from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string')
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    # Set up logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Import and register blueprints
    from routes.auth_routes import auth_bp
    from routes.float_routes import float_bp
    from routes.expense_routes import expense_bp
    from routes.report_routes import report_bp
    from routes.policy_routes import policy_bp
    from routes.file_routes import file_bp
    from routes.location_routes import location_bp
    from routes.main_routes import main_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(float_bp, url_prefix='/api/floats')
    app.register_blueprint(expense_bp, url_prefix='/api/expenses')
    app.register_blueprint(report_bp, url_prefix='/api/reports')
    app.register_blueprint(policy_bp, url_prefix='/api/policies')
    app.register_blueprint(file_bp, url_prefix='/api/files')
    app.register_blueprint(location_bp, url_prefix='/api/locations')
    
    # Error handlers
    from utils.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)