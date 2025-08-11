import logging
from datetime import datetime, timezone
from flask import jsonify
from utils.response_handler import APIResponse

def enhance_login_error_handling():
    """Enhanced error handling utilities for login route"""
    
    def log_login_attempt(email, role, request_id):
        """Log login attempts with request ID for tracking"""
        logging.info(f"[{request_id}] Login attempt: email={email}, role={role}")
    
    def handle_login_error(error, request_id):
        """Handle login errors with detailed information"""
        logging.error(f"[{request_id}] Login error: {str(error)}")
        
        if "Invalid email or password" in str(error):
            return APIResponse.unauthorized("Invalid email or password")
        elif "Account locked" in str(error):
            return APIResponse.error(
                message="Account temporarily locked",
                details="Too many failed attempts. Try again in 30 minutes.",
                code=429
            )
        elif "Account disabled" in str(error):
            return APIResponse.forbidden("Account has been disabled")
        else:
            return APIResponse.error(
                message="An unexpected error occurred",
                details="Please try again later",
                code=500
            )
    
    return {
        'log_login_attempt': log_login_attempt,
        'handle_login_error': handle_login_error
    }

# Enhanced login route with better error handling
def enhanced_login_route():
    """Enhanced login route with detailed error handling"""
    return {
        'error_codes': {
            'INVALID_CREDENTIALS': 'Invalid email or password',
            'ACCOUNT_LOCKED': 'Account temporarily locked due to failed attempts',
            'ACCOUNT_DISABLED': 'Account has been disabled',
            'ROLE_MISMATCH': 'Selected role does not match your account',
            'NOT_VERIFIED': 'Account not verified'
        },
        'max_failed_attempts': 5,
        'lockout_duration_minutes': 30
    }
