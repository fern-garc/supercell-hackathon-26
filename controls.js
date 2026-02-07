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
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        // Mouse look settings
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;

        // Pointer lock
        this.isLocked = false;

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

        // Get forward and right vectors from camera
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        this.camera.getWorldDirection(forward);
        forward.y = 0; // Keep movement on horizontal plane
        forward.normalize();

        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        right.normalize();

        // Calculate movement
        const movement = new THREE.Vector3();

        if (this.moveForward) {
            movement.add(forward.multiplyScalar(moveSpeed));
        }
        if (this.moveBackward) {
            movement.add(forward.multiplyScalar(-moveSpeed));
        }
        if (this.moveRight) {
            movement.add(right.multiplyScalar(moveSpeed));
        }
        if (this.moveLeft) {
            movement.add(right.multiplyScalar(-moveSpeed));
        }

        // Apply movement
        this.camera.position.add(movement);

        // Keep camera at eye level
        this.camera.position.y = 1.6;
    }
}
