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