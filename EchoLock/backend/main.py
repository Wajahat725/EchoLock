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
    allow_origins=["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?", 
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Database Config - Neon Cloud PostgreSQL
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
# Secret length limits - Strictly 8 Characters
# ---------------------------------------------------------
REQUIRED_SECRET_CHARS = 8

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

# ---------- Dashboard ----------
@app.get("/dashboard/history")
def dashboard_history(username: str):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT a.id, a.created_at, a.success
            FROM login_attempts AS a
            JOIN users AS u ON u.id = a.user_id
            WHERE u.username = %s
            ORDER BY a.created_at DESC
            LIMIT 50""",
            (username,)
        )
        history = [
            {
                "id": attempt_id,
                "timestamp": created_at.isoformat() if created_at else None,
                "success": success,
            }
            for attempt_id, created_at, success in cur.fetchall()
        ]
        return {"history": history}
    finally:
        cur.close()
        conn.close()


@app.get("/dashboard/leakage")
def dashboard_leakage(username: str):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT a.selected_chars
            FROM login_attempts AS a
            JOIN users AS u ON u.id = a.user_id
            WHERE u.username = %s AND a.success = FALSE
            ORDER BY a.created_at DESC
            LIMIT 100""",
            (username,)
        )
        failed_attempts = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    if len(failed_attempts) < 3:
        return {
            "status": "insufficient_data",
            "message": "Complete a few login sessions before leakage patterns can be analyzed.",
        }

    observations_by_rank = {}
    for (selected_chars,) in failed_attempts:
        chars = selected_chars.split(",") if selected_chars else []
        for rank, char in enumerate(chars[:REQUIRED_SECRET_CHARS], start=1):
            char = char.strip()
            if char:
                observations_by_rank.setdefault(rank, {}).setdefault(char, 0)
                observations_by_rank[rank][char] += 1

    prediction_count = 0
    predicted_secret_count = 0
    patterns = []
    for rank, counts_by_char in observations_by_rank.items():
        total_observations = sum(counts_by_char.values())
        for count in counts_by_char.values():
            prediction_count += 1
            if check_leakage(
                rank,
                REQUIRED_SECRET_CHARS,
                count,
                total_observations,
                count / total_observations,
            ):
                predicted_secret_count += 1
                patterns.append(f"Repeated character patterns at click {rank}")

    score = round(predicted_secret_count / prediction_count * 100) if prediction_count else 0
    status = "leakage" if score >= 50 else "warning" if score else "safe"
    messages = {
        "leakage": "Repeated failed-login patterns may reveal secret characters.",
        "warning": "Some failed-login patterns may be predictable.",
        "safe": "No predictable patterns were detected in failed login attempts.",
    }
    return {
        "status": status,
        "message": messages[status],
        "score": score,
        "patterns": list(dict.fromkeys(patterns)),
        "attempts_analyzed": len(failed_attempts),
    }

# ---------- 1. Register ----------
@app.post("/register")
def register(req: RegisterRequest):
    parts = [p.strip() for p in req.secret_chars.split(",") if p.strip()]
    
    if len(parts) != REQUIRED_SECRET_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Secret must have exactly {REQUIRED_SECRET_CHARS} characters"
        )
    if any(len(p) != 1 for p in parts):
        raise HTTPException(status_code=400, detail="Each secret must be a single character")
    if len(set(p.upper() for p in parts)) != len(parts):
        raise HTTPException(status_code=400, detail="Secret characters must be unique")

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

        cur.execute(
            "SELECT failed_attempts, lock_until FROM users WHERE id = %s",
            (user_id,)
        )
        attempts, lock_until = cur.fetchone()
        lock_status = check_lockout(attempts, lock_until)

        if lock_status["locked"]:
            raise HTTPException(status_code=403, detail=lock_status["message"])

        cur.execute("SELECT encrypted_secret FROM users WHERE id = %s", (user_id,))
        encrypted_secret = cur.fetchone()[0]
        secret_chars = decrypt_secret(encrypted_secret).split(",")

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
            "secret_length": len(secret_chars),
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
            "SELECT id, encrypted_secret, failed_attempts, lock_until FROM users WHERE username = %s",
            (req.username,)
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_id, encrypted_secret, failed_attempts, lock_until = user
        lock_status = check_lockout(failed_attempts, lock_until)
        if lock_status["locked"]:
            raise HTTPException(status_code=403, detail=lock_status["message"])

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

        grid = session[0]
        if isinstance(grid, str):
            grid = json.loads(grid)

        try:
            positions = []
            for pos in req.positions:
                if isinstance(pos, dict):
                    positions.append((pos.get("row"), pos.get("col")))
                elif isinstance(pos, (list, tuple)):
                    positions.append((pos[0], pos[1]))
                else:
                    raise HTTPException(status_code=400, detail="Invalid position format")

            clicked_chars = [grid[r][c] for r, c in positions]
            
            if len(clicked_chars) != len(secret_chars):
                raise HTTPException(status_code=400, detail=f"Expected {len(secret_chars)} clicks, got {len(clicked_chars)}")

        except (IndexError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid positions")

        if clicked_chars == secret_chars:
            reset_attempts(cur, user_id)
            session_pass = generate_session_password(positions, grid, user_id)

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