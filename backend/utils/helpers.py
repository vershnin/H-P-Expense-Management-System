from decimal import Decimal
import re
from datetime import datetime

def safe_datetime_format(dt_value):
    """Safely convert datetime value to ISO format string"""
    if dt_value is None:
        return None
    if isinstance(dt_value, str):
        try:
            from dateutil import parser
            parsed_dt = parser.parse(dt_value)
            return parsed_dt.isoformat()
        except:
            return dt_value
    if hasattr(dt_value, 'isoformat'):
        return dt_value.isoformat()
    return str(dt_value)  # Fallback to string conversion

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

def validate_email(email):
    """Validate email format for hotpoint domain"""
    pattern = r"^[a-zA-Z0-9._%+-]+@hotpoint\.co\.ke$"
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    return True, "Password is valid"

def allowed_file(filename):
    """Check if file extension is allowed"""
    ALLOWED_EXTENSIONS = {'doc', 'pdf', 'png', 'jpg', 'jpeg', 'docx'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS