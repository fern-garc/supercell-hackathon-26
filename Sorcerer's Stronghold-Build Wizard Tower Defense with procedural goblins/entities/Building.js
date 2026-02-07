import * as THREE from 'three';

export class Building {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        this.damage = type.damage;
        this.range = type.range;
        this.attackSpeed = type.attackSpeed;
        this.lastShotTime = 0;

        this.mesh = this.createMesh(position);
        this.scene.add(this.mesh);
    }

    createMesh(position) {
        const group = new THREE.Group();
        group.position.copy(position);

        const baseGeo = new THREE.BoxGeometry(1, 0.5, 1);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        const crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
        const crystalMat = new THREE.MeshStandardMaterial({ 
            color: this.type.color,
            emissive: this.type.color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = 1;
        this.crystal = crystal;
        group.add(crystal);

        return group;
    }

    update(deltaTime, enemies, shootCallback) {
        this.crystal.rotation.y += deltaTime * 2;
        this.crystal.position.y = 1 + Math.sin(performance.now() * 0.005) * 0.1;

        const currentTime = performance.now() / 1000;
        if (currentTime - this.lastShotTime > 1 / this.attackSpeed) {
            const target = this.findNearestEnemy(enemies);
            if (target) {
                shootCallback(this.crystal.getWorldPosition(new THREE.Vector3()), target, this.damage, this.type.color);
                this.lastShotTime = currentTime;
            }
        }
    }

    findNearestEnemy(enemies) {
        let nearest = null;
        let minDist = this.range;

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
