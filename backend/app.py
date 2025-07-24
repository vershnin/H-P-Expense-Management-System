from flask import Flask, jsonify, request
import pyodbc
import os
from dotenv import load_dotenv
import bcrypt

load_dotenv()

app = Flask(__name__)

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

if __name__ == "__main__":
    app.run(debug=True)