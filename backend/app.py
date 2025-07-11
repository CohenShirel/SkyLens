from pathlib import Path
import shutil
import sys
import uuid
import json

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from src.logic import handle_video
import traceback
import logging
from fastapi import Request
from pydantic import BaseModel


load_dotenv()

sys.path.append(str(Path(__file__).parent))

app = FastAPI()
app.router.redirect_slashes = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIRECTORY = Path("uploaded_files").resolve()
UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
CACHE_FILE = Path("cache.json").resolve()

@app.get("/")
async def root():
    return {"message": "Welcome to SkyLens API !"}


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception):
    logging.error(f"Unhandled error: {exc}")
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error": str(exc)})


class CacheRequest(BaseModel):
    video: str
    srt: str

@app.post("/cache")
async def cache(request: CacheRequest):
    cache = {}

    if CACHE_FILE.exists():
        with open(CACHE_FILE, encoding="utf-8") as f:
            cache = json.load(f).get(f"{request.video};{request.srt}")

    return {
        "status": bool(cache),
        "cache": cache,
    }

@app.post("/analyze")
async def analyze_video(video: UploadFile = File(...), srt: UploadFile = File(...)):
    # Save uploaded files with unique names

    if CACHE_FILE.exists():
        with open(CACHE_FILE, encoding="utf-8") as f:
            cache = json.load(f).get(f"{video.filename};{srt.filename}")
            if cache:
                return cache

    video_path = UPLOAD_DIRECTORY / f"{uuid.uuid4()}_{video.filename}"
    srt_path = UPLOAD_DIRECTORY / f"{uuid.uuid4()}_{srt.filename}"
    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
    with open(srt_path, "wb") as f:
        shutil.copyfileobj(srt.file, f)

    # Run your processing in the background
    result = handle_video(video_path, srt_path)

    # Load existing cache if it exists
    cache = {}
    if CACHE_FILE.exists():
        with open(CACHE_FILE, encoding="utf-8") as f:
            cache = json.load(f)

    # Add the new result to the cache
    cache[f"{video.filename};{srt.filename}"] = result

    # Save the updated cache back to the file
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=4)

    return cache
