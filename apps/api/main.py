from fastapi import FastAPI
from api.config import get_settings

settings = get_settings()
app: FastAPI = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    print(settings.DATABASE_URL)
    return {"status": "ok"}
