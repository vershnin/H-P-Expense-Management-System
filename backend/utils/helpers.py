from decimal import Decimal
import re
from datetime import datetime

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

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

def validate_email(email):
    """Validate email format for Hotpoint domain"""
    pattern = r"^[a-zA-Z0-9._%+-]+@Hotpoint\.co\.ke$"
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