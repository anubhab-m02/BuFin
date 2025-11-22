import sys
import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import models

# Setup DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./bufin.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_db():
    print("Checking Database...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    if "users" in tables:
        print("✅ 'users' table exists.")
    else:
        print("❌ 'users' table MISSING.")

def check_hashing():
    print("\nChecking Bcrypt Hashing...")
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hash = pwd_context.hash("testpassword")
        print(f"✅ Hashing successful: {hash[:10]}...")
    except Exception as e:
        print(f"❌ Hashing FAILED: {e}")

def check_users():
    print("\nChecking Existing Users...")
    session = SessionLocal()
    users = session.query(models.User).all()
    print(f"Total Users: {len(users)}")
    for user in users:
        print(f" - ID: {user.id}, Email: {user.email}, Name: {user.full_name}")
    session.close()

if __name__ == "__main__":
    check_db()
    check_hashing()
    check_users()
