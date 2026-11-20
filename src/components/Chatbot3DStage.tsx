import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Bot, RefreshCw, RotateCcw } from 'lucide-react';
import { Language } from '../data/rehabContent';

export type ChatbotMood = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Chatbot3DStageHandle {
  resetView: () => void;
  triggerGreeting: () => void;
}

interface Chatbot3DStageProps {
  mood: ChatbotMood;
  lang: Language;
  roleLabel: string;
}

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Chatbot3DStage = React.forwardRef<Chatbot3DStageHandle, Chatbot3DStageProps>(
  ({ mood, lang, roleLabel }, ref) => {
    const isTa = lang === 'ta';
    const stageWrapRef = useRef<HTMLDivElement | null>(null);
    const mountRef = useRef<HTMLDivElement | null>(null);
    const moodRef = useRef<ChatbotMood>(mood);
    moodRef.current = mood;

    const resetTriggerRef = useRef<boolean>(false);
    const greetTimerRef = useRef<number>(1.4);
    const requestSingleRenderRef = useRef<(() => void) | null>(null);

    const [webglFailed, setWebglFailed] = useState<boolean>(false);
    const [mountNonce, setMountNonce] = useState<number>(0);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    useImperativeHandle(ref, () => ({
      resetView: () => {
        resetTriggerRef.current = true;
        requestSingleRenderRef.current?.();
      },
      triggerGreeting: () => {
        greetTimerRef.current = 1.6;
        requestSingleRenderRef.current?.();
      },
    }));

    useEffect(() => {
      const container = mountRef.current;
      const wrapEl = stageWrapRef.current;
      if (!container) return;

      let disposed = false;
      let isInView = true;
      let isTabVisible =
        typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
      let frameId = 0;

      const isSoftwareGl = detectSoftwareWebGL();
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          alpha: false,
        });
      } catch {
        setWebglFailed(true);
        return;
      }

      const width = Math.max(280, container.clientWidth || 420);
      const height = Math.max(280, container.clientHeight || 420);

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        setWebglFailed(true);
      };
      const handleContextRestored = () => {
        setWebglFailed(false);
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07101c);
      scene.fog = new THREE.FogExp2(0x07101c, 0.068);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();

      const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
      const defaultCamPos = new THREE.Vector3(0.35, 0.55, 5.25);
      const defaultTarget = new THREE.Vector3(0, 0.15, 0);
      camera.position.copy(defaultCamPos);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(defaultTarget);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.minPolarAngle = Math.PI * 0.28;
      controls.maxPolarAngle = Math.PI * 0.56;
      controls.rotateSpeed = 0.72;
      controls.addEventListener('start', () => {
        resetTriggerRef.current = false;
      });
      controls.update();

      // 3-Point Studio Lighting Rig
      const hemiLight = new THREE.HemisphereLight(0xcbe8ff, 0x0b1623, 0.85);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.2);
      keyLight.position.set(3.2, 4.8, 3.8);
      if (!isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 1;
        keyLight.shadow.camera.far = 14;
        keyLight.shadow.camera.left = -2.5;
        keyLight.shadow.camera.right = 2.5;
        keyLight.shadow.camera.top = 2.5;
        keyLight.shadow.camera.bottom = -2.5;
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.02;
      }
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x2dd4bf, 1.55);
      rimLight.position.set(-3.4, 2.4, -3.2);
      scene.add(rimLight);

      const fillLight = new THREE.PointLight(0x1f6f63, 1.4, 10);
      fillLight.position.set(-2.0, 0.8, 2.2);
      scene.add(fillLight);

      // Grounding Studio Floor & Radial Contact Shadow (y = -1.42)
      const FLOOR_Y = -1.42;
      const disposables: Array<{ dispose: () => void }> = [envTexture];

      const shadowTex = createRadialShadowTexture();
      disposables.push(shadowTex);
      const shadowPlaneGeo = new THREE.PlaneGeometry(3.2, 3.2);
      const shadowPlaneMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.45,
      });
      const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = FLOOR_Y + 0.02;
      scene.add(shadowPlane);
      disposables.push(shadowPlaneGeo, shadowPlaneMat);

      const studioDiscGeo = new THREE.CylinderGeometry(2.6, 2.8, 0.08, 64);
      const studioDiscMat = new THREE.MeshStandardMaterial({
        color: 0x0c192b,
        roughness: 0.78,
        metalness: 0.14,
      });
      const studioDisc = new THREE.Mesh(studioDiscGeo, studioDiscMat);
      studioDisc.position.y = FLOOR_Y - 0.04;
      studioDisc.receiveShadow = !isSoftwareGl;
      scene.add(studioDisc);
      disposables.push(studioDiscGeo, studioDiscMat);

      // =========================================================================
      // Composite Procedural Care Companion (9-Part Hierarchy, Grounded Pivot)
      // =========================================================================
      const botRoot = new THREE.Group();
      botRoot.position.set(0, FLOOR_Y, 0);
      scene.add(botRoot);

      // Materials (varied roughness >= 0.25 & metalness contrast)
      const ceramicWhiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xf4f7f8,
        roughness: 0.34,
        metalness: 0.06,
        clearcoat: 0.55,
        clearcoatRoughness: 0.24,
      });
      const titaniumMat = new THREE.MeshStandardMaterial({
        color: 0x8ea3b5,
        roughness: 0.18,
        metalness: 0.92,
      });
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x182738,
        roughness: 0.72,
        metalness: 0.18,
      });
      const tealCollarMat = new THREE.MeshStandardMaterial({
        color: 0x1f6f63,
        emissive: 0x1f6f63,
        emissiveIntensity: 0.65,
        roughness: 0.3,
        metalness: 0.25,
      });
      const visorGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x071320,
        roughness: 0.08,
        metalness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        transparent: true,
        opacity: isSoftwareGl ? 0.38 : 0.34,
        depthWrite: false,
      });
      const faceBackingMat = new THREE.MeshStandardMaterial({
        color: 0x060f19,
        roughness: 0.5,
        metalness: 0.2,
      });
      const eyeGlowMat = new THREE.MeshStandardMaterial({
        color: 0x5eead4,
        emissive: 0x2dd4bf,
        emissiveIntensity: 1.55,
        roughness: 0.2,
        metalness: 0.1,
      });
      const waveGlowMat = new THREE.MeshStandardMaterial({
        color: 0x99f6e4,
        emissive: 0x2dd4bf,
        emissiveIntensity: 1.35,
        roughness: 0.2,
        metalness: 0.1,
      });
      const haloRingMat = new THREE.MeshStandardMaterial({
        color: 0x2dd4bf,
        emissive: 0x1f6f63,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.58,
        roughness: 0.25,
        metalness: 0.6,
      });
      disposables.push(
        ceramicWhiteMat,
        titaniumMat,
        plinthMat,
        tealCollarMat,
        visorGlassMat,
        faceBackingMat,
        eyeGlowMat,
        waveGlowMat,
        haloRingMat
      );

      // Part 1: Grounded Plinth Base (y: 0 -> 0.22)
      const plinthProfile = [
        new THREE.Vector2(0.001, 0),
        new THREE.Vector2(0.84, 0),
        new THREE.Vector2(0.82, 0.12),
        new THREE.Vector2(0.72, 0.22),
        new THREE.Vector2(0.001, 0.22),
      ];
      const plinthGeo = new THREE.LatheGeometry(plinthProfile, 48);
      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      plinthMesh.castShadow = !isSoftwareGl;
      plinthMesh.receiveShadow = !isSoftwareGl;
      botRoot.add(plinthMesh);
      disposables.push(plinthGeo);

      // Part 2: Brushed Titanium Base Ring
      const baseRingGeo = new THREE.TorusGeometry(0.73, 0.032, 16, 48);
      const baseRing = new THREE.Mesh(baseRingGeo, titaniumMat);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 0.21;
      botRoot.add(baseRing);
      disposables.push(baseRingGeo);

      // Part 3: Sculpted Pearl Torso Column (y: 0.2 -> 1.48)
      const torsoProfile = [
        new THREE.Vector2(0.001, 0.2),
        new THREE.Vector2(0.42, 0.22),
        new THREE.Vector2(0.56, 0.52),
        new THREE.Vector2(0.62, 0.92),
        new THREE.Vector2(0.52, 1.32),
        new THREE.Vector2(0.34, 1.48),
        new THREE.Vector2(0.001, 1.48),
      ];
      const torsoGeo = new THREE.LatheGeometry(torsoProfile, 48);
      const torsoMesh = new THREE.Mesh(torsoGeo, ceramicWhiteMat);
      torsoMesh.castShadow = !isSoftwareGl;
      torsoMesh.receiveShadow = !isSoftwareGl;
      botRoot.add(torsoMesh);
      disposables.push(torsoGeo);

      // Medical Heart-Cross Emblem on Chest
      const chestBadgeGroup = new THREE.Group();
      chestBadgeGroup.position.set(0, 0.94, 0.61);
      const badgeDiscGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.03, 32);
      const badgeDisc = new THREE.Mesh(badgeDiscGeo, plinthMat);
      badgeDisc.rotation.x = Math.PI / 2;
      const crossVGeo = new THREE.BoxGeometry(0.042, 0.13, 0.035);
      const crossHGeo = new THREE.BoxGeometry(0.13, 0.042, 0.035);
      const crossV = new THREE.Mesh(crossVGeo, eyeGlowMat);
      const crossH = new THREE.Mesh(crossHGeo, eyeGlowMat);
      crossV.position.z = 0.012;
      crossH.position.z = 0.012;
      chestBadgeGroup.add(badgeDisc, crossV, crossH);
      botRoot.add(chestBadgeGroup);
      disposables.push(badgeDiscGeo, crossVGeo, crossHGeo);

      // Part 4: Luminous Teal Collar Ring
      const collarGeo = new THREE.TorusGeometry(0.36, 0.042, 18, 48);
      const collarMesh = new THREE.Mesh(collarGeo, tealCollarMat);
      collarMesh.rotation.x = Math.PI / 2;
      collarMesh.position.y = 1.49;
      botRoot.add(collarMesh);
      disposables.push(collarGeo);

      // Part 5: Articulated Gesture Arms (Left & Right Shoulder Pivots)
      const armPivotL = new THREE.Group();
      armPivotL.position.set(-0.62, 1.24, 0.04);
      const armPivotR = new THREE.Group();
      armPivotR.position.set(0.62, 1.24, 0.04);

      const shoulderGeo = new THREE.SphereGeometry(0.11, 20, 20);
      const forearmGeo = new THREE.CapsuleGeometry(0.085, 0.42, 12, 20);
      const cuffGeo = new THREE.TorusGeometry(0.088, 0.018, 12, 24);

      const buildArm = (pivot: THREE.Group, side: -1 | 1) => {
        const shoulder = new THREE.Mesh(shoulderGeo, titaniumMat);
        const forearm = new THREE.Mesh(forearmGeo, ceramicWhiteMat);
        forearm.position.set(side * 0.06, -0.28, 0.05);
        forearm.rotation.z = side * -0.14;
        forearm.castShadow = !isSoftwareGl;

        const cuff = new THREE.Mesh(cuffGeo, tealCollarMat);
        cuff.rotation.x = Math.PI / 2;
        cuff.position.set(side * 0.09, -0.44, 0.05);

        pivot.add(shoulder, forearm, cuff);
      };
      buildArm(armPivotL, -1);
      buildArm(armPivotR, 1);
      botRoot.add(armPivotL, armPivotR);
      disposables.push(shoulderGeo, forearmGeo, cuffGeo);

      // Part 6: Expressive Articulated Head Assembly (pivot y = 1.88)
      const headPivot = new THREE.Group();
      headPivot.position.set(0, 1.92, 0);
      botRoot.add(headPivot);

      const headShellGeo = new THREE.SphereGeometry(0.56, 40, 32);
      const headShell = new THREE.Mesh(headShellGeo, ceramicWhiteMat);
      headShell.scale.set(1.06, 0.94, 0.96);
      headShell.castShadow = !isSoftwareGl;
      headPivot.add(headShell);
      disposables.push(headShellGeo);

      // Side Acoustic Ear Pods
      const earGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.09, 28);
      const earTrimGeo = new THREE.TorusGeometry(0.16, 0.022, 12, 28);
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(earGeo, titaniumMat);
        ear.rotation.z = Math.PI / 2;
        ear.position.set(side * 0.59, 0.02, 0);
        const earTrim = new THREE.Mesh(earTrimGeo, tealCollarMat);
        earTrim.rotation.y = Math.PI / 2;
        earTrim.position.set(side * 0.635, 0.02, 0);
        headPivot.add(ear, earTrim);
      });
      disposables.push(earGeo, earTrimGeo);

      // Face Backing Screen inside Visor
      const faceBackGeo = new THREE.SphereGeometry(0.48, 32, 24);
      const faceBack = new THREE.Mesh(faceBackGeo, faceBackingMat);
      faceBack.scale.set(1.02, 0.84, 0.72);
      faceBack.position.set(0, 0, 0.18);
      headPivot.add(faceBack);
      disposables.push(faceBackGeo);

      // Part 7: Expressive Pill Eyes + 5-Bar Voice Equalizer Mouth
      const eyeGeo = new THREE.CapsuleGeometry(0.052, 0.075, 10, 16);
      const eyeLeft = new THREE.Mesh(eyeGeo, eyeGlowMat);
      const eyeRight = new THREE.Mesh(eyeGeo, eyeGlowMat);
      eyeLeft.position.set(-0.17, 0.08, 0.52);
      eyeRight.position.set(0.17, 0.08, 0.52);
      eyeLeft.renderOrder = 1;
      eyeRight.renderOrder = 1;
      headPivot.add(eyeLeft, eyeRight);
      disposables.push(eyeGeo);

      const waveBarGeo = new THREE.CapsuleGeometry(0.018, 0.05, 8, 12);
      disposables.push(waveBarGeo);
      const waveBars: THREE.Mesh[] = [];
      for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(waveBarGeo, waveGlowMat);
        const offsetX = (i - 2) * 0.055;
        bar.position.set(offsetX, -0.11, 0.515 - Math.abs(i - 2) * 0.01);
        bar.renderOrder = 1;
        headPivot.add(bar);
        waveBars.push(bar);
      }

      // Part 8: Smoked Optical Glass Visor Dome
      const visorGeo = new THREE.SphereGeometry(
        0.53,
        36,
        28,
        -Math.PI * 0.36,
        Math.PI * 0.72,
        Math.PI * 0.24,
        Math.PI * 0.52
      );
      const visorMesh = new THREE.Mesh(visorGeo, visorGlassMat);
      visorMesh.rotation.y = Math.PI / 2;
      visorMesh.position.set(0, 0.01, 0.14);
      visorMesh.renderOrder = 2;
      headPivot.add(visorMesh);
      disposables.push(visorGeo);

      // Part 9: Orbital Neural Halo Rings + 24 Instanced Micro-Nodes
      const haloGroup = new THREE.Group();
      haloGroup.position.set(0, 2.58, 0);
      botRoot.add(haloGroup);

      const haloGeo1 = new THREE.TorusGeometry(0.74, 0.014, 12, 64);
      const haloGeo2 = new THREE.TorusGeometry(0.58, 0.011, 12, 56);
      const haloMesh1 = new THREE.Mesh(haloGeo1, haloRingMat);
      haloMesh1.rotation.x = Math.PI * 0.42;
      haloMesh1.rotation.y = 0.22;
      const haloMesh2 = new THREE.Mesh(haloGeo2, haloRingMat);
      haloMesh2.rotation.x = -Math.PI * 0.38;
      haloMesh2.rotation.z = 0.28;
      haloGroup.add(haloMesh1, haloMesh2);
      disposables.push(haloGeo1, haloGeo2);

      const NODE_COUNT = 24;
      const nodeGeo = new THREE.SphereGeometry(0.024, 10, 10);
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0x5eead4 });
      const nodeInstances = new THREE.InstancedMesh(nodeGeo, nodeMat, NODE_COUNT);
      nodeInstances.frustumCulled = false;
      const _dummy = new THREE.Object3D();
      for (let i = 0; i < NODE_COUNT; i++) {
        const angle = (i / NODE_COUNT) * Math.PI * 2;
        const radius = i % 2 === 0 ? 0.74 : 0.58;
        const tilt = i % 2 === 0 ? Math.PI * 0.42 : -Math.PI * 0.38;
        _dummy.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * Math.cos(tilt),
          Math.sin(angle) * radius * Math.sin(tilt)
        );
        _dummy.scale.setScalar(i % 3 === 0 ? 1.25 : 0.85);
        _dummy.updateMatrix();
        nodeInstances.setMatrixAt(i, _dummy.matrix);
      }
      nodeInstances.instanceMatrix.needsUpdate = true;
      nodeInstances.computeBoundingSphere();
      haloGroup.add(nodeInstances);
      disposables.push(nodeGeo, nodeMat);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // Reusable math scratch (Zero GC in render loop)
      const _targetColor = new THREE.Color();
      const _clock = new THREE.Clock();
      let blinkCooldown = 3.2;
      let blinkProgress = 0;
      let elapsed = 0;

      const applyCompanionPose = (dt: number) => {
        elapsed += dt;
        const activeMood = moodRef.current;

        // Smooth camera reset damping
        if (resetTriggerRef.current) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, defaultCamPos.x, 5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, defaultCamPos.y, 5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, defaultCamPos.z, 5, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, defaultTarget.x, 5, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, defaultTarget.y, 5, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, defaultTarget.z, 5, dt);
          if (camera.position.distanceTo(defaultCamPos) < 0.02) {
            camera.position.copy(defaultCamPos);
            controls.target.copy(defaultTarget);
            resetTriggerRef.current = false;
          }
        }
        controls.update();

        // Greeting timer countdown
        if (greetTimerRef.current > 0) {
          greetTimerRef.current = Math.max(0, greetTimerRef.current - dt);
        }

        // Subtle breathing & head posture based on mood
        const breath = Math.sin(elapsed * 2.0) * 0.014;
        botRoot.position.y = FLOOR_Y + (prefersReducedMotion ? 0 : breath);

        let targetHeadPitch = 0;
        let targetHeadYaw = 0.08; // Slight friendly angle toward user's chat panel
        let targetHaloSpeed = 0.45;
        let targetEmissiveHex = 0x1f6f63;
        let targetCollarIntensity = 0.65;

        if (activeMood === 'listening') {
          targetHeadPitch = -0.06;
          targetHeadYaw = 0.14;
          targetHaloSpeed = 0.9;
          targetEmissiveHex = 0x38bdf8;
          targetCollarIntensity = 1.15;
        } else if (activeMood === 'thinking') {
          targetHeadPitch = -0.11;
          targetHeadYaw = Math.sin(elapsed * 2.2) * 0.16;
          targetHaloSpeed = 2.4;
          targetEmissiveHex = 0xf59e0b;
          targetCollarIntensity = 1.25;
        } else if (activeMood === 'speaking') {
          targetHeadPitch = Math.sin(elapsed * 5.2) * 0.045;
          targetHeadYaw = 0.1 + Math.sin(elapsed * 2.1) * 0.08;
          targetHaloSpeed = 1.3;
          targetEmissiveHex = 0x2dd4bf;
          targetCollarIntensity = 1.4;
        }

        headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, targetHeadPitch, 6, dt);
        headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, targetHeadYaw, 6, dt);

        // Arm gestures (greeting wave or calm speech cadence)
        const waveAngle =
          greetTimerRef.current > 0
            ? -1.15 + Math.sin(elapsed * 7.5) * 0.25
            : activeMood === 'speaking'
            ? -0.22 + Math.sin(elapsed * 3.6) * 0.09
            : -0.05;
        armPivotR.rotation.z = THREE.MathUtils.damp(armPivotR.rotation.z, -waveAngle, 7, dt);
        armPivotL.rotation.z = THREE.MathUtils.damp(
          armPivotL.rotation.z,
          activeMood === 'speaking' ? -0.14 + Math.cos(elapsed * 3.2) * 0.06 : 0.04,
          7,
          dt
        );

        // Collar & eye color transition
        _targetColor.setHex(targetEmissiveHex);
        tealCollarMat.emissive.lerp(_targetColor, Math.min(1, dt * 6));
        tealCollarMat.emissiveIntensity = THREE.MathUtils.damp(
          tealCollarMat.emissiveIntensity,
          targetCollarIntensity,
          6,
          dt
        );

        // Natural eye blink
        blinkCooldown -= dt;
        if (blinkCooldown <= 0) {
          blinkProgress += dt * 7.5;
          if (blinkProgress >= Math.PI) {
            blinkProgress = 0;
            blinkCooldown = 3.2 + (Math.sin(elapsed * 1.7) + 1) * 1.2;
          }
        }
        const blinkScaleY =
          activeMood === 'thinking'
            ? 0.72
            : 1 - Math.sin(blinkProgress) * 0.88;
        eyeLeft.scale.y = Math.max(0.12, blinkScaleY);
        eyeRight.scale.y = Math.max(0.12, blinkScaleY);

        // 5-bar animated voice waveform mouth
        for (let i = 0; i < waveBars.length; i++) {
          let barTargetY = 0.55;
          if (activeMood === 'speaking') {
            barTargetY = 0.9 + Math.abs(Math.sin(elapsed * 11.5 + i * 0.95)) * 1.65;
          } else if (activeMood === 'thinking') {
            barTargetY = 0.75 + Math.abs(Math.sin(elapsed * 5.0 + i * 0.8)) * 0.7;
          } else if (activeMood === 'listening') {
            barTargetY = 0.8 + Math.abs(Math.sin(elapsed * 4.0 + i * 0.5)) * 0.45;
          }
          waveBars[i].scale.y = THREE.MathUtils.damp(waveBars[i].scale.y, barTargetY, 12, dt);
        }

        // Neural halo spin
        if (!prefersReducedMotion) {
          haloMesh1.rotation.z += dt * targetHaloSpeed * 0.65;
          haloMesh2.rotation.y -= dt * targetHaloSpeed * 0.85;
          nodeInstances.rotation.y += dt * targetHaloSpeed * 0.5;
        }
      };

      const afterDraw = (cb: () => void) => {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (disposed) return;
            const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
            if (state === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 80);
            }
          };
          frameId = window.setTimeout(poll, 5);
        } else {
          frameId = window.setTimeout(cb, 80);
        }
      };

      const renderOnce = () => {
        if (disposed) return;
        applyCompanionPose(0.016);
        renderer.render(scene, camera);
      };
      requestSingleRenderRef.current = renderOnce;

      const tick = () => {
        if (disposed || !isInView || !isTabVisible) {
          frameId = 0;
          return;
        }
        const dt = Math.min(0.08, Math.max(0.004, _clock.getDelta()));
        applyCompanionPose(dt);
        renderer.render(scene, camera);

        if (prefersReducedMotion) {
          frameId = 0;
          return;
        }
        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      const startLoopIfNeeded = () => {
        if (disposed || !isInView || !isTabVisible) return;
        if (prefersReducedMotion) {
          renderOnce();
          return;
        }
        if (!frameId) {
          _clock.getDelta();
          tick();
        }
      };

      const stopLoop = () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
          clearTimeout(frameId);
          frameId = 0;
        }
      };

      // ResizeObserver for crisp responsive viewport
      const handleResize = () => {
        if (disposed || !container) return;
        const w = Math.max(260, container.clientWidth);
        const h = Math.max(260, container.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderOnce();
      };

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
      } else {
        window.addEventListener('resize', handleResize);
      }

      // Pause rendering cleanly when offscreen
      let intersectionObserver: IntersectionObserver | null = null;
      if (wrapEl && typeof IntersectionObserver !== 'undefined') {
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            const visibleNow = entries.some((entry) => entry.isIntersecting);
            isInView = visibleNow;
            if (visibleNow) startLoopIfNeeded();
            else stopLoop();
          },
          { threshold: 0.05 }
        );
        intersectionObserver.observe(wrapEl);
      }

      const handleVisibility = () => {
        isTabVisible = document.visibilityState === 'visible';
        if (isTabVisible) startLoopIfNeeded();
        else stopLoop();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      // Render immediately on mount
      renderOnce();
      startLoopIfNeeded();

      return () => {
        disposed = true;
        requestSingleRenderRef.current = null;
        stopLoop();
        resizeObserver?.disconnect();
        window.removeEventListener('resize', handleResize);
        intersectionObserver?.disconnect();
        document.removeEventListener('visibilitychange', handleVisibility);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        controls.dispose();
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        container.innerHTML = '';
      };
    }, [mountNonce, prefersReducedMotion]);

    // Trigger single re-render on mood change when reduced motion is enabled
    useEffect(() => {
      if (prefersReducedMotion) {
        requestSingleRenderRef.current?.();
      }
    }, [mood, prefersReducedMotion]);

    const moodLabel =
      mood === 'speaking'
        ? isTa
          ? 'பதில் பேசுகிறது'
          : 'Speaking Reply'
        : mood === 'thinking'
        ? isTa
          ? 'சிந்திக்கிறது...'
          : 'Thinking...'
        : mood === 'listening'
        ? isTa
          ? 'கேட்கிறது...'
          : 'Listening...'
        : isTa
        ? 'தயார்'
        : 'Ready to Help';

    return (
      <div
        ref={stageWrapRef}
        className="relative rounded-[24px] overflow-hidden bg-[#07101C] border border-white/10"
      >
        {/* Top Clean Unboxed Status Strip (No Pulsating Dots, No Blur Over Canvas) */}
        <div className="px-4 py-3 bg-[#0C1829] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[0.9375rem]">
          <span className="font-semibold text-white truncate">{roleLabel}</span>
          <span className="text-[#5EEAD4] font-medium whitespace-nowrap shrink-0">
            {moodLabel}
          </span>
        </div>

        {/* Dedicated Isolated WebGL Mount */}
        {!webglFailed ? (
          <div
            ref={mountRef}
            aria-label={
              isTa
                ? '3D ஸ்ட்ரோக்கேர் AI உதவியாளர் மாதிரி'
                : 'Interactive 3D StrokeCare AI Companion'
            }
            className="w-full h-[310px] sm:h-[360px] lg:h-[420px] cursor-grab active:cursor-grabbing"
          />
        ) : (
          <div className="w-full h-[310px] sm:h-[360px] lg:h-[420px] flex flex-col items-center justify-center p-6 text-center space-y-4 bg-[#07101C]">
            <div className="w-20 h-20 rounded-3xl bg-[#112A27] border border-[#2DD4BF]/40 flex items-center justify-center text-[#2DD4BF]">
              <Bot className="w-10 h-10" aria-hidden="true" />
            </div>
            <p className="text-[1.125rem] text-slate-200 max-w-xs">
              {isTa
                ? '3D காட்சி தற்காலிகமாக கிடைக்கவில்லை. கீழே உங்கள் கேள்வியைக் கேட்கலாம்.'
                : '3D view is unavailable on this browser. You can still chat below.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setWebglFailed(false);
                setMountNonce((n) => n + 1);
              }}
              className="apple-pill-btn min-h-[48px] px-5 py-2 bg-[#1F6F63] text-white text-[1rem] font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>{isTa ? 'மீண்டும் முயற்சி' : 'Retry 3D View'}</span>
            </button>
          </div>
        )}

        {/* Single Sleek Bottom Dock Inside Stage (No Side Clutter) */}
        <div className="px-4 py-3 bg-[#0C1829] border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.875rem] text-slate-300">
            {isTa ? 'சுழற்ற இழுக்கவும் (360°)' : 'Drag to rotate 360°'}
          </span>
          <button
            type="button"
            onClick={() => {
              resetTriggerRef.current = true;
              greetTimerRef.current = 1.4;
              requestSingleRenderRef.current?.();
            }}
            className="apple-pill-btn min-h-[44px] px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[0.9375rem] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{isTa ? 'முன் பார்வை' : 'Reset View'}</span>
          </button>
        </div>
      </div>
    );
  }
);

Chatbot3DStage.displayName = 'Chatbot3DStage';
