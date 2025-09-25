from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Settings for the platform API."""

    # Database - prefer DATABASE_URL if available
    DATABASE_URL: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PORT: Optional[str] = None
    POSTGRES_DB: Optional[str] = None

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            # Convert postgresql:// to postgresql+asyncpg://
            url = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

            # Parse URL to handle parameters properly
            from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

            parsed = urlparse(url)
            query_params = parse_qs(parsed.query)

            # Parameters that asyncpg doesn't support - remove them
            unsupported_params = [
                'channel_binding', 'gssencmode', 'krbsrvname',
                'service', 'target_session_attrs', 'application_name'
            ]

            # Convert sslmode parameter to ssl parameter for asyncpg compatibility
            if 'sslmode' in query_params:
                sslmode = query_params['sslmode'][0]
                # Map sslmode values to ssl parameter for asyncpg
                if sslmode == 'disable':
                    query_params['ssl'] = ['false']
                elif sslmode in ['allow', 'prefer', 'require', 'verify-ca', 'verify-full']:
                    query_params['ssl'] = ['true']
                else:
                    # For unknown sslmode values, default to true
                    query_params['ssl'] = ['true']
                    print(f"Warning: Unknown sslmode value '{sslmode}', defaulting to ssl=true")

                # Remove sslmode parameter as asyncpg doesn't support it
                del query_params['sslmode']

            # Remove unsupported parameters
            for param in unsupported_params:
                if param in query_params:
                    del query_params[param]

            # Rebuild the URL
            new_query = urlencode(query_params, doseq=True)
            new_parsed = parsed._replace(query=new_query)
            url = urlunparse(new_parsed)

            # Log the conversion for debugging
            if query_params:  # Only log if there were parameters
                print(f"Database URL converted: {self.DATABASE_URL} -> {url}")

            return url

        # Fallback to individual variables
        if not all([self.POSTGRES_USER, self.POSTGRES_PASSWORD, self.POSTGRES_HOST, self.POSTGRES_PORT, self.POSTGRES_DB]):
            raise ValueError("Either DATABASE_URL or all individual POSTGRES_* variables must be set")

        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = {
        "env_file": "../../.env.local",
        "extra": "ignore"
    }


# @lru_cache
def get_settings() -> Settings:
    """Get the settings."""
    return Settings() #pyrefly:ignore
