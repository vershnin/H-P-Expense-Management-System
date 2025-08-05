import jwt
from datetime import datetime, timedelta, timezone
from flask import request, jsonify, current_app
from functools import wraps
from config.database import get_db_connection
import logging

def create_jwt_token(user_id):
    """Create JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def verify_jwt_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def jwt_required(f):
    """JWT required decorator"""
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

def admin_required(f):
    """Admin required decorator"""
    @wraps(f)
    @jwt_required
    def decorated_function(*args, **kwargs):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT role FROM users WHERE id = ?", (request.current_user_id,))
            user = cursor.fetchone()
            
            if not user or user[0] not in ['admin']:
                return jsonify({'error': 'Admin access required'}), 403
            
            return f(*args, **kwargs)
        except Exception as e:
            logging.error(f"Authorization check failed: {str(e)}")
            return jsonify({'error': 'Authorization check failed'}), 500
        finally:
            if 'conn' in locals():
                conn.close()
    return decorated_function

def finance_or_admin_required(f):
    """Finance or admin required decorator"""
    @wraps(f)
    @jwt_required
    def decorated_function(*args, **kwargs):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT role FROM users WHERE id = ?", (request.current_user_id,))
            user = cursor.fetchone()
            
            if not user or user[0] not in ['admin', 'finance']:
                return jsonify({'error': 'Finance or Admin access required'}), 403
            
            return f(*args, **kwargs)
        except Exception as e:
            logging.error(f"Authorization check failed: {str(e)}")
            return jsonify({'error': 'Authorization check failed'}), 500
        finally:
            if 'conn' in locals():
                conn.close()
    return decorated_function