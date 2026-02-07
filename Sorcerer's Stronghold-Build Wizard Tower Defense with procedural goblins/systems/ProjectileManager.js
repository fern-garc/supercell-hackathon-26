import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Projectile {
    constructor(scene, startPos, target, damage, color = 0xff4400) {
        this.scene = scene;
        this.target = target;
        this.damage = damage;
        this.speed = CONFIG.FIREBALL_SPEED;
        this.isDead = false;

        const geo = new THREE.SphereGeometry(0.2, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(startPos);
        this.scene.add(this.mesh);

        // Light effect
        this.light = new THREE.PointLight(color, 1, 5);
        this.mesh.add(this.light);
    }

    update(deltaTime) {
        if (this.isDead) return;

        if (this.target.isDead) {
            this.die();
            return;
        }

        const targetPos = this.target.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
        const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
        this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));

        if (this.mesh.position.distanceTo(targetPos) < 0.5) {
            this.target.takeDamage(this.damage);
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.scene.remove(this.mesh);
    }
}

export class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
    }

    spawn(startPos, target, damage, color) {
        this.projectiles.push(new Projectile(this.scene, startPos, target, damage, color));
    }

    update(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(deltaTime);
            if (this.projectiles[i].isDead) {
                this.projectiles.splice(i, 1);
            }
        }
    }
}
