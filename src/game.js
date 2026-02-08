class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.environment = null;
        this.flashlight = null;
        this.monster = null;
        this.crystalBall = null;
        this.audio = null;
        this.clock = new THREE.Clock();
        this.isGameStarted = false;

        this.init();
        this.handleLoading();
    }

    handleLoading() {
        // Elements
        const uiContainer = document.getElementById('ui-container');
        const loaderBar = document.querySelector('.loader-bar');
        const loadingSection = document.getElementById('loading-section');
        const startSection = document.getElementById('start-section');
        const startButton = document.getElementById('start-button');

        // Start simulated loading immediately
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);

                // Show the start controls + button
                setTimeout(() => {
                    loadingSection.classList.add('hidden');
                    startSection.classList.remove('hidden');
                }, 400);
            }
            loaderBar.style.width = progress + '%';
        }, 150);

        // Game Start
        startButton.addEventListener('click', () => {
            uiContainer.classList.add('fade-out');

            const wasStarted = this.isGameStarted;
            this.isGameStarted = true;

            if (!wasStarted) {
                this.animate();
            }

            // Auto-lock mouse
            this.canvas.requestPointerLock();
        });
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

        // Crystal Ball
        this.crystalBall = new CrystalBall(this.camera, this.audio);
        this.controls.onCrystalFlash = () => this.crystalBall.flash();

        // Environment
        this.environment = new Environment(this.scene);
        this.controls.collidables = this.environment.collidables;

        // Monster
        this.monster = new Monster(this.scene, this.environment.maze, this.camera);

        // Set camera start position from environment
        const startPos = this.environment.getStartPosition();
        this.camera.position.copy(startPos);

        // Add camera to scene
        this.scene.add(this.camera);

        // Start background music and atmosphere
        this.backgroundSound = null;
        this.startAtmosphere();

        // Handle random creepy sounds
        this.lastCreepySoundTime = Date.now();
        this.creepySoundInterval = 20000 + Math.random() * 40000; // 20-60 seconds

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    startAtmosphere() {
        if (!this.audio) return;

        // Try playing every second until it succeeds (handles browser audio policy)
        const checkInterval = setInterval(() => {
            if (this.audio.sounds.has('atmosphere')) {
                this.backgroundSound = this.audio.playGlobal('atmosphere', 0.15, true);
                if (this.backgroundSound) {
                    clearInterval(checkInterval);
                    console.log("Atmosphere started");
                }
            }
        }, 1000);
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

        // Update items (hand sway, etc)
        const time = this.clock.getElapsedTime();
        if (this.flashlight) this.flashlight.update(time, delta);
        if (this.crystalBall) this.crystalBall.update(time, delta);

        // Update controls
        this.controls.update(delta);

        // Update Monster
        if (this.monster) {
            this.monster.update(delta, this.camera.position, this.audio);
        }

        // Random creepy sounds
        if (this.audio) {
            const now = Date.now();
            if (now - this.lastCreepySoundTime > this.creepySoundInterval) {
                const creepySounds = ['ghostly-trace', 'creeper', 'play-game', 'whos-there'];
                const randomSound = creepySounds[Math.floor(Math.random() * creepySounds.length)];

                // Play as a global sound with low volume
                this.audio.playGlobal(randomSound, 0.3);

                this.lastCreepySoundTime = now;
                this.creepySoundInterval = 30000 + Math.random() * 60000; // Next one in 30-90s
            }
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();
});
