import pyodbc
import logging

def get_db_connection():
    """Get database connection"""
    server = "HOTPOINT11-20\\SQLEXPRESS"
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

        # configure cursor to return datetime objects
        conn.autocommit = False
        return conn
    except pyodbc.Error as e:
        logging.error(f"Database connection failed: {str(e)}")
        raise Exception(f"Connection failed: {str(e)}")