from fastapi import FastAPI
from app.routes.verify import router as verify_router

app = FastAPI(title="TraceMind API")

app.include_router(verify_router)

@app.get("/")
async def root():
    return {"message": "TraceMind Backend Running"}