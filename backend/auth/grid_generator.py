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