from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User


class UserService:
    """Encapsulates user persistence helpers."""

    @staticmethod
    async def create_user(db: AsyncSession, clerk_id: str, email: str) -> User:
        """Create a new user in the database."""
        user = User(id=uuid.uuid4(), clerk_id=clerk_id, email=email)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_user_by_clerk_id(db: AsyncSession, clerk_id: str) -> Optional[User]:
        """Get a user by their Clerk ID."""
        result = await db.execute(select(User).where(User.clerk_id == clerk_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get a user by their email."""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
