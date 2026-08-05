"""
Database Setup Script for Multi-Dialect SQL Support
Run this script to test database connections
"""

import os
from dotenv import load_dotenv

load_dotenv()

def test_sqlite():
    """Test SQLite connection (should always work)"""
    import sqlite3
    try:
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"✓ SQLite: Connection successful! Result: {result[0]}")
        conn.close()
        return True
    except Exception as e:
        print(f"✗ SQLite: Connection failed - {e}")
        return False

def test_mysql():
    """Test MySQL connection"""
    try:
        import pymysql
        
        mysql_config = {
            'host': os.getenv('MYSQL_HOST', 'localhost'),
            'port': int(os.getenv('MYSQL_PORT', 3306)),
            'user': os.getenv('MYSQL_USER', 'root'),
            'password': os.getenv('MYSQL_PASSWORD', ''),
            'charset': 'utf8mb4'
        }
        
        print(f"\nAttempting MySQL connection to {mysql_config['host']}:{mysql_config['port']} as {mysql_config['user']}...")
        
        if not mysql_config['password']:
            print("⚠ MySQL password not set in .env file")
            print("  Please edit backend/.env and set MYSQL_PASSWORD")
            return False
        
        conn = pymysql.connect(**mysql_config)
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"✓ MySQL: Connection successful! Version: {version[0]}")
        conn.close()
        return True
    except pymysql.err.OperationalError as e:
        print(f"✗ MySQL: Connection failed - {e}")
        print("  Make sure MySQL is installed and running")
        print("  Check your credentials in backend/.env")
        return False
    except Exception as e:
        print(f"✗ MySQL: Error - {e}")
        return False

def test_postgresql():
    """Test PostgreSQL connection"""
    try:
        import psycopg2
        
        postgres_config = {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),
            'port': int(os.getenv('POSTGRES_PORT', 5432)),
            'user': os.getenv('POSTGRES_USER', 'postgres'),
            'password': os.getenv('POSTGRES_PASSWORD', ''),
            'database': os.getenv('POSTGRES_DB', 'coding_platform')
        }
        
        print(f"\nAttempting PostgreSQL connection to {postgres_config['host']}:{postgres_config['port']} as {postgres_config['user']}...")
        
        if not postgres_config['password']:
            print("⚠ PostgreSQL password not set in .env file")
            print("  Please edit backend/.env and set POSTGRES_PASSWORD")
            return False
        
        conn = psycopg2.connect(**postgres_config)
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"✓ PostgreSQL: Connection successful! Version: {version[0]}")
        conn.close()
        return True
    except psycopg2.OperationalError as e:
        print(f"✗ PostgreSQL: Connection failed - {e}")
        print("  Make sure PostgreSQL is installed and running")
        print("  Check your credentials in backend/.env")
        return False
    except Exception as e:
        print(f"✗ PostgreSQL: Error - {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Database Connection Test")
    print("=" * 60)
    
    print("\n1. Testing SQLite (Default)...")
    sqlite_ok = test_sqlite()
    
    print("\n2. Testing MySQL...")
    mysql_ok = test_mysql()
    
    print("\n3. Testing PostgreSQL...")
    postgres_ok = test_postgresql()
    
    print("\n" + "=" * 60)
    print("Summary:")
    print("=" * 60)
    print(f"SQLite:       {'✓ Working' if sqlite_ok else '✗ Failed'}")
    print(f"MySQL:        {'✓ Working' if mysql_ok else '✗ Not configured'}")
    print(f"PostgreSQL:   {'✓ Working' if postgres_ok else '✗ Not configured'}")
    print()
    
    if sqlite_ok:
        print("✓ You can use the platform right now with SQLite!")
        print("  Select 'Standard SQL' dialect in the editor")
    
    if not mysql_ok or not postgres_ok:
        print("\nℹ To enable MySQL/PostgreSQL:")
        print("  1. Install the database server(s)")
        print("  2. Edit backend/.env with correct credentials")
        print("  3. Run this script again to test")
