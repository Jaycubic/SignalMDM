from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import match_rules

# Routers
from app.routers import entities
from app.routers import simulation
from app.routers import merge

import app.routers.merge
print("MERGE MODULE PATH:", app.routers.merge.__file__)
print("MERGE DIR:", dir(app.routers.merge))

app = FastAPI(
    title="SignalMDM API",
    version="1.0"
)

# -----------------------------
# CORS Configuration
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Include Routers
# -----------------------------
app.include_router(entities.router, prefix="/api/v1", tags=["Entities"])
app.include_router(simulation.router, prefix="/api/v1", tags=["Simulation"])
app.include_router(merge.router, prefix="/api/v1", tags=["Merge Engine"])
app.include_router(match_rules.router, prefix="/api/v1", tags=["Match Rules"])

# -----------------------------
# Root Endpoint
# -----------------------------
@app.get("/")
def root():
    return {"status": "SignalMDM Backend Running"}
