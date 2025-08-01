from flask import Flask, jsonify, request
import pyodbc
import os
from dotenv import load_dotenv
import bcrypt
import logging
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta, timezone
import re
from functools import wraps

# Add this helper function near the top of your file, after the imports
def safe_datetime_format(dt_value):
    """Safely convert datetime value to ISO format string"""
    if dt_value is None:
        return None
    if isinstance(dt_value, str):
        # If it's already a string, return it directly or try to parse it
        try:
            # Try to parse if it's a datetime string and reformat
            from dateutil import parser
            parsed_dt = parser.parse(dt_value)
            return parsed_dt.isoformat()
        except:
            # If parsing fails, return the string as-is
            return dt_value
    if hasattr(dt_value, 'isoformat'):
        # If it's a datetime object, convert to ISO format
        return dt_value.isoformat()
    return str(dt_value)  # Fallback to string conversion

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string')

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_db_connection():
    server = "HOTPOINT11-20\\SQLEXPRESS"
    database = "hotpoint_db"
    
    drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
    if not drivers:
        raise Exception("No SQL Server ODBC drivers found. Please install ODBC Driver 17/18 for SQL Server")
    
    try:
        conn = pyodbc.connect(
            f'DRIVER={{{drivers[0]}}};'
            f'SERVER={server};'
            f'DATABASE={database};'
            f'Trusted_Connection=yes;'
        )

        # configure cursor to return datetime objects
        conn.autocommit = False

        return conn
    except pyodbc.Error as e:
        raise Exception(f"Connection failed: {str(e)}")

# Utility functions
def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    return True, "Password is valid"

def create_jwt_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def verify_jwt_token(token):
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def jwt_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        user_id = verify_jwt_token(token)
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        request.current_user_id = user_id
        return f(*args, **kwargs)
    return decorated_function

@app.before_request
def log_request_info():
    logging.info(f"Request: {request.method} {request.path}")

@app.route('/')
def home():
    return jsonify({
        "message": "Hotpoint Financial Tracking System API",
        "endpoints": {
            "test_db": "/api/test (GET)",
            "signup": "/api/auth/signup (POST)",
            "login": "/api/auth/login (POST)",
            "logout": "/api/auth/logout (POST)",
            "verify": "/api/auth/verify (GET)"
        }
    })

@app.route('/api/test')
def test_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        version = cursor.fetchone()[0]
        return jsonify({
            "status": "success",
            "sql_server_version": version,
            "message": "Database connection successful"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/auth/signup', methods=['POST'])
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

@app.route('/api/auth/login', methods=['POST'])
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

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required
def logout():
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/auth/verify', methods=['GET'])
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
            'lastLogin': safe_datetime_format(last_login) # Ensure last_login is formatted correctly
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

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not found',
        'message': 'The requested resource was not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)