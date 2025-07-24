import pyodbc
import bcrypt
import logging

def get_db_connection():
    server = "HOTPOINT11-20\\SQLEXPRESS"  # replace with your actual server name
    database = "hotpoint_db"
    
    drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
    if not drivers:
        raise Exception("No SQL Server ODBC drivers found. Please install ODBC Driver 17/18 for SQL Server")
    
    conn = pyodbc.connect(
        f'DRIVER={{{drivers[0]}}};'
        f'SERVER={server};'
        f'DATABASE={database};'
        f'Trusted_Connection=yes;'
    )
    return conn

def add_sample_users():
    users = [
        {"username": "adminuser", "email": "admin@example.com", "password": "AdminPass123", "role": "admin"},
        {"username": "financemgr", "email": "finance@example.com", "password": "FinancePass123", "role": "finance"},
        {"username": "branchofficer", "email": "branch@example.com", "password": "BranchPass123", "role": "branch"},
        {"username": "auditoruser", "email": "auditor@example.com", "password": "AuditorPass123", "role": "auditor"},
    ]

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        for user in users:
            # Hash the password
            hashed = bcrypt.hashpw(user["password"].encode('utf-8'), bcrypt.gensalt())
            hashed_str = hashed.decode('utf-8')

            # Check if user already exists by email
            cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", (user["email"],))
            exists = cursor.fetchone()[0]
            if exists:
                logging.info(f"User with email {user['email']} already exists. Skipping.")
                continue

            # Insert user
            cursor.execute(
                "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
                (user["username"], user["email"], hashed_str, user["role"])
            )
            logging.info(f"Added user {user['username']} with role {user['role']}")
        conn.commit()
        print("Sample users added successfully.")
    except Exception as e:
        logging.error(f"Error adding sample users: {str(e)}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    add_sample_users()
