import json
import logging
from datetime import datetime, timezone
from flask import request
from config.database import get_db_connection

def create_audit_log(user_id, action, table_name, record_id, old_values=None, new_values=None):
    """Create audit log entry"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            action,
            table_name,
            record_id,
            json.dumps(old_values) if old_values else None,
            json.dumps(new_values) if new_values else None,
            request.remote_addr,
            datetime.now(timezone.utc)
        ))
        conn.commit()
    except Exception as e:
        logging.error(f"Failed to create audit log: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()