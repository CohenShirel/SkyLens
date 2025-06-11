from typing import Optional
from pathlib import Path
import shutil

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.router.redirect_slashes = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIRECTORY = Path("uploaded_files")
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
