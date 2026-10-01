# security_core/grid_generator.py
import secrets
import string

def generate_grid(size=5, required_chars=None):
    """
    Random grid banao, lekin required_chars zaroor include karo.
    
    Args:
        size: Grid ka size (default 5x5)
        required_chars: List of characters jo grid mein hone chahiye
    """
    chars = string.ascii_uppercase
    
    # 1. Pehle grid ko random characters se bharo
    grid = []
    for i in range(size):
        row = []
        for j in range(size):
            row.append(secrets.choice(chars))
        grid.append(row)
    
    # 2. Agar required_chars diye hain, to unko grid mein daalo
    if required_chars:
        # Random positions choose karo
        total_cells = size * size
        positions = list(range(total_cells))
        secrets.SystemRandom().shuffle(positions)
        
        for idx, char in enumerate(required_chars):
            if idx < len(positions):
                pos = positions[idx]
                row = pos // size
                col = pos % size
                grid[row][col] = char
    
    return grid