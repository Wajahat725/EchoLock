# security_core/otp_generator.py
import hashlib
import hmac
import time
import os

SECRET_KEY = os.environ.get("ECHOLOCK_SECRET", "default_secret_key_change_me").encode()

def generate_session_password(positions, grid, user_id):
    """Positions se one-time password banao."""
    selected_chars = [grid[r][c] for r, c in positions]
    char_string = ''.join(selected_chars)
    session_data = f"{user_id}:{char_string}:{time.time()}"

    session_password = hmac.new(
        SECRET_KEY,
        session_data.encode(),
        hashlib.sha256
    ).hexdigest()

    return session_password