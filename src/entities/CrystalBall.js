class CrystalBall {
    constructor(camera) {
        this.camera = camera;
        this.group = new THREE.Group();
        this.mesh = null;
        this.hand = null;
        this.glow = null;
        this.flashLight = null;
        this.flashIntensity = 0;
        this.cooldown = 20; // 20 seconds
        this.cooldownTimer = 0;

        this.init();
    }

    init() {
        // Position the group on the left side
        this.group.position.set(-0.4, -0.4, -0.5);
        this.camera.add(this.group);

        // --- Create the Hand ---
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xc4a484, // Rich Tan
            roughness: 1.0,  // Matte look
            metalness: 0.0
        });

        // Palm/Arm piece
        const armGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.4);
        this.hand = new THREE.Mesh(armGeometry, skinMaterial);
        this.hand.position.set(-0.05, -0.05, 0.2);
        this.hand.castShadow = false;
        this.hand.receiveShadow = true;
        this.group.add(this.hand);

        // Fingers cupping the ball
        const fingerGeometry = new THREE.BoxGeometry(0.03, 0.1, 0.03);
        const fingerPositions = [
            [-0.08, 0.05, -0.05], // Thumb
            [-0.03, 0.08, -0.1],  // Index
            [0.02, 0.08, -0.1],   // Middle
            [0.07, 0.05, -0.05]   // Ring
        ];

        fingerPositions.forEach(pos => {
            const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
            finger.position.set(pos[0], pos[1], pos[2]);
            finger.rotation.x = -Math.PI / 4;
            finger.castShadow = false;
            finger.receiveShadow = true;
            this.group.add(finger);
        });

        // --- Create the Crystal Ball ---
        const ballGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        const ballMaterial = new THREE.MeshStandardMaterial({
            color: 0x8800ff,
            metalness: 0.5,
            roughness: 0.2,
            transparent: true,
            opacity: 0.6,
            emissive: 0x4400aa,
            emissiveIntensity: 0.5
        });

        this.mesh = new THREE.Mesh(ballGeometry, ballMaterial);
        this.mesh.position.set(0, 0.1, -0.05);
        this.group.add(this.mesh);

        // Inner glow light (constant)
        this.glow = new THREE.PointLight(0x8800ff, 1, 3);
        this.glow.position.copy(this.mesh.position);
        this.group.add(this.glow);

        // Flash light (triggered by R)
        this.flashLight = new THREE.PointLight(0x00ffff, 0, 15); // Cyan/Blue flash
        this.flashLight.position.copy(this.mesh.position);
        this.group.add(this.flashLight);

        // --- Cooldown Text HUD ---
        this.canvas = document.createElement('canvas');
        this.canvas.width = 128;
        this.canvas.height = 128;
        this.context = this.canvas.getContext('2d');

        this.texture = new THREE.CanvasTexture(this.canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: this.texture,
            transparent: true,
            opacity: 0
        });
        this.timerSprite = new THREE.Sprite(spriteMaterial);
        this.timerSprite.position.set(0, 0.3, -0.05); // Above the ball
        this.timerSprite.scale.set(0.15, 0.15, 1);
        this.group.add(this.timerSprite);
    }

    flash() {
        if (this.cooldownTimer <= 0) {
            this.flashIntensity = 10.0; // Sharp peak
            this.cooldownTimer = this.cooldown;
            return true;
        }
        return false;
    }

    update(time, delta) {
        // Subtle breathing/sway animation
        const swayX = Math.sin(time * 1.8) * 0.015;
        const swayY = Math.cos(time * 2.2) * 0.015;
        this.group.position.x = -0.4 + swayX;
        this.group.position.y = -0.4 + swayY;

        // Decrement cooldown
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= delta;
            if (this.cooldownTimer < 0) this.cooldownTimer = 0;
        }

        // Visual feedback for cooldown
        const isOnCooldown = this.cooldownTimer > 0;

        if (isOnCooldown) {
            // Ball is "dim" or "charging"
            const chargeRatio = 1 - (this.cooldownTimer / this.cooldown);
            this.mesh.material.color.setHex(0x333333); // Greyish
            this.mesh.material.emissive.setHex(0x110022); // Very faint purple
            this.mesh.material.emissiveIntensity = 0.1;
            this.glow.intensity = 0.1;

            // Update timer HUD
            this.updateTimerCanvas(Math.ceil(this.cooldownTimer));
            this.timerSprite.material.opacity = Math.min(1, this.timerSprite.material.opacity + delta * 2);
        } else {
            // Normal state
            this.mesh.material.color.setHex(0x8800ff); // Back to purple
            this.mesh.material.emissive.setHex(0x4400aa);

            // Pulse logic (only when ready)
            const pulse = (Math.sin(time * 3) + 1) * 0.5;
            this.mesh.material.emissiveIntensity = 0.3 + pulse * 0.7;
            this.glow.intensity = 0.5 + pulse;

            this.timerSprite.material.opacity = Math.max(0, this.timerSprite.material.opacity - delta * 2);
        }

        // Handle Flash (override pulse color)
        if (this.flashIntensity > 0) {
            this.flashLight.intensity = this.flashIntensity;
            this.mesh.material.emissive.setHex(0x00ffff); // Turn ball blue during flash
            this.mesh.material.emissiveIntensity = this.flashIntensity * 0.5;

            // Fast decay
            this.flashIntensity *= 0.9;
            if (this.flashIntensity < 0.1) {
                this.flashIntensity = 0;
                // Return to normal color handled by the cooldown branch above
            }
        } else {
            this.flashLight.intensity = 0;
        }
    }

    updateTimerCanvas(seconds) {
        const ctx = this.context;
        ctx.clearRect(0, 0, 128, 128);

        // Supernatural "Glow" styling
        ctx.font = 'bold 80px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#8800ff';
        ctx.fillStyle = '#ffffff';

        ctx.fillText(seconds, 64, 64);

        this.texture.needsUpdate = true;
    }
}
