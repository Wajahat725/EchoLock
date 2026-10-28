# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg
import json
import sys
import os
from dotenv import load_dotenv
load_dotenv()

# ---------------------------------------------------------
# Security Core / AI Module Import
# ---------------------------------------------------------
PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PARENT_DIR not in sys.path:
    sys.path.append(PARENT_DIR)

from security_core.encryption import encrypt_secret, decrypt_secret
from security_core.grid_generator import generate_grid
from security_core.otp_generator import generate_session_password
from security_core.lockout import check_lockout, record_failed_attempt, reset_attempts
from ai_module.predictor import check_leakage

# ---------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------
app = FastAPI(title="EchoLock API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Database Config — Neon Cloud PostgreSQL
# ---------------------------------------------------------
DB_CONFIG = {
    "host": "ep-wispy-frog-b3c2j4wm-pooler.c-4.ap-southeast-1.aws.neon.tech",
    "dbname": "echolock_db",
    "user": "echolock_db_owner",
    "sslmode": "require",
    "connect_timeout": 10,           
    "keepalives": 1,                
    "keepalives_idle": 30,           
    "keepalives_interval": 10,     
    "keepalives_count": 5            
}

def get_db():
    password = os.getenv("NEON_DB_PASSWORD")
    if not password:
        raise RuntimeError("NEON_DB_PASSWORD environment variable is not set")
    return psycopg.connect(**DB_CONFIG, password=password)

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

class AIAnalyzeRequest(BaseModel):
    username: str
    secret_length: int = 6  # Default to 6, or get from DB

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
        print(f"DEBUG: decrypted secret_chars for '{username}' = {secret_chars}")

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

        cur.execute(
            "SELECT grid_data FROM sessions WHERE id = %s AND user_id = %s",
            (req.session_id, user_id)
        )
        session = cur.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # grid_data can come back from the DB as a JSON string or parsed list
        grid = session[0]
        if isinstance(grid, str):
            grid = json.loads(grid)

        try:
            # Extract positions from frontend (handles both dict and list formats)
            positions = []
            for pos in req.positions:
                if isinstance(pos, dict):
                    # Agar frontend object bhej raha hai {"row": 2, "col": 2}
                    positions.append((pos.get("row"), pos.get("col")))
                elif isinstance(pos, (list, tuple)):
                    # Agar frontend list bhej raha hai [2, 2]
                    positions.append((pos[0], pos[1]))
                else:
                    raise HTTPException(status_code=400, detail="Invalid position format")

            # Frontend 1-based index bhej raha hai (1,2,3), isliye -1 kar ke 0-based banayein
            clicked_chars = [grid[r - 1][c - 1] for r, c in positions]
            
            # 🛑 DEBUGGING PRINTS (Terminal mein check karein)
            print("\n" + "="*50)
            print(f"DEBUG -> FRONTEND SE POSITIONS AAYI: {req.positions}")
            print(f"DEBUG -> CONVERTED POSITIONS: {positions}")
            print(f"DEBUG -> CLICKED CHARS: {clicked_chars}")
            print(f"DEBUG -> ACTUAL SECRET: {secret_chars}")
            print("="*50 + "\n")

        except (IndexError, TypeError) as e:
            print(f"ERROR IN POSITIONS: {e}")
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

# ---------------------------------------------------------
# AI Leakage Analysis Endpoint
# ---------------------------------------------------------
@app.post("/ai/analyze")
def analyze_leakage(req: AIAnalyzeRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        # 1. Get user_id
        cur.execute("SELECT id FROM users WHERE username = %s", (req.username,))
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user[0]

        # 2. Get the last 5 successful sessions for this user
        cur.execute("""
            SELECT selected_chars 
            FROM login_attempts 
            WHERE user_id = %s AND success = TRUE 
            ORDER BY created_at DESC 
            LIMIT 5
        """, (user_id,))
        
        recent_sessions = cur.fetchall()
        
        if len(recent_sessions) < 3:
            return {"status": "safe", "message": "Not enough data for AI analysis (need at least 3 successful logins)."}

        # 3. Prepare data for AI analysis
        # We need to count how many times a character appeared at a specific rank
        leakage_detected = False
        
        # Loop through each character position (rank 1 to secret_length)
        for rank in range(1, req.secret_length + 1):
            observed_chars = []
            
            # Extract the character at this rank from recent sessions
            for session in recent_sessions:
                chars = session[0].split(",")
                if len(chars) >= rank:
                    observed_chars.append(chars[rank - 1])
            
            total_obs = len(observed_chars)
            if total_obs == 0:
                continue
                
            # Count frequency of each character
            for char in set(observed_chars):
                count = observed_chars.count(char)
                freq = count / total_obs
                
                # 4. Ask the AI Model
                is_leak = check_leakage(
                    click_rank=rank, 
                    secret_length=req.secret_length, 
                    count=count, 
                    total_obs=total_obs, 
                    freq=freq
                )
                
                # If the AI model predicts 1 (it's the secret char) with high frequency
                if is_leak and freq >= 0.6: 
                    leakage_detected = True

        # 5. Return result
        if leakage_detected:
            return {
                "status": "warning",
                "leakage_detected": True,
                "message": "AI Alert: Potential pattern leakage detected over recent sessions!"
            }
        else:
            return {
                "status": "safe",
                "leakage_detected": False,
                "message": "AI Analysis complete. No obvious leakage detected."
            }

    finally:
        cur.close()
        conn.close()