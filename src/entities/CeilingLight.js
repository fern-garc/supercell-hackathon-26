class CeilingLight {
    constructor(scene, x, y, z) {
        this.scene = scene;
        this.position = new THREE.Vector3(x, y, z);

        this.group = new THREE.Group();
        this.light = null;
        this.bulbMesh = null;
        this.fixtureMesh = null;

        // Behavior settings
        this.state = 'normal'; // normal, flickering, off
        this.stateTimer = Math.random() * 5 + 5;
        this.flickerTimer = 0;
        this.intensity = 0.8;
        this.baseColor = new THREE.Color(0xffffee);

        this.init();
    }

    init() {
        // Fixture (holding the bulb)
        const fixtureGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.1, 8);
        const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
        this.fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
        this.fixtureMesh.position.y = 0.05;
        this.group.add(this.fixtureMesh);

        // Bulb
        const bulbGeo = new THREE.SphereGeometry(0.1, 8, 8);
        this.bulbMat = new THREE.MeshStandardMaterial({
            color: this.baseColor,
            emissive: this.baseColor,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9
        });
        this.bulbMesh = new THREE.Mesh(bulbGeo, this.bulbMat);
        this.group.add(this.bulbMesh);

        // Actual Point Light
        // Color, Intensity, Distance, Decay
        this.light = new THREE.PointLight(this.baseColor, this.intensity, 8, 2);
        this.light.castShadow = false; // Point light shadows are too expensive for a maze
        this.group.add(this.light);

        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    update(delta) {
        this.stateTimer -= delta;

        if (this.stateTimer <= 0) {
            this.switchState();
        }

        switch (this.state) {
            case 'normal':
                this.updateNormal(delta);
                break;
            case 'flickering':
                this.updateFlicker(delta);
                break;
            case 'off':
                this.updateOff(delta);
                break;
        }
    }

    switchState() {
        const rand = Math.random();
        // 40% normal, 40% flickering, 20% off
        if (rand < 0.4) {
            this.state = 'normal';
            this.stateTimer = Math.random() * 5 + 5;
        } else if (rand < 0.8) {
            this.state = 'flickering';
            this.stateTimer = Math.random() * 4 + 2; // Longer flicker bursts
        } else {
            this.state = 'off';
            this.stateTimer = Math.random() * 3 + 1;
        }
    }

    updateNormal(delta) {
        // Subtle hum/vibration in intensity
        const fluctuation = Math.sin(Date.now() * 0.01) * 0.05;
        this.applyIntensity(this.intensity + fluctuation);
    }

    updateFlicker(delta) {
        this.flickerTimer -= delta;
        if (this.flickerTimer <= 0) {
            this.flickerTimer = Math.random() * 0.1;
            const flickerIntensity = Math.random() > 0.5 ? this.intensity : 0.1;
            this.applyIntensity(flickerIntensity);

            // Randomly play a tiny click/buzz sound if player is nearby
            if (window.gameInstance && window.gameInstance.camera && window.gameInstance.audio) {
                const dist = window.gameInstance.camera.position.distanceTo(this.position);
                if (dist < 10 && Math.random() < 0.3) {
                    // Small buzz/pop sound
                    window.gameInstance.audio.playProceduralThump(0.02, 800 + Math.random() * 400);
                }
            }
        }
    }

    updateOff(delta) {
        this.applyIntensity(0);
    }

    applyIntensity(val) {
        this.light.intensity = val;
        this.bulbMat.emissiveIntensity = val > 0 ? val : 0.05; // Dim glow even when off
        this.bulbMat.opacity = val > 0 ? 0.9 : 0.3;
    }
}
