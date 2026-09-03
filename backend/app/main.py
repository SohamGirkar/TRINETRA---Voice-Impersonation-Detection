from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health
from app.api.routes import predict


app = FastAPI(
    title="TRINETRA Voice Impersonation Detection API",
    description="Backend API for TRINETRA voice spoof detection",
    version="1.0.0"
)


# Allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    health.router,
    prefix="/api"
)

app.include_router(
    predict.router,
    prefix="/api"
)


@app.get("/")
def root():

    return {
        "message": "TRINETRA Backend is running"
    }