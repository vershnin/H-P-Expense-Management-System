import jwt
from datetime import datetime, timedelta, timezone
from flask import request, jsonify, current_app, g
from functools import wraps
from config.database import get_db_context
import logging
from enum import Enum

class Role(Enum):
    ADMIN = "admin"
    FINANCE = "finance"
    BRANCH = "branch"
    AUDITOR = "auditor"

class Permission(Enum):
    # User permissions
    VIEW_USERS = "view_users"
    CREATE_USERS = "create_users"
    UPDATE_USERS = "update_users"
    DELETE_USERS = "delete_users"
    
    # Expense permissions
    VIEW_EXPENSES = "view_expenses"
    CREATE_EXPENSES = "create_expenses"
    UPDATE_EXPENSES = "update_expenses"
    DELETE_EXPENSES = "delete_expenses"
    APPROVE_EXPENSES = "approve_expenses"
    REJECT_EXPENSES = "reject_expenses"
    VIEW_ALL_EXPENSES = "view_all_expenses"
    
    # Float permissions
    VIEW_FLOATS = "view_floats"
    CREATE_FLOATS = "create_floats"
    UPDATE_FLOATS = "update_floats"
    DELETE_FLOATS = "delete_floats"
    VIEW_ALL_FLOATS = "view_all_floats"
    
    # Report permissions
    VIEW_REPORTS = "view_reports"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    EXPORT_REPORTS = "export_reports"
    
    # Policy permissions
    VIEW_POLICIES = "view_policies"
    CREATE_POLICIES = "create_policies"
    UPDATE_POLICIES = "update_policies"
    DELETE_POLICIES = "delete_policies"

# Role-Permission mapping
ROLE_PERMISSIONS = {
    Role.ADMIN: [
        # Users
        Permission.VIEW_USERS, Permission.CREATE_USERS, 
        Permission.UPDATE_USERS, Permission.DELETE_USERS,
        
        # Expenses
        Permission.VIEW_EXPENSES, Permission.CREATE_EXPENSES,
        Permission.UPDATE_EXPENSES, Permission.DELETE_EXPENSES,
        Permission.APPROVE_EXPENSES, Permission.REJECT_EXPENSES,
        Permission.VIEW_ALL_EXPENSES,
        
        # Floats
        Permission.VIEW_FLOATS, Permission.CREATE_FLOATS,
        Permission.UPDATE_FLOATS, Permission.DELETE_FLOATS,
        Permission.VIEW_ALL_FLOATS,
        
        # Reports
        Permission.VIEW_REPORTS, Permission.VIEW_AUDIT_LOGS,
        Permission.EXPORT_REPORTS,
        
        # Policies
        Permission.VIEW_POLICIES, Permission.CREATE_POLICIES,
        Permission.UPDATE_POLICIES, Permission.DELETE_POLICIES,
    ],
    
    Role.FINANCE: [
        # Expenses
        Permission.VIEW_EXPENSES, Permission.CREATE_EXPENSES,
        Permission.APPROVE_EXPENSES, Permission.REJECT_EXPENSES,
        Permission.VIEW_ALL_EXPENSES,
        
        # Floats
        Permission.VIEW_FLOATS, Permission.CREATE_FLOATS,
        Permission.UPDATE_FLOATS, Permission.DELETE_FLOATS,
        Permission.VIEW_ALL_FLOATS,
        
        # Reports
        Permission.VIEW_REPORTS, Permission.EXPORT_REPORTS,
        
        # Policies
        Permission.VIEW_POLICIES,
    ],
    
    Role.BRANCH: [
        # Expenses
        Permission.VIEW_EXPENSES, Permission.CREATE_EXPENSES,
        Permission.APPROVE_EXPENSES, Permission.REJECT_EXPENSES,
        
        # Floats
        Permission.VIEW_FLOATS,
        
        # Reports
        Permission.VIEW_REPORTS,
        
        # Policies
        Permission.VIEW_POLICIES,
    ],
    
    Role.AUDITOR: [
        # Expenses (read-only)
        Permission.VIEW_EXPENSES, Permission.VIEW_ALL_EXPENSES,
        
        # Floats (read-only)
        Permission.VIEW_FLOATS, Permission.VIEW_ALL_FLOATS,
        
        # Reports
        Permission.VIEW_REPORTS, Permission.VIEW_AUDIT_LOGS,
        Permission.EXPORT_REPORTS,
        
        # Policies
        Permission.VIEW_POLICIES,
    ]
}

class RBACManager:
    @staticmethod
    def has_permission(user_role, permission):
        """Check if a user role has a specific permission"""
        try:
            role_enum = Role(user_role)
            return permission in ROLE_PERMISSIONS.get(role_enum, [])
        except ValueError:
            return False
    
    @staticmethod
    def has_any_permission(user_role, permissions):
        """Check if user has any of the specified permissions"""
        return any(RBACManager.has_permission(user_role, perm) for perm in permissions)
    
    @staticmethod
    def has_all_permissions(user_role, permissions):
        """Check if user has all specified permissions"""
        return all(RBACManager.has_permission(user_role, perm) for perm in permissions)
    
    @staticmethod
    def get_user_permissions(user_role):
        """Get all permissions for a user role"""
        try:
            role_enum = Role(user_role)
            return [perm.value for perm in ROLE_PERMISSIONS.get(role_enum, [])]
        except ValueError:
            return []

def create_jwt_token(user_id):
    """Create JWT token with enhanced payload"""
    try:
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT role, branch_location, is_active, first_name, last_name 
                FROM users WHERE id = ?
            """, (user_id,))
            user_info = cursor.fetchone()
            
            if not user_info or not user_info[2]:  # is_active check
                return None
                
            role, branch_location, is_active, first_name, last_name = user_info
            
            payload = {
                'user_id': user_id,
                'role': role,
                'branch_location': branch_location,
                'permissions': RBACManager.get_user_permissions(role),
                'full_name': f"{first_name} {last_name}",
                'exp': datetime.now(timezone.utc) + timedelta(hours=24),
                'iat': datetime.now(timezone.utc)
            }
            
            return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
    except Exception as e:
        logging.error(f"Error creating JWT token: {str(e)}")
        return None

def verify_jwt_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        
        # Verify user is still active
        with get_db_context() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT is_active FROM users WHERE id = ?", (payload['user_id'],))
            user = cursor.fetchone()
            
            if not user or not user[0]:
                return None
                
        return payload
    except jwt.ExpiredSignatureError:
        logging.warning("JWT token expired")
        return None
    except jwt.InvalidTokenError:
        logging.warning("Invalid JWT token")
        return None
    except Exception as e:
        logging.error(f"Error verifying JWT token: {str(e)}")
        return None

def jwt_required(f):
    """JWT required decorator with enhanced user context"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({
                'error': 'Authentication required',
                'message': 'Authorization token is missing'
            }), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({
                'error': 'Authentication failed',
                'message': 'Invalid or expired token'
            }), 401
        
        # Set user context in Flask g object
        g.current_user = {
            'id': payload['user_id'],
            'role': payload['role'],
            'branch_location': payload.get('branch_location'),
            'permissions': payload.get('permissions', []),
            'full_name': payload.get('full_name')
        }
        
        # Backwards compatibility
        request.current_user_id = payload['user_id']
        
        return f(*args, **kwargs)
    return decorated_function

def require_permission(*required_permissions):
    """Decorator to require specific permissions"""
    def decorator(f):
        @wraps(f)
        @jwt_required
        def decorated_function(*args, **kwargs):
            user_role = g.current_user['role']
            
            # Check if user has any of the required permissions
            if not RBACManager.has_any_permission(user_role, required_permissions):
                return jsonify({
                    'error': 'Insufficient permissions',
                    'message': f'Required permissions: {[p.value for p in required_permissions]}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_all_permissions(*required_permissions):
    """Decorator to require all specified permissions"""
    def decorator(f):
        @wraps(f)
        @jwt_required
        def decorated_function(*args, **kwargs):
            user_role = g.current_user['role']
            
            # Check if user has all required permissions
            if not RBACManager.has_all_permissions(user_role, required_permissions):
                return jsonify({
                    'error': 'Insufficient permissions',
                    'message': f'All required permissions needed: {[p.value for p in required_permissions]}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_roles(*required_roles):
    """Decorator to require specific roles"""
    def decorator(f):
        @wraps(f)
        @jwt_required
        def decorated_function(*args, **kwargs):
            user_role = g.current_user['role']
            
            if user_role not in [role.value for role in required_roles]:
                return jsonify({
                    'error': 'Insufficient privileges',
                    'message': f'Required roles: {[role.value for role in required_roles]}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def can_access_branch_data(target_branch_location):
    """Check if user can access data from a specific branch"""
    user_role = g.current_user['role']
    user_branch = g.current_user.get('branch_location')
    
    # Admin, finance, auditor can access all branches
    if user_role in ['admin', 'finance', 'auditor']:
        return True
    
    # Branch managers can only access their own branch
    if user_role == 'branch':
        return user_branch == target_branch_location
    
    return False

# Convenience decorators for common role combinations
admin_required = require_roles(Role.ADMIN)
finance_or_admin_required = require_roles(Role.ADMIN, Role.FINANCE)
approver_required = require_roles(Role.ADMIN, Role.FINANCE, Role.BRANCH)