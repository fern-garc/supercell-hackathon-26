class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.environment = null;
        this.flashlight = null;
        this.audio = null;
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
        // Position will be set after environment init
        this.camera.position.set(0, 1.6, 0);

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

        // Audio Manager
        this.audio = new AudioManager(this.camera);

        // Flashlight (initialized before environment so it can be toggled by controls)
        this.flashlight = new Flashlight(this.camera, this.audio);
        this.controls.onFlashlightToggle = () => this.flashlight.toggle();
        this.controls.audio = this.audio;

        // Environment
        this.environment = new Environment(this.scene);
        this.controls.collidables = this.environment.collidables;

        // Set camera start position from environment
        const startPos = this.environment.getStartPosition();
        this.camera.position.copy(startPos);

        // Add camera to scene
        this.scene.add(this.camera);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // Update environment (dynamic walls)
        if (this.environment) {
            this.environment.update(delta, this.camera.position, this.controls.isJumping);
        }

        // Update controls
        this.controls.update(delta);

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();
});
