"""
auth_db.py — DuckDB-backed authentication for Coding Platform
Tables:
  users(id, email, password_hash, role, name, created_at)
Roles: 'admin', 'candidate'
"""

import os
import duckdb
import bcrypt

DUCK_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "auth.duckdb")

# ── Seed credentials ──────────────────────────────────────────────
SEED_USERS = [
    {
        "email": "admin@email.com",
        "password": "admin123",
        "role": "admin",
        "name": "Admin",
    },
    {
        "email": "user@email.com",
        "password": "user123",
        "role": "candidate",
        "name": "Demo User",
    },
]


def _get_conn():
    return duckdb.connect(DUCK_DB_PATH)


def init_auth_db():
    """Create the users table and seed default accounts."""
    con = _get_conn()
    con.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          VARCHAR PRIMARY KEY,
            email       VARCHAR NOT NULL UNIQUE,
            password_hash VARCHAR NOT NULL,
            role        VARCHAR NOT NULL,
            name        VARCHAR NOT NULL,
            created_at  TIMESTAMP DEFAULT current_timestamp
        )
    """)

    # Seed default users if they don't exist yet
    for u in SEED_USERS:
        existing = con.execute(
            "SELECT id FROM users WHERE email = ?", [u["email"]]
        ).fetchone()
        if not existing:
            hashed = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
            uid = u["role"] + "_" + u["email"].split("@")[0]
            con.execute(
                "INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)",
                [uid, u["email"], hashed, u["role"], u["name"]],
            )
            print(f"[auth_db] Seeded user: {u['email']} ({u['role']})")

    con.close()


# ── CRUD helpers ──────────────────────────────────────────────────

def get_user_by_email(email: str):
    """Return user row dict or None."""
    con = _get_conn()
    row = con.execute(
        "SELECT id, email, password_hash, role, name FROM users WHERE email = ?",
        [email.strip().lower()],
    ).fetchone()
    con.close()
    if row is None:
        return None
    return {"id": row[0], "email": row[1], "password_hash": row[2], "role": row[3], "name": row[4]}


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def authenticate_user(email: str, password: str):
    """
    Returns user dict if credentials are valid, else None.
    """
    user = get_user_by_email(email)
    if user is None:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


def create_user(email: str, password: str, role: str, name: str) -> dict:
    """Create a new user. Raises ValueError on duplicate email."""
    email = email.strip().lower()
    if get_user_by_email(email):
        raise ValueError(f"User with email '{email}' already exists.")
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    uid = role + "_" + email.split("@")[0] + "_" + os.urandom(4).hex()
    con = _get_conn()
    con.execute(
        "INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)",
        [uid, email, hashed, role, name],
    )
    con.close()
    return {"id": uid, "email": email, "role": role, "name": name}


def update_user_password(email: str, new_password: str):
    """Update a user's password."""
    email = email.strip().lower()
    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    con = _get_conn()
    con.execute(
        "UPDATE users SET password_hash = ? WHERE email = ?", [hashed, email]
    )
    con.close()


def list_users(role: str = None):
    """List all users, optionally filtered by role."""
    con = _get_conn()
    if role:
        rows = con.execute(
            "SELECT id, email, role, name, created_at FROM users WHERE role = ?", [role]
        ).fetchall()
    else:
        rows = con.execute(
            "SELECT id, email, role, name, created_at FROM users"
        ).fetchall()
    con.close()
    return [
        {"id": r[0], "email": r[1], "role": r[2], "name": r[3], "created_at": str(r[4])}
        for r in rows
    ]


def delete_user(email: str):
    """Delete a user by email."""
    con = _get_conn()
    con.execute("DELETE FROM users WHERE email = ?", [email.strip().lower()])
    con.close()
