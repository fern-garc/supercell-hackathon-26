class Monster {
    constructor(scene, maze, playerCamera) {
        this.scene = scene;
        this.maze = maze;
        this.playerCamera = playerCamera;

        this.isStunned = false;
        this.stunTimer = 0;
        this.shockIntensity = 0;

        this.mesh = this.createMesh();
        this.scene.add(this.mesh);

        this.speed = 3.0;
        this.detectionRange = 15.0;
        this.killRange = 1.5;

        // Wandering state
        this.wanderDirection = new THREE.Vector3(1, 0, 0);
        this.wanderTimer = 0;

        this.position = new THREE.Vector3();
        this.resetPosition();

        this.state = 'wandering'; // wandering, chasing
        this.targetNode = null;
        this.path = [];
    }

    createMesh() {
        const group = new THREE.Group();

        // Ghostly body - Pitch black
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.8, 2, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9,
            emissive: 0x000000
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Glowing eyes - Eerie white
        const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
        });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 0.7, 0.5);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 0.7, 0.5);
        group.add(rightEye);

        // Add point lights to the eyes for actual glow
        const eyeLight = new THREE.PointLight(0xffffff, 0.5, 2);
        eyeLight.position.set(0, 0.7, 0.6);
        group.add(eyeLight);

        // Lightning shock effect group
        this.shockEffect = new THREE.Group();
        const shockGeo = new THREE.IcosahedronGeometry(1.2, 1);
        const shockMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0
        });
        this.shockMesh = new THREE.Mesh(shockGeo, shockMat);
        this.shockEffect.add(this.shockMesh);

        this.shockLight = new THREE.PointLight(0x00ffff, 0, 5);
        this.shockEffect.add(this.shockLight);

        group.add(this.shockEffect);

        group.position.y = 1;
        return group;
    }

    resetPosition() {
        // Start monster in a valid maze cell
        const cellSize = 4;
        const gridSize = 21;
        let foundValidPosition = false;

        if (this.maze && this.maze.grid) {
            while (!foundValidPosition) {
                const rx = Math.floor(Math.random() * gridSize);
                const rz = Math.floor(Math.random() * gridSize);

                if (!this.maze.grid[rz][rx]) {
                    const worldX = (rx - gridSize / 2) * cellSize + cellSize / 2;
                    const worldZ = (rz - gridSize / 2) * cellSize + cellSize / 2;
                    this.mesh.position.set(worldX, 1, worldZ);
                    foundValidPosition = true;
                }
            }
        } else {
            this.mesh.position.set(20, 1, 20);
        }
    }

    stun(duration) {
        this.isStunned = true;
        this.stunTimer = duration;
        this.shockIntensity = 1.0;
    }

    update(delta, playerPos, audioManager) {
        if (this.isStunned) {
            this.stunTimer -= delta;

            // Visual shock effect
            this.shockIntensity = Math.min(1.0, this.stunTimer);
            this.shockMesh.material.opacity = (Math.random() * 0.5) * this.shockIntensity;
            this.shockLight.intensity = (Math.random() * 2) * this.shockIntensity;
            this.mesh.rotation.y += delta * 20; // Spin rapidly when shocked

            if (this.stunTimer <= 0) {
                this.isStunned = false;
                this.shockMesh.material.opacity = 0;
                this.shockLight.intensity = 0;
            }
            return; // Skip movement while stunned
        }

        const dist = this.mesh.position.distanceTo(playerPos);

        // State transitions
        if (dist < this.detectionRange) {
            this.state = 'chasing';
        } else {
            this.state = 'wandering';
        }

        if (this.state === 'chasing') {
            this.chase(delta, playerPos);

            // Play heartbeat based on proximity
            if (audioManager && Math.random() < 0.05) {
                const volume = Math.max(0, 1 - (dist / this.detectionRange));
                audioManager.playGlobal('heartbeat', volume * 0.8);
            }
        } else {
            this.wander(delta);
        }

        // Check for kill
        if (dist < this.killRange) {
            this.killPlayer(audioManager);
        }
    }

    chase(delta, playerPos) {
        const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
        dir.y = 0;
        this.mesh.position.add(dir.multiplyScalar(this.speed * delta));
        this.mesh.lookAt(playerPos.x, 1, playerPos.z);
    }

    wander(delta) {
        this.wanderTimer -= delta;
        if (this.wanderTimer <= 0) {
            // Pick a new random cardinal direction
            const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
            const angle = angles[Math.floor(Math.random() * angles.length)];
            this.wanderDirection.set(Math.cos(angle), 0, Math.sin(angle));
            this.wanderTimer = 2 + Math.random() * 4;
        }

        // Move in wander direction but slower than chase
        const moveStep = this.wanderDirection.clone().multiplyScalar(this.speed * 0.4 * delta);
        const nextPos = this.mesh.position.clone().add(moveStep);

        if (!this.checkMazeCollision(nextPos)) {
            this.mesh.position.copy(nextPos);
            // Smoothly look in wander direction
            const targetPos = this.mesh.position.clone().add(this.wanderDirection);
            this.mesh.lookAt(targetPos.x, 1, targetPos.z);
        } else {
            // Hit a wall, force direction change
            this.wanderTimer = 0;
        }
    }

    checkMazeCollision(pos) {
        if (!this.maze || !this.maze.grid) return false;

        const cellSize = 4;
        const gridSize = 21;

        const gridX = Math.floor(pos.x / cellSize + gridSize / 2);
        const gridZ = Math.floor(pos.z / cellSize + gridSize / 2);

        if (gridX < 0 || gridX >= gridSize || gridZ < 0 || gridZ >= gridSize) return true;
        return this.maze.grid[gridZ][gridX];
    }

    killPlayer(audioManager) {
        if (audioManager) {
            audioManager.playGlobal('game-over', 1.0);
        }
        console.log("PLAYER CAUGHT");
        // In a real game, trigger UI and restart
        if (window.confirm("The Mansion claimed you. Restart?")) {
            window.location.reload();
        }
    }
}
