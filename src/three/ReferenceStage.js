import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class ReferenceStage {
  constructor(canvas, statusElement) {
    this.canvas = canvas;
    this.statusElement = statusElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x17131c);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(3.8, 2.8, 5.4);
    const context = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!context) {
      statusElement.textContent = 'WebGL2 unavailable';
      canvas.hidden = true;
      return;
    }
    this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.6, 0);
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 12;
    this.keyLight = new THREE.DirectionalLight(0xfff0d7, 3.2);
    this.keyLight.position.set(4, 6, 4);
    this.keyLight.castShadow = true;
    this.scene.add(this.keyLight);
    this.scene.add(new THREE.HemisphereLight(0xb8b0ff, 0x241a20, 1.7));
    const rim = new THREE.DirectionalLight(0x7f5af0, 2.3);
    rim.position.set(-4, 3, -3);
    this.scene.add(rim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5, 64),
      new THREE.MeshStandardMaterial({ color: 0x201a25, roughness: 0.95, metalness: 0.02 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.25;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(8, 16, 0x5d4a72, 0x30263a);
    grid.position.y = -1.24;
    this.scene.add(grid);
    this.subject = new THREE.Group();
    this.scene.add(this.subject);
    this.setSubject('head');
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.animate();
    statusElement.textContent = 'WebGL2 live';
  }

  material(color = 0xcdb9a4, roughness = 0.76) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
  }

  addMesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.subject.add(mesh);
    return mesh;
  }

  clearSubject() {
    for (const object of [...this.subject.children]) {
      this.subject.remove(object);
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material?.dispose();
    }
  }

  setSubject(type) {
    if (!this.renderer) return;
    this.clearSubject();
    const clay = this.material();
    const dark = this.material(0x483b4e, 0.88);
    if (type === 'sphere') {
      this.addMesh(new THREE.SphereGeometry(1.25, 64, 32), clay, [0, 0.1, 0]);
    } else if (type === 'cube') {
      this.addMesh(new THREE.BoxGeometry(2.1, 2.1, 2.1, 4, 4, 4), clay, [0, 0, 0], [0.18, 0.42, 0]);
    } else if (type === 'cylinder') {
      this.addMesh(new THREE.CylinderGeometry(0.9, 1.15, 2.6, 48), clay, [0, 0.05, 0], [0.12, 0.25, 0]);
    } else if (type === 'figure') {
      this.addMesh(new THREE.SphereGeometry(0.43, 40, 24), clay, [0, 1.35, 0]);
      this.addMesh(new THREE.CapsuleGeometry(0.55, 1.2, 8, 24), clay, [0, 0.15, 0]);
      this.addMesh(new THREE.CapsuleGeometry(0.18, 1.25, 6, 18), clay, [-0.72, 0.25, 0], [0, 0, 0.22]);
      this.addMesh(new THREE.CapsuleGeometry(0.18, 1.25, 6, 18), clay, [0.72, 0.25, 0], [0, 0, -0.22]);
      this.addMesh(new THREE.CapsuleGeometry(0.24, 1.45, 6, 18), dark, [-0.34, -1.05, 0], [0, 0, 0.05]);
      this.addMesh(new THREE.CapsuleGeometry(0.24, 1.45, 6, 18), dark, [0.34, -1.05, 0], [0, 0, -0.05]);
    } else {
      this.addMesh(new THREE.SphereGeometry(0.88, 64, 40), clay, [0, 0.34, 0], [0, 0, 0], [0.87, 1.08, 0.92]);
      this.addMesh(new THREE.SphereGeometry(0.5, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), clay, [0, -0.28, 0.48], [Math.PI, 0, 0], [0.8, 0.75, 0.65]);
      this.addMesh(new THREE.CylinderGeometry(0.27, 0.34, 0.42, 32), clay, [0, -0.7, 0]);
      const eyeMaterial = this.material(0x302833, 0.4);
      this.addMesh(new THREE.SphereGeometry(0.055, 24, 16), eyeMaterial, [-0.29, 0.42, 0.78]);
      this.addMesh(new THREE.SphereGeometry(0.055, 24, 16), eyeMaterial, [0.29, 0.42, 0.78]);
    }
    this.subject.rotation.y = 0.2;
  }

  setLightAngle(value) {
    const angle = Number(value) * Math.PI * 2;
    this.keyLight.position.set(Math.cos(angle) * 5, 5.5, Math.sin(angle) * 5);
  }

  resize() {
    if (!this.renderer) return;
    const parent = this.canvas.parentElement;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    if (!this.renderer) return;
    this.animationFrame = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
