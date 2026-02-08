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
        this.book = null; // Added this.book reference
        this.audio = null;
        this.clock = new THREE.Clock();
        this.isGameStarted = false;
        this.isPaused = false;
        this.isGameOver = false;

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

            // Unlock audio context
            if (this.audio) {
                this.audio.resume();
            }

            // Auto-lock mouse
            this.canvas.requestPointerLock();
        });

        // Pause Menu Listeners
        const resumeBtn = document.getElementById('resume-button');
        const restartBtn = document.getElementById('restart-button');

        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                this.canvas.requestPointerLock();
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
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

        // Book (Escape Item) - Instantiated after environment
        this.book = new Book(this.scene, this.environment.maze);
        this.controls.onInteract = () => this.handleInteraction();

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
            if (this.audio.sounds.has('ghostly-trace')) {
                this.backgroundSound = this.audio.playGlobal('ghostly-trace', 0.15, true);
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

        if (this.isPaused || !this.isGameStarted) return;

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime(); // Get elapsed time for item updates

        // Update environment (dynamic walls)
        if (this.environment) {
            this.environment.update(delta, this.camera.position, this.controls.isJumping);
        }

        // Update items (hand sway, etc)
        if (this.flashlight) this.flashlight.update(time, delta);
        if (this.crystalBall) this.crystalBall.update(time, delta);

        // Update controls
        this.controls.update(delta);

        // Update Monster
        if (this.monster) {
            this.monster.update(delta, this.camera.position, this.audio);
        }

        // Update book
        if (this.book) {
            this.book.update(time); // Using 'time' for consistency with other item updates
        }

        this.checkInteraction();

        // Random creepy sounds
        if (this.audio) {
            const now = Date.now();
            if (now - this.lastCreepySoundTime > this.creepySoundInterval) {
                const creepySounds = ['creeper', 'play-game', 'whos-there'];
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

    handleInteraction() {
        if (!this.book || this.book.isCollected) return;

        // Raycast from camera to check if looking at book
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Interaction reach (3 meters)
        raycaster.far = 3;

        const intersects = raycaster.intersectObject(this.book.group, true);

        if (intersects.length > 0) {
            this.book.collect();
            console.log("BOOK COLLECTED! Escape is now possible.");

            // Notification
            this.showNotification("You found the Ritual Book!");

            // Sequence for ending
            setTimeout(() => {
                this.showEnding();
            }, 2000);
        }
    }

    checkInteraction() {
        if (!this.book || this.book.isCollected || !this.isGameStarted) return;

        const prompt = document.getElementById('interaction-prompt');

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        raycaster.far = 3;

        const intersects = raycaster.intersectObject(this.book.group, true);

        if (intersects.length > 0) {
            prompt.classList.remove('hidden');
        } else {
            prompt.classList.add('hidden');
        }
    }

    togglePause(paused) {
        if (this.isGameOver) return; // Don't pause if the game is over

        this.isPaused = paused;
        const uiContainer = document.getElementById('ui-container');
        const gameModal = document.getElementById('game-modal');
        const pauseSection = document.getElementById('pause-section');
        const startSection = document.getElementById('start-section');

        if (this.isPaused) {
            uiContainer.classList.remove('hidden');
            uiContainer.classList.remove('fade-out');
            if (gameModal) gameModal.classList.remove('hidden');
            pauseSection.classList.remove('hidden');
            startSection.classList.add('hidden');
            this.clock.stop();
        } else {
            // Only hide UI if we're actually resuming (not ending)
            if (!this.isGameOver) {
                uiContainer.classList.add('hidden');
                pauseSection.classList.add('hidden');
            }
            this.clock.start();
        }
    }

    showEnding() {
        this.isGameStarted = false;
        this.isGameOver = true;
        this.isPaused = false;

        const endingScreen = document.getElementById('ending-screen');
        const gameModal = document.getElementById('game-modal');
        const uiContainer = document.getElementById('ui-container');

        if (gameModal) gameModal.classList.add('hidden');
        endingScreen.classList.remove('hidden');
        uiContainer.classList.remove('hidden');
        uiContainer.classList.remove('fade-out');

        // Unlock cursor
        document.exitPointerLock();
        this.controls.isLocked = false;

        // Restart logic
        const replayBtn = document.getElementById('replay-button');
        if (replayBtn) {
            replayBtn.onclick = () => window.location.reload();
        }
    }

    onPlayerDeath() {
        if (!this.isGameStarted || this.isGameOver) return;
        this.isGameStarted = false;
        this.isGameOver = true;
        this.isPaused = false;

        const jumpscare = document.getElementById('jumpscare-overlay');
        const deathScreen = document.getElementById('death-screen');
        const uiContainer = document.getElementById('ui-container');
        const gameModal = document.getElementById('game-modal');

        // 1. Show Jumpscare Immediately
        jumpscare.classList.remove('hidden');

        // 2. Clear other UI
        if (gameModal) gameModal.classList.add('hidden');

        // 3. Show Death Screen after a delay
        setTimeout(() => {
            jumpscare.classList.add('hidden');
            deathScreen.classList.remove('hidden');
            uiContainer.classList.remove('hidden');
            uiContainer.classList.remove('fade-out');

            // Unlock cursor
            document.exitPointerLock();
            this.controls.isLocked = false;

            // Handle retry
            const retryBtn = document.getElementById('retry-button');
            if (retryBtn) {
                retryBtn.onclick = () => window.location.reload();
            }
        }, 2000);
    }

    showNotification(text) {
        // Simple screen notification
        const notification = document.createElement('div');
        notification.style.position = 'absolute';
        notification.style.bottom = '20%';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.color = '#ffd700'; // Gold
        notification.style.fontSize = '24px';
        notification.style.fontWeight = 'bold';
        notification.style.fontFamily = 'Courier New, monospace';
        notification.style.textShadow = '2px 2px #000';
        notification.style.pointerEvents = 'none';
        notification.style.zIndex = '100';
        notification.innerText = text;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transition = 'opacity 2.0s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 2000);
        }, 3000);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();
});
