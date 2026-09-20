import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

SECRET_KEY = "smartroute-pay-jwt-secret-key-2026-interview-grade"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

security = HTTPBearer(auto_error=False)

class TokenPayload(BaseModel):
    sub: str  # merchant_id or user_id
    role: str = "merchant_admin"
    exp: int

class LoginRequest(BaseModel):
    username: str = "merchant_demo"
    password: str = "smartroute123"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    merchant_id: str
    merchant_name: str

def create_access_token(merchant_id: str, role: str = "merchant_admin") -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": merchant_id,
        "role": role,
        "exp": int(expire.timestamp())
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[TokenPayload]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(**payload)
    except Exception:
        return None

def get_current_merchant(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> TokenPayload:
    if not credentials:
        # For demo simplicity, return default merchant context if no token passed
        return TokenPayload(sub="merch_amazon", role="merchant_admin", exp=int((datetime.utcnow() + timedelta(days=1)).timestamp()))

    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired JWT Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload
