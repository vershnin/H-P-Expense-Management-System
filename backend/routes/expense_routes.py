from flask import Blueprint, request, jsonify, g
import logging
import os
import uuid
from datetime import datetime, timezone
from werkzeug.utils import secure_filename

from config.database import get_db_context
from utils.helpers import safe_datetime_format, decimal_to_float, allowed_file
from utils.rbac import jwt_required, require_permission, can_access_branch_data, Permission
from utils.response_handler import APIResponse, handle_exceptions, validate_json_request, ResponseUtils
from utils.audit import create_audit_log

expense_bp = Blueprint('expenses', __name__)

@expense_bp.route('', methods=['GET'])
@jwt_required
@require_permission(Permission.VIEW_EXPENSES)
@handle_exceptions
def get_expenses():
    """Get expenses based on user role and permissions"""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)
    status_filter = request.args.get('status')
    category_filter = request.args.get('category')
    location_filter = request.args.get('location')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        user_role = g.current_user['role']
        user_branch = g.current_user.get('branch_location')
        can_view_all = Permission.VIEW_ALL_EXPENSES.value in g.current_user['permissions']
        
        # Build base query with joins
        base_query = """
            FROM expenses e
            LEFT JOIN users u1 ON e.submitted_by = u1.id
            LEFT JOIN users u2 ON e.approved_by = u2.id
            LEFT JOIN floats f ON e.float_id = f.id
            WHERE 1=1
        """
        
        params = []
        
        # Apply role-based filtering
        if not can_view_all and user_role == 'branch':
            base_query += " AND e.location = ?"
            params.append(user_branch)
        
        # Apply filters
        if status_filter:
            base_query += " AND e.status = ?"
            params.append(status_filter)
            
        if category_filter:
            base_query += " AND e.category = ?"
            params.append(category_filter)
            
        if location_filter and can_access_branch_data(location_filter):
            base_query += " AND e.location = ?"
            params.append(location_filter)
            
        if date_from:
            base_query += " AND e.date >= ?"
            params.append(date_from)
            
        if date_to:
            base_query += " AND e.date <= ?"
            params.append(date_to)
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) " + base_query
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # Get paginated data
        data_query = """
            SELECT e.id, e.date, e.description, e.category, e.amount, e.float_id, e.location,
                   e.status, e.currency, e.exchange_rate, e.receipt_filename, e.submitted_by,
                   e.approved_by, e.approved_at, e.rejection_reason, e.policy_violation,
                   e.violation_reason, e.created_at, e.updated_at,
                   u1.first_name + ' ' + u1.last_name as submitted_by_name,
                   u2.first_name + ' ' + u2.last_name as approved_by_name,
                   f.description as float_description
        """ + base_query + " ORDER BY e.created_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
        
        offset = (page - 1) * per_page
        cursor.execute(data_query, params + [offset, per_page])
        
        expenses = []
        for row in cursor.fetchall():
            expense_data = {
                'id': row[0],
                'date': ResponseUtils.format_datetime(row[1]),
                'description': row[2],
                'category': row[3],
                'amount': ResponseUtils.format_currency(decimal_to_float(row[4]), row[8]),
                'floatId': row[5],
                'location': row[6],
                'status': row[7],
                'exchangeRate': decimal_to_float(row[9]) if row[9] else 1,
                'receipt': row[10],
                'submittedBy': {
                    'id': row[11],
                    'name': row[19]
                },
                'approvedBy': {
                    'id': row[12],
                    'name': row[20]
                } if row[12] else None,
                'approvedAt': ResponseUtils.format_datetime(row[13]),
                'rejectionReason': row[14],
                'policyViolation': {
                    'hasViolation': bool(row[15]),
                    'reason': row[16]
                },
                'timestamps': {
                    'createdAt': ResponseUtils.format_datetime(row[17]),
                    'updatedAt': ResponseUtils.format_datetime(row[18])
                },
                'float': {
                    'id': row[5],
                    'description': row[21]
                } if row[21] else None
            }
            expenses.append(expense_data)
        
        return APIResponse.paginated_success(
            data=expenses,
            total=total,
            page=page,
            per_page=per_page,
            message=f"Retrieved {len(expenses)} expenses"
        )

@expense_bp.route('', methods=['POST'])
@jwt_required
@require_permission(Permission.CREATE_EXPENSES)
@handle_exceptions
def create_expense():
    """Create a new expense"""
    # Handle multipart form data
    data = {}
    for key in request.form:
        data[key] = request.form[key]
    
    # Validate required fields
    required_fields = ['date', 'description', 'category', 'amount', 'floatId', 'location']
    missing_fields = [field for field in required_fields if not data.get(field)]
    
    if missing_fields:
        return APIResponse.validation_error(
            message="Missing required fields",
            errors=[f"Missing fields: {', '.join(missing_fields)}"]
        )
    
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        user_role = g.current_user['role']
        user_id = g.current_user['id']
        
        # Validate branch access for branch managers
        if user_role == 'branch' and not can_access_branch_data(data['location']):
            return APIResponse.forbidden("Cannot create expenses for other branches")
        
        # Check if float exists and has sufficient balance
        cursor.execute("SELECT balance FROM floats WHERE id = ? AND is_active = 1", (data['floatId'],))
        float_info = cursor.fetchone()
        
        if not float_info:
            return APIResponse.not_found("Float", data['floatId'])
        
        try:
            amount = float(data['amount'])
            exchange_rate = float(data.get('exchangeRate', 1))
        except ValueError:
            return APIResponse.validation_error(
                message="Invalid numeric values",
                errors=["Amount and exchange rate must be valid numbers"]
            )
        
        kes_amount = amount * exchange_rate
        
        # Check policy violations
        cursor.execute("""
            SELECT amount_limit FROM policies 
            WHERE category = ? AND is_active = 1
        """, (data['category'],))
        policy = cursor.fetchone()
        
        policy_violation = False
        violation_reason = None
        
        if policy and policy[0] and kes_amount > float(policy[0]):
            policy_violation = True
            violation_reason = f"Exceeds policy limit of {policy[0]} for {data['category']}"
        
        # Generate expense ID
        cursor.execute("SELECT COUNT(*) FROM expenses")
        count = cursor.fetchone()[0] + 1
        expense_id = f"EXP{count:04d}"
        
        # Handle file uploads
        receipt_filename = None
        if 'receipt' in request.files:
            receipt_file = request.files['receipt']
            if receipt_file and allowed_file(receipt_file.filename):
                filename = secure_filename(receipt_file.filename)
                unique_filename = f"{expense_id}_{uuid.uuid4().hex}_{filename}"
                receipt_path = os.path.join('uploads', unique_filename)
                receipt_file.save(receipt_path)
                receipt_filename = unique_filename
        
        # Determine initial status based on role and policy violations
        if user_role == 'admin':
            status = 'approved'
            approved_by = user_id
            approved_at = datetime.now(timezone.utc)
        elif policy_violation and user_role != 'admin':
            status = 'pending'  # Policy violations require higher approval
            approved_by = None
            approved_at = None
        else:
            status = 'pending'
            approved_by = None
            approved_at = None
        
        # Insert expense
        cursor.execute("""
            INSERT INTO expenses (id, date, description, category, amount, float_id, location, status, 
                                currency, exchange_rate, receipt_filename, submitted_by, approved_by, 
                                approved_at, policy_violation, violation_reason, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            expense_id, data['date'], data['description'], data['category'], amount,
            data['floatId'], data['location'], status, data.get('currency', 'KES'),
            exchange_rate, receipt_filename, user_id, approved_by, approved_at,
            policy_violation, violation_reason, datetime.now(timezone.utc), datetime.now(timezone.utc)
        ))
        
        # Handle additional attachments
        attachment_count = 0
        if 'attachments' in request.files:
            attachments = request.files.getlist('attachments')
            for attachment in attachments:
                if attachment and allowed_file(attachment.filename):
                    filename = secure_filename(attachment.filename)
                    unique_filename = f"{expense_id}_{uuid.uuid4().hex}_{filename}"
                    attachment_path = os.path.join('uploads', unique_filename)
                    attachment.save(attachment_path)
                    
                    cursor.execute("""
                        INSERT INTO expense_attachments (expense_id, filename, original_filename, 
                                                       file_type, file_size, upload_path)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        expense_id, unique_filename, attachment.filename,
                        attachment.content_type or 'application/octet-stream',
                        os.path.getsize(attachment_path), attachment_path
                    ))
                    attachment_count += 1
        
        conn.commit()
        
        # Create audit log
        create_audit_log(user_id, 'CREATE', 'expenses', expense_id, new_values=data)
        
        # Create notifications for approvers if not auto-approved
        if status == 'pending':
            cursor.execute("""
                SELECT id FROM users 
                WHERE role IN ('admin', 'finance', 'branch') 
                AND (role != 'branch' OR branch_location = ?) 
                AND is_active = 1
                AND id != ?
            """, (data['location'], user_id))
            
            approvers = cursor.fetchall()
            for approver in approvers:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, related_id)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    approver[0], 'New Expense Approval Required',
                    f'Expense {expense_id} for {data["description"]} requires approval',
                    'expense_submitted', expense_id
                ))
            conn.commit()
        
        response_data = {
            'expense': {
                'id': expense_id,
                'status': status,
                'amount': ResponseUtils.format_currency(amount, data.get('currency', 'KES')),
                'policyViolation': {
                    'hasViolation': policy_violation,
                    'reason': violation_reason
                },
                'attachments': {
                    'receipt': receipt_filename,
                    'additionalCount': attachment_count
                }
            }
        }
        
        return APIResponse.success(
            data=response_data,
            message=f"Expense {expense_id} created successfully",
            code=APIResponse.ResponseCode.CREATED
        )

@expense_bp.route('/<expense_id>/approve', methods=['POST'])
@jwt_required
@require_permission(Permission.APPROVE_EXPENSES)
@handle_exceptions
def approve_expense(expense_id):
    """Approve an expense"""
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        user_role = g.current_user['role']
        user_id = g.current_user['id']
        user_branch = g.current_user.get('branch_location')
        
        # Get expense details
        cursor.execute("""
            SELECT status, location, amount, exchange_rate, submitted_by, policy_violation
            FROM expenses WHERE id = ?
        """, (expense_id,))
        expense = cursor.fetchone()
        
        if not expense:
            return APIResponse.not_found("Expense", expense_id)
        
        status, location, amount, exchange_rate, submitted_by, policy_violation = expense
        
        if status != 'pending':
            return APIResponse.error(
                message="Expense is not pending approval",
                code=APIResponse.ResponseCode.BAD_REQUEST
            )
        
        # Check if user can approve this expense
        if user_role == 'branch' and location != user_branch:
            return APIResponse.forbidden("Cannot approve expenses from other branches")
        
        # Policy violation check - only admin can approve policy violations
        if policy_violation and user_role != 'admin':
            return APIResponse.forbidden("Only administrators can approve expenses with policy violations")
        
        # Update expense status
        cursor.execute("""
            UPDATE expenses 
            SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ?
            WHERE id = ?
        """, (user_id, datetime.now(timezone.utc), datetime.now(timezone.utc), expense_id))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(user_id, 'APPROVE', 'expenses', expense_id)
        
        # Create notification for submitter
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES (?, ?, ?, ?, ?)
        """, (
            submitted_by, 'Expense Approved',
            f'Your expense {expense_id} has been approved',
            'expense_approved', expense_id
        ))
        conn.commit()
        
        return APIResponse.success(
            message=f"Expense {expense_id} approved successfully"
        )

@expense_bp.route('/<expense_id>/reject', methods=['POST'])
@jwt_required
@require_permission(Permission.REJECT_EXPENSES)
@validate_json_request(required_fields=['reason'])
@handle_exceptions
def reject_expense(expense_id):
    """Reject an expense"""
    data = request.get_json()
    rejection_reason = data['reason']
    
    if len(rejection_reason.strip()) < 10:
        return APIResponse.validation_error(
            message="Rejection reason is too short",
            errors=["Rejection reason must be at least 10 characters long"]
        )
    
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        user_role = g.current_user['role']
        user_id = g.current_user['id']
        user_branch = g.current_user.get('branch_location')
        
        # Get expense details
        cursor.execute("""
            SELECT status, location, submitted_by
            FROM expenses WHERE id = ?
        """, (expense_id,))
        expense = cursor.fetchone()
        
        if not expense:
            return APIResponse.not_found("Expense", expense_id)
        
        status, location, submitted_by = expense
        
        if status != 'pending':
            return APIResponse.error(
                message="Expense is not pending approval",
                code=APIResponse.ResponseCode.BAD_REQUEST
            )
        
        # Check if user can reject this expense
        if user_role == 'branch' and location != user_branch:
            return APIResponse.forbidden("Cannot reject expenses from other branches")
        
        # Update expense status
        cursor.execute("""
            UPDATE expenses 
            SET status = 'rejected', approved_by = ?, approved_at = ?, 
                rejection_reason = ?, updated_at = ?
            WHERE id = ?
        """, (user_id, datetime.now(timezone.utc), rejection_reason, 
              datetime.now(timezone.utc), expense_id))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            user_id, 'REJECT', 'expenses', expense_id,
            new_values={'rejection_reason': rejection_reason}
        )
        
        # Create notification for submitter
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES (?, ?, ?, ?, ?)
        """, (
            submitted_by, 'Expense Rejected',
            f'Your expense {expense_id} has been rejected: {rejection_reason}',
            'expense_rejected', expense_id
        ))
        conn.commit()
        
        return APIResponse.success(
            message=f"Expense {expense_id} rejected successfully"
        )

@expense_bp.route('/<expense_id>', methods=['GET'])
@jwt_required
@require_permission(Permission.VIEW_EXPENSES)
@handle_exceptions
def get_expense_details(expense_id):
    """Get detailed expense information"""
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        # Get expense with full details
        cursor.execute("""
            SELECT e.*, 
                   u1.first_name + ' ' + u1.last_name as submitted_by_name,
                   u1.email as submitted_by_email,
                   u2.first_name + ' ' + u2.last_name as approved_by_name,
                   u2.email as approved_by_email,
                   f.description as float_description,
                   f.balance as float_balance
            FROM expenses e
            LEFT JOIN users u1 ON e.submitted_by = u1.id
            LEFT JOIN users u2 ON e.approved_by = u2.id
            LEFT JOIN floats f ON e.float_id = f.id
            WHERE e.id = ?
        """, (expense_id,))
        
        expense = cursor.fetchone()
        if not expense:
            return APIResponse.not_found("Expense", expense_id)
        
        # Check access permissions
        if not can_access_branch_data(expense[6]):  # location is at index 6
            return APIResponse.forbidden("Cannot access this expense")
        
        # Get attachments
        cursor.execute("""
            SELECT filename, original_filename, file_type, file_size, created_at
            FROM expense_attachments WHERE expense_id = ?
        """, (expense_id,))
        attachments = cursor.fetchall()
        
        expense_data = {
            'id': expense[0],
            'date': ResponseUtils.format_datetime(expense[1]),
            'description': expense[2],
            'category': expense[3],
            'amount': ResponseUtils.format_currency(decimal_to_float(expense[4]), expense[8]),
            'location': expense[6],
            'status': expense[7],
            'exchangeRate': decimal_to_float(expense[9]) if expense[9] else 1,
            'receipt': expense[10],
            'submittedBy': {
                'id': expense[11],
                'name': expense[19],
                'email': expense[20]
            },
            'approvedBy': {
                'id': expense[12],
                'name': expense[21],
                'email': expense[22]
            } if expense[12] else None,
            'approvedAt': ResponseUtils.format_datetime(expense[13]),
            'rejectionReason': expense[14],
            'policyViolation': {
                'hasViolation': bool(expense[15]),
                'reason': expense[16]
            },
            'float': {
                'id': expense[5],
                'description': expense[23],
                'balance': ResponseUtils.format_currency(decimal_to_float(expense[24]))
            } if expense[5] else None,
            'attachments': [
                {
                    'filename': att[0],
                    'originalName': att[1],
                    'fileType': att[2],
                    'fileSize': att[3],
                    'uploadedAt': ResponseUtils.format_datetime(att[4])
                } for att in attachments
            ],
            'timestamps': {
                'createdAt': ResponseUtils.format_datetime(expense[17]),
                'updatedAt': ResponseUtils.format_datetime(expense[18])
            }
        }
        
        return APIResponse.success(
            data=expense_data,
            message="Expense details retrieved successfully"
        )