from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import verify

app = FastAPI(
    title="AgriCredX AI Verification Service",
    description="Extracts data from supply chain documents and verifies rules",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(verify.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
