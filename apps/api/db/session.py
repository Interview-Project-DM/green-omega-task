from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine, async_sessionmaker, AsyncSession
import sys
import logging
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import get_settings

_settings = get_settings()

# Set up logging
logger = logging.getLogger(__name__)

try:
    engine: AsyncEngine = create_async_engine(
        _settings.ASYNC_DATABASE_URL,
        pool_pre_ping=True,
        # Additional connection options for production stability
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=3600,
        # Additional asyncpg-specific options
        connect_args={
            "server_settings": {
                "application_name": "green-omega-api",
            },
            # Ensure SSL is handled properly
            "ssl": None,  # Let asyncpg handle SSL based on the URL
        }
    )
    logger.info("Database engine created successfully")
    logger.info(f"Database URL: {_settings.ASYNC_DATABASE_URL}")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    logger.error(f"Database URL: {_settings.ASYNC_DATABASE_URL}")
    raise

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
    class_=AsyncSession,
)
