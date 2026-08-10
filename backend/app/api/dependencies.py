from app.db.database import get_db

# We can export or re-define any common dependencies here.
# For now, we just expose get_db so routers can use `Depends(get_db)`
