from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from config import get_settings
from auth import auth_required
from db.deps import get_db
from routers.marketing_mix import router as marketing_mix_router
from routers.mmm import router as mmm_router
from services.user_service import UserService

# Set up logging
logger = logging.getLogger(__name__)

_settings = get_settings()
app: FastAPI = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_origins=[
        "http://localhost:3000",  # Next.js default port
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://localhost:3001",  # Alternative port
        "http://127.0.0.1:3001",  # Alternative port
        "https://green-omega-task-web.vercel.app",  # Production Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(marketing_mix_router)
app.include_router(mmm_router)

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
    try:
        clerk_id = claims.get("sub")
        email = claims.get("email")

        if not email:
            raise HTTPException(status_code=400, detail="Email is required in token claims")

        logger.info(f"Processing /me request for clerk_id: {clerk_id}, email: {email}")

        user = await UserService.get_user_by_clerk_id(db, clerk_id)
        if not user:
            logger.info(f"User not found, creating new user for clerk_id: {clerk_id}")
            user = await UserService.create_user(db, clerk_id, email)
        else:
            logger.info(f"User found: {user.id}")

        return {
            "user_id": str(user.id),
            "clerk_id": user.clerk_id,
            "email": user.email,
            "created_at": user.created_at.isoformat(),
        }
    except Exception as e:
        logger.error(f"Error in /me endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
