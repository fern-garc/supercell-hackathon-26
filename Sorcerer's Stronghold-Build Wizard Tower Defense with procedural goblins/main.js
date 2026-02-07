import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, BUILDINGS } from './config.js';
import { WizardTower } from './entities/WizardTower.js';
import { Building } from './entities/Building.js';
import { ProjectileManager } from './systems/ProjectileManager.js';
import { GameManager } from './systems/GameManager.js';

class Game {
    constructor() {
        this.initScene();
        this.initManagers();
        this.setupUI();
        this.animate();
        
        window.game = this; // For store interaction
        this.placingBuilding = null;
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        this.scene.fog = new THREE.Fog(0x0a0a1a, 30, 80);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 30, 30);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2.1;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 60;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(10, 20, 10);
        this.scene.add(sunLight);

        // Ground
        const loader = new THREE.TextureLoader();
        const grassTex = loader.load(CONFIG.ASSETS.GRASS);
        grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
        grassTex.repeat.set(10, 10);

        const groundGeo = new THREE.PlaneGeometry(CONFIG.GROUND_SIZE, CONFIG.GROUND_SIZE);
        const groundMat = new THREE.MeshStandardMaterial({ map: grassTex });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Grid helper for building
        this.grid = new THREE.GridHelper(CONFIG.GROUND_SIZE, CONFIG.GROUND_SIZE / 2, 0xffffff, 0x333333);
        this.grid.position.y = 0.01;
        this.scene.add(this.grid);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Click to place building
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        window.addEventListener('mousedown', (e) => this.onMouseClick(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    initManagers() {
        this.tower = new WizardTower(this.scene);
        this.projectiles = new ProjectileManager(this.scene);
        
        const uiCallbacks = {
            updateGold: (val) => document.getElementById('gold-val').innerText = Math.floor(val),
            updateWave: (val) => document.getElementById('wave-val').innerText = val,
            onTowerHit: (damage) => {
                const health = this.tower.health - damage;
                this.tower.health = health;
                document.getElementById('health-val').innerText = Math.max(0, Math.floor(health));
                if (health <= 0) this.gameOver();
            },
            onWaveComplete: () => {
                document.getElementById('wave-btn').style.display = 'block';
                this.showMessage('Wave Complete!');
            }
        };

        this.manager = new GameManager(this.scene, uiCallbacks);
    }

    setupUI() {
        document.getElementById('wave-btn').addEventListener('click', () => {
            document.getElementById('wave-btn').style.display = 'none';
            this.manager.startWave();
        });
    }

    buyBuilding(typeKey) {
        const type = BUILDINGS[typeKey];
        if (this.manager.gold >= type.cost) {
            this.placingBuilding = type;
            this.showMessage(`Placing ${type.name}...`);
        } else {
            this.showMessage('Not enough gold!');
        }
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.placingBuilding) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children);
            const groundIntersect = intersects.find(i => i.object.geometry instanceof THREE.PlaneGeometry);
            
            if (groundIntersect) {
                if (!this.previewMesh) {
                    const geo = new THREE.BoxGeometry(1, 1, 1);
                    const mat = new THREE.MeshBasicMaterial({ color: this.placingBuilding.color, transparent: true, opacity: 0.5 });
                    this.previewMesh = new THREE.Mesh(geo, mat);
                    this.scene.add(this.previewMesh);
                }
                this.previewMesh.position.copy(groundIntersect.point);
                this.previewMesh.position.y = 0.5;
                this.previewMesh.position.x = Math.round(this.previewMesh.position.x);
                this.previewMesh.position.z = Math.round(this.previewMesh.position.z);
            }
        }
    }

    onMouseClick(event) {
        if (this.placingBuilding && event.button === 0) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children);
            const groundIntersect = intersects.find(i => i.object.geometry instanceof THREE.PlaneGeometry);

            if (groundIntersect) {
                const pos = groundIntersect.point.clone();
                pos.x = Math.round(pos.x);
                pos.z = Math.round(pos.z);
                pos.y = 0;

                if (this.manager.spendGold(this.placingBuilding.cost)) {
                    const building = new Building(this.scene, this.placingBuilding, pos);
                    this.manager.buildings.push(building);
                    this.placingBuilding = null;
                    if (this.previewMesh) {
                        this.scene.remove(this.previewMesh);
                        this.previewMesh = null;
                    }
                }
            }
        }
    }

    showMessage(text) {
        const msg = document.getElementById('message');
        msg.innerText = text;
        msg.style.display = 'block';
        setTimeout(() => {
            msg.style.display = 'none';
        }, 2000);
    }

    gameOver() {
        this.manager.isWaveActive = false;
        this.showMessage('Game Over!');
        setTimeout(() => location.reload(), 3000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const deltaTime = 0.016; // Fixed delta for simplicity

        this.controls.update();

        if (this.manager.isWaveActive) {
            this.tower.update(deltaTime, this.manager.enemies, (start, target) => {
                this.projectiles.spawn(start, target, CONFIG.FIREBALL_DAMAGE);
            });

            this.manager.buildings.forEach(b => {
                b.update(deltaTime, this.manager.enemies, (start, target, dmg, color) => {
                    this.projectiles.spawn(start, target, dmg, color);
                });
            });
        }

        this.manager.update(deltaTime, this.tower.mesh.position, this.camera);
        this.projectiles.update(deltaTime);

        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
