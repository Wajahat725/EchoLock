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