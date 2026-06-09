from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.router import api_router
from backend.core import ResponseWrapperMiddleware, install_exception_handlers
from backend.firebase import ensure_initialized, get_service_mode
from backend.services.repository import Repository

app = FastAPI(title="Tazémi Backend", version="0.1.0")
app.add_middleware(ResponseWrapperMiddleware)
install_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ufidtech.github.io",
                "https://ufidtech.github.io/Tazemi",

    ],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):(\d+)$|^https://([a-zA-Z0-9-]+\.)*github\.io$",

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ensure_initialized()

if get_service_mode() == "firebase" and "FIREBASE_SYNC_ON_STARTUP" in __import__("os").environ:
    for collection in ["trucks", "batches", "aggregators", "trials", "notes", "sensor_readings", "alerts"]:
        Repository(collection).migrate_demo_to_firebase()

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Tazémi Backend is running", "mode": get_service_mode()}
