class Maze {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        // Grid: true for wall, false for path
        this.grid = Array(height).fill().map(() => Array(width).fill(true));
    }

    generate() {
        // Start at 1,1
        this.recursiveBacktrack(1, 1);

        // Ensure some "rooms" are created by carving out 2x2 areas occasionally
        this.createRooms();

        return this.grid;
    }

    recursiveBacktrack(x, y) {
        this.grid[y][x] = false;

        const directions = [
            [0, -2], // Top
            [2, 0],  // Right
            [0, 2],  // Bottom
            [-2, 0]  // Left
        ].sort(() => Math.random() - 0.5);

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && this.grid[ny][nx]) {
                this.grid[y + dy / 2][x + dx / 2] = false;
                this.recursiveBacktrack(nx, ny);
            }
        }
    }

    createRooms() {
        // Add some random rooms to make it less like a perfect maze
        for (let i = 0; i < 5; i++) {
            const rw = Math.floor(Math.random() * 2) + 2;
            const rh = Math.floor(Math.random() * 2) + 2;
            const rx = Math.floor(Math.random() * (this.width - rw - 2)) + 1;
            const ry = Math.floor(Math.random() * (this.height - rh - 2)) + 1;

            for (let y = ry; y < ry + rh; y++) {
                for (let x = rx; x < rx + rw; x++) {
                    this.grid[y][x] = false;
                }
            }
        }
    }
}
