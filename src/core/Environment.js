class Environment {
    constructor(scene) {
        this.scene = scene;
        this.collidables = [];
        this.dynamicWalls = [];
        this.ceilingLights = [];
        this.createEnvironment();
    }

    createEnvironment() {
        const cellSize = 4;
        const gridSize = 21; // Must be odd
        const totalSize = cellSize * gridSize;
        const maze = new Maze(gridSize, gridSize);
        const grid = maze.generate();

        // Ensure start position is clear
        const startX = Math.floor(gridSize / 2);
        const startZ = Math.floor(gridSize / 2);
        grid[startZ][startX] = false;
        grid[startZ + 1][startX] = false; // Add a bit of space
        grid[startZ - 1][startX] = false;

        this.startPosition = new THREE.Vector3(
            (startX - gridSize / 2 + 0.5) * cellSize,
            1.6,
            (startZ - gridSize / 2 + 0.5) * cellSize
        );

        // Floor
        const floorGeometry = new THREE.BoxGeometry(totalSize, 0.1, totalSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a1a1a,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = -0.05;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.collidables.push(floor);

        // Ceiling - Darker, more textured feel
        const ceilingGeometry = new THREE.BoxGeometry(totalSize, 0.1, totalSize);
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.95,
            metalness: 0.05
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.position.y = 5.05;
        ceiling.receiveShadow = true;
        this.scene.add(ceiling);
        this.collidables.push(ceiling);

        // Build Maze Walls
        const overlap = 0.05; // Prevent seams
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const posX = (x - gridSize / 2 + 0.5) * cellSize;
                const posZ = (y - gridSize / 2 + 0.5) * cellSize;

                if (grid[y][x]) {
                    // Randomly decide to make it a dynamic wall
                    const isEdge = x === 0 || x === gridSize - 1 || y === 0 || y === gridSize - 1;
                    if (!isEdge && Math.random() < 0.15) {
                        const dWall = new DynamicWall(this.scene, posX, 2.5, posZ, cellSize + overlap, 5, cellSize + overlap, Math.random() < 0.5 ? 'proximity' : 'trigger');
                        this.dynamicWalls.push(dWall);
                    } else {
                        this.createWall(posX, 2.5, posZ, cellSize + overlap, 5, cellSize + overlap, 0x3a2a2a);
                    }
                } else {
                    // Add ceiling lights in paths, slightly more frequent
                    if ((x + y * gridSize) % 10 === 0) {
                        this.ceilingLights.push(new CeilingLight(this.scene, posX, 4.9, posZ));
                    }
                }
            }
        }

        // Lighting
        this.setupLighting();

        // Fog for atmosphere
        this.scene.fog = new THREE.Fog(0x000000, 1, 40);

        // Force update world matrices
        this.scene.updateMatrixWorld(true);
    }

    getStartPosition() {
        return this.startPosition;
    }

    update(delta, playerPos, isJumping) {
        this.dynamicWalls.forEach(wall => {
            wall.update(delta, playerPos, isJumping);
        });
        this.ceilingLights.forEach(light => {
            light.update(delta);
        });
    }

    createWall(x, y, z, width, height, depth, color) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.1
        });
        const wall = new THREE.Mesh(geometry, material);
        wall.position.set(x, y, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
        this.collidables.push(wall);
    }

    setupLighting() {
        // Ambient light (very dim for spooky atmosphere)
        const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
        this.scene.add(ambientLight);

        // Directional light (moonlight effect)
        const directionalLight = new THREE.DirectionalLight(0x8080ff, 0.2);
        directionalLight.position.set(10, 40, 10);
        directionalLight.castShadow = false; // Save texture units for flashlight shadows
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.mapSize.width = 2048; // Higher res for larger area
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.bias = -0.001; // Fix shadow acne (black stripes)
        this.scene.add(directionalLight);

        // Point lights for eerie glow
        const pointLight1 = new THREE.PointLight(0xff4400, 0.5, 15);
        pointLight1.position.set(-10, 3, -10);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x4400ff, 0.5, 15);
        pointLight2.position.set(10, 3, 10);
        this.scene.add(pointLight2);
    }
}
