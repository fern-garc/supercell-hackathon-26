import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Goblin {
    constructor(scene, difficulty = 1) {
        this.scene = scene;
        this.difficulty = difficulty;
        this.hp = 10 * difficulty;
        this.maxHp = this.hp;
        this.speed = 2 + (difficulty * 0.2);
        this.isDead = false;

        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
    }

    createMesh() {
        const group = new THREE.Group();
        
        // Body scale based on difficulty
        const scale = 1 + (this.difficulty - 1) * 0.2;
        
        // Change shape slightly based on difficulty (more "jagged" as they get harder)
        let geometry;
        if (this.difficulty < 3) {
            geometry = new THREE.SphereGeometry(0.5 * scale, 8, 8);
        } else if (this.difficulty < 6) {
            geometry = new THREE.BoxGeometry(0.8 * scale, 0.8 * scale, 0.8 * scale);
        } else {
            geometry = new THREE.IcosahedronGeometry(0.6 * scale, 0);
        }

        const material = new THREE.MeshStandardMaterial({ color: 0x33aa33 });
        const body = new THREE.Mesh(geometry, material);
        body.position.y = 0.5 * scale;
        group.add(body);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.1, 4, 4);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2 * scale, 0.7 * scale, 0.4 * scale);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2 * scale, 0.7 * scale, 0.4 * scale);
        group.add(leftEye, rightEye);

        // Ears
        const earGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
        const earMat = new THREE.MeshStandardMaterial({ color: 0x33aa33 });
        const leftEar = new THREE.Mesh(earGeo, earMat);
        leftEar.position.set(-0.5 * scale, 0.7 * scale, 0);
        leftEar.rotation.z = Math.PI / 3;
        const rightEar = new THREE.Mesh(earGeo, earMat);
        rightEar.position.set(0.5 * scale, 0.7 * scale, 0);
        rightEar.rotation.z = -Math.PI / 3;
        group.add(leftEar, rightEar);

        return group;
    }

    update(deltaTime, targetPosition, camera) {
        if (this.isDead) return;

        const direction = new THREE.Vector3().subVectors(targetPosition, this.mesh.position).normalize();
        this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));
        this.mesh.lookAt(targetPosition);

        if (this.healthBar && camera) {
            this.healthBar.quaternion.copy(camera.quaternion);
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.updateHealthBar();
        if (this.hp <= 0 && !this.isDead) {
            this.die();
        }
    }

    updateHealthBar() {
        if (!this.healthBar) {
            const geo = new THREE.PlaneGeometry(0.8, 0.1);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            this.healthBar = new THREE.Mesh(geo, mat);
            this.healthBar.position.y = 1.2;
            this.mesh.add(this.healthBar);
        }
        this.healthBar.scale.x = Math.max(0, this.hp / this.maxHp);
    }

    die() {
        this.isDead = true;
        this.scene.remove(this.mesh);
    }
}
