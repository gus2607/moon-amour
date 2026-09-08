import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PAINTINGS, PAINTING_ORDER } from "../model/paintings.js";

// Full-viewport WebGL background: Van Gogh paintings crossfade into each
// other as the visitor scrolls between sections, with a gentle painterly
// wave and a thin layer of drifting gold dust in front for depth.
//
// The camera itself never moves. Every "zoom into a detail" cue lives in
// the fragment shader as a UV crop toward that painting's focal point (see
// model/paintings.js) instead of a camera dolly/pointer-parallax — the
// point is that the *content* changes while the viewer stays put, not that
// the viewer feels like they're the one travelling through the scene.
//
// Skips entirely for prefers-reduced-motion and pauses on tab blur.
const PARTICLE_PALETTE = [0xe8935b, 0xc9556b, 0x8a4360, 0xf9dfae];
const PARTICLE_COUNT = 200;
const ZOOM_MAX = 1.55; // how tight the crop gets at full zoomProgress

const VERTEX_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(pos.x * 3.0 + uTime * 0.35) * cos(pos.y * 2.0 + uTime * 0.25) * 0.02;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform sampler2D uCurrent;
  uniform sampler2D uNext;
  uniform vec4 uCurrentUV;
  uniform vec4 uNextUV;
  uniform float uMix;
  uniform vec2 uFocal;
  uniform float uZoom;

  vec2 zoomToward(vec2 uv, vec2 focal, float zoom) {
    vec2 zoomed = (uv - focal) / zoom + focal;
    return clamp(zoomed, 0.0, 1.0);
  }

  void main() {
    vec2 uvA = vUv * uCurrentUV.xy + uCurrentUV.zw;
    vec2 uvB = vUv * uNextUV.xy + uNextUV.zw;
    uvA = zoomToward(uvA, uFocal, uZoom);
    vec4 colorA = texture2D(uCurrent, uvA);
    vec4 colorB = texture2D(uNext, uvB);
    gl_FragColor = mix(colorA, colorB, uMix);
  }
`;

function coverUV(imageAspect, viewportAspect) {
  let sx = 1;
  let sy = 1;
  if (imageAspect > viewportAspect) {
    sx = viewportAspect / imageAspect;
  } else {
    sy = imageAspect / viewportAspect;
  }
  return [sx, sy, (1 - sx) / 2, (1 - sy) / 2];
}

export default function ThreeBackground({ paintingsRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (reduceMotion || !canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    // --- painting plane -------------------------------------------------
    // tick() renders on a rAF loop, but that loop's very first pass fires
    // before any network image has had a chance to arrive — the loader's
    // onLoad forces an immediate extra paint the moment each one lands, so
    // the plane never sits on a blank/incomplete texture waiting for the
    // next animation frame (which on a throttled/backgrounded tab might not
    // come for a while).
    const loader = new THREE.TextureLoader();
    const textures = PAINTING_ORDER.map((key) => {
      const tex = loader.load(PAINTINGS[key].image, (loaded) => {
        loaded.aspect = loaded.image.width / loaded.image.height;
        syncUniformsAndRender();
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.aspect = 1; // replaced by the real ratio once the image loads
      return tex;
    });
    const focalPoints = PAINTING_ORDER.map((key) => PAINTINGS[key].focalPoint || [0.5, 0.5]);

    const geometry = new THREE.PlaneGeometry(2, 2, 40, 40);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uCurrent: { value: textures[0] },
        uNext: { value: textures[0] },
        uCurrentUV: { value: new THREE.Vector4(1, 1, 0, 0) },
        uNextUV: { value: new THREE.Vector4(1, 1, 0, 0) },
        uMix: { value: 0 },
        uTime: { value: 0 },
        uFocal: { value: new THREE.Vector2(0.5, 0.5) },
        uZoom: { value: 1 },
      },
    });
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    let viewportAspect = window.innerWidth / window.innerHeight;
    plane.userData.baseWidth = 1;
    plane.userData.baseHeight = 1;
    function updatePlaneScale() {
      // Oversized a bit past the exact viewport fit as a safety margin —
      // the camera is fixed now, so this only needs to cover aspect-ratio
      // rounding, not any pointer/scroll-driven movement.
      const distance = camera.position.z - plane.position.z;
      const vFov = (camera.fov * Math.PI) / 180;
      const height = 2 * Math.tan(vFov / 2) * distance * 1.06;
      const width = height * camera.aspect;
      plane.userData.baseWidth = width / 2;
      plane.userData.baseHeight = height / 2;
      plane.scale.set(plane.userData.baseWidth, plane.userData.baseHeight, 1);
      viewportAspect = camera.aspect;
    }

    function applyUV(uniformKey, texture) {
      const [sx, sy, ox, oy] = coverUV(texture.aspect || 1, viewportAspect);
      material.uniforms[uniformKey].value.set(sx, sy, ox, oy);
    }

    function syncUniformsAndRender() {
      const state = paintingsRef?.current;
      if (state) {
        material.uniforms.uCurrent.value = textures[state.currentIndex];
        applyUV("uCurrentUV", textures[state.currentIndex]);
        material.uniforms.uNext.value = textures[state.nextIndex];
        applyUV("uNextUV", textures[state.nextIndex]);
        // Ease the linear scroll-driven mix (smoothstep) so the crossfade
        // starts and ends gently instead of ramping at a constant rate —
        // reads as a slow dissolve rather than an abrupt cut.
        const m = state.mix;
        material.uniforms.uMix.value = m * m * (3 - 2 * m);
      }
      renderer.render(scene, camera);
    }

    // --- drifting dust motes ---------------------------------------------
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const color = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 + 2;
      speeds[i] = 0.15 + Math.random() * 0.35;
      color.setHex(PARTICLE_PALETTE[i % PARTICLE_PALETTE.length]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    function resize() {
      const { innerWidth, innerHeight } = window;
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      updatePlaneScale();
    }
    resize();
    window.addEventListener("resize", resize);

    let running = true;
    function onVisibility() {
      running = document.visibilityState === "visible";
    }
    document.addEventListener("visibilitychange", onVisibility);

    const clock = new THREE.Clock();
    let frame;
    let zoomSmoothed = 1;
    function tick() {
      frame = requestAnimationFrame(tick);
      if (!running) return;

      const dt = clock.getDelta();
      material.uniforms.uTime.value += dt;

      const state = paintingsRef?.current;

      // Continuous "zooming into the painting" crop: as zoomProgress climbs
      // 0 -> 1 across a painting's own section (e.g. drifting into a star
      // in Starry Night), the shader crops in toward its focal point. The
      // moment the next section takes over, zoomProgress resets to 0 and
      // the crop eases back out before diving into the next painting. This
      // all happens to the *texture sampling*, not the camera — the camera
      // sits still the whole time.
      const zoomProgress = state ? state.zoomProgress : 0;
      const zoomTarget = 1 + zoomProgress * (ZOOM_MAX - 1);
      zoomSmoothed += (zoomTarget - zoomSmoothed) * 0.045;

      const focal = state ? focalPoints[state.currentIndex] : [0.5, 0.5];
      material.uniforms.uFocal.value.set(focal[0], focal[1]);
      material.uniforms.uZoom.value = zoomSmoothed;

      const posAttr = particleGeometry.attributes.position;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let y = posAttr.getY(i) + speeds[i] * dt;
        if (y > 11) y = -11;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;

      syncUniformsAndRender();
    }
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      textures.forEach((tex) => tex.dispose());
      renderer.dispose();
    };
  }, [paintingsRef]);

  return <canvas ref={canvasRef} className="three-background" aria-hidden="true" />;
}
