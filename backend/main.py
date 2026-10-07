# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg
import json
import sys
import os

# ---------------------------------------------------------
# Security Core Import
# ---------------------------------------------------------
PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PARENT_DIR not in sys.path:
    sys.path.append(PARENT_DIR)

from security_core.encryption import encrypt_secret, decrypt_secret
from security_core.grid_generator import generate_grid
from security_core.otp_generator import generate_session_password
from security_core.lockout import check_lockout, record_failed_attempt, reset_attempts

# ---------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------
app = FastAPI(title="EchoLock API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Database Config — Neon Cloud PostgreSQL
# ---------------------------------------------------------
DB_CONFIG = {
    "host": "ep-wispy-frog-b3c2j4wm-pooler.c-4.ap-southeast-1.aws.neon.tech",
    "database": "echolock_db",
    "user": "echolock_db_owner",
    "password": "npg_Vt2JnobKhea3",
    "sslmode": "require",
    "connect_timeout": 10,           
    "keepalives": 1,                
    "keepalives_idle": 30,           
    "keepalives_interval": 10,     
    "keepalives_count": 5            
}

def get_db():
    return psycopg.connect(**DB_CONFIG)

# ---------------------------------------------------------
# Request Models
# ---------------------------------------------------------
class RegisterRequest(BaseModel):
    username: str
    secret_chars: str

class VerifyRequest(BaseModel):
    username: str
    session_id: int
    positions: list

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

@app.get("/")
def root():
    return {"message": "EchoLock API is running!"}


# ---------- 1. Register ----------
@app.post("/register")
def register(req: RegisterRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        encrypted = encrypt_secret(req.secret_chars)
        cur.execute(
            "INSERT INTO users (username, encrypted_secret) VALUES (%s, %s)",
            (req.username, encrypted)
        )
        conn.commit()
        return {"message": "User registered successfully!"}

    except psycopg.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Username already exists")

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        cur.close()
        conn.close()


# ---------- 2. Login Start ----------
@app.get("/login/start")
def login_start(username: str):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_id = user[0]

        # Lockout check
        cur.execute(
            "SELECT failed_attempts, lock_until FROM users WHERE id = %s",
            (user_id,)
        )
        attempts, lock_until = cur.fetchone()
        lock_status = check_lockout(attempts, lock_until)

        if lock_status["locked"]:
            raise HTTPException(status_code=403, detail=lock_status["message"])

        # ✅ User ke secret chars nikalo
        cur.execute("SELECT encrypted_secret FROM users WHERE id = %s", (user_id,))
        encrypted_secret = cur.fetchone()[0]
        secret_chars = decrypt_secret(encrypted_secret).split(",")
        # secret_chars = ['M', 'N', 'O']

        # ✅ Grid banao — secret chars include karke
        grid = generate_grid(5, required_chars=secret_chars)

        cur.execute(
            "INSERT INTO sessions (user_id, grid_data) VALUES (%s, %s) RETURNING id",
            (user_id, json.dumps(grid))
        )
        session_id = cur.fetchone()[0]
        conn.commit()

        return {
            "grid": grid,
            "session_id": session_id,
            "message": "Grid generated. Click your secret characters in order."
        }

    finally:
        cur.close()
        conn.close()

# ---------- 3. Login Verify ----------
@app.post("/login/verify")
def login_verify(req: VerifyRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, encrypted_secret, failed_attempts FROM users WHERE username = %s",
            (req.username,)
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_id, encrypted_secret, failed_attempts = user

        try:
            secret_chars = decrypt_secret(encrypted_secret).split(",")
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to decrypt secret")

        cur.execute("SELECT grid_data FROM sessions WHERE id = %s", (req.session_id,))
        session = cur.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        grid = (session[0])

        try:
            clicked_chars = [grid[r][c] for r, c in req.positions]
        except (IndexError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid positions")

        if clicked_chars == secret_chars:
            reset_attempts(cur, user_id)
            session_pass = generate_session_password(req.positions, grid, user_id)

            cur.execute(
                """INSERT INTO login_attempts 
                (user_id, session_id, positions, selected_chars, success) 
                VALUES (%s, %s, %s, %s, %s)""",
                (user_id, req.session_id, json.dumps(req.positions),
                 ",".join(clicked_chars), True)
            )
            conn.commit()

            return {
                "status": "success",
                "message": "Login successful!",
                "session_password": session_pass
            }

        else:
            lock_result = record_failed_attempt(cur, user_id, failed_attempts)

            cur.execute(
                """INSERT INTO login_attempts 
                (user_id, session_id, positions, selected_chars, success) 
                VALUES (%s, %s, %s, %s, %s)""",
                (user_id, req.session_id, json.dumps(req.positions),
                 ",".join(clicked_chars), False)
            )
            conn.commit()

            return {
                "status": "failed",
                "message": "Wrong positions! Try again.",
                "lockout": lock_result
            }

    finally:
        cur.close()
        conn.close()