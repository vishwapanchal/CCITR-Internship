from app.models.session import SessionLocal, engine
from app.models.database import Base, User
from app.models.enums import Role
from app.utils.security import get_password_hash

def init_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        print("Creating default admin user...")
        import os
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin@123")
        admin_user = User(
            username="admin",
            role=Role.ADMINISTRATOR,
            hashed_password=get_password_hash(admin_password)
        )
        db.add(admin_user)
        db.commit()
        print(f"Admin user created successfully. Username: admin, Password: {admin_password}")
    else:
        print("Admin user already exists.")
    
    db.close()

if __name__ == "__main__":
    init_db()
