from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import get_settings
from api.auth import auth_required
from api.db.deps import get_db
from api.routers.marketing_mix import router as marketing_mix_router
from api.services.user_service import UserService

_settings = get_settings()
app: FastAPI = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js default port
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://localhost:3001",  # Alternative port
        "http://127.0.0.1:3001",  # Alternative port
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(marketing_mix_router)

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

    if not email:
        raise HTTPException(status_code=400, detail="Email is required in token claims")

    user = await UserService.get_user_by_clerk_id(db, clerk_id)
    if not user:
        user = await UserService.create_user(db, clerk_id, email)

    return {
        "user_id": str(user.id),
        "clerk_id": user.clerk_id,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
    }
