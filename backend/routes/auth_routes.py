from flask import Blueprint, request, jsonify, g
import bcrypt
import logging
from datetime import datetime, timezone

from config.database import get_db_context
from utils.helpers import validate_email, validate_password, safe_datetime_format
from utils.rbac import create_jwt_token, jwt_required, RBACManager
from utils.response_handler import APIResponse, handle_exceptions, validate_json_request, ResponseUtils, ResponseCode
from utils.audit import create_audit_log

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
@validate_json_request(
    required_fields=['firstName', 'lastName', 'email', 'phone', 'password', 'role', 'department', 'branchLocation']
)
@handle_exceptions
def signup():
    """User registration endpoint"""
    data = request.get_json()
    
    # Validate email format
    if not validate_email(data['email']):
        return APIResponse.validation_error(
            message="Invalid email format",
            errors=["Email must be a valid @hotpoint.co.ke address"]
        )
    
    # Validate password
    is_valid, password_message = validate_password(data['password'])
    if not is_valid:
        return APIResponse.validation_error(
            message="Password validation failed",
            errors=[password_message]
        )
    
    # Validate role
    valid_roles = ['admin', 'finance', 'branch', 'auditor']
    if data['role'] not in valid_roles:
        return APIResponse.validation_error(
            message="Invalid role",
            errors=[f"Role must be one of: {', '.join(valid_roles)}"]
        )
    
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (data['email'].lower(),))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return APIResponse.conflict(
                message="User already exists",
                details="An account with this email already exists"
            )
        
        # Hash password
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert new user
        cursor.execute("""
            INSERT INTO users (first_name, last_name, email, phone, password_hash, role, 
                             department, branch_location, is_verified, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['firstName'], data['lastName'], data['email'].lower(), data['phone'],
            password_hash, data['role'], data['department'], data['branchLocation'],
            0, 1, datetime.now(timezone.utc)  # is_verified=False, is_active=True
        ))
        
        # Get the new user ID
        cursor.execute("SELECT @@IDENTITY")
        user_id = cursor.fetchone()[0]
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            user_id, 'CREATE', 'users', user_id,
            new_values={
                'email': data['email'].lower(),
                'role': data['role'],
                'department': data['department'],
                'branch_location': data['branchLocation']
            }
        )
        
        # Prepare user data for response (excluding sensitive info)
        user_data = {
            'id': int(user_id),
            'firstName': data['firstName'],
            'lastName': data['lastName'],
            'email': data['email'].lower(),
            'phone': data['phone'],
            'role': data['role'],
            'department': data['department'],
            'branchLocation': data['branchLocation'],
            'isVerified': False,
            'isActive': True,
            'permissions': RBACManager.get_user_permissions(data['role'])
        }
        
        return APIResponse.success(
            data={'user': user_data},
            message="Account created successfully. You can now log in.",
            code=ResponseCode.CREATED
        )

@auth_bp.route('/login', methods=['POST'])
@validate_json_request(required_fields=['email', 'password', 'role'])
def login():
    """User login endpoint with enhanced error handling"""
    from utils.enhanced_error_handlers import enhance_login_error_handling
    
    data = request.get_json()
    enhanced_handlers = enhance_login_error_handling()
    
    # Use enhanced logging
    request_id = str(datetime.now(timezone.utc).timestamp())
    enhanced_handlers['log_login_attempt'](data.get('email'), data.get('role'), request_id)
    
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
                logging.warning(f"Login failed: User not found for email={data.get('email')}")
                return enhanced_handlers['handle_login_error'](
                    "Invalid email or password", 
                    request_id
                )

            (user_id, first_name, last_name, email, phone, password_hash, role, 
             department, branch_location, is_verified, is_active, created_at, 
             last_login, failed_attempts, last_failed_login) = user
            
            # Check if account is locked
            max_failed_attempts = 5
            if failed_attempts >= max_failed_attempts:
                if last_failed_login:
                    time_diff = datetime.now(timezone.utc) - last_failed_login
                    if time_diff.total_seconds() < 1800:  # 30 minutes
                        return enhanced_handlers['handle_login_error'](
                            "Account locked", 
                            request_id
                        )
            
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
                
                return enhanced_handlers['handle_login_error'](
                    "Invalid email or password", 
                    request_id
                )
            
            # Check if user is active
            if not is_active:
                return enhanced_handlers['handle_login_error'](
                    "Account disabled", 
                    request_id
                )
            
            # Verify role matches
            if role != data['role']:
                return enhanced_handlers['handle_login_error'](
                    "Role mismatch", 
                    request_id
                )
        
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
            return APIResponse.error(
                message="Failed to generate authentication token",
                code=APIResponse.ResponseCode.INTERNAL_SERVER_ERROR
            )
        
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
        
        return APIResponse.success(
            data={
                'user': user_data,
                'token': token,
                'expiresIn': '24h'
            },
            message=f"Welcome back, {first_name}!"
        )
    except Exception as e:
        logging.exception("Unhandled exception during login")
        return APIResponse.error(
            message="An unexpected error occurred during login",
            details=str(e)
        )

@auth_bp.route('/logout', methods=['POST'])
@jwt_required
@handle_exceptions
def logout():
    """User logout endpoint"""
    user_id = g.current_user['id']
    
    # Create audit log for logout
    create_audit_log(
        user_id, 'LOGOUT', 'users', user_id,
        new_values={'logout_time': datetime.now(timezone.utc).isoformat()}
    )
    
    return APIResponse.success(message="Logout successful")

@auth_bp.route('/verify', methods=['GET'])
@jwt_required
@handle_exceptions
def verify_token():
    """Verify JWT token and return user info"""
    user_id = g.current_user['id']
    
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, first_name, last_name, email, phone, role, department, 
                   branch_location, is_verified, is_active, created_at, last_login
            FROM users WHERE id = ?
        """, (user_id,))
        
        user = cursor.fetchone()
        
        if not user or not user[9]:  # is_active check
            return APIResponse.unauthorized("Token is invalid or user is inactive")
        
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
        
        return APIResponse.success(
            data={'user': user_data},
            message="Token is valid"
        )

@auth_bp.route('/profile', methods=['GET'])
@jwt_required
@handle_exceptions
def get_profile():
    """Get current user's profile"""
    user_id = g.current_user['id']
    
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        # Get user profile with additional stats
        cursor.execute("""
            SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, 
                   u.department, u.branch_location, u.is_verified, u.is_active, 
                   u.created_at, u.last_login,
                   COUNT(DISTINCT e.id) as total_expenses,
                   COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as approved_amount,
                   COUNT(DISTINCT CASE WHEN e.status = 'pending' THEN e.id END) as pending_expenses
            FROM users u
            LEFT JOIN expenses e ON u.id = e.submitted_by
            WHERE u.id = ?
            GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.role, 
                     u.department, u.branch_location, u.is_verified, u.is_active, 
                     u.created_at, u.last_login
        """, (user_id,))
        
        user = cursor.fetchone()
        
        if not user:
            return APIResponse.not_found("User profile")
        
        profile_data = {
            'user': {
                'id': user[0],
                'firstName': user[1],
                'lastName': user[2],
                'fullName': f"{user[1]} {user[2]}",
                'email': user[3],
                'phone': user[4],
                'role': user[5],
                'department': user[6],
                'branchLocation': user[7],
                'isVerified': bool(user[8]),
                'isActive': bool(user[9]),
                'permissions': RBACManager.get_user_permissions(user[5]),
                'memberSince': ResponseUtils.format_datetime(user[10]),
                'lastLogin': ResponseUtils.format_datetime(user[11])
            },
            'statistics': {
                'totalExpenses': user[12],
                'approvedAmount': ResponseUtils.format_currency(user[13]),
                'pendingExpenses': user[14]
            }
        }
        
        return APIResponse.success(
            data=profile_data,
            message="Profile retrieved successfully"
        )

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required
@validate_json_request(required_fields=['currentPassword', 'newPassword'])
@handle_exceptions
def change_password():
    """Change user password"""
    data = request.get_json()
    user_id = g.current_user['id']
    
    # Validate new password
    is_valid, password_message = validate_password(data['newPassword'])
    if not is_valid:
        return APIResponse.validation_error(
            message="New password validation failed",
            errors=[password_message]
        )
    
    with get_db_context() as conn:
        cursor = conn.cursor()
        
        # Get current password hash
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return APIResponse.not_found("User")
        
        # Verify current password
        if not bcrypt.checkpw(data['currentPassword'].encode('utf-8'), user[0].encode('utf-8')):
            return APIResponse.unauthorized("Current password is incorrect")
        
        # Hash new password
        new_password_hash = bcrypt.hashpw(data['newPassword'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        cursor.execute("""
            UPDATE users 
            SET password_hash = ?, updated_at = ?
            WHERE id = ?
        """, (new_password_hash, datetime.now(timezone.utc), user_id))
        
        conn.commit()
        
        # Create audit log
        create_audit_log(
            user_id, 'UPDATE', 'users', user_id,
            new_values={'action': 'password_changed'}
        )
        
        return APIResponse.success(message="Password changed successfully")