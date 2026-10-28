# security_core/grid_generator.py
import secrets
import string


def generate_grid(size=5, required_chars=None):
    """
    Random grid banao. Agar required_chars diye hain, to woh
    zaroor grid mein include honge (random positions par).
    
    Args:
        size: Grid ka size (default 5x5)
        required_chars: List of characters jo grid mein hone chahiye
                        (jaise ['M', 'N', 'O'])
    
    Returns:
        2D list (grid) of characters
    """
    chars = string.ascii_uppercase

    # Step 1: Random grid banao
    grid = []
    for i in range(size):
        row = []
        for j in range(size):
            row.append(secrets.choice(chars))
        grid.append(row)

    # Step 2: Agar required_chars diye hain, to unko grid mein daalo
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