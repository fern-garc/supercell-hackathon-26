class Environment {
    constructor(scene) {
        this.scene = scene;
        this.createEnvironment();
    }

    createEnvironment() {
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a1a1a,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls - Create a room
        this.createWall(0, 2.5, -25, 50, 5, 0.5, 0x3a2a2a); // Back wall
        this.createWall(0, 2.5, 25, 50, 5, 0.5, 0x3a2a2a);  // Front wall
        this.createWall(-25, 2.5, 0, 0.5, 5, 50, 0x3a2a2a); // Left wall
        this.createWall(25, 2.5, 0, 0.5, 5, 50, 0x3a2a2a);  // Right wall

        // Ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(50, 50);
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 5;
        this.scene.add(ceiling);

        // Add some decorative elements
        this.addPillars();

        // Lighting
        this.setupLighting();

        // Fog for atmosphere
        this.scene.fog = new THREE.Fog(0x000000, 1, 40);
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
    }

    addPillars() {
        const pillarPositions = [
            [-15, 2.5, -15],
            [15, 2.5, -15],
            [-15, 2.5, 15],
            [15, 2.5, 15]
        ];

        pillarPositions.forEach(pos => {
            const geometry = new THREE.CylinderGeometry(0.8, 1, 5, 8);
            const material = new THREE.MeshStandardMaterial({
                color: 0x4a3a3a,
                roughness: 0.7
            });
            const pillar = new THREE.Mesh(geometry, material);
            pillar.position.set(pos[0], pos[1], pos[2]);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.scene.add(pillar);
        });
    }

    setupLighting() {
        // Ambient light (very dim for spooky atmosphere)
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // Directional light (moonlight effect)
        const directionalLight = new THREE.DirectionalLight(0x8080ff, 0.4);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        this.scene.add(directionalLight);

        // Point lights for eerie glow
        const pointLight1 = new THREE.PointLight(0xff4400, 1, 20);
        pointLight1.position.set(-10, 3, -10);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x4400ff, 1, 20);
        pointLight2.position.set(10, 3, 10);
        this.scene.add(pointLight2);
    }
}
