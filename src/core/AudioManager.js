class AudioManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.sounds = new Map();
        this.audioLoader = new THREE.AudioLoader();

        // Intensity of the last "noise" made, used for monster detection
        this.currentNoiseLevel = 0;

        // Load all sounds from soundLibrary
        this.loadAllSounds();
    }

    resume() {
        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume();
        }
    }

    async loadAllSounds() {
        const soundsToLoad = [
            { name: 'flashlight-click', url: 'src/soundLibrary/flashlight-click.wav' },
            { name: 'ghostly-trace', url: 'src/soundLibrary/a-ghostly-trace.wav' },
            { name: 'creeper', url: 'src/soundLibrary/creeper.wav' },
            { name: 'play-game', url: 'src/soundLibrary/do-you-want-to-play.wav' },
            { name: 'whos-there', url: 'src/soundLibrary/whos-there.wav' },
            { name: 'game-over', url: 'src/soundLibrary/game-of-life-over.wav' },
            { name: 'money', url: 'src/soundLibrary/money.wav' }
        ];

        for (const sound of soundsToLoad) {
            try {
                await this.loadSound(sound.name, sound.url);
                console.log(`Loaded sound: ${sound.name}`);
            } catch (error) {
                console.warn(`Failed to load sound: ${sound.name}`, error);
            }
        }
    }

    // Load a sound and store it
    loadSound(name, url, isPositional = false) {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(url, (buffer) => {
                this.sounds.set(name, { buffer, isPositional });
                resolve();
            }, undefined, reject);
        });
    }

    // Play a global sound (instructions, UI, background)
    playGlobal(name, volume = 0.5, loop = false) {
        const soundData = this.sounds.get(name);
        if (!soundData) {
            console.warn(`Sound not found: ${name}`);
            return;
        }

        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(soundData.buffer);
        sound.setLoop(loop);
        sound.setVolume(volume);
        sound.play();
        return sound;
    }

    // Play a sound at a specific location
    playPositional(name, position, volume = 1, refDistance = 10) {
        const soundData = this.sounds.get(name);
        if (!soundData) {
            console.warn(`Sound not found: ${name}`);
            return;
        }

        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(soundData.buffer);
        sound.setRefDistance(refDistance);
        sound.setVolume(volume);

        // We need a dummy object to hold the sound in the scene
        const mesh = new THREE.Object3D();
        mesh.position.copy(position);
        if (window.gameInstance && window.gameInstance.scene) {
            window.gameInstance.scene.add(mesh);
        }

        sound.play();

        // Cleanup after sound finishes
        sound.onEnded = () => {
            if (window.gameInstance && window.gameInstance.scene) {
                window.gameInstance.scene.remove(mesh);
            }
        };

        return sound;
    }

    // Procedural "thump" sound for when we don't have assets
    playProceduralThump(volume = 0.5, pitch = 100) {
        const ctx = this.listener.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);

        this.currentNoiseLevel = volume;
    }
}
