# SQL Multi-Dialect Setup Guide

This guide explains how to set up MySQL and PostgreSQL databases for the coding platform.

## Prerequisites

You need to have MySQL and/or PostgreSQL installed on your system.

## Option 1: Using SQLite Only (Default - No Setup Required)

If you don't want to install MySQL/PostgreSQL, the platform will use SQLite by default.
- No additional setup needed
- Select "Standard SQL" dialect in the editor
- Works out of the box

## Option 2: Installing MySQL

### Windows Installation:
1. Download MySQL Installer from: https://dev.mysql.com/downloads/installer/
2. Run installer and choose "Developer Default" or "Server only"
3. Set root password during installation
4. Remember your password!

### macOS Installation:
```bash
brew install mysql
mysql.server start
mysql_secure_installation
```

### Linux Installation:
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo mysql_secure_installation
```

### Configure MySQL:
```sql
-- Login as root
mysql -u root -p

-- Create user for coding platform (optional but recommended)
CREATE USER 'coding_user'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON *.* TO 'coding_user'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

## Option 3: Installing PostgreSQL

### Windows Installation:
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run installer (includes pgAdmin)
3. Set postgres password during installation
4. Remember your password!

### macOS Installation:
```bash
brew install postgresql
brew services start postgresql
```

### Linux Installation:
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Configure PostgreSQL:
```bash
# Login as postgres user
sudo -i -u postgres
psql

-- Create database
CREATE DATABASE coding_platform;

-- Create user (optional)
CREATE USER coding_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE coding_platform TO coding_user;
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cd backend
copy .env.example .env    # Windows
cp .env.example .env      # Mac/Linux
```

2. Edit `.env` file with your actual database credentials:
```
MYSQL_PASSWORD=your_actual_mysql_password
POSTGRES_PASSWORD=your_actual_postgres_password
```

## Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `pymysql` - MySQL connector
- `psycopg2-binary` - PostgreSQL connector

## Testing

1. Start the backend server:
```bash
cd backend
uvicorn main:app --reload
```

2. Navigate to a SQL problem in the frontend
3. Select different dialects from the dropdown:
   - **Standard SQL** → Uses SQLite (in-memory)
   - **MySQL** → Uses MySQL database
   - **PostgreSQL** → Uses PostgreSQL database

## How It Works

When a user selects a dialect:
1. Frontend sends the selected dialect to backend
2. Backend creates a temporary database/schema for that problem
3. Executes the problem's schema and seed data
4. Runs the user's query against the actual database engine
5. Returns results with dialect-specific behavior
6. Cleans up the temporary database/schema

Each dialect uses its own database engine:
- **SQLite**: In-memory database (fastest, no setup)
- **MySQL**: Real MySQL server (supports MySQL syntax)
- **PostgreSQL**: Real PostgreSQL server (supports PostgreSQL syntax)

## Troubleshooting

### MySQL Connection Error:
- Verify MySQL is running: `mysql.server status` or check Windows Services
- Check username/password in `.env`
- Ensure port 3306 is not blocked

### PostgreSQL Connection Error:
- Verify PostgreSQL is running: `brew services list` or check Windows Services
- Check username/password in `.env`
- Ensure port 5432 is not blocked
- Verify database exists: `psql -U postgres -l`

### Module Import Error:
```bash
pip install pymysql psycopg2-binary
```

## Security Notes

- The platform blocks dangerous SQL keywords (DROP, DELETE, INSERT, etc.)
- Only SELECT queries are allowed
- Each test runs in an isolated temporary database/schema
- Databases are automatically cleaned up after each execution
