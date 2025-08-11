from flask import Blueprint, request, jsonify, g
import bcrypt
import logging
from datetime import datetime, timezone

from config.database import get_db_context
from utils.helpers import validate_email, validate_password, safe_datetime_format
from utils.rbac import create_jwt_token, jwt_required, RBACManager
from utils.response_handler import APIResponse, handle_exceptions, validate_json_request, ResponseUtils
from utils.audit import create_audit_log

auth_bp = Blueprint('auth', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@auth_bp.route('/login', methods=['POST'])
@validate_json_request(required_fields=['email', 'password', 'role'])
def login():
    """User login endpoint with enhanced error handling and consistent JSON responses"""
    data = request.get_json()
    
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            # Find user with enhanced query
            cursor.execute("""
                SELECT id, first_name, last_name, email, phone, password_hash, role, 
                       department, branch_location, is_verified, is_active, created_at, 
                       last_login, failed_login_attempts, last_failed_login
                FROM users WHERE email = ?
            """, (data['email'].lower(),))
            
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"Login failed: User not found for email={data.get('email')}")
                return jsonify({
                    'success': False,
                    'message': 'Invalid email or password',
                    'error': 'User not found'
                }), 401

            (user_id, first_name, last_name, email, phone, password_hash, role, 
             department, branch_location, is_verified, is_active, created_at, 
             last_login, failed_attempts, last_failed_login) = user
            
            # Check if account is locked
            max_failed_attempts = 5
            if failed_attempts >= max_failed_attempts:
                if last_failed_login:
                    time_diff = datetime.now(timezone.utc) - last_failed_login
                    if time_diff.total_seconds() < 1800:  # 30 minutes
                        return jsonify({
                            'success': False,
                            'message': 'Account temporarily locked due to multiple failed attempts',
                            'error': 'Account locked'
                        }), 423
            
            # Verify password
            if not bcrypt.checkpw(data['password'].encode('utf-8'), password_hash.encode('utf-8')):
                # Increment failed login attempts
                cursor.execute("""
                    UPDATE users 
                    SET failed_login_attempts = ISNULL(failed_login_attempts, 0) + 1,
                        last_failed_login = ?
                    WHERE id = ?
                """, (datetime.now(timezone.utc), user_id))
                conn.commit()
                
                return jsonify({
                    'success': False,
                    'message': 'Invalid email or password',
                    'error': 'Authentication failed'
                }), 401
            
            # Check if user is active
            if not is_active:
                return jsonify({
                    'success': False,
                    'message': 'Account is disabled',
                    'error': 'Account inactive'
                }), 403
            
            # Verify role matches
            if role != data['role']:
                return jsonify({
                    'success': False,
                    'message': 'Role mismatch',
                    'error': 'Invalid role'
                }), 403
        
        # Reset failed login attempts on successful login
        cursor.execute("""
            UPDATE users 
            SET last_login = ?, failed_login_attempts = 0, last_failed_login = NULL
            WHERE id = ?
        """, (datetime.now(timezone.utc), user_id))
        conn.commit()
            
        # Create JWT token with enhanced payload
        token = create_jwt_token(user_id)
        if not token:
            return jsonify({
                'success': False,
                'message': 'Failed to generate authentication token',
                'error': 'Token generation failed'
            }), 500
        
        # Prepare user data for response
        user_data = {
            'id': user_id,
            'firstName': first_name,
            'lastName': last_name,
            'fullName': f"{first_name} {last_name}",
            'email': email,
            'phone': phone,
            'role': role,
            'department': department,
            'branchLocation': branch_location,
            'isVerified': bool(is_verified),
            'isActive': bool(is_active),
            'permissions': RBACManager.get_user_permissions(role),
            'lastLogin': ResponseUtils.format_datetime(last_login),
            'memberSince': ResponseUtils.format_datetime(created_at)
        }
        
        # Create audit log for login
        create_audit_log(
            user_id, 'LOGIN', 'users', user_id,
            new_values={'login_time': datetime.now(timezone.utc).isoformat()}
        )
        
        return jsonify({
            'success': True,
            'data': {
                'user': user_data,
                'token': token,
                'expiresIn': '24h'
            },
            'message': f"Welcome back, {first_name}!",
            'meta': {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'requestId': str(datetime.now(timezone.utc).timestamp())
            }
        }), 200
        
    except Exception as e:
        logger.exception("Unhandled exception during login")
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred during login',
            'error': str(e),
            'details': 'Please try again later'
        }), 500

@auth_bp.route('/verify', methods=['GET'])
@jwt_required
@handle_exceptions
def verify_token():
    """Verify JWT token and return user info with consistent response format"""
    user_id = g.current_user['id']
    
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, first_name, last_name, email, phone, role, department, 
                       branch_location, is_verified, is_active, created_at, last_login
                FROM users WHERE id = ?
            """, (user_id,))
            
            user = cursor.fetchone()
            
            if not user or not user[9]:  # is_active check
                return jsonify({
                    'success': False,
                    'message': 'Token is invalid or user is inactive',
                    'error': 'Unauthorized'
                }), 401
            
            (user_id, first_name, last_name, email, phone, role, department, 
             branch_location, is_verified, is_active, created_at, last_login) = user
            
            user_data = {
                'id': user_id,
                'firstName': first_name,
                'lastName': last_name,
                'fullName': f"{first_name} {last_name}",
                'email': email,
                'phone': phone,
                'role': role,
                'department': department,
                'branchLocation': branch_location,
                'isVerified': bool(is_verified),
                'isActive': bool(is_active),
                'permissions': RBACManager.get_user_permissions(role),
                'lastLogin': ResponseUtils.format_datetime(last_login),
                'memberSince': ResponseUtils.format_datetime(created_at)
            }
            
            return jsonify({
                'success': True,
                'data': {'user': user_data},
                'message': 'Token is valid',
                'meta': {
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'requestId': str(datetime.now(timezone.utc).timestamp())
                }
            }), 200
            
    except Exception as e:
        logger.exception("Error during token verification")
        return jsonify({
            'success': False,
            'message': 'Token verification failed',
            'error': str(e)
        }), 500
