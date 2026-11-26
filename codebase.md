# PROJECT TREE

echolock
├─ backend
│   ├─ .gitignore
│   ├─ auth
│   │   ├─ encryption.py
│   │   ├─ grid_generator.py
│   │   ├─ lockout.py
│   │   ├─ otp_generator.py
│   │   └─ secret.key
│   ├─ main.py
│   ├─ ml
│   │   ├─ echolock.ipynb
│   │   └─ leakage_model.pkl
│   ├─ predictor.py
│   └─ requirements.txt
├─ echolock.ipynb
└─ frontend
    ├─ .gitignore
    ├─ .oxlintrc.json
    ├─ index.html
    ├─ package-lock.json
    ├─ package.json
    ├─ postcss.config.js
    ├─ public
    │   ├─ echolock-mark.svg
    │   └─ favicon.ico
    ├─ src
    │   ├─ App.jsx
    │   ├─ assets
    │   │   └─ logo.svg
    │   ├─ components
    │   │   ├─ auth
    │   │   │   ├─ LoginForm.jsx
    │   │   │   └─ RegisterForm.jsx
    │   │   ├─ common
    │   │   │   ├─ Alert.jsx
    │   │   │   ├─ Button.jsx
    │   │   │   ├─ Card.jsx
    │   │   │   ├─ Input.jsx
    │   │   │   ├─ Loader.jsx
    │   │   │   └─ Navbar.jsx
    │   │   ├─ grid
    │   │   │   ├─ Grid.jsx
    │   │   │   ├─ GridCell.jsx
    │   │   │   └─ SelectedPositions.jsx
    │   │   └─ security
    │   │       ├─ LeakageReport.jsx
    │   │       └─ LockoutBanner.jsx
    │   ├─ context
    │   │   └─ AuthContext.jsx
    │   ├─ hooks
    │   │   ├─ useAuth.js
    │   │   └─ useGrid.js
    │   ├─ main.jsx
    │   ├─ pages
    │   │   ├─ DashboardPage.jsx
    │   │   ├─ HomePage.jsx
    │   │   ├─ LoginPage.jsx
    │   │   ├─ NotFoundPage.jsx
    │   │   └─ RegisterPage.jsx
    │   ├─ services
    │   │   ├─ api.js
    │   │   ├─ authService.js
    │   │   └─ sessionService.js
    │   ├─ styles
    │   │   └─ index.css
    │   └─ utils
    │       ├─ constants.js
    │       └─ validators.js
    ├─ tailwind.config.js
    └─ vite.config.js

# backend\.gitignore

```plaintext
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
venv/
env/
.venv/
ENV/

# Environment variables
.env
*.env

# Encryption keys (NEVER commit these!)
security_core/secret.key
*.key

# Database
*.db
*.sqlite3

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Logs
*.log
logs/

# Test coverage
.coverage
htmlcov/

# Build
dist/
build/
*.egg-info/
```

# backend\auth\encryption.py

```python
from cryptography.fernet import Fernet
import os

# Use an absolute path so the key file is created next to this file
KEY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "secret.key")

def load_or_create_key():
    """Load the key from file, or create a new one if it doesn't exist."""
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "rb") as f:
            return f.read()
    else:
        key = Fernet.generate_key()
        with open(KEY_FILE, "wb") as f:
            f.write(key)
        return key

KEY = load_or_create_key()
cipher = Fernet(KEY)

def encrypt_secret(secret: str) -> str:
    """Encrypt the secret characters."""
    return cipher.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted: str) -> str:
    """Decrypt the encrypted secret and return the original."""
    return cipher.decrypt(encrypted.encode()).decode()
```

# backend\auth\grid_generator.py

```python
import secrets
import string

def generate_grid(size=5, required_chars=None):
    """
    Generate a random grid. If required_chars are given, they
    are always included in the grid (at random positions).
    Args:
        size: Grid size (default 5x5)
        required_chars: List of characters that must appear in the grid
                        (e.g. ['M', 'N', 'O'])
    Returns:
        2D list (grid) of characters
    """
    chars = string.ascii_uppercase

    # Step 1: Generate a random grid
    grid = []
    for i in range(size):
        row = []
        for j in range(size):
            row.append(secrets.choice(chars))
        grid.append(row)

    # Step 2: If required_chars are given, place them in the grid
    if required_chars:
        total_cells = size * size
        positions = list(range(total_cells))

        # Cryptographically secure shuffle
        rng = secrets.SystemRandom()
        rng.shuffle(positions)

        for idx, char in enumerate(required_chars):
            if idx < len(positions):
                pos = positions[idx]
                row = pos // size
                col = pos % size
                grid[row][col] = char.upper()

    return grid
```

# backend\auth\lockout.py

```python
from datetime import datetime, timedelta

MAX_ATTEMPTS = 5
LOCK_MINUTES = 15

def check_lockout(failed_attempts, lock_until):
    if lock_until and datetime.now() < lock_until:
        remaining = int((lock_until - datetime.now()).total_seconds() // 60)
        return {
            "locked": True,
            "remaining_minutes": remaining,
            "message": f"Account locked. Try again in {remaining} minutes."
        }
    return {"locked": False}

def record_failed_attempt(cur, user_id, current_attempts):
    new_attempts = current_attempts + 1

    if new_attempts >= MAX_ATTEMPTS:
        lock_until = datetime.now() + timedelta(minutes=LOCK_MINUTES)
        cur.execute(
            "UPDATE users SET failed_attempts = 0, lock_until = %s WHERE id = %s",
            (lock_until, user_id)
        )
        return {
            "locked": True,
            "message": f"Too many attempts. Locked for {LOCK_MINUTES} minutes."
        }
    else:
        cur.execute(
            "UPDATE users SET failed_attempts = %s WHERE id = %s",
            (new_attempts, user_id)
        )
        return {
            "locked": False,
            "remaining_attempts": MAX_ATTEMPTS - new_attempts,
            "message": f"{MAX_ATTEMPTS - new_attempts} attempts remaining."
        }

def reset_attempts(cur, user_id):
    cur.execute(
        "UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = %s",
        (user_id,)
    )
```

# backend\auth\otp_generator.py

```python
import hashlib
import hmac
import time
import os

SECRET_KEY = os.environ.get("ECHOLOCK_SECRET", "default_secret_key_change_me").encode()

def generate_session_password(positions, grid, user_id):
    """Generate a one-time password from the selected positions."""
    selected_chars = [grid[r][c] for r, c in positions]
    char_string = ''.join(selected_chars)
    session_data = f"{user_id}:{char_string}:{time.time()}"

    session_password = hmac.new(
        SECRET_KEY,
        session_data.encode(),
        hashlib.sha256
    ).hexdigest()

    return session_password
```

# backend\auth\secret.key

```plaintext
S5HVPv0BrbwAYkQUgoXfuQ8bP7CXESRk7IGVNvrGd3g=
```

# backend\main.py

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from cryptography.fernet import InvalidToken
import psycopg
import json
import os
from datetime import timezone
from dotenv import load_dotenv
load_dotenv()

from auth.encryption import encrypt_secret, decrypt_secret
from auth.grid_generator import generate_grid
from auth.otp_generator import generate_session_password
from auth.lockout import check_lockout, record_failed_attempt, reset_attempts
from predictor import check_leakage

app = FastAPI(title="EchoLock API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?", 
    allow_methods=["*"],
    allow_headers=["*"],
)

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

REQUIRED_SECRET_CHARS = 8

class RegisterRequest(BaseModel):
    username: str
    secret_chars: str

class VerifyRequest(BaseModel):
    username: str
    session_id: int
    positions: list

@app.get("/")
def root():
    return {"message": "EchoLock API is running!"}

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
                "timestamp": created_at.replace(tzinfo=timezone.utc).isoformat() if created_at else None,
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
            """SELECT a.positions
            FROM login_attempts AS a
            JOIN users AS u ON u.id = a.user_id
            WHERE u.username = %s AND a.success = TRUE
            ORDER BY a.created_at DESC
            LIMIT 5""",
            (username,)
        )
        recent_sessions = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    if len(recent_sessions) < 3:
        return {
            "status": "safe",
            "message": (
                f"Not enough data. You have {len(recent_sessions)} successful "
                "logins. Need at least 3."
            ),
        }

    pattern_counts = {}
    for (positions,) in recent_sessions:
        if isinstance(positions, str):
            positions = json.loads(positions)
        if not isinstance(positions, list) or len(positions) != REQUIRED_SECRET_CHARS:
            continue

        normalized_positions = []
        for position in positions:
            if isinstance(position, dict):
                row, col = position.get("row"), position.get("col")
            elif isinstance(position, (list, tuple)) and len(position) == 2:
                row, col = position
            else:
                normalized_positions = []
                break

            if type(row) is not int or type(col) is not int:
                normalized_positions = []
                break
            normalized_positions.append([row, col])

        if normalized_positions:
            pattern = json.dumps(normalized_positions, separators=(",", ":"))
            pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1

    valid_sessions = sum(pattern_counts.values())
    most_common_pattern_count = max(pattern_counts.values(), default=0)
    frequency = most_common_pattern_count / valid_sessions if valid_sessions else 0
    predicted_leakage = (
        frequency >= 0.8
        and check_leakage(
            1,
            REQUIRED_SECRET_CHARS,
            most_common_pattern_count,
            valid_sessions,
            frequency,
        )
    )
    risk_score = 100 if predicted_leakage else 0
    status = "leakage" if risk_score == 100 else "safe"
    return {
        "status": status,
        "message": (
            "Repeated login position patterns may reveal predictable behavior."
            if predicted_leakage
            else "No obvious leakage detected."
        ),
        "risk_score": risk_score,
        "score": risk_score,
        "patterns": ["Repeated login position sequence"] if predicted_leakage else [],
        "attempts_analyzed": len(recent_sessions),
    }

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
        try:
            secret_chars = decrypt_secret(encrypted_secret).split(",")
        except InvalidToken as exc:
            raise HTTPException(
                status_code=500,
                detail="Stored secret cannot be decrypted with the current key. Restore the original backend/auth/secret.key or reset and re-register this account.",
            ) from exc

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
        except InvalidToken as exc:
            raise HTTPException(
                status_code=500,
                detail="Stored secret cannot be decrypted with the current key. Restore the original backend/auth/secret.key or reset and re-register this account.",
            ) from exc

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
```

# backend\ml\echolock.ipynb

```plaintext
{
  "cells": [
    {
      "cell_type": "markdown",
      "metadata": {
        "colab_type": "text",
        "id": "view-in-github"
      },
      "source": [
        "<a href=\"https://colab.research.google.com/github/Wajahat725/EchoLock/blob/main/echolock.ipynb\" target=\"_parent\"><img src=\"https://colab.research.google.com/assets/colab-badge.svg\" alt=\"Open In Colab\"/></a>"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "1P0WuE30VjTj"
      },
      "source": [
        "Introduction\n"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "DO1HS_pCUwrU"
      },
      "source": [
        "# 🛡️ EchoLock: Improved Session Password-Based Security System\n",
        "\n",
        "**Objective:** To train a Machine Learning model that detects if an attacker can deduce a user's secret sequence by observing multiple login sessions.\n",
        "\n",
        "---\n",
        "### 📌 Methodology\n",
        "1. **Data Loading:** Load session logs and user secrets.\n",
        "2. **Preprocessing:** Filter successful sessions and aggregate observations for the first 5 sessions.\n",
        "3. **Feature Engineering:** Calculate frequency and count of each observed symbol per click rank.\n",
        "4. **Model Training:** Train a Logistic Regression classifier to predict if the observed symbol is the actual secret.\n",
        "5. **Evaluation:** Assess model accuracy against a majority-vote baseline."
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "iRuv_LanVrTz"
      },
      "source": [
        " Import Libraries & Setup"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/"
        },
        "id": "XJwAlOnNVWd2",
        "outputId": "0375c04b-6237-4f2e-bbac-ac161fc956c7"
      },
      "outputs": [],
      "source": [
        "# 1. Import Required Libraries\n",
        "import pandas as pd\n",
        "import numpy as np\n",
        "import joblib\n",
        "import matplotlib.pyplot as plt\n",
        "import seaborn as sns\n",
        "\n",
        "from sklearn.model_selection import GroupShuffleSplit\n",
        "from sklearn.linear_model import LogisticRegression\n",
        "from sklearn.metrics import classification_report, accuracy_score, confusion_matrix\n",
        "\n",
        "# Global Configurations\n",
        "N_SESSIONS = 5\n",
        "SYMBOL_POOL = list(\"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\")\n",
        "\n",
        "print(\"Libraries imported and setup completed.\")"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "vRIcyGKAVxf1"
      },
      "source": [
        "Data Loading"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/",
          "height": 278
        },
        "id": "tNmBApst1IRr",
        "outputId": "aec64e7a-21c5-40c4-c13e-4f83354a07ed"
      },
      "outputs": [],
      "source": [
        "# 2. Load the Datasets\n",
        "try:\n",
        "    sessions = pd.read_csv(\"login_sessions.csv\")\n",
        "    secrets = pd.read_csv(\"secrets.csv\")\n",
        "\n",
        "    print(f\"Data Loaded Successfully!\")\n",
        "    print(f\"Sessions Dataset Shape: {sessions.shape}\")\n",
        "    print(f\"Secrets Dataset Shape:  {secrets.shape}\")\n",
        "\n",
        "    display(sessions.head())\n",
        "except FileNotFoundError:\n",
        "    print(\"Error: Please upload 'login_sessions.csv' and 'secrets.csv' to the Colab environment.\")"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "qjEk-5pRV3q2"
      },
      "source": [
        "Data Preprocessing & Feature Engineering"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/",
          "height": 223
        },
        "id": "34_B10312f-8",
        "outputId": "0db99f89-d4fd-4aea-8aca-02945cbd471a"
      },
      "outputs": [],
      "source": [
        "# 3. Data Preprocessing\n",
        "# Keep only successful sessions and sort them chronologically\n",
        "sessions = sessions[sessions.session_success == True].sort_values(\n",
        "    [\"user_id\", \"timestamp\", \"click_rank\"]\n",
        ")\n",
        "\n",
        "# Create a lookup for user secrets\n",
        "secret_lookup = dict(zip(secrets.user_id, secrets.secret_sequence))\n",
        "\n",
        "rows = []\n",
        "\n",
        "# Iterate through each user's observations per click rank\n",
        "for (user_id, rank), group in sessions.groupby([\"user_id\", \"click_rank\"]):\n",
        "    # Limit observation to N_SESSIONS\n",
        "    obs = group[\"attacker_observed_symbol\"].astype(str).tolist()[:N_SESSIONS]\n",
        "    obs = [o for o in obs if o not in (\"\", \"nan\")]\n",
        "    total_obs = len(obs)\n",
        "\n",
        "    if total_obs == 0:\n",
        "        continue\n",
        "\n",
        "    counts = {s: obs.count(s) for s in set(obs)}\n",
        "    secret_seq = secret_lookup.get(user_id)\n",
        "\n",
        "    if not secret_seq:\n",
        "        continue\n",
        "\n",
        "    true_symbol = secret_seq[rank - 1] if rank - 1 < len(secret_seq) else None\n",
        "\n",
        "    # Create features for every possible candidate symbol\n",
        "    for cand in SYMBOL_POOL:\n",
        "        c = counts.get(cand, 0)\n",
        "        rows.append({\n",
        "            \"user_id\": user_id,\n",
        "            \"click_rank\": rank,\n",
        "            \"secret_length\": len(secret_seq),\n",
        "            \"candidate\": cand,\n",
        "            \"count\": c,\n",
        "            \"total_obs\": total_obs,\n",
        "            \"freq\": c / total_obs,\n",
        "            \"label\": int(cand == true_symbol), # 1 if it's the real secret, 0 otherwise\n",
        "        })\n",
        "\n",
        "feat_df = pd.DataFrame(rows)\n",
        "print(f\"Feature Engineering Complete. Dataset Shape: {feat_df.shape}\")\n",
        "display(feat_df.head())"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "GtHOvOvnWCBv"
      },
      "source": [
        "Train-Test Split"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/"
        },
        "id": "8pBKkabZ3FHS",
        "outputId": "f698b2d3-a3e4-4524-9bc0-6492f7cd1da1"
      },
      "outputs": [],
      "source": [
        "# 4. Train-Test Split (Grouped by User to prevent data leakage)\n",
        "gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)\n",
        "train_idx, test_idx = next(gss.split(feat_df, groups=feat_df[\"user_id\"]))\n",
        "\n",
        "train_df = feat_df.iloc[train_idx]\n",
        "test_df = feat_df.iloc[test_idx]\n",
        "\n",
        "FEATURES = [\"click_rank\", \"secret_length\", \"count\", \"total_obs\", \"freq\"]\n",
        "\n",
        "X_train, y_train = train_df[FEATURES], train_df[\"label\"]\n",
        "X_test, y_test = test_df[FEATURES], test_df[\"label\"]\n",
        "\n",
        "print(f\"Data Split Complete.\")\n",
        "print(f\"Train Users: {train_df.user_id.nunique()} | Test Users: {test_df.user_id.nunique()}\")\n",
        "print(f\"Training Samples: {len(X_train)} | Testing Samples: {len(X_test)}\")"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "Go4TiW-bWKSk"
      },
      "source": [
        "Model Training"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": null,
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/"
        },
        "id": "fyvgaejp3KGZ",
        "outputId": "a126cac6-d12a-4462-eaa4-59ea6201581f"
      },
      "outputs": [],
      "source": [
        "# 5. Train Logistic Regression Model\n",
        "# Using class_weight='balanced' because class 0 (not secret) is much larger than class 1 (secret)\n",
        "model = LogisticRegression(class_weight=\"balanced\", max_iter=1000)\n",
        "model.fit(X_train, y_train)\n",
        "\n",
        "print(\"Model trained successfully.\")"
      ]
    },
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "tN9P2QMFWR8b"
      },
      "source": [
        " Evaluation & Results"
      ]
    },
    {
      "cell_type": "code",
      "execution_count": 23,
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/"
        },
        "id": "UvNinPi-3Q6C",
        "outputId": "d85bea2e-11b1-406b-c711-f863c1b7e454"
      },
      "outputs": [
        {
          "name": "stdout",
          "output_type": "stream",
          "text": [
            "==================================================\n",
            "AI LEAKAGE DETECTION RESULTS (N_SESSIONS = 5)\n",
            "==================================================\n",
            "Majority-Vote Baseline Accuracy : 0.957\n",
            "Trained LogisticRegression Acc  : 0.957\n",
            "Evaluated on 70 user/rank groups.\n",
            "==================================================\n"
          ]
        }
      ],
      "source": [
        "# 6. Evaluate the Model\n",
        "test_df = test_df.copy()\n",
        "test_df[\"pred_proba\"] = model.predict_proba(X_test)[:, 1]\n",
        "\n",
        "correct_model, correct_baseline, total_groups = 0, 0, 0\n",
        "\n",
        "# Evaluate how well the model identifies the secret compared to a simple majority-vote\n",
        "for (user_id, rank), g in test_df.groupby([\"user_id\", \"click_rank\"]):\n",
        "    total_groups += 1\n",
        "\n",
        "    # Model's pick (highest probability)\n",
        "    model_pick = g.loc[g[\"pred_proba\"].idxmax(), \"candidate\"]\n",
        "\n",
        "    # Baseline pick (most frequently observed)\n",
        "    baseline_pick = g.loc[g[\"count\"].idxmax(), \"candidate\"]\n",
        "\n",
        "    # Actual secret\n",
        "    true_pick = g.loc[g[\"label\"] == 1, \"candidate\"]\n",
        "    true_pick = true_pick.iloc[0] if len(true_pick) else None\n",
        "\n",
        "    correct_model += int(model_pick == true_pick)\n",
        "    correct_baseline += int(baseline_pick == true_pick)\n",
        "\n",
        "print(\"=\"*50)\n",
        "print(f\"AI LEAKAGE DETECTION RESULTS (N_SESSIONS = {N_SESSIONS})\")\n",
        "print(\"=\"*50)\n",
        "print(f\"Majority-Vote Baseline Accuracy : {correct_baseline/total_groups:.3f}\")\n",
        "print(f\"Trained LogisticRegression Acc  : {correct_model/total_groups:.3f}\")\n",
        "print(f\"Evaluated on {total_groups} user/rank groups.\")\n",
        "print(\"=\"*50)"
      ]
    }
  ],
  "metadata": {
    "colab": {
      "authorship_tag": "ABX9TyP2wMCLj+4oXR71lCUw3W58",
      "include_colab_link": true,
      "provenance": []
    },
    "kernelspec": {
      "display_name": "Python 3",
      "name": "python3"
    },
    "language_info": {
      "name": "python"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 0
}

```

# backend\ml\leakage_model.pkl

```plaintext
<!-- binary file contents omitted -->
```

# backend\predictor.py

```python
import joblib
import os
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ml', 'leakage_model.pkl')
model = joblib.load(MODEL_PATH)

def check_leakage(click_rank, secret_length, count, total_obs, freq):
    """
    Predicts if the observed character is the actual secret character.
    Returns True if leakage is detected (Class 1), False otherwise (Class 0).
    """
    X = np.array([[click_rank, secret_length, count, total_obs, freq]])
    prediction = model.predict(X)[0]
    return bool(prediction)
```

# backend\requirements.txt

```plaintext
fastapi
uvicorn[standard]
psycopg[binary]
cryptography
pydantic
python-dotenv
joblib
numpy
scikit-learn==1.6.1

```

# echolock.ipynb

```plaintext
{
  "nbformat": 4,
  "nbformat_minor": 0,
  "metadata": {
    "colab": {
      "provenance": [],
      "authorship_tag": "ABX9TyMEyE/D/Afkt+DufnQmhwuW",
      "include_colab_link": true
    },
    "kernelspec": {
      "name": "python3",
      "display_name": "Python 3"
    },
    "language_info": {
      "name": "python"
    }
  },
  "cells": [
    {
      "cell_type": "markdown",
      "metadata": {
        "id": "view-in-github",
        "colab_type": "text"
      },
      "source": [
        "<a href=\"https://colab.research.google.com/github/Wajahat725/EchoLock/blob/main/echolock.ipynb\" target=\"_parent\"><img src=\"https://colab.research.google.com/assets/colab-badge.svg\" alt=\"Open In Colab\"/></a>"
      ]
    },
    {
      "cell_type": "markdown",
      "source": [
        "Introduction\n"
      ],
      "metadata": {
        "id": "1P0WuE30VjTj"
      }
    },
    {
      "cell_type": "markdown",
      "source": [
        "# EchoLock: Improved Session Password-Based Security System\n",
        "\n",
        "**Objective:** Trains a model that estimates whether an attacker who has watched a user's past\n",
        "login sessions can identify the secret character at a given click position.\n",
        "\n",
        "---\n",
        "### Methodology\n",
        "1. **Data Loading:** Load session logs and user secrets.\n",
        "2. **Preprocessing:** Filter successful sessions and aggregate observations for the first 5 sessions.\n",
        "3. **Feature Engineering:** Calculate frequency and count of each observed symbol per click rank.\n",
        "4. **Model Training:** Train a Logistic Regression classifier to predict if the observed symbol is the actual secret.\n",
        "5. **Evaluation:** Assess model accuracy against a majority-vote baseline."
      ],
      "metadata": {
        "id": "DO1HS_pCUwrU"
      }
    },
    {
      "cell_type": "markdown",
      "source": [
        " Import Libraries & Setup"
      ],
      "metadata": {
        "id": "iRuv_LanVrTz"
      }
    },
    {
      "cell_type": "code",
      "source": [
        "import pandas as pd\n",
        "import numpy as np\n",
        "import joblib\n",
        "\n",
        "from sklearn.model_selection import GroupShuffleSplit\n",
        "from sklearn.linear_model import LogisticRegression\n",
        "\n",
        "N_SESSIONS = 5\n",
        "SYMBOL_POOL = list(\"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\")"
      ],
      "metadata": {
        "id": "XJwAlOnNVWd2"
      },
      "execution_count": 1,
      "outputs": []
    },
    {
      "cell_type": "markdown",
      "source": [
        "Data Loading"
      ],
      "metadata": {
        "id": "vRIcyGKAVxf1"
      }
    },
    {
      "cell_type": "code",
      "execution_count": 2,
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/",
          "height": 351
        },
        "id": "tNmBApst1IRr",
        "outputId": "44a68823-1447-4cab-9e91-38c48f4561da"
      },
      "outputs": [
        {
          "output_type": "display_data",
          "data": {
            "text/plain": [
              "<IPython.core.display.HTML object>"
            ],
            "text/html": [
              "\n",
              "     <input type=\"file\" id=\"files-346220e4-385c-465a-8b94-3f7bc6328b2e\" name=\"files[]\" multiple disabled\n",
              "        style=\"border:none\" />\n",
              "     <output id=\"result-346220e4-385c-465a-8b94-3f7bc6328b2e\">\n",
              "      Upload widget is only available when the cell has been executed in the\n",
              "      current browser session. Please rerun this cell to enable.\n",
              "      </output>\n",
              "      <script>// Copyright 2017 Google LLC\n",
              "//\n",
              "// Licensed under the Apache License, Version 2.0 (the \"License\");\n",
              "// you may not use this file except in compliance with the License.\n",
              "// You may obtain a copy of the License at\n",
              "//\n",
              "//      http://www.apache.org/licenses/LICENSE-2.0\n",
              "//\n",
              "// Unless required by applicable law or agreed to in writing, software\n",
              "// distributed under the License is distributed on an \"AS IS\" BASIS,\n",
              "// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n",
              "// See the License for the specific language governing permissions and\n",
              "// limitations under the License.\n",
              "\n",
              "/**\n",
              " * @fileoverview Helpers for google.colab Python module.\n",
              " */\n",
              "(function(scope) {\n",
              "function span(text, styleAttributes = {}) {\n",
              "  const element = document.createElement('span');\n",
              "  element.textContent = text;\n",
              "  for (const key of Object.keys(styleAttributes)) {\n",
              "    element.style[key] = styleAttributes[key];\n",
              "  }\n",
              "  return element;\n",
              "}\n",
              "\n",
              "// Max number of bytes which will be uploaded at a time.\n",
              "const MAX_PAYLOAD_SIZE = 100 * 1024;\n",
              "\n",
              "function _uploadFiles(inputId, outputId) {\n",
              "  const steps = uploadFilesStep(inputId, outputId);\n",
              "  const outputElement = document.getElementById(outputId);\n",
              "  // Cache steps on the outputElement to make it available for the next call\n",
              "  // to uploadFilesContinue from Python.\n",
              "  outputElement.steps = steps;\n",
              "\n",
              "  return _uploadFilesContinue(outputId);\n",
              "}\n",
              "\n",
              "// This is roughly an async generator (not supported in the browser yet),\n",
              "// where there are multiple asynchronous steps and the Python side is going\n",
              "// to poll for completion of each step.\n",
              "// This uses a Promise to block the python side on completion of each step,\n",
              "// then passes the result of the previous step as the input to the next step.\n",
              "function _uploadFilesContinue(outputId) {\n",
              "  const outputElement = document.getElementById(outputId);\n",
              "  const steps = outputElement.steps;\n",
              "\n",
              "  const next = steps.next(outputElement.lastPromiseValue);\n",
              "  return Promise.resolve(next.value.promise).then((value) => {\n",
              "    // Cache the last promise value to make it available to the next\n",
              "    // step of the generator.\n",
              "    outputElement.lastPromiseValue = value;\n",
              "    return next.value.response;\n",
              "  });\n",
              "}\n",
              "\n",
              "/**\n",
              " * Generator function which is called between each async step of the upload\n",
              " * process.\n",
              " * @param {string} inputId Element ID of the input file picker element.\n",
              " * @param {string} outputId Element ID of the output display.\n",
              " * @return {!Iterable<!Object>} Iterable of next steps.\n",
              " */\n",
              "function* uploadFilesStep(inputId, outputId) {\n",
              "  const inputElement = document.getElementById(inputId);\n",
              "  inputElement.disabled = false;\n",
              "\n",
              "  const outputElement = document.getElementById(outputId);\n",
              "  outputElement.innerHTML = '';\n",
              "\n",
              "  const pickedPromise = new Promise((resolve) => {\n",
              "    inputElement.addEventListener('change', (e) => {\n",
              "      resolve(e.target.files);\n",
              "    });\n",
              "  });\n",
              "\n",
              "  const cancel = document.createElement('button');\n",
              "  inputElement.parentElement.appendChild(cancel);\n",
              "  cancel.textContent = 'Cancel upload';\n",
              "  const cancelPromise = new Promise((resolve) => {\n",
              "    cancel.onclick = () => {\n",
              "      resolve(null);\n",
              "    };\n",
              "  });\n",
              "\n",
              "  // Wait for the user to pick the files.\n",
              "  const files = yield {\n",
              "    promise: Promise.race([pickedPromise, cancelPromise]),\n",
              "    response: {\n",
              "      action: 'starting',\n",
              "    }\n",
              "  };\n",
              "\n",
              "  cancel.remove();\n",
              "\n",
              "  // Disable the input element since further picks are not allowed.\n",
              "  inputElement.disabled = true;\n",
              "\n",
              "  if (!files) {\n",
              "    return {\n",
              "      response: {\n",
              "        action: 'complete',\n",
              "      }\n",
              "    };\n",
              "  }\n",
              "\n",
              "  for (const file of files) {\n",
              "    const li = document.createElement('li');\n",
              "    li.append(span(file.name, {fontWeight: 'bold'}));\n",
              "    li.append(span(\n",
              "        `(${file.type || 'n/a'}) - ${file.size} bytes, ` +\n",
              "        `last modified: ${\n",
              "            file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() :\n",
              "                                    'n/a'} - `));\n",
              "    const percent = span('0% done');\n",
              "    li.appendChild(percent);\n",
              "\n",
              "    outputElement.appendChild(li);\n",
              "\n",
              "    const fileDataPromise = new Promise((resolve) => {\n",
              "      const reader = new FileReader();\n",
              "      reader.onload = (e) => {\n",
              "        resolve(e.target.result);\n",
              "      };\n",
              "      reader.readAsArrayBuffer(file);\n",
              "    });\n",
              "    // Wait for the data to be ready.\n",
              "    let fileData = yield {\n",
              "      promise: fileDataPromise,\n",
              "      response: {\n",
              "        action: 'continue',\n",
              "      }\n",
              "    };\n",
              "\n",
              "    // Use a chunked sending to avoid message size limits. See b/62115660.\n",
              "    let position = 0;\n",
              "    do {\n",
              "      const length = Math.min(fileData.byteLength - position, MAX_PAYLOAD_SIZE);\n",
              "      const chunk = new Uint8Array(fileData, position, length);\n",
              "      position += length;\n",
              "\n",
              "      const base64 = btoa(String.fromCharCode.apply(null, chunk));\n",
              "      yield {\n",
              "        response: {\n",
              "          action: 'append',\n",
              "          file: file.name,\n",
              "          data: base64,\n",
              "        },\n",
              "      };\n",
              "\n",
              "      let percentDone = fileData.byteLength === 0 ?\n",
              "          100 :\n",
              "          Math.round((position / fileData.byteLength) * 100);\n",
              "      percent.textContent = `${percentDone}% done`;\n",
              "\n",
              "    } while (position < fileData.byteLength);\n",
              "  }\n",
              "\n",
              "  // All done.\n",
              "  yield {\n",
              "    response: {\n",
              "      action: 'complete',\n",
              "    }\n",
              "  };\n",
              "}\n",
              "\n",
              "scope.google = scope.google || {};\n",
              "scope.google.colab = scope.google.colab || {};\n",
              "scope.google.colab._files = {\n",
              "  _uploadFiles,\n",
              "  _uploadFilesContinue,\n",
              "};\n",
              "})(self);\n",
              "</script> "
            ]
          },
          "metadata": {}
        },
        {
          "output_type": "stream",
          "name": "stdout",
          "text": [
            "Saving secrets (1).csv to secrets (1).csv\n",
            "Saving login_sessions (2).csv to login_sessions (2).csv\n",
            "Sessions: 7200 rows\n",
            "Secrets: 60 users\n"
          ]
        },
        {
          "output_type": "execute_result",
          "data": {
            "text/plain": [
              "  user_id session_id   timestamp  click_rank  secret_length  clicked_position  \\\n",
              "0    U001    S000001  1700137236           1              6                28   \n",
              "1    U001    S000001  1700137236           2              6                 1   \n",
              "2    U001    S000001  1700137236           3              6                23   \n",
              "3    U001    S000001  1700137236           4              6                 4   \n",
              "4    U001    S000001  1700137236           5              6                 7   \n",
              "\n",
              "                         grid_layout_36 true_symbol_at_position  \\\n",
              "0  1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC                       H   \n",
              "1  1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC                       B   \n",
              "2  1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC                       R   \n",
              "3  1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC                       P   \n",
              "4  1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC                       O   \n",
              "\n",
              "  attacker_observed_symbol  session_success  \n",
              "0                        H             True  \n",
              "1                        B             True  \n",
              "2                        O             True  \n",
              "3                        Z             True  \n",
              "4                        R             True  "
            ],
            "text/html": [
              "\n",
              "  <div id=\"df-9ce4547d-4e9d-41f5-bf49-f295d2b675e7\" class=\"colab-df-container\">\n",
              "    <div>\n",
              "<style scoped>\n",
              "    .dataframe tbody tr th:only-of-type {\n",
              "        vertical-align: middle;\n",
              "    }\n",
              "\n",
              "    .dataframe tbody tr th {\n",
              "        vertical-align: top;\n",
              "    }\n",
              "\n",
              "    .dataframe thead th {\n",
              "        text-align: right;\n",
              "    }\n",
              "</style>\n",
              "<table border=\"1\" class=\"dataframe\">\n",
              "  <thead>\n",
              "    <tr style=\"text-align: right;\">\n",
              "      <th></th>\n",
              "      <th>user_id</th>\n",
              "      <th>session_id</th>\n",
              "      <th>timestamp</th>\n",
              "      <th>click_rank</th>\n",
              "      <th>secret_length</th>\n",
              "      <th>clicked_position</th>\n",
              "      <th>grid_layout_36</th>\n",
              "      <th>true_symbol_at_position</th>\n",
              "      <th>attacker_observed_symbol</th>\n",
              "      <th>session_success</th>\n",
              "    </tr>\n",
              "  </thead>\n",
              "  <tbody>\n",
              "    <tr>\n",
              "      <th>0</th>\n",
              "      <td>U001</td>\n",
              "      <td>S000001</td>\n",
              "      <td>1700137236</td>\n",
              "      <td>1</td>\n",
              "      <td>6</td>\n",
              "      <td>28</td>\n",
              "      <td>1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC</td>\n",
              "      <td>H</td>\n",
              "      <td>H</td>\n",
              "      <td>True</td>\n",
              "    </tr>\n",
              "    <tr>\n",
              "      <th>1</th>\n",
              "      <td>U001</td>\n",
              "      <td>S000001</td>\n",
              "      <td>1700137236</td>\n",
              "      <td>2</td>\n",
              "      <td>6</td>\n",
              "      <td>1</td>\n",
              "      <td>1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC</td>\n",
              "      <td>B</td>\n",
              "      <td>B</td>\n",
              "      <td>True</td>\n",
              "    </tr>\n",
              "    <tr>\n",
              "      <th>2</th>\n",
              "      <td>U001</td>\n",
              "      <td>S000001</td>\n",
              "      <td>1700137236</td>\n",
              "      <td>3</td>\n",
              "      <td>6</td>\n",
              "      <td>23</td>\n",
              "      <td>1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC</td>\n",
              "      <td>R</td>\n",
              "      <td>O</td>\n",
              "      <td>True</td>\n",
              "    </tr>\n",
              "    <tr>\n",
              "      <th>3</th>\n",
              "      <td>U001</td>\n",
              "      <td>S000001</td>\n",
              "      <td>1700137236</td>\n",
              "      <td>4</td>\n",
              "      <td>6</td>\n",
              "      <td>4</td>\n",
              "      <td>1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC</td>\n",
              "      <td>P</td>\n",
              "      <td>Z</td>\n",
              "      <td>True</td>\n",
              "    </tr>\n",
              "    <tr>\n",
              "      <th>4</th>\n",
              "      <td>U001</td>\n",
              "      <td>S000001</td>\n",
              "      <td>1700137236</td>\n",
              "      <td>5</td>\n",
              "      <td>6</td>\n",
              "      <td>7</td>\n",
              "      <td>1BIJPMQOU0K47Z6A5SF2E8NRYLD3HVGW9XTC</td>\n",
              "      <td>O</td>\n",
              "      <td>R</td>\n",
              "      <td>True</td>\n",
              "    </tr>\n",
              "  </tbody>\n",
              "</table>\n",
              "</div>\n",
              "    <div class=\"colab-df-buttons\">\n",
              "\n",
              "  <div class=\"colab-df-container\">\n",
              "    <button class=\"colab-df-convert\" onclick=\"convertToInteractive('df-9ce4547d-4e9d-41f5-bf49-f295d2b675e7')\"\n",
              "            title=\"Convert this dataframe to an interactive table.\"\n",
              "            style=\"display:none;\">\n",
              "\n",
              "  <svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24px\" viewBox=\"0 -960 960 960\">\n",
              "    <path d=\"M120-120v-720h720v720H120Zm60-500h600v-160H180v160Zm220 220h160v-160H400v160Zm0 220h160v-160H400v160ZM180-400h160v-160H180v160Zm440 0h160v-160H620v160ZM180-180h160v-160H180v160Zm440 0h160v-160H620v160Z\"/>\n",
              "  </svg>\n",
              "    </button>\n",
              "\n",
              "  <style>\n",
              "    .colab-df-container {\n",
              "      display:flex;\n",
              "      gap: 12px;\n",
              "    }\n",
              "\n",
              "    .colab-df-convert {\n",
              "      background-color: #E8F0FE;\n",
              "      border: none;\n",
              "      border-radius: 50%;\n",
              "      cursor: pointer;\n",
              "      display: none;\n",
              "      fill: #1967D2;\n",
              "      height: 32px;\n",
              "      padding: 0 0 0 0;\n",
              "      width: 32px;\n",
              "    }\n",
              "\n",
              "    .colab-df-convert:hover {\n",
              "      background-color: #E2EBFA;\n",
              "      box-shadow: 0px 1px 2px rgba(60, 64, 67, 0.3), 0px 1px 3px 1px rgba(60, 64, 67, 0.15);\n",
              "      fill: #174EA6;\n",
              "    }\n",
              "\n",
              "    .colab-df-buttons div {\n",
              "      margin-bottom: 4px;\n",
              "    }\n",
              "\n",
              "    [theme=dark] .colab-df-convert {\n",
              "      background-color: #3B4455;\n",
              "      fill: #D2E3FC;\n",
              "    }\n",
              "\n",
              "    [theme=dark] .colab-df-convert:hover {\n",
              "      background-color: #434B5C;\n",
              "      box-shadow: 0px 1px 3px 1px rgba(0, 0, 0, 0.15);\n",
              "      filter: drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.3));\n",
              "      fill: #FFFFFF;\n",
              "    }\n",
              "  </style>\n",
              "\n",
              "    <script>\n",
              "      const buttonEl =\n",
              "        document.querySelector('#df-9ce4547d-4e9d-41f5-bf49-f295d2b675e7 button.colab-df-convert');\n",
              "      buttonEl.style.display =\n",
              "        google.colab.kernel.accessAllowed ? 'block' : 'none';\n",
              "\n",
              "      async function convertToInteractive(key) {\n",
              "        const element = document.querySelector('#df-9ce4547d-4e9d-41f5-bf49-f295d2b675e7');\n",
              "        const dataTable =\n",
              "          await google.colab.kernel.invokeFunction('convertToInteractive',\n",
              "                                                    [key], {});\n",
              "        if (!dataTable) return;\n",
              "\n",
              "        const docLinkHtml = 'Like what you see? Visit the ' +\n",
              "          '<a target=\"_blank\" href=https://colab.research.google.com/notebooks/data_table.ipynb>data table notebook</a>'\n",
              "          + ' to learn more about interactive tables.';\n",
              "        element.innerHTML = '';\n",
              "        dataTable['output_type'] = 'display_data';\n",
              "        await google.colab.output.renderOutput(dataTable, element);\n",
              "        const docLink = document.createElement('div');\n",
              "        docLink.innerHTML = docLinkHtml;\n",
              "        element.appendChild(docLink);\n",
              "      }\n",
              "    </script>\n",
              "  </div>\n",
              "\n",
              "\n",
              "    </div>\n",
              "  </div>\n"
            ],
            "application/vnd.google.colaboratory.intrinsic+json": {
              "type": "dataframe",
              "variable_name": "sessions",
              "summary": "{\n  \"name\": \"sessions\",\n  \"rows\": 7200,\n  \"fields\": [\n    {\n      \"column\": \"user_id\",\n      \"properties\": {\n        \"dtype\": \"category\",\n        \"num_unique_values\": 60,\n        \"samples\": [\n          \"U001\",\n          \"U006\",\n          \"U037\"\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"session_id\",\n      \"properties\": {\n        \"dtype\": \"category\",\n        \"num_unique_values\": 1500,\n        \"samples\": [\n          \"S001117\",\n          \"S001369\",\n          \"S000423\"\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"timestamp\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 132200465,\n        \"min\": 1700137236,\n        \"max\": 2157785161,\n        \"num_unique_values\": 1500,\n        \"samples\": [\n          2038196382,\n          2116763314,\n          1827622056\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"click_rank\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 1,\n        \"min\": 1,\n        \"max\": 6,\n        \"num_unique_values\": 6,\n        \"samples\": [\n          1,\n          2,\n          6\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"secret_length\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 0,\n        \"min\": 4,\n        \"max\": 6,\n        \"num_unique_values\": 3,\n        \"samples\": [\n          6,\n          4,\n          5\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"clicked_position\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 10,\n        \"min\": 0,\n        \"max\": 35,\n        \"num_unique_values\": 36,\n        \"samples\": [\n          24,\n          18,\n          5\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"grid_layout_36\",\n      \"properties\": {\n        \"dtype\": \"category\",\n        \"num_unique_values\": 1500,\n        \"samples\": [\n          \"9D2ZOWX4HN63I1P7AQRFKGECJTMS8B5UL0VY\",\n          \"T1W9YDCGIL6QVBSNXEZJ0UA5HF47MOR2K38P\",\n          \"QYV64G5LCB1S7E9IKAWJMFH3Z2O8XPD0RTUN\"\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"true_symbol_at_position\",\n      \"properties\": {\n        \"dtype\": \"category\",\n        \"num_unique_values\": 36,\n        \"samples\": [\n          \"4\",\n          \"5\",\n          \"3\"\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"attacker_observed_symbol\",\n      \"properties\": {\n        \"dtype\": \"category\",\n        \"num_unique_values\": 36,\n        \"samples\": [\n          \"Y\",\n          \"G\",\n          \"2\"\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"session_success\",\n      \"properties\": {\n        \"dtype\": \"boolean\",\n        \"num_unique_values\": 2,\n        \"samples\": [\n          false,\n          true\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    }\n  ]\n}"
            }
          },
          "metadata": {},
          "execution_count": 2
        }
      ],
      "source": [
        "from google.colab import files\n",
        "\n",
        "uploaded = files.upload()\n",
        "\n",
        "sessions = pd.read_csv(\"login_sessions.csv\")\n",
        "secrets = pd.read_csv(\"secrets.csv\")\n",
        "\n",
        "print(f\"Sessions: {sessions.shape[0]} rows\")\n",
        "print(f\"Secrets: {secrets.shape[0]} users\")\n",
        "sessions.head()"
      ]
    },
    {
      "cell_type": "markdown",
      "source": [
        "Data Preprocessing & Feature Engineering"
      ],
      "metadata": {
        "id": "qjEk-5pRV3q2"
      }
    },
    {
      "cell_type": "code",
      "source": [
        "sessions = sessions[sessions.session_success == True].sort_values(\n",
        "    [\"user_id\", \"timestamp\", \"click_rank\"]\n",
        ")\n",
        "secret_lookup = dict(zip(secrets.user_id, secrets.secret_sequence))\n",
        "\n",
        "rows = []\n",
        "for (user_id, rank), group in sessions.groupby([\"user_id\", \"click_rank\"]):\n",
        "    obs = group[\"attacker_observed_symbol\"].astype(str).tolist()[:N_SESSIONS]\n",
        "    obs = [o for o in obs if o not in (\"\", \"nan\")]\n",
        "    total_obs = len(obs)\n",
        "    if total_obs == 0:\n",
        "        continue\n",
        "\n",
        "    counts = {s: obs.count(s) for s in set(obs)}\n",
        "    secret_seq = secret_lookup.get(user_id)\n",
        "    if not secret_seq:\n",
        "        continue\n",
        "\n",
        "    true_symbol = secret_seq[rank - 1] if rank - 1 < len(secret_seq) else None\n",
        "\n",
        "    for candidate in SYMBOL_POOL:\n",
        "        count = counts.get(candidate, 0)\n",
        "        rows.append({\n",
        "            \"user_id\": user_id,\n",
        "            \"click_rank\": rank,\n",
        "            \"secret_length\": len(secret_seq),\n",
        "            \"candidate\": candidate,\n",
        "            \"count\": count,\n",
        "            \"total_obs\": total_obs,\n",
        "            \"freq\": count / total_obs,\n",
        "            \"label\": int(candidate == true_symbol),\n",
        "        })\n",
        "\n",
        "features_df = pd.DataFrame(rows)\n",
        "print(f\"Feature table: {features_df.shape[0]} rows\")\n",
        "features_df.head()"
      ],
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/",
          "height": 223
        },
        "id": "34_B10312f-8",
        "outputId": "3b9c2008-fc3d-4c39-bc8a-34ea0688bd19"
      },
      "execution_count": 3,
      "outputs": [
        {
          "output_type": "stream",
          "name": "stdout",
          "text": [
            "Feature table: 10368 rows\n"
          ]
        },
        {
          "output_type": "execute_result",
          "data": {
            "text/plain": [
              "  user_id  click_rank  secret_length candidate  count  total_obs  freq  label\n",
              "0    U001           1              6         A      0          5   0.0      0\n",
              "1    U001           1              6         B      0          5   0.0      0\n",
              "2    U001           1              6         C      0          5   0.0      0\n",
              "3    U001           1              6         D      0          5   0.0      0\n",
              "4    U001           1              6         E      0          5   0.0      0"
            ],
            "text/html": [
              "\n",
              "  <div id=\"df-e49005ac-a945-4725-b2f5-33b5cd0a6f93\" class=\"colab-df-container\">\n",
              "    <div>\n",
              "<style scoped>\n",
              "    .dataframe tbody tr th:only-of-type {\n",
              "        vertical-align: middle;\n",
              "    }\n",
              "\n",
              "    .dataframe tbody tr th {\n",
              "        vertical-align: top;\n",
              "    }\n",
              "\n",
              "    .dataframe thead th {\n",
              "        text-align: right;\n",
              "    }\n",
              "</style>\n",
              "<table border=\"1\" class=\"dataframe\">\n",
              "  <thead>\n",
              "    <tr style=\"text-align: right;\">\n",
              "      <th></th>\n",
              "      <th>user_id</th>\n",
              "      <th>click_rank</th>\n",
              "      <th>secret_length</th>\n",
              "      <th>candidate</th>\n",
              "      <th>count</th>\n",
              "      <th>total_obs</th>\n",
              "      <th>freq</th>\n",
              "      <th>label</th>\n",
              "    </tr>\n",
              "  </thead>\n",
              "  <tbody>\n",
              "    <tr>\n",
              "      <th>0</th>\n",
              "      <td>U001</td>\n",
              "      <td>1</td>\n",
              "      <td>6</td>\n",
              "      <td>A</td>\n",
              "      <td>0</td>\n",
              "      <td>5</td>\n",
              "      <td>0.0</td>\n",
              "      <td>0</td>\n",
              "    </tr>\n",
              "    <tr>\n",
              "      <th>1</th>\n",
              "      <td>U001</td>\n",
              "      <td>1</td>\n",
              "      <td>6</td>\n",
              "      <td>B</td>\n",
              "      <td>0</td>\n",
              "      <td>5</td>\n",
              "      <td>0.0</td>\n",
              "      <td>0</td>\n",
              "    </tr>\n",
              "    <tr>\n",
              "      <th>2</th>\n",
              "      <td>U001</td>\n",
              "      <td>1</td>\n",
              "      <td>6</td>\n",
              "      <td>C</td>\n",
              "      <td>0</td>\n",
              "      <td>5</td>\n",
              "      <td>0.0</td>\n",
              "      <td>0</td>\n",
              "    </tr>\n",
              "    <tr>\n",
              "      <th>3</th>\n",
              "      <td>U001</td>\n",
              "      <td>1</td>\n",
              "      <td>6</td>\n",
              "      <td>D</td>\n",
              "      <td>0</td>\n",
              "      <td>5</td>\n",
              "      <td>0.0</td>\n",
              "      <td>0</td>\n",
              "    </tr>\n",
              "    <tr>\n",
              "      <th>4</th>\n",
              "      <td>U001</td>\n",
              "      <td>1</td>\n",
              "      <td>6</td>\n",
              "      <td>E</td>\n",
              "      <td>0</td>\n",
              "      <td>5</td>\n",
              "      <td>0.0</td>\n",
              "      <td>0</td>\n",
              "    </tr>\n",
              "  </tbody>\n",
              "</table>\n",
              "</div>\n",
              "    <div class=\"colab-df-buttons\">\n",
              "\n",
              "  <div class=\"colab-df-container\">\n",
              "    <button class=\"colab-df-convert\" onclick=\"convertToInteractive('df-e49005ac-a945-4725-b2f5-33b5cd0a6f93')\"\n",
              "            title=\"Convert this dataframe to an interactive table.\"\n",
              "            style=\"display:none;\">\n",
              "\n",
              "  <svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24px\" viewBox=\"0 -960 960 960\">\n",
              "    <path d=\"M120-120v-720h720v720H120Zm60-500h600v-160H180v160Zm220 220h160v-160H400v160Zm0 220h160v-160H400v160ZM180-400h160v-160H180v160Zm440 0h160v-160H620v160ZM180-180h160v-160H180v160Zm440 0h160v-160H620v160Z\"/>\n",
              "  </svg>\n",
              "    </button>\n",
              "\n",
              "  <style>\n",
              "    .colab-df-container {\n",
              "      display:flex;\n",
              "      gap: 12px;\n",
              "    }\n",
              "\n",
              "    .colab-df-convert {\n",
              "      background-color: #E8F0FE;\n",
              "      border: none;\n",
              "      border-radius: 50%;\n",
              "      cursor: pointer;\n",
              "      display: none;\n",
              "      fill: #1967D2;\n",
              "      height: 32px;\n",
              "      padding: 0 0 0 0;\n",
              "      width: 32px;\n",
              "    }\n",
              "\n",
              "    .colab-df-convert:hover {\n",
              "      background-color: #E2EBFA;\n",
              "      box-shadow: 0px 1px 2px rgba(60, 64, 67, 0.3), 0px 1px 3px 1px rgba(60, 64, 67, 0.15);\n",
              "      fill: #174EA6;\n",
              "    }\n",
              "\n",
              "    .colab-df-buttons div {\n",
              "      margin-bottom: 4px;\n",
              "    }\n",
              "\n",
              "    [theme=dark] .colab-df-convert {\n",
              "      background-color: #3B4455;\n",
              "      fill: #D2E3FC;\n",
              "    }\n",
              "\n",
              "    [theme=dark] .colab-df-convert:hover {\n",
              "      background-color: #434B5C;\n",
              "      box-shadow: 0px 1px 3px 1px rgba(0, 0, 0, 0.15);\n",
              "      filter: drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.3));\n",
              "      fill: #FFFFFF;\n",
              "    }\n",
              "  </style>\n",
              "\n",
              "    <script>\n",
              "      const buttonEl =\n",
              "        document.querySelector('#df-e49005ac-a945-4725-b2f5-33b5cd0a6f93 button.colab-df-convert');\n",
              "      buttonEl.style.display =\n",
              "        google.colab.kernel.accessAllowed ? 'block' : 'none';\n",
              "\n",
              "      async function convertToInteractive(key) {\n",
              "        const element = document.querySelector('#df-e49005ac-a945-4725-b2f5-33b5cd0a6f93');\n",
              "        const dataTable =\n",
              "          await google.colab.kernel.invokeFunction('convertToInteractive',\n",
              "                                                    [key], {});\n",
              "        if (!dataTable) return;\n",
              "\n",
              "        const docLinkHtml = 'Like what you see? Visit the ' +\n",
              "          '<a target=\"_blank\" href=https://colab.research.google.com/notebooks/data_table.ipynb>data table notebook</a>'\n",
              "          + ' to learn more about interactive tables.';\n",
              "        element.innerHTML = '';\n",
              "        dataTable['output_type'] = 'display_data';\n",
              "        await google.colab.output.renderOutput(dataTable, element);\n",
              "        const docLink = document.createElement('div');\n",
              "        docLink.innerHTML = docLinkHtml;\n",
              "        element.appendChild(docLink);\n",
              "      }\n",
              "    </script>\n",
              "  </div>\n",
              "\n",
              "\n",
              "    </div>\n",
              "  </div>\n"
            ],
            "application/vnd.google.colaboratory.intrinsic+json": {
              "type": "dataframe",
              "variable_name": "features_df",
              "summary": "{\n  \"name\": \"features_df\",\n  \"rows\": 10368,\n  \"fields\": [\n    {\n      \"column\": \"user_id\",\n      \"properties\": {\n        \"dtype\": \"category\",\n        \"num_unique_values\": 60,\n        \"samples\": [\n          \"U001\",\n          \"U006\",\n          \"U037\"\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"click_rank\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 1,\n        \"min\": 1,\n        \"max\": 6,\n        \"num_unique_values\": 6,\n        \"samples\": [\n          1,\n          2,\n          6\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"secret_length\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 0,\n        \"min\": 4,\n        \"max\": 6,\n        \"num_unique_values\": 3,\n        \"samples\": [\n          6,\n          4,\n          5\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"candidate\",\n      \"properties\": {\n        \"dtype\": \"category\",\n        \"num_unique_values\": 36,\n        \"samples\": [\n          \"9\",\n          \"N\",\n          \"0\"\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"count\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 0,\n        \"min\": 0,\n        \"max\": 5,\n        \"num_unique_values\": 6,\n        \"samples\": [\n          0,\n          4,\n          2\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"total_obs\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 0,\n        \"min\": 1,\n        \"max\": 5,\n        \"num_unique_values\": 5,\n        \"samples\": [\n          4,\n          2,\n          1\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"freq\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 0.13641832336949958,\n        \"min\": 0.0,\n        \"max\": 1.0,\n        \"num_unique_values\": 11,\n        \"samples\": [\n          0.75,\n          0.0,\n          0.6666666666666666\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    },\n    {\n      \"column\": \"label\",\n      \"properties\": {\n        \"dtype\": \"number\",\n        \"std\": 0,\n        \"min\": 0,\n        \"max\": 1,\n        \"num_unique_values\": 2,\n        \"samples\": [\n          1,\n          0\n        ],\n        \"semantic_type\": \"\",\n        \"description\": \"\"\n      }\n    }\n  ]\n}"
            }
          },
          "metadata": {},
          "execution_count": 3
        }
      ]
    },
    {
      "cell_type": "markdown",
      "source": [
        "Train and Test Split"
      ],
      "metadata": {
        "id": "GtHOvOvnWCBv"
      }
    },
    {
      "cell_type": "code",
      "source": [
        "FEATURES = [\"click_rank\", \"secret_length\", \"count\", \"total_obs\", \"freq\"]\n",
        "\n",
        "splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)\n",
        "train_idx, test_idx = next(splitter.split(features_df, groups=features_df[\"user_id\"]))\n",
        "\n",
        "train_df = features_df.iloc[train_idx]\n",
        "test_df = features_df.iloc[test_idx]\n",
        "\n",
        "X_train, y_train = train_df[FEATURES], train_df[\"label\"]\n",
        "X_test, y_test = test_df[FEATURES], test_df[\"label\"]\n",
        "\n",
        "print(f\"Train users: {train_df.user_id.nunique()}, test users: {test_df.user_id.nunique()}\")\n",
        "print(f\"Train rows: {len(X_train)}, test rows: {len(X_test)}\")"
      ],
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/"
        },
        "id": "8pBKkabZ3FHS",
        "outputId": "6508ef06-0abd-419d-c91a-51e38d8488b9"
      },
      "execution_count": 4,
      "outputs": [
        {
          "output_type": "stream",
          "name": "stdout",
          "text": [
            "Train users: 45, test users: 15\n",
            "Train rows: 7848, test rows: 2520\n"
          ]
        }
      ]
    },
    {
      "cell_type": "markdown",
      "source": [
        "Model Training"
      ],
      "metadata": {
        "id": "Go4TiW-bWKSk"
      }
    },
    {
      "cell_type": "code",
      "source": [
        "model = LogisticRegression(class_weight=\"balanced\", max_iter=1000)\n",
        "model.fit(X_train, y_train)\n",
        "print(\"Model trained.\")"
      ],
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/"
        },
        "id": "fyvgaejp3KGZ",
        "outputId": "ac976aff-e77d-4e29-ab19-80cdec29b8b1"
      },
      "execution_count": 5,
      "outputs": [
        {
          "output_type": "stream",
          "name": "stdout",
          "text": [
            "Model trained.\n"
          ]
        }
      ]
    },
    {
      "cell_type": "markdown",
      "source": [
        " Evaluation & Results"
      ],
      "metadata": {
        "id": "tN9P2QMFWR8b"
      }
    },
    {
      "cell_type": "code",
      "source": [
        "test_df = test_df.copy()\n",
        "test_df[\"pred_proba\"] = model.predict_proba(X_test)[:, 1]\n",
        "\n",
        "correct_model = 0\n",
        "correct_baseline = 0\n",
        "total_groups = 0\n",
        "\n",
        "for (user_id, rank), group in test_df.groupby([\"user_id\", \"click_rank\"]):\n",
        "    total_groups += 1\n",
        "    model_pick = group.loc[group[\"pred_proba\"].idxmax(), \"candidate\"]\n",
        "    baseline_pick = group.loc[group[\"count\"].idxmax(), \"candidate\"]\n",
        "    true_pick = group.loc[group[\"label\"] == 1, \"candidate\"]\n",
        "    true_pick = true_pick.iloc[0] if len(true_pick) else None\n",
        "\n",
        "    correct_model += int(model_pick == true_pick)\n",
        "    correct_baseline += int(baseline_pick == true_pick)\n",
        "\n",
        "print(f\"N_SESSIONS: {N_SESSIONS}\")\n",
        "print(f\"Majority-vote baseline accuracy: {correct_baseline / total_groups:.3f}\")\n",
        "print(f\"Logistic regression accuracy:    {correct_model / total_groups:.3f}\")\n",
        "print(f\"Evaluated on {total_groups} user/rank groups\")"
      ],
      "metadata": {
        "colab": {
          "base_uri": "https://localhost:8080/"
        },
        "id": "UvNinPi-3Q6C",
        "outputId": "f52e9c5a-0fea-49ea-dcc1-04881ca62047"
      },
      "execution_count": 6,
      "outputs": [
        {
          "output_type": "stream",
          "name": "stdout",
          "text": [
            "N_SESSIONS: 5\n",
            "Majority-vote baseline accuracy: 0.957\n",
            "Logistic regression accuracy:    0.957\n",
            "Evaluated on 70 user/rank groups\n"
          ]
        }
      ]
    },
    {
      "cell_type": "code",
      "source": [
        "joblib.dump(model, \"leakage_model.pkl\")\n",
        "print(\"Saved leakage_model.pkl\")\n",
        "\n",
        "from google.colab import files\n",
        "files.download(\"leakage_model.pkl\")"
      ],
      "metadata": {
        "id": "swK3wanvX3UH",
        "outputId": "1c5dd6e2-ab2b-4073-e6e4-3b66a513bba5",
        "colab": {
          "base_uri": "https://localhost:8080/",
          "height": 34
        }
      },
      "execution_count": 7,
      "outputs": [
        {
          "output_type": "stream",
          "name": "stdout",
          "text": [
            "Saved leakage_model.pkl\n"
          ]
        },
        {
          "output_type": "display_data",
          "data": {
            "text/plain": [
              "<IPython.core.display.Javascript object>"
            ],
            "application/javascript": [
              "\n",
              "    async function download(id, filename, size) {\n",
              "      if (!google.colab.kernel.accessAllowed) {\n",
              "        return;\n",
              "      }\n",
              "      const div = document.createElement('div');\n",
              "      const label = document.createElement('label');\n",
              "      label.textContent = `Downloading \"${filename}\": `;\n",
              "      div.appendChild(label);\n",
              "      const progress = document.createElement('progress');\n",
              "      progress.max = size;\n",
              "      div.appendChild(progress);\n",
              "      document.body.appendChild(div);\n",
              "\n",
              "      const buffers = [];\n",
              "      let downloaded = 0;\n",
              "\n",
              "      const channel = await google.colab.kernel.comms.open(id);\n",
              "      // Send a message to notify the kernel that we're ready.\n",
              "      channel.send({})\n",
              "\n",
              "      for await (const message of channel.messages) {\n",
              "        // Send a message to notify the kernel that we're ready.\n",
              "        channel.send({})\n",
              "        if (message.buffers) {\n",
              "          for (const buffer of message.buffers) {\n",
              "            buffers.push(buffer);\n",
              "            downloaded += buffer.byteLength;\n",
              "            progress.value = downloaded;\n",
              "          }\n",
              "        }\n",
              "      }\n",
              "      const blob = new Blob(buffers, {type: 'application/binary'});\n",
              "      const a = document.createElement('a');\n",
              "      a.href = window.URL.createObjectURL(blob);\n",
              "      a.download = filename;\n",
              "      div.appendChild(a);\n",
              "      a.click();\n",
              "      div.remove();\n",
              "    }\n",
              "  "
            ]
          },
          "metadata": {}
        },
        {
          "output_type": "display_data",
          "data": {
            "text/plain": [
              "<IPython.core.display.Javascript object>"
            ],
            "application/javascript": [
              "download(\"download_a2191981-2588-45a2-a45c-c3679e0a8fef\", \"leakage_model.pkl\", 1231)"
            ]
          },
          "metadata": {}
        }
      ]
    }
  ]
}
```

# frontend\.gitignore

```plaintext
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

# frontend\.oxlintrc.json

```plaintext
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

# frontend\index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/echolock-mark.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#fbf7e9" />
    <meta name="description" content="EchoLock - improved session password-based security with grid authentication" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet"/>
    <title>EchoLock</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

# frontend\package-lock.json

```json
{
  "name": "frontend",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "frontend",
      "version": "0.0.0",
      "dependencies": {
        "axios": "^1.20.0",
        "react": "^19.2.8",
        "react-dom": "^19.2.8",
        "react-hot-toast": "^2.6.1",
        "react-router-dom": "^7.18.4"
      },
      "devDependencies": {
        "@types/react": "^19.2.18",
        "@types/react-dom": "^19.2.7",
        "@vitejs/plugin-react": "^6.1.1",
        "autoprefixer": "^10.6.1",
        "oxlint": "^1.81.0",
        "postcss": "^8.5.28",
        "tailwindcss": "^3.4.19",
        "vite": "^8.3.0"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.3.0.tgz",
      "integrity": "sha512-U4+70Pc5ZS9osnCBCE5Jha/ciHM+Yp+CNMNC/7HvYbNRk1Ldd+f7qO65W5qfhu/TCv+/ozljlXXe9Nj8419DMA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.6.0.tgz",
      "integrity": "sha512-T7jf+5zgsZHwNJ4lvQ7/aezbyk0nNX+zJVWpmHA7VYsEx7a7qr5Rg5IbtJFqkgze5Y2sruq1RUY8Q837Od7iFw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.31",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@nodelib/fs.scandir": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.scandir/-/fs.scandir-2.1.5.tgz",
      "integrity": "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "2.0.5",
        "run-parallel": "^1.1.9"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.stat": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.stat/-/fs.stat-2.0.5.tgz",
      "integrity": "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.walk": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.walk/-/fs.walk-1.2.8.tgz",
      "integrity": "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.scandir": "2.1.5",
        "fastq": "^1.6.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@oxc-project/types": {
      "version": "0.151.0",
      "resolved": "https://registry.npmjs.org/@oxc-project/types/-/types-0.151.0.tgz",
      "integrity": "sha512-J1yXrIlNDZVzE3ada310xeAw7nH8yCAyLPuUIsjKatFPmfn5bS1oW+cM+QsGOtVWd5nhSpbwZWx/rue+r5Z+PA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/oxc-project"
      }
    },
    "node_modules/@oxlint/binding-android-arm-eabi": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-android-arm-eabi/-/binding-android-arm-eabi-1.85.0.tgz",
      "integrity": "sha512-q2KO/Zso9UT+OMn0NF9ywn4E4t0MI3yxiDhNyhsQ7DyQJrC4FhFE4TXOi4bktFnOWXTMds8qZSbpv2XwRaNOBg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-android-arm64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-android-arm64/-/binding-android-arm64-1.85.0.tgz",
      "integrity": "sha512-SxLN3ALjoT9NNdvpjEevGeHvfzTAFrF0NBYB5tzK7/GtCKMze3j1e/m/X2ozqGj2U9hfGG/dg/OG8vpVK4PiDA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-darwin-arm64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-darwin-arm64/-/binding-darwin-arm64-1.85.0.tgz",
      "integrity": "sha512-Y/Sup/J4f0f9UGsSd/xyCNTeWL+gepO63GBdEDAfue9nBsnk9zMmnIXx1O6b1V8C90vB5nucYNZ0pbMXAp8zJA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-darwin-x64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-darwin-x64/-/binding-darwin-x64-1.85.0.tgz",
      "integrity": "sha512-ApOSNC04ynpDTwvBD+//0wyfODRSbEzvRoKpX8teffmc27z8AockwSNeMXGJXn5KP85eahDgR/2llICWLkzcnw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-freebsd-x64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-freebsd-x64/-/binding-freebsd-x64-1.85.0.tgz",
      "integrity": "sha512-bNrVrCOA/kHky3Tu79IXWXe5bhIgLXfUuUEDHlAGOHUk96MkvDZ1ecaQF19rwstrnaqfP1o9nBTqzIr9+ZHkUg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm-gnueabihf": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm-gnueabihf/-/binding-linux-arm-gnueabihf-1.85.0.tgz",
      "integrity": "sha512-NUrzOJ1s/EqsVvfn2L/1D8Wro2LPIZUbihL8kOJLh5fEdGEN3rdOGUYq3HwnUIL8sjpoP+4N6RaGrgmMJnaMPw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm-musleabihf": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm-musleabihf/-/binding-linux-arm-musleabihf-1.85.0.tgz",
      "integrity": "sha512-UJXrAT3E/RWkEqXLIs2ehETja1qfgkPb+5gwLIIS+o/6cf+grHvoOXTa5997a/YNQfcJS0DRBTOfZt95cvOI1g==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm64-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm64-gnu/-/binding-linux-arm64-gnu-1.85.0.tgz",
      "integrity": "sha512-lK40QLjI0HxigO7CjDDshEtfYIeiYS0020v5BHFPqN4uuQBQxd2K9LNom2dW15o9F1937quSCRVp4ZsVhdbYdg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm64-musl": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm64-musl/-/binding-linux-arm64-musl-1.85.0.tgz",
      "integrity": "sha512-c2zbdBwGKreHXwRx3gWBuFGJxLhxgsg6YlZ+3H+RgRusU/UEV9jNwJ3HGYK+nRo0LvBa7mt6Kj86xoVotUo8cw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-ppc64-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-ppc64-gnu/-/binding-linux-ppc64-gnu-1.85.0.tgz",
      "integrity": "sha512-tlt/Hy8lZ97/lCPmCgw/B3k/mwh+BzaIPbPkldZEly7TwLmx0xe2CQcaW2g/rR0dOgS9JNGCZsMEqLhUNMGvaw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-riscv64-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-riscv64-gnu/-/binding-linux-riscv64-gnu-1.85.0.tgz",
      "integrity": "sha512-3tNR9Xey82X0zKuY1d8hJ6Rc9gwRDurmqGLnQZa5xqOXy8/YyiqFXjAtugkKLY82obOlpK1eSiDRlgcNPuxtIg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-riscv64-musl": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-riscv64-musl/-/binding-linux-riscv64-musl-1.85.0.tgz",
      "integrity": "sha512-wbGRd5PqCcjkJFHhZuZ2OBSUQY9czlQsoA/cQQB9JK/L9mC5MQgGoKAh+xd8QjA5V+0D3j+Qd1lAWn1I8zlelA==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-s390x-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-s390x-gnu/-/binding-linux-s390x-gnu-1.85.0.tgz",
      "integrity": "sha512-3Sn0kSrE4DPZCWV/8o+n4x3aFZxI9ulMnkYlwCbJ8eUVkwRK2IerohE/A/z3SNbCwoPFOCJmGE5Avrq0rrvdvQ==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-x64-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-x64-gnu/-/binding-linux-x64-gnu-1.85.0.tgz",
      "integrity": "sha512-JY2pxxYfB62bAGfejljVCqc44etItehPuAyaeSAdMuEMtwNA00ggMnS66lC1oIhos6oOXUkuU6mZ9bpFh3BqWg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-x64-musl": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-x64-musl/-/binding-linux-x64-musl-1.85.0.tgz",
      "integrity": "sha512-5k74vZ6qJBjBHEOlBk9B/iv68Yu0F1Afw/vvT2ar6OGCqEeXLaSjXz2n/IPCbhLG22UoKoYEJTzpYraRdcp6PA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-openharmony-arm64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-openharmony-arm64/-/binding-openharmony-arm64-1.85.0.tgz",
      "integrity": "sha512-GbAl5qt5TCkPLXTaIISZJnugrcBhra6rodcXc9jYt620UtdsTt71NlNmJmm0frxzFpd54x/G+MkitEJA8I/BoA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-arm64-msvc": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-arm64-msvc/-/binding-win32-arm64-msvc-1.85.0.tgz",
      "integrity": "sha512-kjmws5MK0et2swk4ND85D7NVQyDHw162i6whtZDLUA/lo6FQyBZDcmMRCMcVZcNrAhIaftVb00x9ChGDOjjNJA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-ia32-msvc": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-ia32-msvc/-/binding-win32-ia32-msvc-1.85.0.tgz",
      "integrity": "sha512-eSsIJx9n4yxvOqYTZyPEMyEXRmE60XH7xGAU7i0Qbsn1lf6Za3CWJ9aRd82oSFKXaxhp+sA6/yMJVRIpLpna6A==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-x64-msvc": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-x64-msvc/-/binding-win32-x64-msvc-1.85.0.tgz",
      "integrity": "sha512-pBebIPUpKKhWrhSMWhy8TdAZBewiXnfxmaAGxhzxM1068GagqFaTwgKlU6e+UyJ2sPR+VoHouhXuGJkQjsrDvA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-android-arm-eabi": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-android-arm-eabi/-/binding-android-arm-eabi-1.2.11.tgz",
      "integrity": "sha512-A5kXfGKvKWWZE0TtPrfsvT+q4Y5d1QG8gGUzpYjGydM+fARM9MuX90PrXYXe0XbsDVgyxxNzHo6giCj90bsFNw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-android-arm64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-android-arm64/-/binding-android-arm64-1.2.11.tgz",
      "integrity": "sha512-z6cTycz+iJ4PVkuL4HHW4DfTfoeU/2nqYYuSOrTmH7yHK5Y0LCOnA03V4ZNxavyVaU1oOqUgIg2klN/s+USGOA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-darwin-arm64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-darwin-arm64/-/binding-darwin-arm64-1.2.11.tgz",
      "integrity": "sha512-jShvqNtP6vDC6/A5JOAzbVV+DkgHqhl/ScVCJEbt+TUY6QYz7YnXcrg3sLtFBniro0f/Ld50ZwCWA6f7KYD1nQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-darwin-x64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-darwin-x64/-/binding-darwin-x64-1.2.11.tgz",
      "integrity": "sha512-f2i2xiNWq1Z1l2++q2fuhZRdLAT3aqxD6vRNm1RAxpUoBcdqNB3C0s1Bt+K+PbEx2F5F4gQp6hqKkphCY/xF9w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-freebsd-x64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-freebsd-x64/-/binding-freebsd-x64-1.2.11.tgz",
      "integrity": "sha512-4Ir5FSOKIAMr4r0kExpt1s3bMgzJU3rA45AYOHtQpls0oNeqcYBKrWMlckrYH4KCfGLfkfn1tN1dmZPMVsdXow==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm-gnueabihf": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm-gnueabihf/-/binding-linux-arm-gnueabihf-1.2.11.tgz",
      "integrity": "sha512-/gnRDM+39BROzAN/k1OZjDPnDMcZxB/0EUxKjONO5yVkNEvlsoMDrxGNKgZi/ttFriS2gwlDNzB65pvNbFOXIQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm64-gnu": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm64-gnu/-/binding-linux-arm64-gnu-1.2.11.tgz",
      "integrity": "sha512-PFaK8HwvAHbaKbBcDNQihjMKYvFnA5hiENx/l5tphTDz1E0WFp32l0A7aq7lyUwGsRw/xSrNIy/gIK4thrSCrw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm64-musl": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm64-musl/-/binding-linux-arm64-musl-1.2.11.tgz",
      "integrity": "sha512-AskzJUIKRLPxkruR1wLKewGbOw+EYfU/9lOrBFj4AFrEA8hPpKFnODWNu2WLaNs0QNkEb9QIJufmVZZIL/bJlg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-ppc64-gnu": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-ppc64-gnu/-/binding-linux-ppc64-gnu-1.2.11.tgz",
      "integrity": "sha512-qlUGAheh2yh8afH7QBgx0PrRHN85hKnNd78x8MeMhXivuevgd8vgf6/CstOzmNKY/lLTHvNTrPy98cLnAugzJw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-s390x-gnu": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-s390x-gnu/-/binding-linux-s390x-gnu-1.2.11.tgz",
      "integrity": "sha512-secpEad+0vCbSfn8upFySkDskv+bGPk3THSDS9Y89yc4rb4kzqHp8Dmyd9BkQW4SnhNXBZCl/6CrO//hZahNJQ==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-x64-gnu": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-x64-gnu/-/binding-linux-x64-gnu-1.2.11.tgz",
      "integrity": "sha512-mOVBT3dPpkWm8XBWPmU4bf+U6dYDLeMo/9ojUmis4N0L5uu10qra5vOyngZ7/PSdoE4G9KvRt4bloRxNjLas7A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-x64-musl": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-x64-musl/-/binding-linux-x64-musl-1.2.11.tgz",
      "integrity": "sha512-Is78i9A8Ui4SqcxUwFJ9uMmjDn58IbVTjFWYdQestFEgeuEmHMLGNriXnVJKkwG2YiZjw8cP0zCTyDMdDGtOOg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-openharmony-arm64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-openharmony-arm64/-/binding-openharmony-arm64-1.2.11.tgz",
      "integrity": "sha512-dUCXneZ87INUMyQ0D+C0HrEBNUPNXHaPmU5GTjyKTJEiussw9Kaj5Ln8UztPe4epV/ffvgNBEadksdYhmW6xJA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-win32-arm64-msvc": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-win32-arm64-msvc/-/binding-win32-arm64-msvc-1.2.11.tgz",
      "integrity": "sha512-jByxb6qfd+bH1xUd0qnfFnb17i9sWBPY2tOavJ0l3tdr3OTu+Kvtm8cd/JV5nFt657b1VqGltxg9olOEfofXWw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-win32-x64-msvc": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-win32-x64-msvc/-/binding-win32-x64-msvc-1.2.11.tgz",
      "integrity": "sha512-/PzKqzAJ03i19oy2ItPvyvaVjOjBCNnfaJs8yvUdGBKmiESgnrJSQ2awd81QzFbbnAmu7YO9ZnJrDCb9VSJPRA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/pluginutils": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.1.tgz",
      "integrity": "sha512-2j9bGt5Jh8hj+vPtgzPtl72j0yRxHAyumoo6TNfAjsLB04UtpSvPbPcDcBMxz7n+9CYB0c1GxQFxYRg2jimqGw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/react": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.3.0.tgz",
      "integrity": "sha512-N0rFCuH9YoxG9/m61l9MfpJKfmLOVU0em7ipIz6TRgSSkvReLB9vL85GB+yr8Bs5leqpvg96JSwF4ZS1s4viQg==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.3.0.tgz",
      "integrity": "sha512-ZI7bU42mZXXKHn/qNLEw2IrbiINU7X5+vfgdixBHkCNpYWXjKgfQ/P+uyGb5CjOLB9UcnTeg3rylQtV2hym44Q==",
      "devOptional": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.3.0"
      }
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "6.1.1",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-6.1.1.tgz",
      "integrity": "sha512-yxLaQV9gkhS8ezJqCM6+ndU7mDY6gqAg75NQ+0IjwEI8IYOmQCgkRwHKVSfWXW076DsqMo0Dk+0FK1U+M5RgFw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@rolldown/pluginutils": "^1.0.1"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "peerDependencies": {
        "@rolldown/plugin-babel": "^0.1.7 || ^0.2.0",
        "babel-plugin-react-compiler": "^1.0.0",
        "oxc-transform-react": "^0.145.0",
        "vite": "^8.0.0"
      },
      "peerDependenciesMeta": {
        "@rolldown/plugin-babel": {
          "optional": true
        },
        "babel-plugin-react-compiler": {
          "optional": true
        },
        "oxc-transform-react": {
          "optional": true
        }
      }
    },
    "node_modules/agent-base": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-6.0.2.tgz",
      "integrity": "sha512-RZNwNclF7+MS/8bDg70amg32dyeZGZxiDuQmZxKLAlQjr3jGyLx+4Kkk58UO7D2QdgFIQCovuSuZESne6RG6XQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "4"
      },
      "engines": {
        "node": ">= 6.0.0"
      }
    },
    "node_modules/any-promise": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/any-promise/-/any-promise-1.3.0.tgz",
      "integrity": "sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/anymatch": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/anymatch/-/anymatch-3.1.3.tgz",
      "integrity": "sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "normalize-path": "^3.0.0",
        "picomatch": "^2.0.4"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/anymatch/node_modules/picomatch": {
      "version": "2.3.2",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.2.tgz",
      "integrity": "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/arg": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/arg/-/arg-5.0.2.tgz",
      "integrity": "sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/asynckit": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/asynckit/-/asynckit-0.4.0.tgz",
      "integrity": "sha512-Oei9OH4tRh0YqU3GxhX79dM/mwVgvbZJaSNaRk+bshkj0S5cfHcgYakreBjrHwatXKbz+IoIdYLxrKim2MjW0Q==",
      "license": "MIT"
    },
    "node_modules/autoprefixer": {
      "version": "10.6.1",
      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.6.1.tgz",
      "integrity": "sha512-cL1Qz6ADZhcEbny/8HPfe99J6HhNoYtpX2LFLIbhgGE7Q1hlQVkYFdetDN7Id3KiQxhDrHwzlHr/YQCnZ8+xSA==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "browserslist": "^4.28.9",
        "caniuse-lite": "^1.0.30001810",
        "fraction.js": "^5.3.4",
        "picocolors": "^1.1.1",
        "postcss-value-parser": "^4.2.0"
      },
      "bin": {
        "autoprefixer": "bin/autoprefixer"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      },
      "peerDependencies": {
        "postcss": "^8.1.0"
      }
    },
    "node_modules/axios": {
      "version": "1.20.0",
      "resolved": "https://registry.npmjs.org/axios/-/axios-1.20.0.tgz",
      "integrity": "sha512-r8aOh8j9cGKpgQAqpzrUHnSIc6a59Y3Xf/cv8sy1DrHCkZHzQGEuoq1tARk6qSyDdtQGSDgpb9kFlruzPvrgwg==",
      "license": "MIT",
      "dependencies": {
        "follow-redirects": "^1.16.0",
        "form-data": "^4.0.6",
        "https-proxy-agent": "^5.0.1",
        "proxy-from-env": "^2.1.0"
      }
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.11.26",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.11.26.tgz",
      "integrity": "sha512-GLQdD3y6UF8iVuMJl5fHgE4jdn/ua7n+toKfLgNlg3BqQtOZjpy68T8Tup8/wGWZCDlm7KMg7tPb4MPn7oN0TQ==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.cjs"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/binary-extensions": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/binary-extensions/-/binary-extensions-2.3.0.tgz",
      "integrity": "sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.29.1",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.29.1.tgz",
      "integrity": "sha512-AUdjuRyCNGUYtqpqfTmWyM4fXay8yIQhmLnvYe/THMGfT9B/34X7xQd3ifKxwyNPPpowVBjLb+64BN9Rn1mizw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "baseline-browser-mapping": "^2.11.25",
        "caniuse-lite": "^1.0.30001810",
        "electron-to-chromium": "^1.5.438",
        "node-releases": "^2.0.57",
        "update-browserslist-db": "^1.3.3"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/camelcase-css": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/camelcase-css/-/camelcase-css-2.0.1.tgz",
      "integrity": "sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001812",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001812.tgz",
      "integrity": "sha512-qN+QNNBr93TCmFrmte0bBCjSDMuRvt78VlHT99qIGPszm4QsqCX8lnyWUFkHi8B7ZBAPq8SH+UqyXNy/odMdng==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chokidar": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-3.6.0.tgz",
      "integrity": "sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "anymatch": "~3.1.2",
        "braces": "~3.0.2",
        "glob-parent": "~5.1.2",
        "is-binary-path": "~2.1.0",
        "is-glob": "~4.0.1",
        "normalize-path": "~3.0.0",
        "readdirp": "~3.6.0"
      },
      "engines": {
        "node": ">= 8.10.0"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/chokidar/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/combined-stream": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/combined-stream/-/combined-stream-1.0.8.tgz",
      "integrity": "sha512-FQN4MRfuJeHf7cBbBMJFXhKSDq+2kAArBlmRBvcvFE5BB1HZKXtSFASDhdlz9zOYwxh8lDdnvmMOe/+5cdoEdg==",
      "license": "MIT",
      "dependencies": {
        "delayed-stream": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/commander": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/commander/-/commander-4.1.1.tgz",
      "integrity": "sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/cookie": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-1.1.1.tgz",
      "integrity": "sha512-ei8Aos7ja0weRpFzJnEA9UHJ/7XQmqglbRwnf2ATjcB9Wq874VKH9kfjjirM6UhU2/E5fFYadylyhFldcqSidQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/cssesc": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/cssesc/-/cssesc-3.0.0.tgz",
      "integrity": "sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "cssesc": "bin/cssesc"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "license": "MIT"
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/delayed-stream": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/delayed-stream/-/delayed-stream-1.0.0.tgz",
      "integrity": "sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/didyoumean": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/didyoumean/-/didyoumean-1.2.2.tgz",
      "integrity": "sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/dlv": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/dlv/-/dlv-1.1.3.tgz",
      "integrity": "sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.439",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.439.tgz",
      "integrity": "sha512-qu6QIPXhsb+CRcAiTMNjR4A1y/7tCYKkKjr5CZXRVih6qkDf79peZ2BpEU3qoDBNCRrcy3Mra3X9nG5oruuA7Q==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.2.tgz",
      "integrity": "sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-set-tostringtag": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/es-set-tostringtag/-/es-set-tostringtag-2.1.0.tgz",
      "integrity": "sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6",
        "has-tostringtag": "^1.0.2",
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/fast-glob": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/fast-glob/-/fast-glob-3.3.3.tgz",
      "integrity": "sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "^2.0.2",
        "@nodelib/fs.walk": "^1.2.3",
        "glob-parent": "^5.1.2",
        "merge2": "^1.3.0",
        "micromatch": "^4.0.8"
      },
      "engines": {
        "node": ">=8.6.0"
      }
    },
    "node_modules/fast-glob/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/fastq": {
      "version": "1.20.3",
      "resolved": "https://registry.npmjs.org/fastq/-/fastq-1.20.3.tgz",
      "integrity": "sha512-XKv5nnLs6nLF71NgiKJLIZFLkPyIEuOselLG7ujZnGrRfQK8HpvY+WqKhAJUAdLomwVHErVS4LfxFlPq0/FTAw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "reusify": "^1.0.4"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/follow-redirects": {
      "version": "1.16.0",
      "resolved": "https://registry.npmjs.org/follow-redirects/-/follow-redirects-1.16.0.tgz",
      "integrity": "sha512-y5rN/uOsadFT/JfYwhxRS5R7Qce+g3zG97+JrtFZlC9klX/W5hD7iiLzScI4nZqUS7DNUdhPgw4xI8W2LuXlUw==",
      "funding": [
        {
          "type": "individual",
          "url": "https://github.com/sponsors/RubenVerborgh"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=4.0"
      },
      "peerDependenciesMeta": {
        "debug": {
          "optional": true
        }
      }
    },
    "node_modules/form-data": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/form-data/-/form-data-4.0.6.tgz",
      "integrity": "sha512-vKatAh4SlVfgbv+YtmhiRjhEMJsYpsG1Y2rMQtR+SVSbytsSD1YGzDIcrAJmdFec88u/+VoGmxnl+80gL1tRCQ==",
      "license": "MIT",
      "dependencies": {
        "asynckit": "^0.4.0",
        "combined-stream": "^1.0.8",
        "es-set-tostringtag": "^2.1.0",
        "hasown": "^2.0.4",
        "mime-types": "^2.1.35"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/fraction.js": {
      "version": "5.3.4",
      "resolved": "https://registry.npmjs.org/fraction.js/-/fraction.js-5.3.4.tgz",
      "integrity": "sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "*"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/rawify"
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/goober": {
      "version": "2.1.19",
      "resolved": "https://registry.npmjs.org/goober/-/goober-2.1.19.tgz",
      "integrity": "sha512-U7veizMqxyKlM58+Z5j2ngJBH/r9siDmxpvNxSw0PylF6WQvrASJEZrxh1hidRBJc2jqoBVSyOban5u8m+6Rxg==",
      "license": "MIT",
      "peerDependencies": {
        "csstype": "^3.0.10"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-tostringtag": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/has-tostringtag/-/has-tostringtag-1.0.2.tgz",
      "integrity": "sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==",
      "license": "MIT",
      "dependencies": {
        "has-symbols": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.4.tgz",
      "integrity": "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==",
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/https-proxy-agent": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-5.0.1.tgz",
      "integrity": "sha512-dFcAjpTQFgoLMzC2VwU+C/CbS7uRL0lWmxDITmqm7C+7F0Odmj6s9l6alZc6AELXhrnggM2CeWSXHGOdX2YtwA==",
      "license": "MIT",
      "dependencies": {
        "agent-base": "6",
        "debug": "4"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/is-binary-path": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/is-binary-path/-/is-binary-path-2.1.0.tgz",
      "integrity": "sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "binary-extensions": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-core-module": {
      "version": "2.17.0",
      "resolved": "https://registry.npmjs.org/is-core-module/-/is-core-module-2.17.0.tgz",
      "integrity": "sha512-J/vG0zBCbIKOQFfufSwyXdMrsohyJIUNkrnmo6WZGzoM7tr/lsbfW5b2BvisL6zsyMzK9UxV9L6c7AoFbyXHOA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/jiti": {
      "version": "1.21.7",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-1.21.7.tgz",
      "integrity": "sha512-/imKNG4EbWNrVjoNC/1H5/9GFy+tqjGBHCaSsN+P2RnPqjsLmv6UD3Ej+Kj8nBWaRAwyk7kK5ZUc+OEatnTR3A==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jiti": "bin/jiti.js"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.33.0.tgz",
      "integrity": "sha512-WkUDrojuJs0xkgGf2udWxa3yGBRxPtxUkB79i6aCZLRgc7PM8fZe9TosfPDcvEpQZbuFASnHYmRLBLUbmLOIIA==",
      "dev": true,
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.33.0",
        "lightningcss-darwin-arm64": "1.33.0",
        "lightningcss-darwin-x64": "1.33.0",
        "lightningcss-freebsd-x64": "1.33.0",
        "lightningcss-linux-arm-gnueabihf": "1.33.0",
        "lightningcss-linux-arm64-gnu": "1.33.0",
        "lightningcss-linux-arm64-musl": "1.33.0",
        "lightningcss-linux-x64-gnu": "1.33.0",
        "lightningcss-linux-x64-musl": "1.33.0",
        "lightningcss-win32-arm64-msvc": "1.33.0",
        "lightningcss-win32-x64-msvc": "1.33.0"
      }
    },
    "node_modules/lightningcss-android-arm64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.33.0.tgz",
      "integrity": "sha512-gEpRTalKdosp4Bb8qWtc2iOgE5SeIHlpS1up9bFq2wAyYhl1UdTObYiHe98zEM9SQvSoqQZ1IQD0JNpg3Ml5pg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.33.0.tgz",
      "integrity": "sha512-Sciaz8eenNTKn9b3t7+xr0ipTp9YxKQY4npwQ3mrRuL0BAVHBLyZxofhaKBAVtzmtRZ/zTyo0/to4B1uWG/Djg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-x64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.33.0.tgz",
      "integrity": "sha512-Z5UPAxzrjlWNNyGy6i65cJzzvgJ5D3T6wMvs+gWpY9d7qRhANrxqAp6LhxIgZhWEw18RfJTGcRxjuLIBr+m8XQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-freebsd-x64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.33.0.tgz",
      "integrity": "sha512-QQM/Ti/hQajJwCY+RiWuCZ9sdtI/XQk7nDK5vC8kkdwixezOlDgvDx7+RT+QjK6FcFT4MpsuoBnHIo/O3StRRg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm-gnueabihf": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.33.0.tgz",
      "integrity": "sha512-N7FVBe6iS24MlM6R/4RBTxGhQheZGs7tiQ9U32UtF75NzP5Q7xWPRqLBCKxlRQRk3rY1jCIPLzx7WzOhuUIRLQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-gnu": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.33.0.tgz",
      "integrity": "sha512-j2v/itmy4HlNxlc6voKXYgBqNi0Ng2LShg4z7GufpEgs05P+2suBVyi9I6YHq5uoVFx9ETin3eCEhLVyXGQnKg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-musl": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.33.0.tgz",
      "integrity": "sha512-yiO5ROMuYQgXbC60yjZU5CYSFZGKXL0HFATXt9mHJn1+zW55oCtMI9NfcVhYLMFDL7gV7oBPon/EmMMGg2OvtQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.33.0.tgz",
      "integrity": "sha512-ar+Ju7LmcN0Jo4FpL4hpFybwNG9/3A/Br5KW2n2jyODg3MEZXaDYADdemoNS+BDNfMgKvylJLj4S5tyRActuAg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-musl": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.33.0.tgz",
      "integrity": "sha512-RYiYbkokw0trfKqqzfF55lginwEPrD3OJDfTuJzFs1MK6iFnDenaz1fqLLtX4ITG3OktJQXOeTaw1awrBAlZPw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-arm64-msvc": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.33.0.tgz",
      "integrity": "sha512-1K+MPfLSFVpphzpdbfkhlWk6wBrTObBzS2T6db10PNOZgR9GoVsAWzwNyuhUYYbTp23j+4RrncfujZ4uAzXvwA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.33.0.tgz",
      "integrity": "sha512-OlEICDx/Xl0FqSp4bry8zFnCvGpig3Gl4gCquvYwHuqJKEC1+n9NgDniFvqHGmMv1ZkqDJrDqKKSykTDX+ehuA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lilconfig": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/lilconfig/-/lilconfig-3.1.3.tgz",
      "integrity": "sha512-/vlFKAoH5Cgt3Ie+JLhRbwOsCQePABiU3tJ1egGvyQ+33R/vcwM2Zl2QR/LzjsBeItPt3oSVXapn+m4nQDvpzw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/antonk52"
      }
    },
    "node_modules/lines-and-columns": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/lines-and-columns/-/lines-and-columns-1.2.4.tgz",
      "integrity": "sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/merge2": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/merge2/-/merge2-1.4.1.tgz",
      "integrity": "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/micromatch": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/micromatch/-/micromatch-4.0.8.tgz",
      "integrity": "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "braces": "^3.0.3",
        "picomatch": "^2.3.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/micromatch/node_modules/picomatch": {
      "version": "2.3.2",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.2.tgz",
      "integrity": "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/mz": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/mz/-/mz-2.7.0.tgz",
      "integrity": "sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "any-promise": "^1.0.0",
        "object-assign": "^4.0.1",
        "thenify-all": "^1.0.0"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.19",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.19.tgz",
      "integrity": "sha512-Y2tUNy4ouw6tq5oDSKeQYGOyhkUBhNOcGV/02KC+6kd9eDGqdZd++mjMiIDilrBYvjEnCYvVtsuHCuP+okSfug==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/node-releases": {
      "version": "2.0.57",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.57.tgz",
      "integrity": "sha512-kQK9LGGFiHtrWiNhZtA7Qbw17AQz+dmsEKODRIVTXA9+e5MS/2gZEBhYJt13GrAz5/IOZKddH/0Z3TP/Zgo+yw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/normalize-path": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/normalize-path/-/normalize-path-3.0.0.tgz",
      "integrity": "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-hash": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/object-hash/-/object-hash-3.0.0.tgz",
      "integrity": "sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/oxlint": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/oxlint/-/oxlint-1.85.0.tgz",
      "integrity": "sha512-bc26s97nuvPj1ViyPsqmKecVkUWFMEdtayO8MaQ6oiLfs1pj94cQlZZhrh4BPNlr9HQosjhIlwgZKsfcwmcNgg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "oxlint": "bin/oxlint"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/oxc-project"
      },
      "optionalDependencies": {
        "@oxlint/binding-android-arm-eabi": "1.85.0",
        "@oxlint/binding-android-arm64": "1.85.0",
        "@oxlint/binding-darwin-arm64": "1.85.0",
        "@oxlint/binding-darwin-x64": "1.85.0",
        "@oxlint/binding-freebsd-x64": "1.85.0",
        "@oxlint/binding-linux-arm-gnueabihf": "1.85.0",
        "@oxlint/binding-linux-arm-musleabihf": "1.85.0",
        "@oxlint/binding-linux-arm64-gnu": "1.85.0",
        "@oxlint/binding-linux-arm64-musl": "1.85.0",
        "@oxlint/binding-linux-ppc64-gnu": "1.85.0",
        "@oxlint/binding-linux-riscv64-gnu": "1.85.0",
        "@oxlint/binding-linux-riscv64-musl": "1.85.0",
        "@oxlint/binding-linux-s390x-gnu": "1.85.0",
        "@oxlint/binding-linux-x64-gnu": "1.85.0",
        "@oxlint/binding-linux-x64-musl": "1.85.0",
        "@oxlint/binding-openharmony-arm64": "1.85.0",
        "@oxlint/binding-win32-arm64-msvc": "1.85.0",
        "@oxlint/binding-win32-ia32-msvc": "1.85.0",
        "@oxlint/binding-win32-x64-msvc": "1.85.0"
      },
      "peerDependencies": {
        "oxlint-tsgolint": ">=7.0.2001",
        "vite-plus": "*"
      },
      "peerDependenciesMeta": {
        "oxlint-tsgolint": {
          "optional": true
        },
        "vite-plus": {
          "optional": true
        }
      }
    },
    "node_modules/path-parse": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/path-parse/-/path-parse-1.0.7.tgz",
      "integrity": "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/pirates": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/pirates/-/pirates-4.0.7.tgz",
      "integrity": "sha512-TfySrs/5nm8fQJDcBDuUng3VOUKsd7S+zqvbOTiGXHfxX4wK31ard+hoNuvkicM/2YFzlpDgABOevKSsB4G/FA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.28",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.28.tgz",
      "integrity": "sha512-RRuzqDtt5Y9h3quz5hWhK+TPnsmVs6WwSU6LkJMeY4HstUEDuYTG8UJSdawMRzmzAtV+KEoG8N3Qg2qLy5vM/A==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.18",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss-import": {
      "version": "15.1.0",
      "resolved": "https://registry.npmjs.org/postcss-import/-/postcss-import-15.1.0.tgz",
      "integrity": "sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "postcss-value-parser": "^4.0.0",
        "read-cache": "^1.0.0",
        "resolve": "^1.1.7"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "peerDependencies": {
        "postcss": "^8.0.0"
      }
    },
    "node_modules/postcss-js": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/postcss-js/-/postcss-js-4.1.0.tgz",
      "integrity": "sha512-oIAOTqgIo7q2EOwbhb8UalYePMvYoIeRY2YKntdpFQXNosSu3vLrniGgmH9OKs/qAkfoj5oB3le/7mINW1LCfw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "camelcase-css": "^2.0.1"
      },
      "engines": {
        "node": "^12 || ^14 || >= 16"
      },
      "peerDependencies": {
        "postcss": "^8.4.21"
      }
    },
    "node_modules/postcss-load-config": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/postcss-load-config/-/postcss-load-config-6.0.1.tgz",
      "integrity": "sha512-oPtTM4oerL+UXmx+93ytZVN82RrlY/wPUV8IeDxFrzIjXOLF1pN+EmKPLbubvKHT2HC20xXsCAH2Z+CKV6Oz/g==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "lilconfig": "^3.1.1"
      },
      "engines": {
        "node": ">= 18"
      },
      "peerDependencies": {
        "jiti": ">=1.21.0",
        "postcss": ">=8.0.9",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        },
        "postcss": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/postcss-nested": {
      "version": "6.2.0",
      "resolved": "https://registry.npmjs.org/postcss-nested/-/postcss-nested-6.2.0.tgz",
      "integrity": "sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "postcss-selector-parser": "^6.1.1"
      },
      "engines": {
        "node": ">=12.0"
      },
      "peerDependencies": {
        "postcss": "^8.2.14"
      }
    },
    "node_modules/postcss-selector-parser": {
      "version": "6.1.4",
      "resolved": "https://registry.npmjs.org/postcss-selector-parser/-/postcss-selector-parser-6.1.4.tgz",
      "integrity": "sha512-bIoJLOmjCO1S9XdY/DcnR5hJxvrDir1PbGChrzXG3vw0/FOliy/fA3dmdhQ441kah4gKv+TwckGzex6wNS5cnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "cssesc": "^3.0.0",
        "util-deprecate": "^1.0.2"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/postcss-value-parser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/postcss-value-parser/-/postcss-value-parser-4.2.0.tgz",
      "integrity": "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/proxy-from-env": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/proxy-from-env/-/proxy-from-env-2.1.0.tgz",
      "integrity": "sha512-cJ+oHTW1VAEa8cJslgmUZrc+sjRKgAKl3Zyse6+PV38hZe/V6Z14TbCuXcan9F9ghlz4QrFr2c92TNF82UkYHA==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/queue-microtask": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/queue-microtask/-/queue-microtask-1.2.3.tgz",
      "integrity": "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/react": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/react/-/react-19.3.0.tgz",
      "integrity": "sha512-E8LUcbtBWt20bbl2YoHfx4ZDBdxVTfOKtCZn9cDSJ4l6/nuoApcpIBcj47t2wZoVX8g2ZHuMHbiShgCR1T5Sog==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.3.0.tgz",
      "integrity": "sha512-JDk8dgif51OjFoDE70+OT9ICyYr+69HlmihNwp1+Nsfbna3t5sIiCa9ZJktDmQ4/1b/rn26hIAR2uYXDMr5r0Q==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.28.0"
      },
      "peerDependencies": {
        "react": "^19.3.0"
      }
    },
    "node_modules/react-hot-toast": {
      "version": "2.6.1",
      "resolved": "https://registry.npmjs.org/react-hot-toast/-/react-hot-toast-2.6.1.tgz",
      "integrity": "sha512-gjFsf05dxcku0FkyMtFH+XmYFdA2odXfBVknEr/IZ+XpUjwsgvtY2616sOpUynK+l9ykQDRNpaJ1hYfuximUiA==",
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.1.3",
        "goober": "^2.1.16"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "@types/react": "*",
        "@types/react-dom": "*",
        "react": ">=16",
        "react-dom": ">=16"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        },
        "@types/react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/react-router": {
      "version": "7.18.4",
      "resolved": "https://registry.npmjs.org/react-router/-/react-router-7.18.4.tgz",
      "integrity": "sha512-PUPQcMhMGRAslLcvtlPz/kmzBEWPhLdgLFrL7pLNepBL6dX0lWj4WD2cUYVgYCuT3jxvghYFg81cDTj44DhetQ==",
      "license": "MIT",
      "dependencies": {
        "cookie": "^1.0.1",
        "set-cookie-parser": "^2.6.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "react": ">=18",
        "react-dom": ">=18"
      },
      "peerDependenciesMeta": {
        "react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/react-router-dom": {
      "version": "7.18.4",
      "resolved": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-7.18.4.tgz",
      "integrity": "sha512-yrfmJHIpDG7taCpqKjT1G5B6q3O2K+RN8/fgNf0lTjCwiPbQ0ei6vXX9ZjQR+7ld8Tr7Z5xmyMnZ8YJrphWQUw==",
      "license": "MIT",
      "dependencies": {
        "react-router": "7.18.4"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "react": ">=18",
        "react-dom": ">=18"
      }
    },
    "node_modules/read-cache": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/read-cache/-/read-cache-1.0.2.tgz",
      "integrity": "sha512-/peqiBB/n07gQGLsWaHho3WfvUyRscw0gYTsEFMhrIe/nWLkYaf5SbKYjGYqtRV3aPwykJgF2VEMo1ac4bnsGA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/readdirp": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/readdirp/-/readdirp-3.6.0.tgz",
      "integrity": "sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "picomatch": "^2.2.1"
      },
      "engines": {
        "node": ">=8.10.0"
      }
    },
    "node_modules/readdirp/node_modules/picomatch": {
      "version": "2.3.2",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.2.tgz",
      "integrity": "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/resolve": {
      "version": "1.22.12",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-1.22.12.tgz",
      "integrity": "sha512-TyeJ1zif53BPfHootBGwPRYT1RUt6oGWsaQr8UyZW/eAm9bKoijtvruSDEmZHm92CwS9nj7/fWttqPCgzep8CA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "is-core-module": "^2.16.1",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/reusify": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/reusify/-/reusify-1.1.0.tgz",
      "integrity": "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "iojs": ">=1.0.0",
        "node": ">=0.10.0"
      }
    },
    "node_modules/rolldown": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/rolldown/-/rolldown-1.2.11.tgz",
      "integrity": "sha512-qpSwIyz0jHQq5qXBTNxFmE6664rJ7O+4TvPFOiOaBSrz8IOHc1koKKSqTM2H6u1UG1+TveuC6vaDHKXFOvb1Kw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@oxc-project/types": "=0.151.0",
        "@rolldown/pluginutils": "^1.0.0"
      },
      "bin": {
        "rolldown": "bin/cli.mjs"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "optionalDependencies": {
        "@rolldown/binding-android-arm-eabi": "1.2.11",
        "@rolldown/binding-android-arm64": "1.2.11",
        "@rolldown/binding-darwin-arm64": "1.2.11",
        "@rolldown/binding-darwin-x64": "1.2.11",
        "@rolldown/binding-freebsd-x64": "1.2.11",
        "@rolldown/binding-linux-arm-gnueabihf": "1.2.11",
        "@rolldown/binding-linux-arm64-gnu": "1.2.11",
        "@rolldown/binding-linux-arm64-musl": "1.2.11",
        "@rolldown/binding-linux-ppc64-gnu": "1.2.11",
        "@rolldown/binding-linux-s390x-gnu": "1.2.11",
        "@rolldown/binding-linux-x64-gnu": "1.2.11",
        "@rolldown/binding-linux-x64-musl": "1.2.11",
        "@rolldown/binding-openharmony-arm64": "1.2.11",
        "@rolldown/binding-win32-arm64-msvc": "1.2.11",
        "@rolldown/binding-win32-x64-msvc": "1.2.11"
      }
    },
    "node_modules/run-parallel": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/run-parallel/-/run-parallel-1.2.0.tgz",
      "integrity": "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "queue-microtask": "^1.2.2"
      }
    },
    "node_modules/scheduler": {
      "version": "0.28.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.28.0.tgz",
      "integrity": "sha512-juorfCmIkIw8tT+p5BXSm6PJjQF/ycEYmKyzURCIt/RaZIhL+PulbQ9Yu2z1HdOJDdqDTlxA1+xKBmHXJsczAw==",
      "license": "MIT"
    },
    "node_modules/set-cookie-parser": {
      "version": "2.7.2",
      "resolved": "https://registry.npmjs.org/set-cookie-parser/-/set-cookie-parser-2.7.2.tgz",
      "integrity": "sha512-oeM1lpU/UvhTxw+g3cIfxXHyJRc/uidd3yK1P242gzHds0udQBYzs3y8j4gCCW+ZJ7ad0yctld8RYO+bdurlvw==",
      "license": "MIT"
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/sucrase": {
      "version": "3.35.1",
      "resolved": "https://registry.npmjs.org/sucrase/-/sucrase-3.35.1.tgz",
      "integrity": "sha512-DhuTmvZWux4H1UOnWMB3sk0sbaCVOoQZjv8u1rDoTV0HTdGem9hkAZtl4JZy8P2z4Bg0nT+YMeOFyVr4zcG5Tw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.2",
        "commander": "^4.0.0",
        "lines-and-columns": "^1.1.6",
        "mz": "^2.7.0",
        "pirates": "^4.0.1",
        "tinyglobby": "^0.2.11",
        "ts-interface-checker": "^0.1.9"
      },
      "bin": {
        "sucrase": "bin/sucrase",
        "sucrase-node": "bin/sucrase-node"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/supports-preserve-symlinks-flag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/supports-preserve-symlinks-flag/-/supports-preserve-symlinks-flag-1.0.0.tgz",
      "integrity": "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/tailwindcss": {
      "version": "3.4.19",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-3.4.19.tgz",
      "integrity": "sha512-3ofp+LL8E+pK/JuPLPggVAIaEuhvIz4qNcf3nA1Xn2o/7fb7s/TYpHhwGDv1ZU3PkBluUVaF8PyCHcm48cKLWQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "arg": "^5.0.2",
        "chokidar": "^3.6.0",
        "didyoumean": "^1.2.2",
        "dlv": "^1.1.3",
        "fast-glob": "^3.3.2",
        "glob-parent": "^6.0.2",
        "is-glob": "^4.0.3",
        "jiti": "^1.21.7",
        "lilconfig": "^3.1.3",
        "micromatch": "^4.0.8",
        "normalize-path": "^3.0.0",
        "object-hash": "^3.0.0",
        "picocolors": "^1.1.1",
        "postcss": "^8.4.47",
        "postcss-import": "^15.1.0",
        "postcss-js": "^4.0.1",
        "postcss-load-config": "^4.0.2 || ^5.0 || ^6.0",
        "postcss-nested": "^6.2.0",
        "postcss-selector-parser": "^6.1.2",
        "resolve": "^1.22.8",
        "sucrase": "^3.35.0"
      },
      "bin": {
        "tailwind": "lib/cli.js",
        "tailwindcss": "lib/cli.js"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/thenify": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/thenify/-/thenify-3.3.1.tgz",
      "integrity": "sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "any-promise": "^1.0.0"
      }
    },
    "node_modules/thenify-all": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/thenify-all/-/thenify-all-1.6.0.tgz",
      "integrity": "sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "thenify": ">= 3.1.0 < 4"
      },
      "engines": {
        "node": ">=0.8"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/ts-interface-checker": {
      "version": "0.1.13",
      "resolved": "https://registry.npmjs.org/ts-interface-checker/-/ts-interface-checker-0.1.13.tgz",
      "integrity": "sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==",
      "dev": true,
      "license": "Apache-2.0"
    },
    "node_modules/update-browserslist-db": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.3.3.tgz",
      "integrity": "sha512-pJ2sYawQS0R/WI928Gj5GlPhTGzbMelq0+4INtSYNDV9ErKJcX6xjGWkoG/VnB3dpUm00zALaqkrUD77pO5TDQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/vite": {
      "version": "8.3.1",
      "resolved": "https://registry.npmjs.org/vite/-/vite-8.3.1.tgz",
      "integrity": "sha512-/bvH9E9tmCXRGp2uXY3WbOldqpTwFkbha/8ANaEQ6VkxhH60KyqLwgZq6lG2y+4uT55x9+9eUHMpQ7uGnOCKjA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "lightningcss": "^1.33.0",
        "picomatch": "^4.0.7",
        "postcss": "^8.5.28",
        "rolldown": "~1.2.9",
        "tinyglobby": "^0.2.17"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^20.19.0 || >=22.12.0",
        "@vitejs/devtools": "^0.7.1",
        "esbuild": "^0.27.0 || ^0.28.0",
        "jiti": ">=1.21.0",
        "less": "^4.0.0",
        "sass": "^1.70.0",
        "sass-embedded": "^1.70.0",
        "stylus": ">=0.54.8",
        "sugarss": "^5.0.0",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "@vitejs/devtools": {
          "optional": true
        },
        "esbuild": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    }
  }
}

```

# frontend\package.json

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.20.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-hot-toast": "^2.6.1",
    "react-router-dom": "^7.18.4"
  },
  "devDependencies": {
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "autoprefixer": "^10.6.1",
    "oxlint": "^1.81.0",
    "postcss": "^8.5.28",
    "tailwindcss": "^3.4.19",
    "vite": "^8.3.0"
  }
}

```

# frontend\postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

# frontend\public\echolock-mark.svg

```plaintext
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="18" fill="#304487"/>
  <path d="M32 10.5 49 17v13.2c0 11.1-6.9 19.8-17 24.3-10.1-4.5-17-13.2-17-24.3V17l17-6.5Z" stroke="#fffdf7" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="32" cy="31" r="3.5" fill="#fffdf7"/>
  <path d="M23.8 27.1a9 9 0 0 0 0 7.8M40.2 27.1a9 9 0 0 1 0 7.8" stroke="#fffdf7" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M19.2 23.2a15 15 0 0 0 0 15.6M44.8 23.2a15 15 0 0 1 0 15.6" stroke="#ead9ad" stroke-width="2" stroke-linecap="round"/>
</svg>

```

# frontend\public\favicon.ico

```plaintext
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="46" fill="none" viewBox="0 0 48 46"><path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" style="fill:#863bff;fill:color(display-p3 .5252 .23 1);fill-opacity:1"/><mask id="a" width="48" height="46" x="0" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#000" d="M25.842 44.938c-.664.844-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.183c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.498 0-3.579-1.842-3.579H1.133c-.92 0-1.456-1.04-.92-1.787L9.91.473c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.578 1.842 3.578h11.377c.943 0 1.473 1.088.89 1.832L25.843 44.94z" style="fill:#000;fill-opacity:1"/></mask><g mask="url(#a)"><g filter="url(#b)"><ellipse cx="5.508" cy="14.704" fill="#ede6ff" rx="5.508" ry="14.704" style="fill:#ede6ff;fill:color(display-p3 .9275 .9033 1);fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -4.47 31.516)"/></g><g filter="url(#c)"><ellipse cx="10.399" cy="29.851" fill="#ede6ff" rx="10.399" ry="29.851" style="fill:#ede6ff;fill:color(display-p3 .9275 .9033 1);fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -39.328 7.883)"/></g><g filter="url(#d)"><ellipse cx="5.508" cy="30.487" fill="#7e14ff" rx="5.508" ry="30.487" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(89.814 -25.913 -14.639)scale(1 -1)"/></g><g filter="url(#e)"><ellipse cx="5.508" cy="30.599" fill="#7e14ff" rx="5.508" ry="30.599" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(89.814 -32.644 -3.334)scale(1 -1)"/></g><g filter="url(#f)"><ellipse cx="5.508" cy="30.599" fill="#7e14ff" rx="5.508" ry="30.599" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -34.34 30.47)"/></g><g filter="url(#g)"><ellipse cx="14.072" cy="22.078" fill="#ede6ff" rx="14.072" ry="22.078" style="fill:#ede6ff;fill:color(display-p3 .9275 .9033 1);fill-opacity:1" transform="rotate(93.35 24.506 48.493)scale(-1 1)"/></g><g filter="url(#h)"><ellipse cx="3.47" cy="21.501" fill="#7e14ff" rx="3.47" ry="21.501" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(89.009 28.708 47.59)scale(-1 1)"/></g><g filter="url(#i)"><ellipse cx="3.47" cy="21.501" fill="#7e14ff" rx="3.47" ry="21.501" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(89.009 28.708 47.59)scale(-1 1)"/></g><g filter="url(#j)"><ellipse cx=".387" cy="8.972" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(39.51 .387 8.972)"/></g><g filter="url(#k)"><ellipse cx="47.523" cy="-6.092" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(37.892 47.523 -6.092)"/></g><g filter="url(#l)"><ellipse cx="41.412" cy="6.333" fill="#47bfff" rx="5.971" ry="9.665" style="fill:#47bfff;fill:color(display-p3 .2799 .748 1);fill-opacity:1" transform="rotate(37.892 41.412 6.333)"/></g><g filter="url(#m)"><ellipse cx="-1.879" cy="38.332" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(37.892 -1.88 38.332)"/></g><g filter="url(#n)"><ellipse cx="-1.879" cy="38.332" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(37.892 -1.88 38.332)"/></g><g filter="url(#o)"><ellipse cx="35.651" cy="29.907" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(37.892 35.651 29.907)"/></g><g filter="url(#p)"><ellipse cx="38.418" cy="32.4" fill="#47bfff" rx="5.971" ry="15.297" style="fill:#47bfff;fill:color(display-p3 .2799 .748 1);fill-opacity:1" transform="rotate(37.892 38.418 32.4)"/></g></g><defs><filter id="b" width="60.045" height="41.654" x="-19.77" y="16.149" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="c" width="90.34" height="51.437" x="-54.613" y="-7.533" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="d" width="79.355" height="29.4" x="-49.64" y="2.03" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="e" width="79.579" height="29.4" x="-45.045" y="20.029" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="f" width="79.579" height="29.4" x="-43.513" y="21.178" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="g" width="74.749" height="58.852" x="15.756" y="-17.901" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="h" width="61.377" height="25.362" x="23.548" y="2.284" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="i" width="61.377" height="25.362" x="23.548" y="2.284" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="j" width="56.045" height="63.649" x="-27.636" y="-22.853" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="k" width="54.814" height="64.646" x="20.116" y="-38.415" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="l" width="33.541" height="35.313" x="24.641" y="-11.323" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="m" width="54.814" height="64.646" x="-29.286" y="6.009" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="n" width="54.814" height="64.646" x="-29.286" y="6.009" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="o" width="54.814" height="64.646" x="8.244" y="-2.416" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="p" width="39.409" height="43.623" x="18.713" y="10.588" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter></defs></svg>
```

# frontend\src\App.jsx

```jsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/common/Navbar';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import { ROUTES } from './utils/constants';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-white !text-slate-800 !border !border-slate-200 !shadow-lg !font-medium !text-sm',
          duration: 4000,
        }}
      />
    </BrowserRouter>
  </AuthProvider>
);
export default App;
```

# frontend\src\assets\logo.svg

```plaintext
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#4f46e5"/>
  <rect x="14" y="14" width="36" height="36" rx="8" stroke="#ffffff" stroke-width="2.5" stroke-opacity="0.9"/>
  <path d="M24 32h16M32 24v16" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="4" fill="#93c5fd"/>
</svg>


```

# frontend\src\components\auth\LoginForm.jsx

```jsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import Loader from '../common/Loader';
import Grid from '../grid/Grid';
import SelectedPositions from '../grid/SelectedPositions';
import LockoutBanner from '../security/LockoutBanner';
import { useGrid } from '../../hooks/useGrid';
import { useAuth } from '../../hooks/useAuth';
import { startLogin, verifyLogin } from '../../services/authService';
import { ROUTES } from '../../utils/constants';
import { validateUsername } from '../../utils/validators';

const GridSkeleton = () => (
  <div className="mx-auto grid max-w-md grid-cols-5 gap-2 sm:gap-3">
    {Array.from({ length: 25 }).map((_, i) => (
      <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-200" />
    ))}
  </div>
);

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [grid, setGrid] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [sessionPassword, setSessionPassword] = useState('');
  const [gridKey, setGridKey] = useState(0);

  const { selections, handleCellClick, resetSelections, isComplete } = useGrid();

  useEffect(() => {
    resetSelections();
  }, [gridKey, resetSelections]);

  const verifySession = useCallback(async (positions) => {
    setLoadingVerify(true);
    setStatusMessage(null);

    try {
      const { data } = await verifyLogin({ username: username.trim(), session_id: sessionId, positions });

      if (data.lockout?.locked) {
        setLockedUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString());
        setStatusMessage({ variant: 'error', text: data.lockout.message || 'Account locked due to failed attempts.' });
        toast.error(data.lockout.message || 'Account locked');
        return;
      }

      if (data.locked || data.status === 'locked') {
        setLockedUntil(data.locked_until || data.lockout_until);
        setStatusMessage({ variant: 'error', text: 'Account locked due to failed attempts.' });
        toast.error('Account locked');
        return;
      }

      if (data.success || data.status === 'success') {
        const password = data.session_password || positions.map((p) => `${p.row},${p.col}`).join('|');
        setSessionPassword(password);
        login({ username: username.trim(), sessionPassword: password });
        setStatusMessage({ variant: 'success', text: 'Authentication successful.' });
        toast.success('Welcome back!');
        setTimeout(() => navigate(ROUTES.DASHBOARD), 1500);
        return;
      }

      setStatusMessage({ variant: 'error', text: data.message || 'Authentication failed.' });
      toast.error('Invalid selection-try again');
      setGridKey((k) => k + 1);
    } catch (err) {
      const msg = err.message || 'Verification failed';
      if (msg.toLowerCase().includes('lock')) setLockedUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString());
      setStatusMessage({ variant: 'error', text: msg });
      toast.error(msg);
      setGridKey((k) => k + 1);
    } finally {
      setLoadingVerify(false);
    }
  }, [sessionId, username, login, navigate]);

  useEffect(() => {
    if (!isComplete || loadingVerify || sessionPassword) return;
    verifySession(selections.map(({ row, col }) => ({ row, col })));
  }, [isComplete, selections, loadingVerify, sessionPassword, verifySession]);

  const handleStartLogin = async (e) => {
    e.preventDefault();
    const err = validateUsername(username);
    setUsernameError(err);
    if (err) return;

    setLoadingStart(true);
    setStatusMessage(null);
    setLockedUntil(null);

    try {
      const { data } = await startLogin(username);
      setGrid(data.grid);
      setSessionId(data.session_id);
      setStep(2);
      setGridKey((k) => k + 1);
      toast.success('Grid loaded-select your secret pattern');
    } catch (err) {
      const msg = err.message || 'Could not start login session';
      toast.error(msg);
      setStatusMessage({ variant: 'error', text: msg });
    } finally {
      setLoadingStart(false);
    }
  };

  const copySessionPassword = async () => {
    try {
      await navigator.clipboard.writeText(sessionPassword);
      toast.success('Session password copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  if (lockedUntil) {
    return (
      <div className="space-y-4">
        <LockoutBanner lockedUntil={lockedUntil} />
        <Button variant="secondary" className="w-full" onClick={() => setLockedUntil(null)}>Back</Button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <form onSubmit={handleStartLogin} className="space-y-4">
        {statusMessage && <Alert variant={statusMessage.variant}>{statusMessage.text}</Alert>}
        <Input label="Username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username" error={usernameError} />
        <Button type="submit" className="w-full" loading={loadingStart}>Continue to grid</Button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {statusMessage && <Alert variant={statusMessage.variant}>{statusMessage.text}</Alert>}

      {sessionPassword && (
        <Alert variant="success">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              One-time session password:{' '}
              <code className="rounded-md bg-white border border-emerald-300 px-2.5 py-1 text-emerald-800 font-mono font-bold">{sessionPassword}</code>
            </span>
            <Button size="sm" variant="secondary" onClick={copySessionPassword}>Copy</Button>
          </div>
        </Alert>
      )}

      <p className="text-center text-sm text-slate-600">
        Signed in as <span className="font-semibold text-indigo-600">{username}</span>
      </p>

      {loadingStart ? (
        <Loader label="Loading grid..." />
      ) : grid ? (
        <Grid key={gridKey} grid={grid} selections={selections} onCellClick={(r, c) => !loadingVerify && !isComplete && !sessionPassword && handleCellClick(r, c, grid)} disabled={loadingVerify || !!sessionPassword} />
      ) : (
        <GridSkeleton />
      )}

      <SelectedPositions selections={selections} />
      {loadingVerify && <Loader size="sm" label="Verifying..." />}

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => { setStep(1); setGrid(null); resetSelections(); setStatusMessage(null); }} disabled={loadingVerify}>Change user</Button>
        <Button variant="secondary" className="flex-1" onClick={() => setGridKey((k) => k + 1)} disabled={loadingVerify || !!sessionPassword}>Reset selection</Button>
      </div>
    </div>
  );
};

export default LoginForm;
```

# frontend\src\components\auth\RegisterForm.jsx

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import { registerUser } from '../../services/authService';
import { ROUTES } from '../../utils/constants';
import { parseSecretChars, validateUsername } from '../../utils/validators';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [secretChars, setSecretChars] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const usernameError = validateUsername(username);
    const { chars, error: secretError } = parseSecretChars(secretChars);
    setErrors({ username: usernameError, secretChars: secretError });
    if (usernameError || secretError) return;

    setLoading(true);
    try {
      await registerUser({ username, secretChars: chars.join(',') });
      toast.success('Account created! You can sign in now.');
      navigate(ROUTES.LOGIN);
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && <Alert variant="error">{apiError}</Alert>}
      <Input label="Username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" error={errors.username} />
      <Input label="Secret characters" name="secretChars" value={secretChars} onChange={(e) => setSecretChars(e.target.value)} placeholder="A, B, C, D, E, F, G, H" error={errors.secretChars} />
      <p className="-mt-2 text-xs text-slate-500 leading-relaxed">Register 8 secret characters. At login you will click their positions on a dynamic grid.</p>
      <Button type="submit" className="w-full" loading={loading}>Create account</Button>
    </form>
  );
};

export default RegisterForm;
```

# frontend\src\components\common\Alert.jsx

```jsx
const Alert = ({ variant = 'info', children, className = '' }) => {
  const styles = {
    info: 'border-blue-200 bg-blue-50/80 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50/80 text-amber-900',
    error: 'border-rose-200 bg-rose-50/80 text-rose-900',
  };
  return (
    <div className={`rounded-xl border p-3.5 text-sm font-medium ${styles[variant]} ${className}`} role="alert">
      {children}
    </div>
  );
};
export default Alert;
```

# frontend\src\components\common\Button.jsx

```jsx
const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) => {
  const variants = {
    primary: 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm shadow-indigo-900/15 focus:ring-indigo-500',
    secondary: 'bg-cream-50 border border-slate-300/90 text-slate-700 hover:bg-white hover:text-indigo-900 shadow-sm focus:ring-indigo-500',
    danger: 'bg-rose-700 hover:bg-rose-800 text-white shadow-sm focus:ring-rose-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs sm:text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2 font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
};
export default Button;
```

# frontend\src\components\common\Card.jsx

```jsx
const Card = ({ children, title, subtitle, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200/80 bg-cream-50 p-6 shadow-[0_12px_36px_-24px_rgba(37,50,91,0.28)] transition-shadow duration-200 hover:shadow-[0_18px_42px_-24px_rgba(37,50,91,0.34)] ${className}`}>
    {(title || subtitle) && (
      <header className="mb-5">
        {title && <h2 className="text-lg font-bold tracking-tight text-indigo-950">{title}</h2>}
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </header>
    )}
    {children}
  </div>
);
export default Card;
```

# frontend\src\components\common\Input.jsx

```jsx
const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  name,
  id,
  disabled = false,
}) => {
  const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-lg border bg-white/80 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:opacity-60 ${
          error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20'
        }`}
      />
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
};
export default Input;
```

# frontend\src\components\common\Loader.jsx

```jsx
const Loader = ({ size = 'md', label = 'Loading...' }) => {
  const sizes = { sm: 'h-6 w-6 border-2', md: 'h-10 w-10 border-[3px]', lg: 'h-14 w-14 border-4' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6" role="status">
      <div className={`animate-spin rounded-full border-indigo-600 border-t-transparent ${sizes[size]}`} />
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  );
};
export default Loader;
```

# frontend\src\components\common\Navbar.jsx

```jsx
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import Button from './Button';

const navLinkClass = ({ isActive }) => `inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'}`;

const mobileNavLinkClass = ({ isActive }) => `block px-4 py-2.5 rounded-lg text-base font-medium transition-all ${isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`;

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to={ROUTES.HOME} onClick={closeMenu} className="group flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-4">
            <img src="/echolock-mark.svg" alt="" aria-hidden="true" className="h-9 w-9 rounded-xl shadow-sm shadow-indigo-950/15 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105" />
            <span className="text-xl font-bold tracking-[-0.045em] text-indigo-950">Echo<span className="text-indigo-600">Lock</span></span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
          <NavLink to={ROUTES.HOME} className={navLinkClass}>Home</NavLink>
          {isAuthenticated && <NavLink to={ROUTES.DASHBOARD} className={navLinkClass}>Dashboard</NavLink>}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 shadow-xs">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs">{user?.username ? user.username[0].toUpperCase() : 'U'}</span>
                <span className="text-sm font-semibold text-slate-800">{user?.username}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={logout} className="gap-1.5 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to={ROUTES.LOGIN}><Button variant="secondary" size="sm">Sign in</Button></Link>
              <Link to={ROUTES.REGISTER}><Button size="sm">Get started</Button></Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-expanded={mobileMenuOpen} aria-label="Toggle navigation menu">
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-cream-50 px-4 pt-2 pb-5 shadow-lg md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1">
            <NavLink to={ROUTES.HOME} onClick={closeMenu} className={mobileNavLinkClass}>Home</NavLink>
            {isAuthenticated && <NavLink to={ROUTES.DASHBOARD} onClick={closeMenu} className={mobileNavLinkClass}>Dashboard</NavLink>}
          </nav>

          <div className="mt-4 pt-4 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{user?.username ? user.username[0].toUpperCase() : 'U'}</span>
                  <span className="text-sm font-semibold text-slate-800">{user?.username}</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { logout(); closeMenu(); }}>Log out</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to={ROUTES.LOGIN} onClick={closeMenu}><Button variant="secondary" className="w-full">Sign in</Button></Link>
                <Link to={ROUTES.REGISTER} onClick={closeMenu}><Button className="w-full">Get started</Button></Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
```

# frontend\src\components\grid\Grid.jsx

```jsx
import GridCell from './GridCell';

const Grid = ({ grid, selections, onCellClick, disabled = false }) => {
  if (!grid?.length) return null;

  return (
    <div className="mx-auto grid max-w-md grid-cols-5 gap-2 sm:gap-3" role="grid">
      {grid.map((row, r) =>
        row.map((char, c) => {
          const sel = selections.find((s) => s.row === r && s.col === c);
          return (
            <GridCell
              key={`${r}-${c}`}
              char={char}
              row={r}
              col={c}
              isSelected={!!sel}
              order={sel?.order ?? null}
              onClick={(row, col) => !disabled && onCellClick(row, col)}
            />
          );
        })
      )}
    </div>
  );
};
export default Grid;
```

# frontend\src\components\grid\GridCell.jsx

```jsx
const GridCell = ({ char, row, col, isSelected, order, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(row, col)}
    className={`relative aspect-square w-full rounded-xl border-2 text-lg font-bold transition-all sm:text-xl ${
      isSelected
        ? 'border-indigo-700 bg-indigo-700 text-white shadow-md shadow-indigo-900/20 scale-[0.97]'
        : 'border-slate-200/90 bg-cream-50 text-slate-800 shadow-sm hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-800 active:scale-95'
    }`}
  >
    {char}
    {isSelected && order != null && (
      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cream-200 text-xs font-bold text-indigo-950 ring-2 ring-cream-50 shadow-sm">
        {order}
      </span>
    )}
  </button>
);
export default GridCell;
```

# frontend\src\components\grid\SelectedPositions.jsx

```jsx
const SelectedPositions = ({ selections }) => {
  if (!selections.length) {
    return <p className="text-center text-sm font-medium text-slate-500">Click your 3 secret characters in order on the grid.</p>;
  }

  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {selections.map((sel) => (
        <li
          key={`${sel.row}-${sel.col}`}
          className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-sm font-medium"
        >
          <span className="font-bold text-indigo-600">{sel.order}.</span>{' '}
          <span className="text-slate-800">
            {sel.char ?? '?'} at ({sel.row + 1}, {sel.col + 1})
          </span>
        </li>
      ))}
    </ul>
  );
};
export default SelectedPositions;
```

# frontend\src\components\security\LeakageReport.jsx

```jsx
import Alert from '../common/Alert';
import Loader from '../common/Loader';
import { LEAKAGE_STATUS } from '../../utils/constants';

const LeakageReport = ({ report, loading, error }) => {
  if (loading) return <Loader size="sm" label="Running AI leakage analysis..." />;
  if (error) return <Alert variant="warning">Could not load leakage report: {error}</Alert>;
  if (!report) return <p className="text-sm text-slate-500">No leakage analysis report was returned.</p>;

  const hasRiskScore = typeof report.risk_score === 'number';
  const riskScore = hasRiskScore ? report.risk_score : report.score;
  const status = hasRiskScore
    ? (riskScore >= 100 ? LEAKAGE_STATUS.LEAKAGE : LEAKAGE_STATUS.SAFE)
    : (report.status || LEAKAGE_STATUS.SAFE).toLowerCase();
  const meta = {
    [LEAKAGE_STATUS.SAFE]: { variant: 'success', title: 'Safe', desc: 'No cross-session pattern leakage detected.' },
    [LEAKAGE_STATUS.WARNING]: { variant: 'warning', title: 'Warning', desc: 'Similar click patterns detected across sessions.' },
    [LEAKAGE_STATUS.LEAKAGE]: { variant: 'error', title: 'Leakage detected', desc: 'Session passwords may be predictable. Rotate secrets.' },
  }[status] || { variant: 'success', title: 'Safe', desc: 'No cross-session pattern leakage detected.' };

  return (
    <div className="space-y-3">
      <Alert variant={meta.variant}>
        <p className="font-bold">{meta.title}</p>
        <p className="mt-1 font-normal opacity-90">{report.message || meta.desc}</p>
        {typeof riskScore === 'number' && <p className="mt-2 text-xs font-semibold opacity-80">Risk score: {riskScore}/100</p>}
      </Alert>
      {report.patterns?.length > 0 && (
        <ul className="list-inside list-disc text-sm text-slate-600">
          {report.patterns.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </div>
  );
};

export default LeakageReport;
```

# frontend\src\components\security\LockoutBanner.jsx

```jsx
import { useEffect, useState } from 'react';
import Alert from '../common/Alert';

const LockoutBanner = ({ lockedUntil }) => {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const target = typeof lockedUntil === 'number'
      ? Date.now() + lockedUntil * 60000
      : (Date.parse(lockedUntil) || Date.now());

    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <Alert variant="error" className="text-center">
      <p className="font-bold">Account temporarily locked</p>
      <p className="mt-1 font-normal">
        Too many failed attempts. Try again in{' '}
        <span className="font-mono font-bold tabular-nums">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        {minutes > 0 && ` (${minutes} min remaining)`}
      </p>
    </Alert>
  );
};
export default LockoutBanner;
```

# frontend\src\context\AuthContext.jsx

```jsx
import { createContext, useCallback, useMemo, useState } from 'react';
import { AUTH_STORAGE_KEY } from '../utils/constants';

export const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback((sessionUser) => {
    setUser(sessionUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: !!user,
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

# frontend\src\hooks\useAuth.js

```javascript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
```

# frontend\src\hooks\useGrid.js

```javascript
import { useCallback, useState } from 'react';
import { REQUIRED_SECRET_CHARS } from '../utils/constants';

export const useGrid = (maxSelections = REQUIRED_SECRET_CHARS) => {
  const [selections, setSelections] = useState([]);

  const handleCellClick = useCallback(
    (row, col, grid) => {
      setSelections((prev) => {
        const already = prev.some((s) => s.row === row && s.col === col);
        if (already || prev.length >= maxSelections) return prev;
        return [
          ...prev,
          {
            row,
            col,
            order: prev.length + 1,
            char: grid?.[row]?.[col],
          },
        ];
      });
    },
    [maxSelections]
  );

  const resetSelections = useCallback(() => setSelections([]), []);

  return {
    selections,
    handleCellClick,
    resetSelections,
    isComplete: selections.length >= maxSelections,
  };
};
```

# frontend\src\main.jsx

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

# frontend\src\pages\DashboardPage.jsx

```jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import LeakageReport from '../components/security/LeakageReport';
import { useAuth } from '../hooks/useAuth';
import { getLeakageReport, getLoginHistory } from '../services/sessionService';
import { ROUTES } from '../utils/constants';

// Date formatting function with Pakistan Timezone
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi' // Pakistan Standard Time
  }).toLowerCase();

  return `${day}/${month}/${year}, ${time}`;
};

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [history, setHistory] = useState([]);
  const [leakage, setLeakage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user?.username) return;
    let mounted = true;
    setLoading(true);

    Promise.allSettled([
      getLoginHistory(user.username),
      getLeakageReport(user.username),
    ]).then(([histRes, leakRes]) => {
      if (!mounted) return;
      if (histRes.status === 'fulfilled') {
        const d = histRes.value.data;
        setHistory(Array.isArray(d) ? d : d?.history ?? []);
      } else {
        setErrors((prev) => ({ ...prev, history: histRes.reason?.message }));
      }
      if (leakRes.status === 'fulfilled') {
        setLeakage(leakRes.value.data);
      } else {
        setErrors((prev) => ({ ...prev, leakage: leakRes.reason?.message }));
      }
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [user?.username]);

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;

  return (
    <div className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          Welcome back, <span className="font-semibold text-indigo-600">{user.username}</span>
        </p>
        {user.sessionPassword && (
          <p className="mt-2 text-sm text-slate-600">
            Latest session key:{' '}
            <code className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono font-semibold text-indigo-700 shadow-xs">
              {user.sessionPassword}
            </code>
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Login history" subtitle="Recent authentication events">
          {loading ? (
            <Loader size="sm" label="Loading history..." />
          ) : errors.history ? (
            <p className="text-sm text-slate-500">History unavailable ({errors.history}).</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No login events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((row, i) => (
                    <tr key={row.id ?? i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 pr-4 text-slate-700 font-medium">
                        {formatDate(row.timestamp || row.created_at)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.success || row.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {row.success || row.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-xs">{row.ip || row.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="AI leakage analysis" subtitle="Cross-session pattern monitoring">
          <LeakageReport report={leakage} loading={loading} error={errors.leakage} />
        </Card>
      </div>
    </div>
  );
};
export default DashboardPage;
```

# frontend\src\pages\HomePage.jsx

```jsx
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { ROUTES } from '../utils/constants';

const features = [
  {
    title: 'Grid-based login',
    text: 'Each session shows a unique 5×5 character grid. Your password is where you click - not what you type.',
  },
  {
    title: 'One-time session keys',
    text: 'Click positions become a disposable session password verified securely server-side.',
  },
  {
    title: 'Lockout protection',
    text: 'Failed attempts trigger temporary lockouts to prevent automated brute-force attacks.',
  },
  {
    title: 'AI leakage monitoring',
    text: 'Cross-session analysis flags predictable patterns and protects against shoulder surfing.',
  },
];

const HomePage = () => (
  <div className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
    <section className="relative overflow-hidden rounded-[1.75rem] border border-indigo-900/10 bg-cream-50 px-6 py-12 shadow-[0_24px_70px_-42px_rgba(37,50,91,0.38)] sm:px-12 sm:py-16 lg:px-16">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[48px] border-indigo-50/80" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full border border-indigo-200/70" aria-hidden="true" />
      <div className="relative max-w-3xl">
        <div className="mb-5 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-800">
          Next-Gen Authentication
        </div>
        <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-indigo-950 sm:text-5xl lg:text-6xl">
          Security with <span className="text-gradient">EchoLock</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Register eight secret characters, then authenticate by clicking their positions on a fresh random grid every time. Stronger than static passwords, designed for modern session-based access.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to={ROUTES.REGISTER}>
            <Button size="lg" className="w-full sm:w-auto">Get started</Button>
          </Link>
          <Link to={ROUTES.LOGIN}>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </section>

    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-5">
      {features.map((feature) => (
        <Card key={feature.title} className="group relative overflow-hidden p-6 sm:p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-700 to-indigo-300" aria-hidden="true" />
          <h2 className="text-base font-bold tracking-tight text-indigo-950">{feature.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
        </Card>
      ))}
    </section>

    <section className="mt-8 rounded-2xl border border-slate-200/80 bg-cream-50 p-6 shadow-[0_12px_36px_-24px_rgba(37,50,91,0.28)] sm:p-8">
      <h2 className="text-xl font-bold tracking-tight text-indigo-950">How it works</h2>
      <ol className="mt-6 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-3">
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">1</span>
          <span>Register with a username and eight secret characters.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">2</span>
          <span>At login, enter your username and receive a dynamic random grid.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">3</span>
          <span>Click your eight secrets in order - those dynamic coordinates form your one-time session password.</span>
        </li>
      </ol>
    </section>
  </div>
);
export default HomePage;
```

# frontend\src\pages\LoginPage.jsx

```jsx
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import LoginForm from '../components/auth/LoginForm';
import { ROUTES } from '../utils/constants';

const LoginPage = () => (
  <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
    <Card title="Sign in" subtitle="Step 1: username · Step 2: click your secret pattern on the grid" >
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        New to EchoLock?{' '}
        <Link to={ROUTES.REGISTER} className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
          Register
        </Link>
      </p>
    </Card>
  </div>
);
export default LoginPage;
```

# frontend\src\pages\NotFoundPage.jsx

```jsx
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { ROUTES } from '../utils/constants';

const NotFoundPage = () => (
  <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
    <p className="text-7xl font-extrabold text-indigo-200">404</p>
    <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
    <p className="mt-2 text-sm text-slate-600"> The route you requested does not exist in EchoLock. </p>
    <Link to={ROUTES.HOME} className="mt-8">
      <Button>Back to home</Button>
    </Link>
  </div>
);
export default NotFoundPage;
```

# frontend\src\pages\RegisterPage.jsx

```jsx
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import RegisterForm from '../components/auth/RegisterForm';
import { ROUTES } from '../utils/constants';

const RegisterPage = () => (
  <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
    <Card title="Create account" subtitle="Set your username and eight secret characters.">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link to={ROUTES.LOGIN} className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  </div>
);
export default RegisterPage;
```

# frontend\src\services\api.js

```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';
    return Promise.reject(new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
);

export default API;

```

# frontend\src\services\authService.js

```javascript
import API from './api';

export const registerUser = (data) =>
  API.post('/register', {
    username: data.username.trim(),
    secret_chars: data.secretChars,
  });

export const startLogin = (username) =>
  API.get('/login/start', { params: { username: username.trim() } });

export const verifyLogin = (data) => API.post('/login/verify', data);

```

# frontend\src\services\sessionService.js

```javascript
import API from './api';

export const getLoginHistory = (username) =>
  API.get('/dashboard/history', { params: { username } });

export const getLeakageReport = (username) =>
  API.get('/dashboard/leakage', { params: { username } });
```

# frontend\src\styles\index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    background: #fbf7e9;
  }

  body {
    @apply min-h-screen text-slate-800 font-sans antialiased selection:bg-indigo-200 selection:text-indigo-950;
    background-color: #fbf7e9;
    background-image: radial-gradient(ellipse at 50% -20%, #fffdf7 0%, #fbf7e9 58%, #f5efdf 100%);
    background-attachment: fixed;
  }

  #root {
    @apply min-h-screen flex flex-col;
  }

  button,
  input {
    font: inherit;
  }
}

.text-gradient {
  @apply bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-950 bg-clip-text text-transparent;
}
```

# frontend\src\utils\constants.js

```javascript
export const GRID_SIZE = 5;
export const MIN_USERNAME_LENGTH = 3;
export const REQUIRED_SECRET_CHARS = 8;

export const ROUTES = {
  HOME: '/',
  REGISTER: '/register',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
};

export const LEAKAGE_STATUS = {
  SAFE: 'safe',
  WARNING: 'warning',
  LEAKAGE: 'leakage',
};

export const AUTH_STORAGE_KEY = 'echolock_auth';
```

# frontend\src\utils\validators.js

```javascript
import { MIN_USERNAME_LENGTH, REQUIRED_SECRET_CHARS } from './constants';

export const validateUsername = (username) => {
  const trimmed = username?.trim() ?? '';
  if (!trimmed) return 'Username is required';
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username may only contain letters, numbers, and underscores';
  }
  return null;
};

export const parseSecretChars = (input) => {
  const raw = input?.trim() ?? '';
  if (!raw) return { chars: null, error: 'Secret characters are required' };

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length !== REQUIRED_SECRET_CHARS) {
    return {
      chars: null,
      error: `Enter exactly ${REQUIRED_SECRET_CHARS} characters, comma-separated`,
    };
  }

  for (const part of parts) {
    if (part.length !== 1) {
      return { chars: null, error: 'Each secret must be a single character' };
    }
  }

  const unique = new Set(parts.map((p) => p.toUpperCase()));
  if (unique.size !== parts.length) {
    return { chars: null, error: 'Secret characters must be unique (no repeats)' };
  }

  return { chars: parts, error: null };
};
```

# frontend\tailwind.config.js

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#f1f3fb',
          100: '#e5e9f7',
          200: '#cbd3ee',
          300: '#a5b3e1',
          400: '#788ed0',
          500: '#566dbb',
          600: '#3e55a1',
          700: '#304487',
          800: '#29396f',
          900: '#25325b',
          950: '#171f3b',
        },
        cream: {
          50: '#fffdf7',
          100: '#fbf7e9',
          200: '#f4ebcf',
          300: '#ead9ad',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

# frontend\vite.config.js

```javascript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
```