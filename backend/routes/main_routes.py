from flask import Blueprint, jsonify, redirect, url_for
from config.database import get_db_connection

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    return jsonify({
        "message": "Hotpoint Financial Tracking System API",
        "endpoints": {
            "auth": {
                "test_db": "/api/test (GET)",
                "signup": "/api/auth/signup (POST)",
                "login": "/api/auth/login (POST)",
                "logout": "/api/auth/logout (POST)",
                "verify": "/api/auth/verify (GET)"
            },
            "floats": {
                "list": "/api/floats (GET)",
                "create": "/api/floats (POST)",
                "update": "/api/floats/<id> (PUT)",
                "delete": "/api/floats/<id> (DELETE)"
            },
            "expenses": {
                "list": "/api/expenses (GET)",
                "create": "/api/expenses (POST)",
                "update": "/api/expenses/<id> (PUT)",
                "approve": "/api/expenses/<id>/approve (POST)",
                "reject": "/api/expenses/<id>/reject (POST)"
            },
            "reports": {
                "dashboard": "/api/reports/dashboard (GET)",
                "expenses": "/api/reports/expenses (GET)",
                "floats": "/api/reports/floats (GET)"
            }
        }
    })

@main_bp.route('/api/')
def api_root():
    """Root API endpoint that redirects to API documentation"""
    return redirect(url_for('api_docs'), code=302)

@main_bp.route('/api/test')
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
