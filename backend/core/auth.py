# backend/core/auth.py
import os
from typing import Optional
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
import jwt
from core.config import settings

security = HTTPBearer(auto_error=False)

def get_supabase_client():
    url = settings.SUPABASE_URL or os.getenv("SUPABASE_URL")
    key = settings.SUPABASE_KEY or os.getenv("SUPABASE_KEY")
    if url and key:
        return create_client(url, key)
    return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> dict:
    """
    Validate the Supabase JWT token passed in Authorization: Bearer <token>.
    Returns the authenticated user dict with 'id' and 'email'.
    Raises 401 if token is missing, invalid, or expired.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Bearer token."
        )

    token = credentials.credentials.strip()
    sb = get_supabase_client()
    if not sb:
        raise HTTPException(
            status_code=500,
            detail="Authentication service unavailable. Supabase is not configured on the backend."
        )

    try:
        user_resp = sb.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token."
            )
        return {
            "id": user_resp.user.id,
            "email": user_resp.user.email,
            "role": getattr(user_resp.user, "role", "authenticated")
        }
    except HTTPException:
        raise
    except Exception as e:
        # Fallback local decode if JWT_SECRET_KEY is configured
        jwt_secret = settings.JWT_SECRET_KEY
        if jwt_secret and jwt_secret != "changethis":
            try:
                payload = jwt.decode(
                    token,
                    jwt_secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
                user_id = payload.get("sub") or payload.get("id")
                if user_id:
                    return {
                        "id": user_id,
                        "email": payload.get("email"),
                        "role": payload.get("role", "authenticated")
                    }
            except Exception:
                pass
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {str(e)}"
        )

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[dict]:
    """
    Optional authentication: returns the user dict if valid Bearer token is provided,
    or None if no token is provided. Raises 401 only if an invalid token was sent.
    """
    if not credentials or not credentials.credentials:
        return None
    return await get_current_user(credentials)
