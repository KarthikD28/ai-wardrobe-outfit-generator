import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import event

from .config import settings
from .db import Base, engine
from .images import warm_up
from .routers import auth, items, outfits


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _record):
    dbapi_connection.execute("PRAGMA foreign_keys=ON")


Base.metadata.create_all(engine)
settings.media_dir.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    threading.Thread(target=warm_up, daemon=True).start()
    yield


app = FastAPI(title="Wardrobe AI", lifespan=lifespan)
app.include_router(auth.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(outfits.router, prefix="/api")
# Photos are served by unguessable filename rather than behind the login.
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.get("/api/health")
def health():
    return {"status": "ok"}
