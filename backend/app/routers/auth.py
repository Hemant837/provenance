"""Authentication endpoints: Google OAuth + JWT."""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.auth import create_access_token, oauth
from app.config import get_settings
from app.db import get_db
from app.deps import DEV_USER, get_current_user
from app.models import User
from app.schemas import UserOut

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
async def google_login(request: Request):
    """Redirect to Google's consent screen."""
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Exchange the code, upsert the user, and hand a JWT back to the frontend."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"OAuth failed: {exc}") from exc

    userinfo = token.get("userinfo")
    if not userinfo:
        userinfo = await oauth.google.userinfo(token=token)

    user = await crud.get_or_create_user(
        db,
        google_id=userinfo["sub"],
        email=userinfo["email"],
        name=userinfo.get("name"),
        avatar_url=userinfo.get("picture"),
    )
    jwt_token = create_access_token(user)
    # Frontend reads the token from the query, stores it, and drops the param.
    return RedirectResponse(f"{settings.frontend_origin}/auth/callback?token={jwt_token}")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.post("/dev-token")
async def dev_token(db: AsyncSession = Depends(get_db)):
    """Issue a JWT for the dev user. Available only in development."""
    if settings.environment != "development":
        raise HTTPException(status_code=404, detail="Not found")
    user = await crud.get_or_create_user(db, **DEV_USER)
    return {"access_token": create_access_token(user), "token_type": "bearer"}
