# utils/response_handler.py
from flask import jsonify, current_app
from datetime import datetime
import logging
from enum import Enum

class ResponseStatus(Enum):
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

class ResponseCode(Enum):
    # Success codes
    OK = 200
    CREATED = 201
    ACCEPTED = 202
    NO_CONTENT = 204
    
    # Client error codes
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    TOO_MANY_REQUESTS = 429
    
    # Server error codes
    INTERNAL_SERVER_ERROR = 500
    BAD_GATEWAY = 502
    SERVICE_UNAVAILABLE = 503

class APIResponse:
    """Standardized API response handler"""
    
    @staticmethod
    def success(data=None, message="Operation successful", code=ResponseCode.OK, meta=None):
        """Create a successful response"""
        response_body = {
            "status": ResponseStatus.SUCCESS.value,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "code": code.value
        }
        
        if data is not None:
            response_body["data"] = data
            
        if meta is not None:
            response_body["meta"] = meta
            
        return jsonify(response_body), code.value
    
    @staticmethod
    def error(message="An error occurred", code=ResponseCode.INTERNAL_SERVER_ERROR, 
              details=None, error_code=None):
        """Create an error response"""
        response_body = {
            "status": ResponseStatus.ERROR.value,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "code": code.value
        }
        
        if details is not None:
            response_body["details"] = details
            
        if error_code is not None:
            response_body["error_code"] = error_code
            
        # Log error for debugging
        logging.error(f"API Error: {message} - Code: {code.value}")
        if details:
            logging.error(f"Error details: {details}")
            
        return jsonify(response_body), code.value
    
    @staticmethod
    def validation_error(message="Validation failed", errors=None):
        """Create a validation error response"""
        response_body = {
            "status": ResponseStatus.ERROR.value,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "code": ResponseCode.UNPROCESSABLE_ENTITY.value
        }
        
        if errors:
            response_body["validation_errors"] = errors
            
        return jsonify(response_body), ResponseCode.UNPROCESSABLE_ENTITY.value
    
    @staticmethod
    def not_found(resource="Resource", resource_id=None):
        """Create a not found response"""
        message = f"{resource} not found"
        if resource_id:
            message += f" with ID: {resource_id}"
            
        return APIResponse.error(
            message=message,
            code=ResponseCode.NOT_FOUND
        )
    
    @staticmethod
    def unauthorized(message="Authentication required"):
        """Create an unauthorized response"""
        return APIResponse.error(
            message=message,
            code=ResponseCode.UNAUTHORIZED,
            error_code="AUTH_REQUIRED"
        )
    
    @staticmethod
    def forbidden(message="Insufficient permissions"):
        """Create a forbidden response"""
        return APIResponse.error(
            message=message,
            code=ResponseCode.FORBIDDEN,
            error_code="INSUFFICIENT_PERMISSIONS"
        )
    
    @staticmethod
    def conflict(message="Resource conflict", details=None):
        """Create a conflict response"""
        return APIResponse.error(
            message=message,
            code=ResponseCode.CONFLICT,
            details=details,
            error_code="RESOURCE_CONFLICT"
        )
    
    @staticmethod
    def paginated_success(data, total, page, per_page, message="Data retrieved successfully"):
        """Create a paginated success response"""
        total_pages = (total + per_page - 1) // per_page
        
        meta = {
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_items": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
        
        return APIResponse.success(
            data=data,
            message=message,
            meta=meta
        )

# Decorators for common response patterns
def handle_exceptions(f):
    """Decorator to handle common exceptions and return standardized responses"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return APIResponse.validation_error(
                message="Invalid input data",
                errors=[str(e)]
            )
        except PermissionError as e:
            return APIResponse.forbidden(str(e))
        except FileNotFoundError as e:
            return APIResponse.not_found("File")
        except Exception as e:
            logging.exception(f"Unhandled exception in {f.__name__}")
            return APIResponse.error(
                message="An unexpected error occurred",
                details=str(e) if current_app.debug else None
            )
    
    return decorated_function

def validate_json_request(required_fields=None, optional_fields=None):
    """Decorator to validate JSON request data"""
    from functools import wraps
    from flask import request
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return APIResponse.validation_error(
                    message="Content-Type must be application/json"
                )
            
            data = request.get_json()
            if not data:
                return APIResponse.validation_error(
                    message="Request body must contain valid JSON"
                )
            
            errors = []
            
            # Check required fields
            if required_fields:
                missing_fields = [field for field in required_fields if field not in data or not data[field]]
                if missing_fields:
                    errors.append(f"Missing required fields: {', '.join(missing_fields)}")
            
            # Validate field types and constraints
            if optional_fields:
                for field, constraints in optional_fields.items():
                    if field in data and data[field] is not None:
                        value = data[field]
                        if 'type' in constraints and not isinstance(value, constraints['type']):
                            errors.append(f"Field '{field}' must be of type {constraints['type'].__name__}")
                        if 'min_length' in constraints and len(str(value)) < constraints['min_length']:
                            errors.append(f"Field '{field}' must be at least {constraints['min_length']} characters")
                        if 'max_length' in constraints and len(str(value)) > constraints['max_length']:
                            errors.append(f"Field '{field}' must not exceed {constraints['max_length']} characters")
                        if 'choices' in constraints and value not in constraints['choices']:
                            errors.append(f"Field '{field}' must be one of: {', '.join(constraints['choices'])}")
            
            if errors:
                return APIResponse.validation_error(
                    message="Request validation failed",
                    errors=errors
                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

# Response utilities
class ResponseUtils:
    @staticmethod
    def format_currency(amount, currency='KES'):
        """Format currency for API responses"""
        if amount is None:
            return None
        return {
            'amount': float(amount),
            'currency': currency,
            'formatted': f"{currency} {amount:,.2f}"
        }
    
    @staticmethod
    def format_datetime(dt):
        """Format datetime for API responses"""
        if dt is None:
            return None
        if hasattr(dt, 'isoformat'):
            return dt.isoformat() + "Z"
        return str(dt)
    
    @staticmethod
    def format_user(user_data):
        """Format user data for API responses"""
        if not user_data:
            return None
        
        return {
            'id': user_data.get('id'),
            'name': f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
            'email': user_data.get('email'),
            'role': user_data.get('role'),
            'department': user_data.get('department'),
            'branch': user_data.get('branch_location')
        }
    
    @staticmethod
    def sanitize_for_response(data, exclude_fields=None):
        """Remove sensitive fields from response data"""
        if exclude_fields is None:
            exclude_fields = ['password_hash', 'password', 'secret_key']
        
        if isinstance(data, dict):
            return {k: v for k, v in data.items() if k not in exclude_fields}
        elif isinstance(data, list):
            return [ResponseUtils.sanitize_for_response(item, exclude_fields) for item in data]
        
        return data