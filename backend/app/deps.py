"""Shared FastAPI dependencies.

Auth is a dev stub for now: every request maps to a single dev user so the
API can be built and tested. It is replaced with real Google OAuth / JWT in
build step 5.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.db import get_db
from app.models import User

DEV_USER = {
    "google_id": "dev-user",
    "email": "dev@provenance.local",
    "name": "Dev User",
}


async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    return await crud.get_or_create_user(db, **DEV_USER)
