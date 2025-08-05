from flask import Blueprint, request, jsonify
import logging
from config.database import get_db_connection
from utils.helpers import safe_datetime_format, decimal_to_float
from utils.auth import jwt_required

policy_bp = Blueprint('policies', __name__)

@policy_bp.route('', methods=['GET'])
@jwt_required
def get_policies():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT p.*, u.first_name + ' ' + u.last_name as created_by_name
            FROM policies p
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.is_active = 1
            ORDER BY p.created_at DESC
        """)
        
        policies = []
        for row in cursor.fetchall():
            policy_data = {
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'amountLimit': decimal_to_float(row[3]) if row[3] else None,
                'category': row[4],
                'location': row[5],
                'currency': row[6],
                'isActive': bool(row[7]),
                'createdBy': row[8],
                'createdAt': safe_datetime_format(row[9]),
                'updatedAt': safe_datetime_format(row[10]),
                'createdByName': row[11]
            }
            policies.append(policy_data)
        
        return jsonify({
            'message': 'Policies retrieved successfully',
            'policies': policies
        }), 200
        
    except Exception as e:
        logging.error(f"Error retrieving policies: {str(e)}")
        return jsonify({'error': 'Failed to retrieve policies'}), 500
    finally:
        if 'conn' in locals():
            conn.close()