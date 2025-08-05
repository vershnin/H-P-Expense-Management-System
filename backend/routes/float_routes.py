from flask import Blueprint, request, jsonify
import logging
from datetime import datetime, timezone
from config.database import get_db_connection
from utils.helpers import safe_datetime_format, decimal_to_float
from utils.auth import jwt_required, finance_or_admin_required
from utils.audit import create_audit_log

float_bp = Blueprint('floats', __name__)

@float_bp.route('', methods=['GET'])
@jwt_required
def get_floats():
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
        if user_role == 'branch':
            # Branch managers only see their location's floats
            query = """
                SELECT f.*, u.first_name + ' ' + u.last_name as created_by_name
                FROM floats f
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.is_active = 1 AND f.location = ?
                ORDER BY f.created_at DESC
            """
            cursor.execute(query, (user_branch,))
        else:
            # Admin, finance, auditor see all floats
            query = """
                SELECT f.*, u.first_name + ' ' + u.last_name as created_by_name
                FROM floats f
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.is_active = 1
                ORDER BY f.created_at DESC
            """
            cursor.execute(query)
        
        floats = []
        for row in cursor.fetchall():
            float_data = {
                'id': row[0],
                'description': row[1],
                'location': row[2],
                'initialAmount': decimal_to_float(row[3]),
                'usedAmount': decimal_to_float(row[4]),
                'balance': decimal_to_float(row[5]),
                'status': row[6],
                'currency': row[7],
                'createdBy': row[8],
                'createdAt': safe_datetime_format(row[9]),
                'updatedAt': safe_datetime_format(row[10]),
                'createdByName': row[12] if len(row) > 12 else None
            }
            floats.append(float_data)
        
        return jsonify({
            'message': 'Floats retrieved successfully',
            'floats': floats
        }), 200
        
    except Exception as e:
        logging.error(f"Error retrieving floats: {str(e)}")
        return jsonify({'error': 'Failed to retrieve floats'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@float_bp.route('', methods=['POST'])
@finance_or_admin_required
def create_float():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['id', 'description', 'location', 'initialAmount']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'message': f'Missing fields: {", ".join(missing_fields)}'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if float ID already exists
        cursor.execute("SELECT id FROM floats WHERE id = ?", (data['id'],))
        if cursor.fetchone():
            return jsonify({
                'error': 'Float already exists',
                'message': 'A float with this ID already exists'
            }), 409
        
        # Create new float
        initial_amount = float(data['initialAmount'])
        used_amount = float(data.get('usedAmount', 0))
        balance = initial_amount - used_amount
        
        # Determine status
        if balance <= 0:
            status = 'exhausted'
        elif balance < initial_amount * 0.2:
            status = 'low'
        else:
            status = 'active'
        
        cursor.execute("""
            INSERT INTO floats (id, description, location, initial_amount, used_amount, balance, status, currency, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['id'],
            data['description'],
            data['location'],
            initial_amount,
            used_amount,
            balance,
            status,
            data.get('currency', 'KES'),
            request.current_user_id,
            datetime.now(timezone.utc),
            datetime.now(timezone.utc)
        ))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            request.current_user_id,
            'CREATE',
            'floats',
            data['id'],
            new_values=data
        )
        
        return jsonify({
            'message': 'Float created successfully',
            'float': {
                'id': data['id'],
                'description': data['description'],
                'location': data['location'],
                'initialAmount': initial_amount,
                'usedAmount': used_amount,
                'balance': balance,
                'status': status,
                'currency': data.get('currency', 'KES')
            }
        }), 201
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        logging.error(f"Error creating float: {str(e)}")
        return jsonify({'error': 'Failed to create float'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@float_bp.route('/<float_id>', methods=['PUT'])
@finance_or_admin_required
def update_float(float_id):
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get existing float
        cursor.execute("SELECT * FROM floats WHERE id = ? AND is_active = 1", (float_id,))
        existing_float = cursor.fetchone()
        
        if not existing_float:
            return jsonify({'error': 'Float not found'}), 404
        
        # Update float
        initial_amount = float(data.get('initialAmount', existing_float[3]))
        used_amount = float(data.get('usedAmount', existing_float[4]))
        balance = initial_amount - used_amount
        
        # Determine status
        if balance <= 0:
            status = 'exhausted'
        elif balance < initial_amount * 0.2:
            status = 'low'
        else:
            status = 'active'
        
        cursor.execute("""
            UPDATE floats 
            SET description = ?, location = ?, initial_amount = ?, used_amount = ?, balance = ?, status = ?, updated_at = ?
            WHERE id = ?
        """, (
            data.get('description', existing_float[1]),
            data.get('location', existing_float[2]),
            initial_amount,
            used_amount,
            balance,
            status,
            datetime.now(timezone.utc),
            float_id
        ))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            request.current_user_id,
            'UPDATE',
            'floats',
            float_id,
            old_values={'id': existing_float[0], 'description': existing_float[1]},
            new_values=data
        )
        
        return jsonify({'message': 'Float updated successfully'}), 200
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        logging.error(f"Error updating float: {str(e)}")
        return jsonify({'error': 'Failed to update float'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@float_bp.route('/<float_id>', methods=['DELETE'])
@finance_or_admin_required
def delete_float(float_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if float has associated expenses
        cursor.execute("SELECT COUNT(*) FROM expenses WHERE float_id = ?", (float_id,))
        expense_count = cursor.fetchone()[0]
        
        if expense_count > 0:
            return jsonify({
                'error': 'Cannot delete float',
                'message': 'Float has associated expenses. Archive instead of deleting.'
            }), 400
        
        # Soft delete the float
        cursor.execute("""
            UPDATE floats 
            SET is_active = 0, updated_at = ?
            WHERE id = ?
        """, (datetime.now(timezone.utc), float_id))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            request.current_user_id,
            'DELETE',
            'floats',
            float_id
        )
        
        return jsonify({'message': 'Float deleted successfully'}), 200
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        logging.error(f"Error deleting float: {str(e)}")
        return jsonify({'error': 'Failed to delete float'}), 500
    finally:
        if 'conn' in locals():
            conn.close()