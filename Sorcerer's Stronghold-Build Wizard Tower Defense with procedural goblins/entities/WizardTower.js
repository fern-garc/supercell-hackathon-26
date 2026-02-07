import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class WizardTower {
    constructor(scene) {
        this.scene = scene;
        this.health = CONFIG.TOWER_HEALTH;
        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
        
        this.lastShotTime = 0;
    }

    createMesh() {
        const group = new THREE.Group();
        
        const loader = new THREE.TextureLoader();
        const stoneTex = loader.load(CONFIG.ASSETS.STONE);
        stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
        stoneTex.repeat.set(2, 4);

        // Tower Base
        const baseGeo = new THREE.CylinderGeometry(2, 2.5, 8, 8);
        const baseMat = new THREE.MeshStandardMaterial({ map: stoneTex });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 4;
        group.add(base);

        // Top Platform
        const topGeo = new THREE.CylinderGeometry(2.5, 2, 1, 8);
        const top = new THREE.Mesh(topGeo, baseMat);
        top.position.y = 8.5;
        group.add(top);

        // Wizard
        const wizardGroup = new THREE.Group();
        wizardGroup.position.y = 9;
        
        // Robe
        const robeGeo = new THREE.ConeGeometry(0.5, 1.5, 8);
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x4422aa });
        const robe = new THREE.Mesh(robeGeo, robeMat);
        wizardGroup.add(robe);

        // Head
        const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.8;
        wizardGroup.add(head);

        // Hat
        const hatGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x221155 });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 1.3;
        wizardGroup.add(hat);

        this.wizard = wizardGroup;
        group.add(wizardGroup);

        return group;
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    update(deltaTime, enemies, shootCallback) {
        const currentTime = performance.now() / 1000;
        if (currentTime - this.lastShotTime > 1 / CONFIG.WIZARD_ATTACK_SPEED) {
            const target = this.findNearestEnemy(enemies);
            if (target) {
                this.wizard.lookAt(target.mesh.position);
                shootCallback(this.wizard.getWorldPosition(new THREE.Vector3()), target);
                this.lastShotTime = currentTime;
            }
        }
    }

    findNearestEnemy(enemies) {
        let nearest = null;
        let minDist = CONFIG.WIZARD_ATTACK_RANGE;

        for (const enemy of enemies) {
            const dist = this.mesh.position.distanceTo(enemy.mesh.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        return nearest;
    }
}
