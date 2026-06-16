"""Shared FastAPI dependencies — JWT-based current user."""

import uuid

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import decode_access_token
from app.db import get_db
from app.models import User

# Used by the dev-only /auth/dev-token endpoint so the API stays testable
# without going through the Google consent screen.
DEV_USER = {
    "google_id": "dev-user",
    "email": "dev@provenance.local",
    "name": "Dev User",
}


def _extract_token(request: Request) -> str | None:
    """Bearer header for normal API calls, or ?token= for the SSE stream
    (native EventSource cannot send custom headers)."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return request.query_params.get("token")


async def get_current_user(
    request: Request, db: AsyncSession = Depends(get_db)
) -> User:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid token subject") from exc

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
