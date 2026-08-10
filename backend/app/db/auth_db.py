import os
import bcrypt
from sqlalchemy.orm import Session
from app.models.domain import AuthUser

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

def init_auth_db(db: Session):
    """Seed default accounts."""
    for u in SEED_USERS:
        existing = db.query(AuthUser).filter(AuthUser.email == u["email"]).first()
        if not existing:
            hashed = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
            uid = u["role"] + "_" + u["email"].split("@")[0]
            new_user = AuthUser(
                id=uid,
                email=u["email"],
                password_hash=hashed,
                role=u["role"],
                name=u["name"]
            )
            db.add(new_user)
            print(f"[auth_db] Seeded user: {u['email']} ({u['role']})")
    db.commit()


# ── CRUD helpers ──────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str):
    """Return user dict or None."""
    email_clean = email.strip().lower()
    user = db.query(AuthUser).filter(AuthUser.email == email_clean).first()
    if not user:
        return None
    return {"id": user.id, "email": user.email, "password_hash": user.password_hash, "role": user.role, "name": user.name}


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def authenticate_user(db: Session, email: str, password: str):
    """Returns user dict if credentials are valid, else None."""
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


def create_user(db: Session, email: str, password: str, role: str, name: str) -> dict:
    """Create a new user. Raises ValueError on duplicate email."""
    email_clean = email.strip().lower()
    if get_user_by_email(db, email_clean):
        raise ValueError(f"User with email '{email_clean}' already exists.")
    
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    uid = role + "_" + email_clean.split("@")[0] + "_" + os.urandom(4).hex()
    
    new_user = AuthUser(
        id=uid,
        email=email_clean,
        password_hash=hashed,
        role=role,
        name=name
    )
    db.add(new_user)
    db.commit()
    return {"id": uid, "email": email_clean, "role": role, "name": name}


def update_user_password(db: Session, email: str, new_password: str):
    """Update a user's password."""
    email_clean = email.strip().lower()
    user = db.query(AuthUser).filter(AuthUser.email == email_clean).first()
    if user:
        hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        user.password_hash = hashed
        db.commit()


def list_users(db: Session, role: str = None):
    """List all users, optionally filtered by role."""
    query = db.query(AuthUser)
    if role:
        query = query.filter(AuthUser.role == role)
    
    users = query.all()
    return [
        {"id": u.id, "email": u.email, "role": u.role, "name": u.name, "created_at": u.created_at or ""}
        for u in users
    ]


def delete_user(db: Session, email: str):
    """Delete a user by email."""
    email_clean = email.strip().lower()
    user = db.query(AuthUser).filter(AuthUser.email == email_clean).first()
    if user:
        db.delete(user)
        db.commit()
