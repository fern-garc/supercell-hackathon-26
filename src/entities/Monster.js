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

        this.huntSpeed = 5.0;
        this.searchSpeed = 7.0;
        this.chaseSpeed = 8.0;
        this.speed = this.huntSpeed;

        this.searchRange = 22.0;
        this.chaseRange = 8.0;
        this.killRange = 1.8;

        // Wandering state
        this.wanderDirection = new THREE.Vector3(1, 0, 0);
        this.wanderTimer = 0;

        this.position = new THREE.Vector3();
        this.resetPosition();

        this.state = 'hunting'; // hunting, searching, chasing
        this.timeSinceLastSeen = 0;
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
        // Start monster in a valid maze cell roughly 22m away from player
        const cellSize = 4;
        const gridSize = 21;
        let foundValidPosition = false;
        let attempts = 0;

        if (this.maze && this.maze.grid) {
            while (!foundValidPosition && attempts < 100) {
                attempts++;
                const rx = Math.floor(Math.random() * gridSize);
                const rz = Math.floor(Math.random() * gridSize);

                if (!this.maze.grid[rz][rx]) {
                    const worldX = (rx - gridSize / 2) * cellSize + cellSize / 2;
                    const worldZ = (rz - gridSize / 2) * cellSize + cellSize / 2;
                    const tempPos = new THREE.Vector3(worldX, 1, worldZ);

                    // Check distance to player camera
                    const distToPlayer = tempPos.distanceTo(this.playerCamera.position);

                    // Aim for roughly 22m
                    if (distToPlayer > 18 && distToPlayer < 26) {
                        this.mesh.position.copy(tempPos);
                        foundValidPosition = true;
                    }

                    // Fallback to just far away if we can't find perfect distance
                    if (attempts > 90 && distToPlayer > 15) {
                        this.mesh.position.copy(tempPos);
                        foundValidPosition = true;
                    }
                }
            }
        } else {
            this.mesh.position.set(22, 1, 22);
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
        const hasLoS = this.hasLineOfSight(playerPos);

        // State Machine logic with Line of Sight and Time-based Persistence
        if (hasLoS) {
            // Reset timer and enter/stay in chase if seen - distance doesn't matter
            this.state = 'chasing';
            this.timeSinceLastSeen = 0;
        } else if (this.state === 'chasing') {
            // If we are chasing but lost sight, start the persistence timer
            this.timeSinceLastSeen += delta;

            // Only revert after 5 seconds of being unseen
            if (this.timeSinceLastSeen > 5.0) {
                this.state = 'searching';
            }
        }

        // Behavior based on state
        if (this.state === 'chasing') {
            this.speed = this.chaseSpeed;
            this.chase(delta, playerPos);

            // Intense heartbeat during chase
            if (audioManager && Math.random() < 0.1) {
                audioManager.playGlobal('heartbeat', 1.0);
            }
        } else if (dist > this.searchRange) {
            // FAR & UNSEEN: Target the player directly but steadily
            this.state = 'hunting';
            this.speed = this.huntSpeed;
            this.chase(delta, playerPos);
        } else {
            // WITHIN SEARCH RANGE & UNSEEN: Lose lock and search frantically
            this.state = 'searching';
            this.speed = this.searchSpeed;
            this.wander(delta);

            // Play heartbeat based on proximity (starts getting louder)
            if (audioManager && Math.random() < 0.05) {
                const volume = Math.max(0, 1 - (dist / this.searchRange));
                audioManager.playGlobal('heartbeat', volume * 0.8);
            }
        }

        // Check for kill
        if (dist < this.killRange) {
            this.killPlayer(audioManager);
        }
    }

    chase(delta, playerPos) {
        const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
        dir.y = 0;

        const moveStep = dir.multiplyScalar(this.speed * delta);

        // Try to move in X and Z separately to allow sliding along walls
        const nextPosX = this.mesh.position.clone();
        nextPosX.x += moveStep.x;
        if (!this.checkMazeCollision(nextPosX)) {
            this.mesh.position.x = nextPosX.x;
        }

        const nextPosZ = this.mesh.position.clone();
        nextPosZ.z += moveStep.z;
        if (!this.checkMazeCollision(nextPosZ)) {
            this.mesh.position.z = nextPosZ.z;
        }

        this.mesh.lookAt(playerPos.x, 1, playerPos.z);
    }

    wander(delta) {
        this.wanderTimer -= delta;
        if (this.wanderTimer <= 0) {
            // Pick a new random cardinal direction
            const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
            const angle = angles[Math.floor(Math.random() * angles.length)];
            this.wanderDirection.set(Math.cos(angle), 0, Math.sin(angle));

            // Searching is frantic when the monster is in range
            if (this.state === 'searching') {
                this.wanderTimer = 0.4 + Math.random() * 0.8;
            } else {
                this.wanderTimer = 2 + Math.random() * 4;
            }
        }

        // Move in wander direction
        const moveScalar = this.state === 'searching' ? 1.2 : 0.4;
        const moveStep = this.wanderDirection.clone().multiplyScalar(this.speed * moveScalar * delta);
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

    hasLineOfSight(playerPos) {
        if (!window.gameInstance || !window.gameInstance.environment) return false;

        // Raycast from monster chest to player camera
        const start = this.mesh.position.clone();
        start.y = 1.0;

        const direction = new THREE.Vector3().subVectors(playerPos, start).normalize();
        const distToPlayer = start.distanceTo(playerPos);

        const raycaster = new THREE.Raycaster(start, direction, 0, distToPlayer);

        // Check static walls (environment.collidables)
        const intersects = raycaster.intersectObjects(window.gameInstance.environment.collidables, true);

        // If no walls hit before player, we have LoS
        return intersects.length === 0;
    }

    checkMazeCollision(pos) {
        if (!this.maze || !this.maze.grid) return false;

        const cellSize = 4;
        const gridSize = 21;
        const radius = 0.6; // Monster's physical radius

        // Check 5 points (center and cardinal edges) to ensure volume doesn't clip
        const testPoints = [
            { x: pos.x, z: pos.z },
            { x: pos.x + radius, z: pos.z + radius },
            { x: pos.x + radius, z: pos.z - radius },
            { x: pos.x - radius, z: pos.z + radius },
            { x: pos.x - radius, z: pos.z - radius }
        ];

        for (const p of testPoints) {
            const gridX = Math.floor(p.x / cellSize + gridSize / 2);
            const gridZ = Math.floor(p.z / cellSize + gridSize / 2);

            if (gridX < 0 || gridX >= gridSize || gridZ < 0 || gridZ >= gridSize) return true;

            // Check static maze wall
            if (this.maze.grid[gridZ][gridX]) return true;
        }

        // Check dynamic walls (doors/secret passages)
        if (window.gameInstance && window.gameInstance.environment) {
            const monsterBox = new THREE.Box3().setFromCenterAndSize(
                pos,
                new THREE.Vector3(radius * 2, 2, radius * 2)
            );

            for (const dWall of window.gameInstance.environment.dynamicWalls) {
                const wallBox = dWall.getCollisionBox();
                if (wallBox && monsterBox.intersectsBox(wallBox)) {
                    return true;
                }
            }
        }

        return false;
    }

    killPlayer(audioManager) {
        if (audioManager) {
            audioManager.playGlobal('game-over', 1.0);
        }
        console.log("PLAYER CAUGHT");

        if (window.gameInstance) {
            window.gameInstance.onPlayerDeath();
        }
    }
}
