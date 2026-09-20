from fastapi import APIRouter, HTTPException, Depends
from app.services.auth import LoginRequest, TokenResponse, create_access_token, get_current_merchant, TokenPayload

router = APIRouter(prefix="/api/auth", tags=["JWT Authentication"])

@router.post("/login", response_model=TokenResponse)
def login_merchant(payload: LoginRequest):
    # Standard demo login check
    if payload.username in ["merchant_demo", "admin", "juspay_merchant"] and payload.password in ["smartroute123", "admin", "juspay"]:
        token = create_access_token(merchant_id=payload.username)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            merchant_id=payload.username,
            merchant_name="Apex Global Merchants Ltd"
        )
    raise HTTPException(status_code=401, detail="Invalid merchant credentials. Use username: merchant_demo / password: smartroute123")

@router.get("/me")
def get_auth_profile(current_merchant: TokenPayload = Depends(get_current_merchant)):
    return {
        "merchant_id": current_merchant.sub,
        "role": current_merchant.role,
        "authenticated": True
    }
