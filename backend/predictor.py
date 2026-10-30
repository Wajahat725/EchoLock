import joblib
import os
import numpy as np

# Load the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'leakage_model.pkl')
model = joblib.load(MODEL_PATH)

def check_leakage(click_rank, secret_length, count, total_obs, freq):
    """
    Predicts if the observed character is the actual secret character.
    Returns True if leakage is detected (Class 1), False otherwise (Class 0).
    """
    # Prepare the feature array (must match the order in training)
    # Features: ["click_rank", "secret_length", "count", "total_obs", "freq"]
    X = np.array([[click_rank, secret_length, count, total_obs, freq]])
    
    # Predict (0 or 1)
    prediction = model.predict(X)[0]
    
    return bool(prediction)