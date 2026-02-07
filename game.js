class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.environment = null;
        this.clock = new THREE.Clock();

        this.init();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 10);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Controls
        this.controls = new FirstPersonControls(this.camera, this.canvas);
        this.controls.onFlashlightToggle = () => this.toggleFlashlight();

        // Environment
        this.environment = new Environment(this.scene);
        this.controls.collidables = this.environment.collidables;

        // Flashlight
        this.createFlashlight();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createFlashlight() {
        // Create spotlight for flashlight effect
        // Color, Intensity, Distance, Angle, Penumbra, Decay
        this.flashlight = new THREE.SpotLight(0xfff6d5, 3, 25, Math.PI / 8, 0.4, 1.2);

        // Settings for better light quality
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.width = 1024;
        this.flashlight.shadow.mapSize.height = 1024;
        this.flashlight.shadow.camera.near = 0.1;
        this.flashlight.shadow.camera.far = 40;

        // Position the light slightly to the side (first-person style)
        this.flashlight.position.set(0.4, -0.3, -0.2);

        // Attach light to camera
        this.camera.add(this.flashlight);

        // The target of the light needs to be added to the scene (or camera)
        this.flashlight.target.position.set(0.4, -0.3, -10);
        this.camera.add(this.flashlight.target);

        // Create a simple flashlight mesh
        const flashlightGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
        const flashlightMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        const flashlightMesh = new THREE.Mesh(flashlightGeometry, flashlightMaterial);

        // Position the mesh just behind the light source
        flashlightMesh.rotation.x = Math.PI / 2;
        flashlightMesh.position.set(0.4, -0.3, -0.2);
        this.camera.add(flashlightMesh);

        // Add a small lens part
        const lensGeometry = new THREE.CylinderGeometry(0.06, 0.05, 0.05, 16);
        const lensMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            emissive: 0xfff6d5,
            emissiveIntensity: 0.5
        });
        const lensMesh = new THREE.Mesh(lensGeometry, lensMaterial);
        lensMesh.rotation.x = Math.PI / 2;
        lensMesh.position.set(0.4, -0.3, -0.4);
        this.camera.add(lensMesh);

        // Add camera to scene so its children (light and meshes) are rendered
        this.scene.add(this.camera);
    }

    toggleFlashlight() {
        if (this.flashlight) {
            this.flashlight.visible = !this.flashlight.visible;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // Update controls
        this.controls.update(delta);

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
