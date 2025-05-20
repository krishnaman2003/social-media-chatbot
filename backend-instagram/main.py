from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import sqlite3
import os
import shutil
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

DB_NAME = 'instagram.db'

class Token(BaseModel):
    access_token: str
    token_type: str

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS posts')
    c.execute('DROP TABLE IF EXISTS users')
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (username TEXT PRIMARY KEY, password TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS posts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT,
                  image_path TEXT,
                  caption TEXT,
                  timestamp DATETIME,
                  FOREIGN KEY (username) REFERENCES users(username))''')
    c.execute("INSERT INTO users (username, password) VALUES (?, ?)", ("admin", "12345"))
    default_posts = [
        ("nasa", "/static/nasa.png", "Exploring the cosmos! 🚀"),
        ("isro", "/static/isro.png", "Indian space achievements! 🛸")
    ]
    for username, image_path, caption in default_posts:
        c.execute("""INSERT OR IGNORE INTO posts (username, image_path, caption, timestamp)
                     VALUES (?, ?, ?, datetime('now'))""", (username, image_path, caption))
    conn.commit()
    conn.close()

@app.on_event("startup")
async def startup_event():
    init_db()

def verify_password(password: str, stored_password: str) -> bool:
    return password == stored_password

def get_user_from_db(username: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT username, password FROM users WHERE username=?", (username,))
    user = c.fetchone()
    conn.close()
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire_minutes = expires_delta.total_seconds() / 60 if expires_delta else ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_from_db(username)
    if user is None:
        raise credentials_exception
    return user[0] 

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_from_db(form_data.username)
    if not user or not verify_password(form_data.password, user[1]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user[0]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/feed")
async def read_feed(current_user: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT username, image_path, caption, timestamp FROM posts ORDER BY timestamp DESC")
    posts_data = c.fetchall()
    conn.close()
    return [{"username": row[0], "image": row[1], "caption": row[2], "timestamp": row[3]} for row in posts_data]

@app.post("/post")
async def upload_post(
    caption: str = Form(...),
    image: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(image.filename or "unknown")[1]
    image_path = f"/static/{current_user}_{timestamp_str}{file_extension}"
    
    file_location = f"static/{current_user}_{timestamp_str}{file_extension}"
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute("""INSERT INTO posts (username, image_path, caption, timestamp)
                     VALUES (?, ?, ?, datetime('now'))""",
                  (current_user, image_path, caption))
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        conn.close()
    return {"status": "success", "image_path": image_path, "caption": caption}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)