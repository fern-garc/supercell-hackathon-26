import { CONFIG } from '../config.js';
import { Goblin } from '../entities/Goblin.js';
import { getRandomPositionOnEdge } from '../utils.js';

export class GameManager {
    constructor(scene, uiCallbacks) {
        this.scene = scene;
        this.uiCallbacks = uiCallbacks;
        
        this.gold = CONFIG.INITIAL_GOLD;
        this.wave = 1;
        this.waveTimer = 0;
        this.spawnTimer = 0;
        this.isWaveActive = false;
        
        this.enemies = [];
        this.buildings = [];
        
        this.uiCallbacks.updateGold(this.gold);
        this.uiCallbacks.updateWave(this.wave);
    }

    startWave() {
        this.isWaveActive = true;
        this.waveTimer = CONFIG.WAVE_DURATION;
        console.log(`Wave ${this.wave} started!`);
    }

    update(deltaTime, towerPosition, camera) {
        if (!this.isWaveActive) return;

        this.waveTimer -= deltaTime;
        this.spawnTimer -= deltaTime;

        if (this.spawnTimer <= 0) {
            this.spawnEnemy();
            this.spawnTimer = CONFIG.GOBLIN_SPAWN_INTERVAL / (1 + (this.wave - 1) * 0.1);
        }

        if (this.waveTimer <= 0 && this.enemies.length === 0) {
            this.isWaveActive = false;
            this.wave++;
            this.uiCallbacks.updateWave(this.wave);
            this.uiCallbacks.onWaveComplete();
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, towerPosition, camera);
            
            if (enemy.isDead) {
                this.addGold(5 * enemy.difficulty);
                this.enemies.splice(i, 1);
            } else if (enemy.mesh.position.distanceTo(towerPosition) < 2) {
                this.uiCallbacks.onTowerHit(enemy.difficulty * 2);
                enemy.die();
                this.enemies.splice(i, 1);
            }
        }
    }

    spawnEnemy() {
        const pos = getRandomPositionOnEdge(CONFIG.GROUND_SIZE / 2 - 5);
        const goblin = new Goblin(this.scene, this.wave);
        goblin.mesh.position.copy(pos);
        this.enemies.push(goblin);
    }

    addGold(amount) {
        this.gold += amount;
        this.uiCallbacks.updateGold(this.gold);
    }

    spendGold(amount) {
        if (this.gold >= amount) {
            this.gold -= amount;
            this.uiCallbacks.updateGold(this.gold);
            return true;
        }
        return false;
    }
}
