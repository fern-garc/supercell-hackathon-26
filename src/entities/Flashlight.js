class Flashlight {
    constructor(camera) {
        this.camera = camera;
        this.group = new THREE.Group();
        this.light = null;
        this.mesh = null;
        this.lens = null;
        this.hand = null;

        this.onTime = 0;
        this.maxOnTime = 15; // 15 seconds of use before warning/timeout
        this.isOverheated = false;
        this.timeoutTimer = 0;
        this.baseIntensity = 5;

        this.init();
    }

    init() {
        // Create spotlight for flashlight effect
        // Color, Intensity, Distance, Angle, Penumbra, Decay
        this.light = new THREE.SpotLight(0xfff6d5, 5, 30, Math.PI / 6, 0.5, 1.2);

        // Settings for better light quality
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
        this.light.shadow.camera.near = 0.1;
        this.light.shadow.camera.far = 40;
        this.light.shadow.bias = -0.0001;

        // Position the light group
        this.group.position.set(0.4, -0.4, -0.5);
        this.camera.add(this.group);

        // Add light to group
        this.light.position.set(0, 0, 0);
        this.group.add(this.light);

        // Light target
        this.light.target.position.set(0, 0, -10);
        this.group.add(this.light.target);

        // Create a simple flashlight mesh
        const flashlightGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 16);
        const flashlightMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.9,
            roughness: 0.1
        });
        this.mesh = new THREE.Mesh(flashlightGeometry, flashlightMaterial);

        // Position the mesh just behind the light source
        this.mesh.rotation.x = Math.PI / 2;
        this.group.add(this.mesh);

        // Add a small lens part
        const lensGeometry = new THREE.CylinderGeometry(0.05, 0.04, 0.05, 16);
        const lensMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            emissive: 0xfff6d5,
            emissiveIntensity: 0.5
        });
        this.lens = new THREE.Mesh(lensGeometry, lensMaterial);
        this.lens.rotation.x = Math.PI / 2;
        this.lens.position.z = -0.15;
        this.group.add(this.lens);

        // --- Add the Hand ---
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xc4a484, // Rich Tan
            roughness: 1.0,  // Matte look
            metalness: 0.0
        });

        // Palm/Arm piece
        const armGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.4);
        this.hand = new THREE.Mesh(armGeometry, skinMaterial);
        this.hand.position.set(0.05, -0.05, 0.2);
        this.hand.castShadow = false; // Prevent shadow acne on arms
        this.hand.receiveShadow = true;
        this.group.add(this.hand);

        // Fingers wrapping around
        const fingerGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.03);
        for (let i = 0; i < 4; i++) {
            const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
            finger.position.set(0, 0.04, -0.05 + (i * 0.04));
            finger.rotation.z = Math.PI / 4;
            finger.castShadow = false; // Prevent shadow acne on fingers
            finger.receiveShadow = true;
            this.group.add(finger);
        }

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
        this.timerSprite.position.set(0, 0.2, -0.05); // Above the flashlight
        this.timerSprite.scale.set(0.12, 0.12, 1);
        this.group.add(this.timerSprite);
    }

    toggle() {
        if (this.isOverheated) return; // Cannot turn on when overheated

        if (this.light) {
            this.light.visible = !this.light.visible;
            this.mesh.visible = true; // Mesh always visible in hand
            this.lens.visible = true;
            this.lens.material.emissiveIntensity = this.light.visible ? 0.5 : 0.05;
        }
    }

    update(time, delta) {
        // Subtle breathing/sway animation
        const swayX = Math.sin(time * 2) * 0.02;
        const swayY = Math.cos(time * 2.5) * 0.02;
        this.group.position.x = 0.4 + swayX;
        this.group.position.y = -0.4 + swayY;

        // --- Usage Logic ---
        if (this.isOverheated) {
            this.timeoutTimer -= delta;
            this.light.visible = false;
            this.lens.material.emissiveIntensity = 0;

            if (this.timeoutTimer <= 0) {
                this.isOverheated = false;
                this.onTime = 0;
            }

            // Update timer HUD
            this.updateTimerCanvas(Math.ceil(this.timeoutTimer));
            this.timerSprite.material.opacity = Math.min(1, this.timerSprite.material.opacity + delta * 2);
        } else {
            this.timerSprite.material.opacity = Math.max(0, this.timerSprite.material.opacity - delta * 2);
            if (this.light.visible) {
                this.onTime += delta;

                // Flickering behavior when nearing limit
                if (this.onTime > 10) {
                    const flickerChance = (this.onTime - 10) / (this.maxOnTime - 10); // 0 to 1
                    if (Math.random() < flickerChance * 0.3) {
                        this.light.intensity = Math.random() < 0.5 ? 0.1 : this.baseIntensity;
                        if (window.gameInstance && window.gameInstance.audio && Math.random() < 0.1) {
                            window.gameInstance.audio.playProceduralThump(0.01, 1200);
                        }
                    } else {
                        this.light.intensity = this.baseIntensity;
                    }
                } else {
                    this.light.intensity = this.baseIntensity;
                }

                // Hit max time
                if (this.onTime >= this.maxOnTime) {
                    this.isOverheated = true;
                    this.timeoutTimer = 10;
                    this.light.visible = false;
                    if (window.gameInstance && window.gameInstance.audio) {
                        // Fizzle sound
                        window.gameInstance.audio.playProceduralThump(0.1, 100);
                    }
                }
            } else {
                // Cool down slowly when off
                this.onTime = Math.max(0, this.onTime - delta * 0.5);
                this.light.intensity = this.baseIntensity;
            }
        }
    }

    updateTimerCanvas(seconds) {
        const ctx = this.context;
        ctx.clearRect(0, 0, 128, 128);

        // Stylized White Alert HUD
        ctx.font = 'bold 80px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer glow (White/Technical)
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';

        ctx.fillText(seconds, 64, 64);

        this.texture.needsUpdate = true;
    }
}
