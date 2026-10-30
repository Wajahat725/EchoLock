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