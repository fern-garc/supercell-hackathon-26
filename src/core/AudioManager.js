class AudioManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.sounds = new Map();
        this.audioLoader = new THREE.AudioLoader();

        // Intensity of the last "noise" made, used for monster detection
        this.currentNoiseLevel = 0;
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
        if (!soundData) return;

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
        if (!soundData) return;

        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(soundData.buffer);
        sound.setRefDistance(refDistance);
        sound.setVolume(volume);

        // We need a dummy object to hold the sound in the scene
        const mesh = new THREE.Object3D();
        mesh.position.copy(position);
        window.gameInstance.scene.add(mesh);

        sound.play();

        // Cleanup after sound finishes
        sound.onEnded = () => {
            window.gameInstance.scene.remove(mesh);
        };

        return sound;
    }

    // Procedural "thump" sound for when we don't have assets
    // This allows the game to have sound even without .mp3 files
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

        // Alert the system that a noise was made
        this.currentNoiseLevel = volume;
    }
}
