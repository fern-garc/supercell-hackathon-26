class FirstPersonControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;

        // Movement settings
        this.movementSpeed = 10.0;
        this.jumpStrength = 8.0;
        this.gravity = 25.0;
        this.velocity = new THREE.Vector3();
        this.velocityY = 0;
        this.isGrounded = false;
        this.direction = new THREE.Vector3();

        // Mouse look settings
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;

        // Pointer lock
        this.isLocked = false;

        // Flashlight toggle callback
        this.onFlashlightToggle = null;

        // Collision detection
        this.collidables = [];
        this.playerRadius = 0.5;
        this.playerHeight = 1.8;

        this.init();
    }

    init() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse events
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
            const instructions = document.getElementById('instructions');
            if (this.isLocked) {
                instructions.classList.add('hidden');
            } else {
                instructions.classList.remove('hidden');
            }
        });

        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'KeyF':
                if (this.onFlashlightToggle) this.onFlashlightToggle();
                break;
            case 'Space':
                if (this.isGrounded) {
                    this.velocityY = this.jumpStrength;
                    this.isGrounded = false;
                }
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
        }
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.euler.setFromQuaternion(this.camera.quaternion);

        // Horizontal rotation (yaw)
        this.euler.y -= movementX * 0.002;

        // Vertical rotation (pitch)
        this.euler.x -= movementY * 0.002;

        // Clamp vertical rotation to prevent over-rotation
        this.euler.x = Math.max(
            this.PI_2 - this.maxPolarAngle,
            Math.min(this.PI_2 - this.minPolarAngle, this.euler.x)
        );

        this.camera.quaternion.setFromEuler(this.euler);
    }

    update(delta) {
        if (!this.isLocked) return;

        const moveSpeed = this.movementSpeed * delta;

        // Apply gravity
        if (!this.isGrounded) {
            this.velocityY -= this.gravity * delta;
        }

        // Get forward and right vectors from camera
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        right.normalize();

        // Calculate horizontal movement
        const movement = new THREE.Vector3();
        if (this.moveForward) movement.add(forward.multiplyScalar(moveSpeed));
        if (this.moveBackward) movement.add(forward.multiplyScalar(-moveSpeed));
        if (this.moveRight) movement.add(right.multiplyScalar(moveSpeed));
        if (this.moveLeft) movement.add(right.multiplyScalar(-moveSpeed));

        // Apply horizontal movement with collision detection
        const nextPosition = this.camera.position.clone();

        // Try X movement
        nextPosition.x += movement.x;
        if (!this.checkCollisions(nextPosition)) {
            this.camera.position.x = nextPosition.x;
        } else {
            nextPosition.x = this.camera.position.x;
        }

        // Try Z movement
        nextPosition.z += movement.z;
        if (!this.checkCollisions(nextPosition)) {
            this.camera.position.z = nextPosition.z;
        } else {
            nextPosition.z = this.camera.position.z;
        }

        // Apply vertical movement (jumping/gravity)
        const deltaY = this.velocityY * delta;
        nextPosition.y = this.camera.position.y + deltaY;

        if (!this.checkCollisions(nextPosition)) {
            this.camera.position.y = nextPosition.y;
            this.isGrounded = false;
        } else {
            // Collision detected in Y axis
            if (this.velocityY < 0) {
                // Falling and hit something (floor)
                this.isGrounded = true;
                this.velocityY = 0;
            } else if (this.velocityY > 0) {
                // Jumping and hit something (ceiling)
                this.velocityY = 0;
            }
        }

        // Safety floor at y=0 (eye level y=1.6)
        if (this.camera.position.y < 1.6) {
            this.camera.position.y = 1.6;
            this.velocityY = 0;
            this.isGrounded = true;
        }
    }

    checkCollisions(position) {
        // Player bounding box (centered at position)
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(position.x, position.y, position.z),
            new THREE.Vector3(this.playerRadius * 2, this.playerHeight, this.playerRadius * 2)
        );

        for (const object of this.collidables) {
            // Use cached or compute world bounding box
            if (!object.userData.boundingBox) {
                if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
                object.userData.boundingBox = new THREE.Box3().copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
            }

            if (playerBox.intersectsBox(object.userData.boundingBox)) {
                return true;
            }
        }
        return false;
    }
}
