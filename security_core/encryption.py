# security_core/encryption.py
from cryptography.fernet import Fernet
import os

# ✅ Absolute path use karo — file ke saath hi key banao
KEY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "secret.key")

def load_or_create_key():
    """Key file se load karo ya naya banao."""
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
    """Secret characters ko encrypt karo."""
    return cipher.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted: str) -> str:
    """Encrypted secret ko wapas nikalo."""
    return cipher.decrypt(encrypted.encode()).decode()