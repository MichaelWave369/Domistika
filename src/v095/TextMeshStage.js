import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import helvetikerRegularData from 'three/examples/fonts/helvetiker_regular.typeface.json';
import helvetikerBoldData from 'three/examples/fonts/helvetiker_bold.typeface.json';
import optimerRegularData from 'three/examples/fonts/optimer_regular.typeface.json';

const FONT_LOADER = new FontLoader();
const FONTS = Object.freeze({
  helvetiker: FONT_LOADER.parse(helvetikerRegularData),
  'helvetiker-bold': FONT_LOADER.parse(helvetikerBoldData),
  optimer: FONT_LOADER.parse(optimerRegularData),
});

export const TEXT_MESH_FONTS = Object.freeze([
  ['Helvetiker', 'helvetiker'],
  ['Helvetiker Bold', 'helvetiker-bold'],
  ['Optimer', 'optimer'],
]);

export const TEXT_MESH_DEFAULTS = Object.freeze({
  text: 'Domistika', font: 'helvetiker-bold', size: 0.92, depth: 0.24,
  curveSegments: 8, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.035,
  bevelSegments: 3, tracking: 0.04, lineHeight: 1.22, align: 'center',
  material: 'matte', frontColor: '#f3c45b', sideColor: '#6b3f8f',
  roughness: 0.56, metalness: 0.14, emissive: 0.18, transmission: 0.62,
  background: '#17131c', environment: true, autoSpin: false, spinSpeed: 0.18,
  transformMode: 'translate', transformSpace: 'world', snap: false,
  position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function disposeTree(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
    else object.material?.dispose?.();
  });
  root.clear();
}

function materialPair(state) {
  const common = {
    roughness: clamp(state.roughness, 0, 1),
    metalness: clamp(state.metalness, 0, 1),
  };
  const frontColor = new THREE.Color(state.frontColor);
  const sideColor = new THREE.Color(state.sideColor);
  if (state.material === 'glass') {
    return [frontColor, sideColor].map((color) => new THREE.MeshPhysicalMaterial({
      color, transparent: true, opacity: 0.78, transmission: clamp(state.transmission, 0, 1),
      thickness: 0.8, ior: 1.45, roughness: Math.min(common.roughness, 0.24), metalness: 0,
      clearcoat: 0.65, clearcoatRoughness: 0.16,
    }));
  }
  if (state.material === 'neon') {
    return [frontColor, sideColor].map((color) => new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.5 + clamp(state.emissive, 0, 2) * 2.6,
      roughness: 0.34, metalness: 0.04,
    }));
  }
  if (state.material === 'chrome') {
    return [frontColor, sideColor].map((color) => new THREE.MeshPhysicalMaterial({
      color, roughness: Math.min(common.roughness, 0.24), metalness: 0.96,
      clearcoat: 1, clearcoatRoughness: 0.08,
    }));
  }
  if (state.material === 'toon') {
    return [frontColor, sideColor].map((color) => new THREE.MeshToonMaterial({ color }));
  }
  return [frontColor, sideColor].map((color) => new THREE.MeshStandardMaterial({ color, ...common }));
}

export class TextMeshStage {
  constructor(canvas, { onStateChange, onStatus } = {}) {
    this.canvas = canvas;
    this.onStateChange = onStateChange ?? (() => {});
    this.onStatus = onStatus ?? (() => {});
    this.state = JSON.parse(JSON.stringify(TEXT_MESH_DEFAULTS));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.state.background);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.05, 120);
    this.camera.position.set(4.6, 3.2, 6.8);

    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!context) throw new Error('WebGL2 is required for editable 3D text.');
    this.renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.target.set(0, 0.15, 0);
    this.orbit.minDistance = 2;
    this.orbit.maxDistance = 24;

    this.keyLight = new THREE.DirectionalLight(0xffedd2, 4.2);
    this.keyLight.position.set(5, 7, 6);
    this.keyLight.castShadow = true;
    this.scene.add(this.keyLight);
    this.scene.add(new THREE.HemisphereLight(0x9fb7ff, 0x271b28, 1.9));
    this.rimLight = new THREE.DirectionalLight(0x8f63ff, 2.8);
    this.rimLight.position.set(-5, 3, -4);
    this.scene.add(this.rimLight);

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x211a27, roughness: 0.94, metalness: 0.02 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -1.65;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.grid = new THREE.GridHelper(16, 32, 0x775895, 0x352a40);
    this.grid.position.y = -1.64;
    this.scene.add(this.grid);

    this.textRoot = new THREE.Group();
    this.textContent = new THREE.Group();
    this.textRoot.add(this.textContent);
    this.scene.add(this.textRoot);

    this.transform = new TransformControls(this.camera, canvas);
    this.transform.attach(this.textRoot);
    this.transform.size = 0.82;
    this.transform.addEventListener('dragging-changed', (event) => { this.orbit.enabled = !event.value; });
    this.transform.addEventListener('objectChange', () => this.captureTransform(true));
    this.scene.add(this.transform.getHelper());

    this.clock = new THREE.Clock();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.applyState(this.state, { rebuild: true, notify: false });
    this.animate();
  }

  captureTransform(notify = false) {
    this.state.position = this.textRoot.position.toArray();
    this.state.rotation = [this.textRoot.rotation.x, this.textRoot.rotation.y, this.textRoot.rotation.z];
    this.state.scale = this.textRoot.scale.toArray();
    if (notify) this.onStateChange(this.serializeState());
  }

  serializeState() {
    this.captureTransform(false);
    return JSON.parse(JSON.stringify(this.state));
  }

  applyState(next = {}, { rebuild = true, notify = true } = {}) {
    this.state = { ...this.state, ...next };
    this.textRoot.position.fromArray(this.state.position || [0, 0, 0]);
    this.textRoot.rotation.set(...(this.state.rotation || [0, 0, 0]));
    this.textRoot.scale.fromArray(this.state.scale || [1, 1, 1]);
    this.scene.background = new THREE.Color(this.state.background || '#17131c');
    this.floor.visible = this.state.environment !== false;
    this.grid.visible = this.state.environment !== false;
    this.transform.setMode(this.state.transformMode || 'translate');
    this.transform.setSpace(this.state.transformSpace || 'world');
    this.setSnap(Boolean(this.state.snap));
    if (rebuild) this.rebuildText();
    if (notify) this.onStateChange(this.serializeState());
  }

  setSnap(enabled) {
    this.state.snap = Boolean(enabled);
    this.transform.translationSnap = enabled ? 0.25 : null;
    this.transform.rotationSnap = enabled ? THREE.MathUtils.degToRad(15) : null;
    this.transform.scaleSnap = enabled ? 0.1 : null;
  }

  setTransformMode(mode) {
    if (!['translate', 'rotate', 'scale'].includes(mode)) return;
    this.state.transformMode = mode;
    this.transform.setMode(mode);
    this.onStateChange(this.serializeState());
  }

  setTransformSpace(space) {
    this.state.transformSpace = space === 'local' ? 'local' : 'world';
    this.transform.setSpace(this.state.transformSpace);
    this.onStateChange(this.serializeState());
  }

  resetTransform() {
    this.textRoot.position.set(0, 0, 0);
    this.textRoot.rotation.set(0, 0, 0);
    this.textRoot.scale.set(1, 1, 1);
    this.captureTransform(true);
  }

  rebuildText() {
    disposeTree(this.textContent);
    const font = FONTS[this.state.font] || FONTS.helvetiker;
    const materials = materialPair(this.state);
    const size = clamp(this.state.size, 0.12, 4);
    const depth = clamp(this.state.depth, 0.01, 2.5);
    const tracking = clamp(this.state.tracking, -0.2, 1.2) * size;
    const lineHeight = clamp(this.state.lineHeight, 0.7, 3) * size;
    const lines = String(this.state.text || 'Domistika').replace(/\r/g, '').split('\n').slice(0, 8);

    lines.forEach((line, lineIndex) => {
      const glyphs = [];
      let lineWidth = 0;
      for (const character of line.slice(0, 80)) {
        if (character === ' ') {
          const advance = size * 0.44 + tracking;
          glyphs.push({ character, advance, geometry: null });
          lineWidth += advance;
          continue;
        }
        const geometry = new TextGeometry(character, {
          font, size, depth, curveSegments: clamp(this.state.curveSegments, 2, 18),
          bevelEnabled: Boolean(this.state.bevelEnabled),
          bevelSize: clamp(this.state.bevelSize, 0, size * 0.22),
          bevelThickness: clamp(this.state.bevelThickness, 0, depth * 0.75),
          bevelSegments: clamp(this.state.bevelSegments, 1, 8),
        });
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox;
        const width = Math.max(size * 0.12, (bounds?.max.x || 0) - (bounds?.min.x || 0));
        const advance = width + tracking;
        glyphs.push({ character, advance, geometry });
        lineWidth += advance;
      }
      if (glyphs.length) lineWidth -= tracking;
      let cursor = this.state.align === 'left' ? 0 : this.state.align === 'right' ? -lineWidth : -lineWidth / 2;
      const lineGroup = new THREE.Group();
      lineGroup.position.y = -lineIndex * lineHeight;
      for (const glyph of glyphs) {
        if (glyph.geometry) {
          const mesh = new THREE.Mesh(glyph.geometry, materials);
          mesh.position.x = cursor;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          lineGroup.add(mesh);
        }
        cursor += glyph.advance;
      }
      this.textContent.add(lineGroup);
    });

    const bounds = new THREE.Box3().setFromObject(this.textContent);
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3());
      this.textContent.position.set(-center.x, -center.y, -center.z);
    }
    this.onStatus('Editable 3D text rebuilt');
  }

  cameraPreset(preset) {
    const positions = {
      front: [0, 0.2, 7.4], iso: [5.6, 3.8, 6.2], side: [7.4, 0.2, 0], top: [0.01, 8.4, 0.01],
    };
    const position = positions[preset] || positions.iso;
    this.camera.position.set(...position);
    this.orbit.target.set(0, 0, 0);
    this.camera.lookAt(0, 0, 0);
    this.orbit.update();
  }

  async capturePng({ width = 1600, height = 900, transparent = true } = {}) {
    const previousSize = this.renderer.getSize(new THREE.Vector2());
    const previousAspect = this.camera.aspect;
    const previousBackground = this.scene.background;
    const helper = this.transform.getHelper();
    const previousHelper = helper.visible;
    const previousFloor = this.floor.visible;
    const previousGrid = this.grid.visible;
    helper.visible = false;
    if (transparent) {
      this.scene.background = null;
      this.floor.visible = false;
      this.grid.visible = false;
      this.renderer.setClearAlpha(0);
    }
    this.renderer.setSize(Math.max(256, width), Math.max(256, height), false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.canvas.toDataURL('image/png');
    this.renderer.setSize(previousSize.x, previousSize.y, false);
    this.camera.aspect = previousAspect;
    this.camera.updateProjectionMatrix();
    this.scene.background = previousBackground;
    this.floor.visible = previousFloor;
    this.grid.visible = previousGrid;
    helper.visible = previousHelper;
    this.renderer.setClearAlpha(1);
    return dataUrl;
  }

  async exportGlb() {
    const exporter = new GLTFExporter();
    const scene = new THREE.Scene();
    const clone = this.textRoot.clone(true);
    scene.add(clone);
    return exporter.parseAsync(scene, { binary: true, onlyVisible: true, trs: false });
  }

  resize() {
    const parent = this.canvas.parentElement;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    this.animationFrame = requestAnimationFrame(() => this.animate());
    const delta = Math.min(0.05, this.clock.getDelta());
    if (this.state.autoSpin && !this.transform.dragging) {
      this.textRoot.rotation.y += delta * clamp(this.state.spinSpeed, 0.02, 2);
      this.captureTransform(false);
    }
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    this.orbit?.dispose();
    this.transform?.dispose();
    disposeTree(this.textContent);
    this.renderer?.dispose();
  }
}
