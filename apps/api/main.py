from fastapi import Depends, FastAPI
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import get_settings
from api.auth import auth_required
from api.db.deps import get_db
from api.services.user_service import UserService

_settings = get_settings()
app: FastAPI = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/me")
async def me(
    claims: dict = Depends(auth_required),
    db: AsyncSession = Depends(get_db),
):
    clerk_id = claims.get("sub")
    email = claims.get("email")

    user = await UserService.get_user_by_clerk_id(db, clerk_id)
    if not user:
        user = await UserService.create_user(db, clerk_id, email)

    return {
        "user_id": str(user.id),
        "clerk_id": user.clerk_id,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
    }
