from pathlib import Path
import shutil
import sys
import uuid
import json

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from src.logic import handle_video
import traceback
import logging
from fastapi import Request


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


@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI example!"}


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

    return {"filename": file.filename, "detail": "File uploaded successfully", "content": content}


@app.get("/downloadfile/{filename}")
async def download_file(filename: str):
    file_location = UPLOAD_DIRECTORY / filename
    if not file_location.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_location, filename=filename)



@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception):
    logging.error(f"Unhandled error: {exc}")
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error": str(exc)})


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
async def analyze_video(file: UploadFile = File(...), srt: UploadFile = File(...)):
    # Save uploaded files with unique names

    if Path("result.json").exists():
        with open("result.json", encoding="utf-8") as f:
            result = json.load(f).get(f"{file.filename};{srt.filename}")
            if result:
                return result

    video_path = UPLOAD_DIRECTORY / f"{uuid.uuid4()}_{file.filename}"
    srt_path = UPLOAD_DIRECTORY / f"{uuid.uuid4()}_{srt.filename}"
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    with open(srt_path, "wb") as f:
        shutil.copyfileobj(srt.file, f)

    # Run your processing in the background
    result = handle_video(video_path, srt_path)

    # Load existing cache if it exists
    cache = {}
    if Path("result.json").exists():
        with open("result.json", encoding="utf-8") as f:
            cache = json.load(f)

    # Add the new result to the cache
    cache[f"{file.filename};{srt.filename}"] = result

    # Save the updated cache back to the file
    with open("result.json", "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=4)

    return result
