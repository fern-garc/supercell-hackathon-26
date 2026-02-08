class DynamicWall {
    constructor(scene, x, y, z, width, height, depth, type = 'proximity') {
        this.scene = scene;
        this.type = type; // 'proximity', 'timed', or 'trigger'
        this.startPos = new THREE.Vector3(x, y, z);
        this.openPos = new THREE.Vector3(x, y - height + 0.1, z); // Slides into floor

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: type === 'trigger' ? 0x4a2a2a : 0x2a2a2a, // Slightly different color for triggers
            roughness: 0.9,
            metalness: 0.2
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.startPos);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.scene.add(this.mesh);

        this.isOpen = false;
        this.transition = 0; // 0 to 1
        this.speed = 2.0;

        // For collision detection
        this.box = new THREE.Box3();
    }

    update(delta, playerPos, isJumping) {
        let targetOpen = this.isOpen;

        if (this.type === 'proximity') {
            const dist = playerPos.distanceTo(this.startPos);
            targetOpen = dist < 5;
        } else if (this.type === 'trigger') {
            // If the player jumps near this wall, it toggles
            if (isJumping && playerPos.distanceTo(this.startPos) < 8) {
                this.isOpen = !this.isOpen;
            }
            targetOpen = this.isOpen;
        }

        // Animate transition
        const wasMoving = (targetOpen && this.transition < 1) || (!targetOpen && this.transition > 0);

        if (targetOpen && this.transition < 1) {
            this.transition = Math.min(1, this.transition + delta * this.speed);
        } else if (!targetOpen && this.transition > 0) {
            this.transition = Math.max(0, this.transition - delta * this.speed);
        }

        // Update position
        this.mesh.position.lerpVectors(this.startPos, this.openPos, this.transition);

        // Update bounding box for collisions
        if (this.mesh.geometry.boundingBox) {
            this.box.copy(this.mesh.geometry.boundingBox).applyMatrix4(this.mesh.matrixWorld);
        } else {
            this.mesh.geometry.computeBoundingBox();
        }
    }

    getCollisionBox() {
        // Only provide a collision box if it's not fully open
        return this.transition < 0.8 ? this.box : null;
    }
}
