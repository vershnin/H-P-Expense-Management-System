from flask import Blueprint, request, jsonify
import logging
import os
import uuid
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
from config.database import get_db_connection
from utils.helpers import safe_datetime_format, decimal_to_float, allowed_file
from utils.auth import jwt_required
from utils.audit import create_audit_log

expense_bp = Blueprint('expenses', __name__)

@expense_bp.route('', methods=['GET'])
@jwt_required
def get_expenses():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user role to filter data
        cursor.execute("SELECT role, branch_location FROM users WHERE id = ?", (request.current_user_id,))
        user_info = cursor.fetchone()
        
        if not user_info:
            return jsonify({'error': 'User not found'}), 404
        
        user_role, user_branch = user_info
        
        # Build query based on user role
        base_query = """
            SELECT e.*, 
                   u1.first_name + ' ' + u1.last_name as submitted_by_name,
                   u2.first_name + ' ' + u2.last_name as approved_by_name,
                   f.description as float_description
            FROM expenses e
            LEFT JOIN users u1 ON e.submitted_by = u1.id
            LEFT JOIN users u2 ON e.approved_by = u2.id
            LEFT JOIN floats f ON e.float_id = f.id
        """
        
        if user_role == 'branch':
            # Branch managers see their location's expenses
            query = base_query + " WHERE e.location = ? ORDER BY e.created_at DESC"
            cursor.execute(query, (user_branch,))
        elif user_role == 'auditor':
            # Auditors see all expenses but read-only
            query = base_query + " ORDER BY e.created_at DESC"
            cursor.execute(query)
        else:
            # Admin and finance see all expenses
            query = base_query + " ORDER BY e.created_at DESC"
            cursor.execute(query)
        
        expenses = []
        for row in cursor.fetchall():
            expense_data = {
                'id': row[0],
                'date': safe_datetime_format(row[1]),
                'description': row[2],
                'category': row[3],
                'amount': decimal_to_float(row[4]),
                'floatId': row[5],
                'location': row[6],
                'status': row[7],
                'currency': row[8],
                'exchangeRate': decimal_to_float(row[9]) if row[9] else 1,
                'receipt': row[10],
                'submittedBy': row[11],
                'approvedBy': row[12],
                'approvedAt': safe_datetime_format(row[13]),
                'rejectionReason': row[14],
                'policyViolation': bool(row[15]),
                'violationReason': row[16],
                'createdAt': safe_datetime_format(row[17]),
                'updatedAt': safe_datetime_format(row[18]),
                'submittedByName': row[19],
                'approvedByName': row[20],
                'floatDescription': row[21]
            }
            expenses.append(expense_data)
        
        return jsonify({
            'message': 'Expenses retrieved successfully',
            'expenses': expenses
        }), 200
        
    except Exception as e:
        logging.error(f"Error retrieving expenses: {str(e)}")
        return jsonify({'error': 'Failed to retrieve expenses'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@expense_bp.route('', methods=['POST'])
@jwt_required
def create_expense():
    try:
        # Handle multipart form data
        data = {}
        for key in request.form:
            data[key] = request.form[key]
        
        # Validate required fields
        required_fields = ['date', 'description', 'category', 'amount', 'floatId', 'location']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'message': f'Missing fields: {", ".join(missing_fields)}'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user role for auto-approval
        cursor.execute("SELECT role FROM users WHERE id = ?", (request.current_user_id,))
        user_role = cursor.fetchone()[0]
        
        # Check if float exists and has sufficient balance
        cursor.execute("SELECT balance FROM floats WHERE id = ? AND is_active = 1", (data['floatId'],))
        float_info = cursor.fetchone()
        
        if not float_info:
            return jsonify({'error': 'Float not found or inactive'}), 404
        
        amount = float(data['amount'])
        exchange_rate = float(data.get('exchangeRate', 1))
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
        expense_id = f"EXP{count:03d}"
        
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
        
        # Determine initial status
        status = 'approved' if user_role == 'admin' else 'pending'
        approved_by = request.current_user_id if user_role == 'admin' else None
        approved_at = datetime.now(timezone.utc) if user_role == 'admin' else None
        
        # Insert expense
        cursor.execute("""
            INSERT INTO expenses (id, date, description, category, amount, float_id, location, status, currency, exchange_rate, 
                                receipt_filename, submitted_by, approved_by, approved_at, policy_violation, violation_reason, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            expense_id,
            data['date'],
            data['description'],
            data['category'],
            amount,
            data['floatId'],
            data['location'],
            status,
            data.get('currency', 'KES'),
            exchange_rate,
            receipt_filename,
            request.current_user_id,
            approved_by,
            approved_at,
            policy_violation,
            violation_reason,
            datetime.now(timezone.utc),
            datetime.now(timezone.utc)
        ))
        
        # Handle additional attachments
        if 'attachments' in request.files:
            attachments = request.files.getlist('attachments')
            for attachment in attachments:
                if attachment and allowed_file(attachment.filename):
                    filename = secure_filename(attachment.filename)
                    unique_filename = f"{expense_id}_{uuid.uuid4().hex}_{filename}"
                    attachment_path = os.path.join('uploads', unique_filename)
                    attachment.save(attachment_path)
                    
                    # Insert attachment record
                    cursor.execute("""
                        INSERT INTO expense_attachments (expense_id, filename, original_filename, file_type, file_size, upload_path)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        expense_id,
                        unique_filename,
                        attachment.filename,
                        attachment.content_type or 'application/octet-stream',
                        os.path.getsize(attachment_path),
                        attachment_path
                    ))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            request.current_user_id,
            'CREATE',
            'expenses',
            expense_id,
            new_values=data
        )
        
        # Create notification for approvers if not auto-approved
        if status == 'pending':
            cursor.execute("""
                SELECT id FROM users 
                WHERE role IN ('admin', 'finance', 'branch') 
                AND (role != 'branch' OR branch_location = ?) 
                AND is_active = 1
            """, (data['location'],))
            
            approvers = cursor.fetchall()
            for approver in approvers:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, related_id)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    approver[0],
                    'New Expense Approval Required',
                    f'Expense {expense_id} for {data["description"]} requires approval',
                    'expense_submitted',
                    expense_id
                ))
            conn.commit()
        
        return jsonify({
            'message': 'Expense created successfully',
            'expense': {
                'id': expense_id,
                'status': status,
                'policyViolation': policy_violation,
                'violationReason': violation_reason
            }
        }), 201
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        logging.error(f"Error creating expense: {str(e)}")
        return jsonify({'error': 'Failed to create expense', 'details': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@expense_bp.route('/<expense_id>/approve', methods=['POST'])
@jwt_required
def approve_expense(expense_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check user permissions
        cursor.execute("SELECT role, branch_location FROM users WHERE id = ?", (request.current_user_id,))
        user_info = cursor.fetchone()
        
        if not user_info or user_info[0] not in ['admin', 'finance', 'branch']:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        user_role, user_branch = user_info
        
        # Get expense details
        cursor.execute("""
            SELECT status, location, amount, exchange_rate, submitted_by 
            FROM expenses WHERE id = ?
        """, (expense_id,))
        expense = cursor.fetchone()
        
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        if expense[0] != 'pending':
            return jsonify({'error': 'Expense is not pending approval'}), 400
        
        # Check if branch manager can approve this expense
        if user_role == 'branch' and expense[1] != user_branch:
            return jsonify({'error': 'Cannot approve expenses from other branches'}), 403
        
        # Update expense status
        cursor.execute("""
            UPDATE expenses 
            SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ?
            WHERE id = ?
        """, (
            request.current_user_id,
            datetime.now(timezone.utc),
            datetime.now(timezone.utc),
            expense_id
        ))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            request.current_user_id,
            'APPROVE',
            'expenses',
            expense_id
        )
        
        # Create notification for submitter
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES (?, ?, ?, ?, ?)
        """, (
            expense[4],  # submitted_by
            'Expense Approved',
            f'Your expense {expense_id} has been approved',
            'expense_approved',
            expense_id
        ))
        conn.commit()
        
        return jsonify({'message': 'Expense approved successfully'}), 200
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        logging.error(f"Error approving expense: {str(e)}")
        return jsonify({'error': 'Failed to approve expense'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@expense_bp.route('/<expense_id>/reject', methods=['POST'])
@jwt_required
def reject_expense(expense_id):
    try:
        data = request.get_json()
        rejection_reason = data.get('reason', 'No reason provided')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check user permissions
        cursor.execute("SELECT role, branch_location FROM users WHERE id = ?", (request.current_user_id,))
        user_info = cursor.fetchone()
        
        if not user_info or user_info[0] not in ['admin', 'finance', 'branch']:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        user_role, user_branch = user_info
        
        # Get expense details
        cursor.execute("""
            SELECT status, location, submitted_by 
            FROM expenses WHERE id = ?
        """, (expense_id,))
        expense = cursor.fetchone()
        
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        if expense[0] != 'pending':
            return jsonify({'error': 'Expense is not pending approval'}), 400
        
        # Check if branch manager can reject this expense
        if user_role == 'branch' and expense[1] != user_branch:
            return jsonify({'error': 'Cannot reject expenses from other branches'}), 403
        
        # Update expense status
        cursor.execute("""
            UPDATE expenses 
            SET status = 'rejected', approved_by = ?, approved_at = ?, rejection_reason = ?, updated_at = ?
            WHERE id = ?
        """, (
            request.current_user_id,
            datetime.now(timezone.utc),
            rejection_reason,
            datetime.now(timezone.utc),
            expense_id
        ))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            request.current_user_id,
            'REJECT',
            'expenses',
            expense_id,
            new_values={'rejection_reason': rejection_reason}
        )
        
        # Create notification for submitter
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES (?, ?, ?, ?, ?)
        """, (
            expense[2],  # submitted_by
            'Expense Rejected',
            f'Your expense {expense_id} has been rejected: {rejection_reason}',
            'expense_rejected',
            expense_id
        ))
        conn.commit()
        
        return jsonify({'message': 'Expense rejected successfully'}), 200
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        logging.error(f"Error rejecting expense: {str(e)}")
        return jsonify({'error': 'Failed to reject expense'}), 500
    finally:
        if 'conn' in locals():
            conn.close()