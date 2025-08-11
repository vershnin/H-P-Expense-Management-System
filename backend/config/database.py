import pyodbc
import logging
import threading
from queue import Queue
from contextlib import contextmanager
import time
from datetime import datetime, timedelta

class ConnectionWrapper:
    """ Wrapper for pyodbc connection to add custom attributes """
    def __init__(self, connection):
        self._connection = connection
        self.last_used = datetime.now()
        self.created_at = datetime.now()
    
    def __getattr__(self, name):
        # Delegate all other attributes to the underlying connection
        return getattr(self._connection, name)
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Dont close the connection here, let the pool handle it
        if exc_type:
            try:
                self.rollback()
            except:
                pass

    def cursor(self):
        self.last_used = datetime.now()
        return self._connection.cursor()
    
    def commit(self):
        self.last_used = datetime.now()
        return self._connection.commit()
    
    def rollback(self):
        self.last_used = datetime.now()
        return self._connection.rollback()
    
    def close(self):
        return self._connection.close()
    
    @property
    def autocommit(self):
        return self._connection.autocommit
    
    @autocommit.setter
    def autocommit(self, value):
        self._connection.autocommit = value

class DatabasePool:
    def __init__(self, server, database, min_connections=5, max_connections=20, connection_timeout=30):
        self.server = server
        self.database = database
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.connection_timeout = connection_timeout
        
        self._pool = Queue(maxsize=max_connections)
        self._all_connections = []
        self._lock = threading.RLock()
        self._created_connections = 0
        
        # Connection string template
        self.drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
        if not self.drivers:
            raise Exception("No SQL Server ODBC drivers found. Please install ODBC Driver 17/18 for SQL Server")
        
        self.connection_string = (
            f'DRIVER={{{self.drivers[0]}}};'
            f'SERVER={server};'
            f'DATABASE={database};'
            f'Trusted_Connection=yes;'
            f'Connection Timeout={connection_timeout};'
        )
        
        # Initialize minimum connections
        self._initialize_pool()
    
    def _create_connection(self):
        """Create a new database connection"""
        try:
            # Create the raw pyodbc connection
            raw_conn = pyodbc.connect(self.connection_string)
            raw_conn.autocommit = False

            # Wrap the raw connection in our custom connection class
            conn = ConnectionWrapper(raw_conn)

            logging.info(f"Created new database connection at {datetime.now()}")
            return conn
        
        except pyodbc.Error as e:
            logging.error(f"Failed to create database connection: {str(e)}")
            raise Exception(f"Connection failed: {str(e)}")
    
    def _initialize_pool(self):
        """Initialize the connection pool with minimum connections"""
        with self._lock:
            for _ in range(self.min_connections):
                try:
                    conn = self._create_connection()
                    self._pool.put(conn)
                    self._all_connections.append(conn)
                    self._created_connections += 1
                except Exception as e:
                    logging.error(f"Failed to initialize connection pool: {str(e)}")
                    break
    
    def get_connection(self, timeout=5):
        """Get a connection from the pool"""
        try:
            # Try to get an existing connection
            conn = self._pool.get(timeout=timeout)
            
            # Test if connection is still valid
            if self._is_connection_valid(conn):
                conn.last_used = datetime.now()
                return conn
            else:
                # Connection is stale, create a new one
                with self._lock:
                    if conn in self._all_connections:
                        self._all_connections.remove(conn)
                    self._created_connections -= 1
                return self._get_or_create_connection()
                
        except:
            # Pool is empty, try to create a new connection
            return self._get_or_create_connection()
    
    def _get_or_create_connection(self):
        """Get existing or create new connection"""
        with self._lock:
            if self._created_connections < self.max_connections:
                try:
                    conn = self._create_connection()
                    self._all_connections.append(conn)
                    self._created_connections += 1
                    return conn
                except Exception as e:
                    logging.error(f"Failed to create new connection: {str(e)}")
                    raise
            else:
                raise Exception("Maximum connections reached")
    
    def _is_connection_valid(self, conn):
        """Check if a connection is still valid"""
        try:
            # Check if connection was used recently (within 60 minutes)
            if hasattr(conn, 'last_used'):
                if datetime.now() - conn.last_used > timedelta(minutes=60):
                    return False
            
            # Test with a simple query
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            return True
        except:
            return False
    
    def return_connection(self, conn):
        """Return a connection to the pool"""
        if conn and self._is_connection_valid(conn):
            try:
                # Rollback any uncommitted transactions
                conn.rollback()
                conn.last_used = datetime.now()
                self._pool.put_nowait(conn)
            except:
                # Pool is full or connection is invalid
                with self._lock:
                    if conn in self._all_connections:
                        self._all_connections.remove(conn)
                        self._created_connections -= 1
                try:
                    conn.close()
                except:
                    pass
    
    def close_all(self):
        """Close all connections in the pool"""
        with self._lock:
            # Close all connections in the pool
            while not self._pool.empty():
                try:
                    conn = self._pool.get_nowait()
                    conn.close()
                except:
                    pass
            
            # Close any remaining connections
            for conn in self._all_connections:
                try:
                    conn.close()
                except:
                    pass
            
            self._all_connections.clear()
            self._created_connections = 0
    
    def get_pool_stats(self):
        """Get connection pool statistics"""
        return {
            'active_connections': self._created_connections,
            'available_connections': self._pool.qsize(),
            'max_connections': self.max_connections,
            'pool_utilization': f"{(self._created_connections / self.max_connections) * 100:.1f}%"
        }

# Global pool instance
_db_pool = None

def initialize_db_pool():
    """Initialize the database connection pool"""
    global _db_pool
    if _db_pool is None:
        server = "HOTPOINT11-20\\SQLEXPRESS"
        database = "hotpoint_db"
        _db_pool = DatabasePool(server, database)
    return _db_pool

def get_db_connection():
    """Get a database connection from the pool"""
    global _db_pool
    if _db_pool is None:
        _db_pool = initialize_db_pool()
    return _db_pool.get_connection()

def return_db_connection(conn):
    """Return a database connection to the pool"""
    global _db_pool
    if _db_pool:
        _db_pool.return_connection(conn)

@contextmanager
def get_db_context():
    """Context manager for database connections"""
    conn = None
    try:
        conn = get_db_connection()
        yield conn
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except:
                pass
        raise e
    finally:
        if conn:
            return_db_connection(conn)

def close_db_pool():
    """Close the database connection pool"""
    global _db_pool
    if _db_pool:
        _db_pool.close_all()
        _db_pool = None