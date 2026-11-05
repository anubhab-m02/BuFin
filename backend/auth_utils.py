import os
import warnings
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from jose import JWTError, jwt

load_dotenv()

# Configuration
MIN_SECRET_LENGTH = 32
_DEV_SECRET = "bufin-dev-only-secret-do-not-use-in-production"


def _load_secret_key() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if os.getenv("BUFIN_ENV", "development").lower() == "production":
        if not secret or len(secret) < MIN_SECRET_LENGTH:
            raise RuntimeError(
                f"JWT_SECRET_KEY must be set to at least {MIN_SECRET_LENGTH} characters when BUFIN_ENV=production"
            )
        return secret
    if not secret:
        warnings.warn("JWT_SECRET_KEY is not set; using an insecure development secret", stacklevel=2)
        return _DEV_SECRET
    return secret


SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
