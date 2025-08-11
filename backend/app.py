from flask import Flask,request, g
from flask_cors import CORS
import os
import atexit
from dotenv import load_dotenv
import logging
from logging.handlers import RotatingFileHandler
import time
from datetime import datetime, timezone

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # CORS configuration
    CORS(app, 
         origins=[ 'http://localhost:5173'],  # Frontend URL
         allow_headers=['Content-Type', 'Authorization'],
         expose_headers=['X-Total-Count', 'X-Total-Pages'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Configuration
    app.config.update({
        'SECRET_KEY': os.environ.get('SECRET_KEY', 'your-secret-key-here'),
        'JWT_SECRET_KEY': os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string'),
        'UPLOAD_FOLDER': os.environ.get('UPLOAD_FOLDER', 'uploads'),
        'MAX_CONTENT_LENGTH': 16 * 1024 * 1024,  # 16MB max file size
        'DATABASE_POOL_SIZE': int(os.environ.get('DATABASE_POOL_SIZE', '10')),
        'DATABASE_POOL_MAX': int(os.environ.get('DATABASE_POOL_MAX', '20')),
        'JSONIFY_PRETTYPRINT_REGULAR': True,
        'JSON_SORT_KEYS': False
    })
    
    # Setup enhanced logging
    setup_logging(app)
    
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize database connection pool
    from config.database import initialize_db_pool
    initialize_db_pool()
    app.logger.info("Database connection pool initialized")
    
    # Register cleanup function
    @atexit.register
    def cleanup():
        from config.database import close_db_pool
        close_db_pool()
        app.logger.info("Application cleanup completed")
    
    # Request/Response middleware
    @app.before_request
    def before_request():
        g.start_time = time.time()
        app.logger.info(f"Request: {request.method} {request.path}")
    
    @app.after_request
    def after_request(response):
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # CORS headers for pagination
        if hasattr(g, 'total_count'):
            response.headers['X-Total-Count'] = str(g.total_count)
        if hasattr(g, 'total_pages'):
            response.headers['X-Total-Pages'] = str(g.total_pages)
        
        # Log response time
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            app.logger.info(f"Response: {response.status_code} - {duration:.3f}s")
        
        return response
    
    # Import and register blueprints
    from routes.auth_routes import auth_bp
    from routes.float_routes import float_bp
    from routes.expense_routes import expense_bp
    from routes.report_routes import report_bp
    from routes.policy_routes import policy_bp
    from routes.file_routes import file_bp
    from routes.location_routes import location_bp
    from routes.main_routes import main_bp
    
    # Register blueprints with consistent URL prefixes
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(float_bp, url_prefix='/api/floats')
    app.register_blueprint(expense_bp, url_prefix='/api/expenses')
    app.register_blueprint(report_bp, url_prefix='/api/reports')
    app.register_blueprint(policy_bp, url_prefix='/api/policies')
    app.register_blueprint(file_bp, url_prefix='/api/files')
    app.register_blueprint(location_bp, url_prefix='/api/locations')
    
    # Enhanced error handlers
    register_enhanced_error_handlers(app)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        from utils.response_handler import APIResponse, ResponseCode
        
        try:
            # Test database connection using context manager
            from config.database import get_db_context
            with get_db_context() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            # Get pool stats
            from config.database import _db_pool
            pool_stats = _db_pool.get_pool_stats() if _db_pool else {}
            
            return APIResponse.success(
                data={
                    'status': 'healthy',
                    'timestamp': datetime.now(timezone.utc).isoformat() + "Z",
                    'database': 'connected',
                    'pool_stats': pool_stats
                },
                message="Service is healthy"
            )
        except Exception as e:
            return APIResponse.error(
                message="Service is unhealthy",
                details=str(e),
                code=ResponseCode.SERVICE_UNAVAILABLE
            )
    
    # API documentation endpoint
    @app.route('/api/docs')
    def api_docs():
        from utils.response_handler import APIResponse
        
        docs = {
            "api_version": "2.0",
            "title": "Hotpoint Expense Management System API",
            "description": "Enhanced API with RBAC, connection pooling, and standardized responses",
            "endpoints": {
                "authentication": {
                    "signup": {"method": "POST", "url": "/api/auth/signup", "auth": False},
                    "login": {"method": "POST", "url": "/api/auth/login", "auth": False},
                    "logout": {"method": "POST", "url": "/api/auth/logout", "auth": True},
                    "verify": {"method": "GET", "url": "/api/auth/verify", "auth": True}
                },
                "expenses": {
                    "list": {"method": "GET", "url": "/api/expenses", "auth": True, "permissions": ["view_expenses"]},
                    "create": {"method": "POST", "url": "/api/expenses", "auth": True, "permissions": ["create_expenses"]},
                    "details": {"method": "GET", "url": "/api/expenses/<id>", "auth": True, "permissions": ["view_expenses"]},
                    "approve": {"method": "POST", "url": "/api/expenses/<id>/approve", "auth": True, "permissions": ["approve_expenses"]},
                    "reject": {"method": "POST", "url": "/api/expenses/<id>/reject", "auth": True, "permissions": ["reject_expenses"]}
                },
                "floats": {
                    "list": {"method": "GET", "url": "/api/floats", "auth": True, "permissions": ["view_floats"]},
                    "create": {"method": "POST", "url": "/api/floats", "auth": True, "permissions": ["create_floats"]},
                    "update": {"method": "PUT", "url": "/api/floats/<id>", "auth": True, "permissions": ["update_floats"]},
                    "delete": {"method": "DELETE", "url": "/api/floats/<id>", "auth": True, "permissions": ["delete_floats"]}
                },
                "reports": {
                    "dashboard": {"method": "GET", "url": "/api/reports/dashboard", "auth": True, "permissions": ["view_reports"]},
                    "expenses": {"method": "GET", "url": "/api/reports/expenses", "auth": True, "permissions": ["view_reports"]},
                    "floats": {"method": "GET", "url": "/api/reports/floats", "auth": True, "permissions": ["view_reports"]}
                }
            },
            "response_format": {
                "success": {
                    "status": "success",
                    "message": "Operation successful",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "code": 200,
                    "data": "Response data here",
                    "meta": "Optional metadata (pagination, etc.)"
                },
                "error": {
                    "status": "error",
                    "message": "Error description",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "code": 400,
                    "details": "Optional error details",
                    "error_code": "Optional error code"
                }
            },
            "authentication": {
                "type": "JWT Bearer Token",
                "header": "Authorization: Bearer <token>",
                "token_expiry": "24 hours"
            }
        }
        
        return APIResponse.success(data=docs, message="API documentation")
    
    return app

def setup_logging(app):
    """Setup enhanced logging configuration"""
    if not app.debug and not app.testing:
        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        # Setup file handler with rotation
        file_handler = RotatingFileHandler('logs/hotpoint_api.log', 
                                         maxBytes=10240000, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        # Setup console handler for development
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        console_handler.setLevel(logging.INFO)
        app.logger.addHandler(console_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('Hotpoint API startup')

def register_enhanced_error_handlers(app):
    """Register enhanced error handlers"""
    from utils.response_handler import APIResponse, ResponseCode
    import time
    
    @app.errorhandler(400)
    def bad_request(error):
        return APIResponse.error(
            message="Bad request",
            details="The request could not be understood by the server",
            code=ResponseCode.BAD_REQUEST
        )
    
    @app.errorhandler(401)
    def unauthorized(error):
        return APIResponse.unauthorized("Authentication required")
    
    @app.errorhandler(403)
    def forbidden(error):
        return APIResponse.forbidden("Access denied")
    
    @app.errorhandler(404)
    def not_found(error):
        return APIResponse.not_found("Resource")
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return APIResponse.error(
            message="Method not allowed",
            details="The method is not allowed for the requested URL",
            code=ResponseCode.BAD_REQUEST
        )
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return APIResponse.error(
            message="File too large",
            details="The uploaded file exceeds the maximum allowed size (16MB)",
            code=ResponseCode.BAD_REQUEST
        )
    
    @app.errorhandler(429)
    def too_many_requests(error):
        return APIResponse.error(
            message="Too many requests",
            details="Rate limit exceeded. Please try again later",
            code=ResponseCode.TOO_MANY_REQUESTS
        )
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Internal server error: {str(error)}")
        return APIResponse.error(
            message="Internal server error",
            details="An unexpected error occurred" if not app.debug else str(error),
            code=ResponseCode.INTERNAL_SERVER_ERROR
        )
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception(f"Unexpected error: {str(error)}")
        return APIResponse.error(
            message="Unexpected error occurred",
            details=str(error) if app.debug else "Please contact support",
            code=ResponseCode.INTERNAL_SERVER_ERROR
        )

if __name__ == '__main__':
    import time
    from datetime import datetime
    
    app = create_app()
    
    # Display startup information
    print("="*60)
    print("🚀 HOTPOINT EXPENSE MANAGEMENT SYSTEM API")
    print("="*60)
    print(f"📅 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 Environment: {'Development' if app.debug else 'Production'}")
    print(f"📂 Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"🔧 Max file size: {app.config['MAX_CONTENT_LENGTH'] / (1024*1024):.0f}MB")
    print("="*60)
    print("📋 Available endpoints:")
    print("   • Health check: http://localhost:5000/health")
    print("   • API docs: http://localhost:5000/api/docs")
    print("   • Main API: http://localhost:5000/api/")
    print("="*60)
    
    app.run(
        debug=True,
        port=5000,
        host='0.0.0.0',  # Allow external connections
        threaded=True    # Enable threading for better concurrency
    )