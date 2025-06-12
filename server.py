from typing import Optional, List
from pathlib import Path
import shutil
import sys
import uuid

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.append(str(Path(__file__).parent))
from extractions_in_threads import handle_video

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

class User(BaseModel):
    id: int
    name: str
    age: Optional[int] = None

users_db = [
    {"id": 1, "name": "Moshe", "age": 42},
    {"id": 2, "name": "David", "age": 25},
    {"id": 3, "name": "Levi", "age": 21},
]

@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI example!"}

@app.get("/users")
async def get_users():
    return users_db

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    for user in users_db:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/users")
async def create_user(user: User):
    for u in users_db:
        if u["id"] == user.id:
            raise HTTPException(status_code=400, detail="User already exists")
    users_db.append(user.model_dump())
    return user

@app.put("/users/{user_id}")
async def update_user(user_id: int, user: User):
    for idx, u in enumerate(users_db):
        if u["id"] == user_id:
            users_db[idx] = user.model_dump()
            return user
    raise HTTPException(status_code=404, detail="User not found")

@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    for idx, user in enumerate(users_db):
        if user["id"] == user_id:
            del users_db[idx]
            return {"message": "User deleted"}
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/uploadfile")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    file_location = UPLOAD_DIRECTORY / file.filename
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Reopen the file to read its content after saving
    
    with open(file_location, "rb") as f:
        content = f.read().strip()

    result = {
        "filename": file.filename,
        "detail": "File uploaded successfully",
        "content": content
    }
    return result

@app.get("/downloadfile/{filename}")
async def download_file(filename: str):
    file_location = UPLOAD_DIRECTORY / filename
    if not file_location.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_location, filename=filename)
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler
import traceback
import logging
from fastapi import Request


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled error: {exc}")
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail" : "Internal Server Error", "error": str(exc)})

@app.post("/analyze1")
async def analyze_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    srt: UploadFile = File(...)
):
    # Save uploaded files with unique names
    video_path = UPLOAD_DIRECTORY / f"{uuid.uuid4()}_{file.filename}"
    srt_path = UPLOAD_DIRECTORY / f"{uuid.uuid4()}_{srt.filename}"
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    with open(srt_path, "wb") as f:
        shutil.copyfileobj(srt.file, f)

    # Run your processing in the background
    def run_analysis():
        result_path = handle_video(video_path, srt_path)
        # Optionally, you can do more with result_path (e.g., notify, log, etc.)
    background_tasks.add_task(run_analysis)

    

    # Return a response (optionally, you can return a result URL or ID)
    return JSONResponse({"detail": "Processing started", "video": str(video_path), "srt": str(srt_path)})

@app.get("/result/{result_file}")
async def get_result(result_file: str):
    result_path = UPLOAD_DIRECTORY / result_file
    if not result_path.is_file():
        raise HTTPException(status_code=404, detail="Result not found")
    with open(result_path, encoding="utf-8") as f:
        import json
        data = json.load(f)
    return JSONResponse(content=data)



@app.post("/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    srt: UploadFile = File(...)
):
    # Save uploaded files with unique names
    video_path = UPLOAD_DIRECTORY / f"{uuid.uuid4()}_{file.filename}"
    srt_path = UPLOAD_DIRECTORY / f"{uuid.uuid4()}_{srt.filename}"
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    with open(srt_path, "wb") as f:
        shutil.copyfileobj(srt.file, f)

    # Run your processing in the background
    result_path = handle_video(video_path, srt_path)

    result_path = Path(result_path).resolve()
        # Optionally, you can do more with result_path (e.g., notify, log, etc.)

    if not result_path.is_file():
        raise HTTPException(status_code=404, detail="Result not found")
    with open(result_path, encoding="utf-8") as f:
        import json
        data = json.load(f)
    return JSONResponse(content=data)