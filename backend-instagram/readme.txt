-----------main.py----------------
# filepath: c:\Users\Krishna Raj\Desktop\handson\task\social_media_chatbot\backend-instagram\main.py
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
import sqlite3
import os
import shutil
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from jose.exceptions import JWTError
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Instagram Clone API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS configuration to allow access to static files
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT settings
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class UserLogin(BaseModel):
    username: str
    password: str

class PostCreate(BaseModel):
    caption: str

# Database initialization
def init_db():
    conn = sqlite3.connect('instagram.db')
    c = conn.cursor()
    
    # Drop existing tables to ensure fresh start
    c.execute('DROP TABLE IF EXISTS chat_messages')
    c.execute('DROP TABLE IF EXISTS posts')
    c.execute('DROP TABLE IF EXISTS users')
    
    # Create users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (username TEXT PRIMARY KEY, password TEXT)''')
    
    # Create posts table with unique constraint on username
    c.execute('''CREATE TABLE IF NOT EXISTS posts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT,
                  image_path TEXT,
                  caption TEXT,
                  timestamp DATETIME,
                  FOREIGN KEY (username) REFERENCES users(username))''')
    
    # Create chat_messages table
    c.execute('''CREATE TABLE IF NOT EXISTS chat_messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT,
                  message TEXT,
                  response TEXT,
                  timestamp DATETIME,
                  FOREIGN KEY (username) REFERENCES users(username))''')
    
    # Insert default user
    c.execute("INSERT INTO users (username, password) VALUES (?, ?)",
              ("admin", "12345"))
    logger.info("Created default user: admin")
    
    # Insert default posts
    default_posts = [
        ("nasa", "/static/nasa.png", "Exploring the cosmos! 🚀"),
        ("isro", "/static/isro.png", "Indian space achievements! 🛸")
    ]
    
    for username, image_path, caption in default_posts:
        c.execute("""INSERT OR IGNORE INTO posts (username, image_path, caption, timestamp)
                     VALUES (?, ?, ?, datetime('now'))""", (username, image_path, caption))
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

# Initialize DB on startup
@app.on_event("startup")
async def startup_event():
    init_db()

def verify_password(password: str, stored_password: str) -> bool:
    # For this simple implementation, we're doing direct comparison
    # In a production environment, you should use proper password hashing
    return password == stored_password

def get_user(username: str):
    conn = sqlite3.connect('instagram.db')
    c = conn.cursor()
    try:
        c.execute("SELECT username, password FROM users WHERE username=?", (username,))
        user = c.fetchone()
        return user
    finally:
        conn.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
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
        username = payload.get("sub")
        if username is None or not isinstance(username, str):
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return username

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = get_user(form_data.username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        username, stored_password = user
        if not verify_password(form_data.password, stored_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(
            data={"sub": username},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/feed")
async def get_feed(current_user: str = Depends(get_current_user)):
    conn = sqlite3.connect('instagram.db')
    c = conn.cursor()
    try:
        c.execute("""SELECT username, image_path, caption, timestamp 
                    FROM posts 
                    ORDER BY timestamp DESC""")
        posts = [{"username": row[0], "image": row[1], "caption": row[2], "timestamp": row[3]} 
                for row in c.fetchall()]
        return posts
    except sqlite3.Error as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@app.post("/post")
async def create_post(
    caption: str = Form(...),
    image: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    # Create static directory if it doesn't exist
    if not os.path.exists("static"):
        os.makedirs("static")
    
    # Save the uploaded file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = image.filename or "unnamed_file"
    file_extension = os.path.splitext(filename)[1]
    image_path = f"/static/{timestamp}{file_extension}"
    
    with open(f".{image_path}", "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    # Save/update post in database
    conn = sqlite3.connect('instagram.db')
    c = conn.cursor()
    try:
        c.execute("""INSERT OR REPLACE INTO posts 
                     (username, image_path, caption, timestamp)
                     VALUES (?, ?, ?, datetime('now'))""",
                     (current_user, image_path, caption))
        conn.commit()
        return {"status": "success", "image_path": image_path}
    except sqlite3.Error as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)







-------------requirements.txt----------------
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
aiofiles==23.2.1
pydantic>=2.0.0
python-dotenv==1.0.0
requests==2.31.0
sqlalchemy==2.0.23
bcrypt==4.0.1
python-jose==3.3.0
cryptography==41.0.1