import * as THREE from 'three';

export function getDistance(obj1, obj2) {
    return obj1.position.distanceTo(obj2.position);
}

export function getRandomPositionOnEdge(radius) {
    const angle = Math.random() * Math.PI * 2;
    return new THREE.Vector3(
        Math.cos(angle) * radius,
        0.5,
        Math.sin(angle) * radius
    );
}
