class Book {
    constructor(scene, maze) {
        this.scene = scene;
        this.maze = maze;
        this.group = new THREE.Group();
        this.isCollected = false;

        this.init();
    }

    init() {
        // --- Create the Book Mesh ---
        const leatherMat = new THREE.MeshStandardMaterial({
            color: 0x4a2c1d, // Dark leather brown
            roughness: 0.8,
            metalness: 0.1
        });

        const paperMat = new THREE.MeshStandardMaterial({
            color: 0xfffdd0, // Old paper cream
            roughness: 1.0
        });

        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, // Gold
            emissive: 0xffd700,
            emissiveIntensity: 0.4,
            metalness: 1.0,
            roughness: 0.2
        });

        // Bottom Cover
        const bottomCover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.01, 0.42), leatherMat);
        bottomCover.position.y = -0.025;
        this.group.add(bottomCover);

        // Top Cover
        const topCover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.01, 0.42), leatherMat);
        topCover.position.y = 0.025;
        this.group.add(topCover);

        // Spine
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.42), leatherMat);
        spine.position.x = -0.155;
        this.group.add(spine);

        // Pages
        const pages = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.4), paperMat);
        this.group.add(pages);

        // Gold detailing/emblem on top
        const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.12), goldMat);
        emblem.position.y = 0.031;
        this.group.add(emblem);

        // --- Faint Gold Glow ---
        this.glow = new THREE.PointLight(0xffd700, 0.6, 3);
        this.glow.position.set(0, 0.3, 0);
        this.group.add(this.glow);

        // Randomly place it in the maze
        this.placeInMaze();

        this.scene.add(this.group);
    }

    placeInMaze() {
        if (!this.maze || !this.maze.grid) {
            this.group.position.set(5, 0.03, 5);
            return;
        }

        const cellSize = 4;
        const gridSize = 21;
        let foundValidPosition = false;

        // Try up to 50 times to find a position far from spawn
        for (let i = 0; i < 50 && !foundValidPosition; i++) {
            const rx = Math.floor(Math.random() * (gridSize - 2)) + 1;
            const rz = Math.floor(Math.random() * (gridSize - 2)) + 1;

            // Spawn is center (10, 10). Let's aim for far corners.
            const distFromSpawn = Math.sqrt(Math.pow(rx - 10, 2) + Math.pow(rz - 10, 2));

            if (!this.maze.grid[rz][rx] && distFromSpawn > 8) {
                const worldX = (rx - gridSize / 2) * cellSize + cellSize / 2;
                const worldZ = (rz - gridSize / 2) * cellSize + cellSize / 2;

                this.group.position.set(worldX, 0.04, worldZ);
                this.group.rotation.y = Math.random() * Math.PI * 2;
                foundValidPosition = true;
            }
        }

        // Fallback
        if (!foundValidPosition) {
            this.group.position.set(8, 0.04, 8);
        }
    }

    update(time) {
        if (this.isCollected) return;

        // Subtle floating/glow pulse
        const pulse = (Math.sin(time * 2.5) + 1) * 0.5;
        this.glow.intensity = 0.4 + pulse * 0.5;

        // Very slight hover
        this.group.position.y = 0.04 + Math.sin(time * 1.5) * 0.01;
    }

    collect() {
        this.isCollected = true;
        this.scene.remove(this.group);
    }
}
