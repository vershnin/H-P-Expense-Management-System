from flask import Flask, jsonify, request
import pyodbc
import os
from dotenv import load_dotenv
import bcrypt
import logging
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_db_connection():
    server = "HOTPOINT11-20\\SQLEXPRESS"  # replace with your actual server name
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
        return conn
    except pyodbc.Error as e:
        raise Exception(f"Connection failed: {str(e)}")

@app.before_request
def log_request_info():
    logging.info(f"Request: {request.method} {request.path}")

@app.route('/')
def home():
    return jsonify({
        "message": "Expense Management System API",
        "endpoints": {
            "test_db": "/api/test (GET)",
            "login": "/api/login (POST)"
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

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, email, password, role FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        if user is None:
            return jsonify({"status": "error", "message": "Invalid email or password"}), 401

        user_id, username, user_email, hashed_password, role = user
        try:
            if bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8')):
                return jsonify({
                    "status": "success",
                    "message": "Login successful",
                    "user": {
                        "id": user_id,
                        "username": username,
                        "email": user_email,
                        "role": role
                    }
                })
            else:
                return jsonify({"status": "error", "message": "Invalid email or password"}), 401
        except ValueError as e:
            # Log the error and return a generic error message
            logging.error(f"bcrypt error: {str(e)} - hashed_password: {hashed_password}")
            return jsonify({"status": "error", "message": "Invalid password hash format"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
