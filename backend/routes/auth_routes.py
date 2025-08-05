from flask import Blueprint, request, jsonify
import bcrypt
import logging
from datetime import datetime, timezone
from config.database import get_db_connection
from utils.helpers import validate_email, validate_password, safe_datetime_format
from utils.auth import create_jwt_token, jwt_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'email', 'phone', 'password', 'role', 'department', 'branchLocation']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'message': f'Missing fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({
                'error': 'Invalid email format',
                'message': 'Please provide a valid email address'
            }), 400
        
        # Validate password
        is_valid, password_message = validate_password(data['password'])
        if not is_valid:
            return jsonify({
                'error': 'Invalid password',
                'message': password_message
            }), 400
        
        # Validate role
        valid_roles = ['admin', 'finance', 'branch', 'auditor']
        if data['role'] not in valid_roles:
            return jsonify({
                'error': 'Invalid role',
                'message': f'Role must be one of: {", ".join(valid_roles)}'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (data['email'].lower(),))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return jsonify({
                'error': 'User already exists',
                'message': 'An account with this email already exists'
            }), 409
        
        # Hash password
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert new user
        cursor.execute("""
            INSERT INTO users (first_name, last_name, email, phone, password_hash, role, department, branch_location, is_verified, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['firstName'],
            data['lastName'],
            data['email'].lower(),
            data['phone'],
            password_hash,
            data['role'],
            data['department'],
            data['branchLocation'],
            0,  # is_verified = False
            1,  # is_active = True
            datetime.now(timezone.utc)
        ))
        
        # Get the new user ID
        cursor.execute("SELECT @@IDENTITY")
        user_id = cursor.fetchone()[0]
        
        conn.commit()
        
        return jsonify({
            'message': 'Account created successfully. You can now log in.',
            'user': {
                'id': int(user_id),
                'firstName': data['firstName'],
                'lastName': data['lastName'],
                'email': data['email'].lower(),
                'phone': data['phone'],
                'role': data['role'],
                'department': data['department'],
                'branchLocation': data['branchLocation'],
                'isVerified': False,
                'isActive': True
            }
        }), 201
    
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        logging.error(f"Signup error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An error occurred while creating your account'
        }), 500
    finally:
        if 'conn' in locals():
            conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all(data.get(field) for field in ['email', 'password', 'role']):
            return jsonify({
                'error': 'Missing credentials',
                'message': 'Email, password, and role are required'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user
        cursor.execute("""
            SELECT id, first_name, last_name, email, phone, password_hash, role, department, branch_location, is_verified, is_active, created_at, last_login
            FROM users WHERE email = ?
        """, (data['email'].lower(),))
        
        user = cursor.fetchone()

        if not user:
            return jsonify({
                'error': 'Invalid credentials',  
                'message': 'Invalid email or password'
            }), 401
        
        user_id, first_name, last_name, email, phone, password_hash, role, department, branch_location, is_verified, is_active, created_at, last_login = user
        
        # Verify password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), password_hash.encode('utf-8')):
            return jsonify({
                'error': 'Invalid credentials',
                'message': 'Invalid email or password'
            }), 401
        
        # Check if user is active
        if not is_active:
            return jsonify({
                'error': 'Account disabled',
                'message': 'Your account has been disabled. Please contact support.'
            }), 403
        
        # Verify role matches
        if role != data['role']:
            return jsonify({
                'error': 'Invalid role',
                'message': 'Selected role does not match your account'
            }), 403
        
        # Update last login
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (datetime.now(timezone.utc), user_id))
        conn.commit()
            
        # Create JWT token
        token = create_jwt_token(user_id)
        
        user_dict = {
            'id': user_id,
            'firstName': first_name,
            'lastName': last_name,
            'email': email,
            'phone': phone,
            'role': role,
            'department': department,
            'branchLocation': branch_location,
            'isVerified': bool(is_verified),
            'isActive': bool(is_active),
            'createdAt': safe_datetime_format(created_at),
            'lastLogin': safe_datetime_format(last_login)
        }
        
        return jsonify({
            'message': 'Login successful',
            'user': user_dict,
            'token': token
        }), 200
    
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An error occurred during login'
        }), 500
    finally:
        if 'conn' in locals():
            conn.close()

@auth_bp.route('/logout', methods=['POST'])
@jwt_required
def logout():
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/verify', methods=['GET'])
@jwt_required
def verify_token():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, first_name, last_name, email, phone, role, department, branch_location, is_verified, is_active, created_at, last_login
            FROM users WHERE id = ?
        """, (request.current_user_id,))
        
        user = cursor.fetchone()
        
        if not user or not user[9]:  # is_active check
            return jsonify({
                'error': 'Invalid token',
                'message': 'Token is invalid or user is inactive'
            }), 401
        
        user_id, first_name, last_name, email, phone, role, department, branch_location, is_verified, is_active, created_at, last_login = user
        
        user_dict = {
            'id': user_id,
            'firstName': first_name,
            'lastName': last_name,
            'email': email,
            'phone': phone,
            'role': role,
            'department': department,
            'branchLocation': branch_location,
            'isVerified': bool(is_verified),
            'isActive': bool(is_active),
            'createdAt': safe_datetime_format(created_at),
            'lastLogin': safe_datetime_format(last_login)
        }
        
        return jsonify({
            'message': 'Token is valid',
            'user': user_dict
        }), 200
    
    except Exception as e:
        logging.error(f"Token verification error: {str(e)}")
        return jsonify({
            'error': 'Token verification failed',
            'message': 'Invalid or expired token'
        }), 401
    finally:
        if 'conn' in locals():
            conn.close()