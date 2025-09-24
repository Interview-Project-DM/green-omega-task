import os
import time
from functools import lru_cache

import httpx
from dotenv import find_dotenv, load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwk, jwt
from jose.utils import base64url_decode

load_dotenv()  # Load apps/api/.env if present
load_dotenv(find_dotenv(".env.local"))  # Fallback to shared .env.local if available

ISSUER = os.environ.get("CLERK_ISSUER", "")
JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")

security = HTTPBearer(auto_error=True)


class JWKSCache:
    """Simple in-memory JWKS cache with staleness control."""

    def __init__(self) -> None:
        self._keys: list[dict[str, object]] = []
        self._fetched_at: float = 0.0

    async def get_keys(self) -> list[dict[str, object]]:
        now = time.time()
        if not self._keys or now - self._fetched_at > 600:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(JWKS_URL)
                response.raise_for_status()
                self._keys = response.json().get("keys", [])
                self._fetched_at = now
        return self._keys


@lru_cache(maxsize=1)
def _jwks_cache() -> JWKSCache:
    return JWKSCache()


async def verify_jwt(token: str) -> dict[str, object]:
    if not ISSUER or not JWKS_URL:
        raise HTTPException(status_code=500, detail="Auth not configured")

    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")

    keys = await _jwks_cache().get_keys()
    key = next((candidate for candidate in keys if candidate.get("kid") == kid), None)

    if not key:
        raise HTTPException(status_code=401, detail="Invalid token key")

    public_key = jwk.construct(key)
    message, encoded_signature = token.rsplit(".", 1)
    decoded_signature = base64url_decode(encoded_signature.encode())

    if not public_key.verify(message.encode(), decoded_signature):
        raise HTTPException(status_code=401, detail="Bad signature")

    claims = jwt.get_unverified_claims(token)

    if claims.get("iss") != ISSUER:
        raise HTTPException(status_code=401, detail="Bad issuer")

    if time.time() > float(claims.get("exp", 0)):
        raise HTTPException(status_code=401, detail="Token expired")

    return claims


async def auth_required(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, object]:
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bearer required")

    return await verify_jwt(credentials.credentials)
