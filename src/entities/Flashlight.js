class Flashlight {
    constructor(camera) {
        this.camera = camera;
        this.light = null;
        this.mesh = null;
        this.lens = null;

        this.init();
    }

    init() {
        // Create spotlight for flashlight effect
        // Color, Intensity, Distance, Angle, Penumbra, Decay
        this.light = new THREE.SpotLight(0xfff6d5, 3, 25, Math.PI / 8, 0.4, 1.2);

        // Settings for better light quality
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
        this.light.shadow.camera.near = 0.1;
        this.light.shadow.camera.far = 40;

        // Position the light slightly to the side (first-person style)
        this.light.position.set(0.4, -0.3, -0.2);

        // Attach light to camera
        this.camera.add(this.light);

        // The target of the light needs to be added to the scene (or camera)
        this.light.target.position.set(0.4, -0.3, -10);
        this.camera.add(this.light.target);

        // Create a simple flashlight mesh
        const flashlightGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
        const flashlightMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        this.mesh = new THREE.Mesh(flashlightGeometry, flashlightMaterial);

        // Position the mesh just behind the light source
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.position.set(0.4, -0.3, -0.2);
        this.camera.add(this.mesh);

        // Add a small lens part
        const lensGeometry = new THREE.CylinderGeometry(0.06, 0.05, 0.05, 16);
        const lensMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            emissive: 0xfff6d5,
            emissiveIntensity: 0.5
        });
        this.lens = new THREE.Mesh(lensGeometry, lensMaterial);
        this.lens.rotation.x = Math.PI / 2;
        this.lens.position.set(0.4, -0.3, -0.4);
        this.camera.add(this.lens);
    }

    toggle() {
        if (this.light) {
            this.light.visible = !this.light.visible;
            this.mesh.visible = this.light.visible;
            this.lens.visible = this.light.visible;
        }
    }
}
