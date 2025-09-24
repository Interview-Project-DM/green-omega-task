from fastapi import Depends, FastAPI

from api.config import get_settings
from api.auth import auth_required

_settings = get_settings()
app: FastAPI = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/me")
async def me(claims: dict = Depends(auth_required)):
    return {
        "user_id": claims.get("sub"),
        "email": claims.get("email"),
    }
