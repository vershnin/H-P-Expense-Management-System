# import pyodbc
# import bcrypt
# import logging

# def get_db_connection():
#     server = "HOTPOINT11-20\\SQLEXPRESS"  # replace with your actual server name
#     database = "hotpoint_db"
    
#     drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
#     if not drivers:
#         raise Exception("No SQL Server ODBC drivers found. Please install ODBC Driver 17/18 for SQL Server")
    
#     conn = pyodbc.connect(
#         f'DRIVER={{{drivers[0]}}};'
#         f'SERVER={server};'
#         f'DATABASE={database};'
#         f'Trusted_Connection=yes;'
#     )
#     return conn

# def hash_and_update_passwords():
#     conn = get_db_connection()
#     cursor = conn.cursor()
#     try:
#         cursor.execute("SELECT id, password FROM users")
#         users = cursor.fetchall()
#         for user_id, plain_password in users:
#             # Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
#             if not (plain_password.startswith("$2b$") or plain_password.startswith("$2a$")):
#                 hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt())
#                 hashed_str = hashed.decode('utf-8')
#                 cursor.execute("UPDATE users SET password = ? WHERE id = ?", (hashed_str, user_id))
#                 logging.info(f"Updated password hash for user id {user_id}")
#         conn.commit()
#         print("Password hashing and update completed successfully.")
#     except Exception as e:
#         logging.error(f"Error updating passwords: {str(e)}")
#     finally:
#         cursor.close()
#         conn.close()

# if __name__ == "__main__":
#     hash_and_update_passwords()
