import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import "./style.css";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const GITHUB_USER = "MikeKorotych";
const PHOS = new THREE.Color("#00ff9f");
const PHOS_SOFT = new THREE.Color("#35d0ba");
const WARN = new THREE.Color("#ff6a39");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const LINKS = {
  sayful: "https://sayful.app",
  brain: "https://app-brain-trainer.vercel.app",
};

// Camera stations: [position, lookAt]
const STATIONS = [
  { pos: new THREE.Vector3(0, 7.5, 34), look: new THREE.Vector3(0, 5, 0) },     // identity
  { pos: new THREE.Vector3(-1, 7, 16), look: new THREE.Vector3(0, 6.4, 0) },    // products
  { pos: new THREE.Vector3(19, 24, 22), look: new THREE.Vector3(0, 0.2, -2) },  // activity — high diagonal, whole city in frame
];
const INTRO_POS = new THREE.Vector3(0, 30, 84);
const INTRO_LOOK = new THREE.Vector3(0, 9, 0);

const STATION_CARDS = [
  {
    title: "IDENTITY // 身元",
    body: `
      <div class="row"><span class="dim">ROLE</span><span>Full-Stack Product Engineer</span></div>
      <div class="row"><span class="dim">BASE</span><span>Kyiv, Ukraine</span></div>
      <div class="row"><span class="dim">STACK</span><span>RN · Next.js · Swift · AI</span></div>
      <div class="row"><span class="dim">SHIPPED</span><span class="num">3 products / 9 months</span></div>
      <p style="margin-top:10px">I ship complete products solo — idea to production!</p>`,
  },
  {
    title: "PRODUCTS // 製品",
    body: `
      <div class="row"><span class="dim">01</span><span><a href="${LINKS.sayful}" target="_blank" rel="noopener">SAYFUL</a> — AI dictation for macOS</span></div>
      <div class="row"><span class="dim">02</span><span><a href="${LINKS.brain}" target="_blank" rel="noopener">BRAIN TRAINER</a> — iOS + Android</span></div>
      <p style="margin-top:10px">Both live, both free. Click a screen in the scene to open it.</p>`,
  },
  {
    title: "ACTIVITY // 活動記録",
    body: `<div id="activity-stats">
      <div class="row"><span class="dim">SOURCE</span><span>github.com/${GITHUB_USER}</span></div>
      <div class="row"><span class="dim">WINDOW</span><span>last 365 days</span></div>
      <div class="row"><span class="dim">CONTRIBUTIONS</span><span class="num" id="stat-total">…</span></div>
      <div class="row"><span class="dim">BEST DAY</span><span class="num" id="stat-max">…</span></div>
      <p style="margin-top:10px">Each glowing tower below is one day of GitHub work — hover them. Rebuilt live on every visit.</p></div>`,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Tiny tween engine (driven from the frame loop)
// ────────────────────────────────────────────────────────────────────────────

const tweens = [];
let now = 0;
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
const easeOutBack = (k) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);

function tween({ delay = 0, dur = 1, ease = easeOutCubic, update, done }) {
  tweens.push({ start: now + (reduceMotion ? 0 : delay), dur: reduceMotion ? 0.001 : dur, ease, update, done });
}

function stepTweens() {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (now < tw.start) continue;
    const k = Math.min(1, (now - tw.start) / tw.dur);
    tw.update(tw.ease(k), k);
    if (k >= 1) {
      tweens.splice(i, 1);
      tw.done?.();
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Renderer / scene
// ────────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("scene");
// The composited WebGL layer can differ subtly from DOM black on wide/P3
// displays, which reads as a lighter band during boot. Keep the canvas
// invisible until the boot screen is gone; one warm-up frame renders first.
canvas.style.visibility = "hidden";
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#030807");
scene.fog = new THREE.FogExp2("#030807", 0.016);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
camera.position.copy(INTRO_POS);

scene.add(new THREE.AmbientLight("#0c2a22", 2.2));
const key = new THREE.PointLight("#19ffb0", 260, 120, 1.9);
key.position.set(0, 26, 8);
scene.add(key);
const rim = new THREE.PointLight("#ff6a39", 60, 80, 2);
rim.position.set(-24, 8, -18);
scene.add(rim);

// ────────────────────────────────────────────────────────────────────────────
// Ground: dark plane + phosphor grid
// ────────────────────────────────────────────────────────────────────────────

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: "#04100d", roughness: 0.55, metalness: 0.8 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
scene.add(ground);

const grid = new THREE.GridHelper(400, 100, 0x0d5f4a, 0x07271f);
grid.material.transparent = true;
grid.material.opacity = 0;
scene.add(grid);

// ────────────────────────────────────────────────────────────────────────────
// Wireframe "network" set dressing — GITS title-sequence rings
// ────────────────────────────────────────────────────────────────────────────

const dressing = new THREE.Group();
dressing.scale.setScalar(0.001);
scene.add(dressing);

const globeMat = new THREE.MeshBasicMaterial({ color: 0x0f8f6c, wireframe: true, transparent: true, opacity: 0.5 });
const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(5.2, 2), globeMat);
globe.position.set(0, 9.4, -14);
dressing.add(globe);

const globeCore = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.1, 1),
  new THREE.MeshBasicMaterial({ color: PHOS, wireframe: true, transparent: true, opacity: 0.85 })
);
globeCore.position.copy(globe.position);
dressing.add(globeCore);

const rings = [];
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(7.5 + i * 2.1, 0.02, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0x11aa7f, transparent: true, opacity: 0.5 - i * 0.12 })
  );
  ring.position.copy(globe.position);
  ring.rotation.x = Math.PI / 2 + (i - 1) * 0.28;
  rings.push(ring);
  dressing.add(ring);
}
// dressing pivots around the globe centre, not the world origin
// (clone first: globe itself is a child, so subtracting the live vector
// would zero it for every child processed after it)
const dressingPivot = globe.position.clone();
dressing.position.copy(dressingPivot);
dressing.children.forEach((child) => child.position.sub(dressingPivot));

// Floating data motes
const moteCount = 700;
const motePositions = new Float32Array(moteCount * 3);
for (let i = 0; i < moteCount; i++) {
  motePositions[i * 3] = (Math.random() - 0.5) * 130;
  motePositions[i * 3 + 1] = Math.random() * 42;
  motePositions[i * 3 + 2] = (Math.random() - 0.5) * 130;
}
const moteGeo = new THREE.BufferGeometry();
moteGeo.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
const moteMat = new THREE.PointsMaterial({ color: 0x2fd8a4, size: 0.09, transparent: true, opacity: 0 });
const motes = new THREE.Points(moteGeo, moteMat);
scene.add(motes);

// ────────────────────────────────────────────────────────────────────────────
// Product holo-panels — CRT screens that power on/off
// ────────────────────────────────────────────────────────────────────────────

const clickables = [];
const panels = [];
const texLoader = new THREE.TextureLoader();

function holoPanel({ texture, x, url, label }) {
  const group = new THREE.Group();
  const w = 7.4;
  const h = w * (630 / 1200);

  const tex = texLoader.load(texture);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
  panel.userData.url = url;
  panel.userData.group = group;
  clickables.push(panel);
  group.add(panel);

  const frameMat = new THREE.LineBasicMaterial({ color: PHOS, transparent: true, opacity: 0 });
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(w + 0.3, h + 0.3)),
    frameMat
  );
  group.add(frame);

  // corner ticks, GITS-targeting style
  const tickMat = new THREE.LineBasicMaterial({ color: WARN, transparent: true, opacity: 0 });
  const t = 0.55;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const cx = (sx * (w + 0.9)) / 2;
    const cy = (sy * (h + 0.9)) / 2;
    const pts = [
      new THREE.Vector3(cx - sx * t, cy, 0), new THREE.Vector3(cx, cy, 0),
      new THREE.Vector3(cx, cy, 0), new THREE.Vector3(cx, cy - sy * t, 0),
    ];
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), tickMat));
  });

  group.position.set(x, 6.4, 6);
  group.rotation.y = -x * 0.045;
  group.scale.y = 0.001;
  Object.assign(group.userData, {
    baseY: 6.4, screenMat, frameMat, tickMat, label,
    on: false, hoverScale: 1, targetHover: 1,
  });
  panels.push(group);
  return group;
}

const panelSayful = holoPanel({ texture: "/panel-sayful.png", x: -4.6, url: LINKS.sayful, label: "OPEN ▸ sayful.app" });
const panelBrain = holoPanel({ texture: "/panel-braintrainer.png", x: 4.6, url: LINKS.brain, label: "OPEN ▸ brain trainer" });
scene.add(panelSayful, panelBrain);

/** CRT power-on: a thin bright line snaps open into the full screen.
 * Each call takes a fresh token; a later powerOn/powerOff supersedes any
 * still-pending tween (otherwise the intro's delayed power-on can re-light
 * screens the user already switched off by jumping to ACTIVITY early). */
function powerOn(group, delay = 0) {
  group.userData.on = true;
  const token = (group.userData.powerSeq = (group.userData.powerSeq ?? 0) + 1);
  tween({
    delay, dur: 0.55, ease: easeOutBack,
    update: (e, k) => {
      if (group.userData.powerSeq !== token) return;
      group.scale.y = Math.max(0.001, e);
      const flicker = k < 0.75 ? 0.55 + 0.45 * Math.sin(k * 46) : 1;
      group.userData.screenMat.opacity = 0.92 * Math.min(1, k * 1.4) * flicker;
      group.userData.frameMat.opacity = 0.9 * k;
      group.userData.tickMat.opacity = 0.95 * k;
    },
    done: () => {
      if (group.userData.powerSeq !== token) return;
      group.userData.screenMat.opacity = 0.92;
      group.scale.y = 1;
    },
  });
}

/** CRT power-off: collapse back to a scanline and go dark. */
function powerOff(group, delay = 0) {
  group.userData.on = false;
  const token = (group.userData.powerSeq = (group.userData.powerSeq ?? 0) + 1);
  tween({
    delay, dur: 0.3,
    update: (e) => {
      if (group.userData.powerSeq !== token) return;
      group.scale.y = Math.max(0.001, 1 - e);
      group.userData.screenMat.opacity = 0.92 * (1 - e);
      group.userData.frameMat.opacity = 0.9 * (1 - e) * 0.4;
      group.userData.tickMat.opacity = 0.95 * (1 - e) * 0.4;
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// GitHub contribution city — built live, grown from the ground on reveal
// ────────────────────────────────────────────────────────────────────────────

const CITY = { weeks: 52, days: 7, cell: 0.62, gap: 0.16 };
let cityMesh = null;
let cityData = null;
let cityGrow = 0;           // 0..1 reveal progress
let cityGrowing = false;
const cityColors = [];      // per-instance base colors, for hover restore
const cityDummy = new THREE.Object3D();

function cityInstanceTransform(i, growth) {
  const { weeks, days, cell, gap } = CITY;
  const step = cell + gap;
  const originX = (-(weeks - 1) / 2) * step;
  const originZ = (-(days - 1) / 2) * step;
  const week = Math.floor(i / days);
  const day = i % days;
  // reveal sweeps across weeks, oldest first
  const local = THREE.MathUtils.clamp(growth * 1.7 - (week / weeks) * 0.7, 0, 1);
  const h = cityMesh.userData.heights[i] * easeOutCubic(local);
  cityDummy.position.set(originX + week * step, 0, originZ + day * step);
  cityDummy.scale.set(1, Math.max(0.001, h), 1);
  cityDummy.updateMatrix();
  return cityDummy.matrix;
}

function refreshCityMatrices() {
  const count = CITY.weeks * CITY.days;
  for (let i = 0; i < count; i++) cityMesh.setMatrixAt(i, cityInstanceTransform(i, cityGrow));
  cityMesh.instanceMatrix.needsUpdate = true;
}

function buildCity(contributions) {
  const { weeks, days, cell } = CITY;
  const box = new THREE.BoxGeometry(cell, 1, cell);
  box.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.25,
    emissive: PHOS,
    emissiveIntensity: 1,
  });
  const mesh = new THREE.InstancedMesh(box, mat, weeks * days);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(weeks * days * 3), 3);

  const color = new THREE.Color();
  const maxCount = Math.max(1, ...contributions.map((c) => c.count));
  mesh.userData.heights = contributions.map((c) => 0.06 + (c.count / maxCount) * 6.5);

  contributions.forEach((c, i) => {
    const day = i % days;
    const glow = c.count === 0 ? 0.04 : 0.12 + 0.42 * Math.pow(c.count / maxCount, 0.75);
    color.copy(PHOS).multiplyScalar(glow).lerp(PHOS_SOFT, day / days / 3);
    cityColors.push(color.clone());
    mesh.setColorAt(i, color);
  });
  mesh.instanceColor.needsUpdate = true;
  mesh.position.set(0, 0, -2);
  return mesh;
}

function growCity() {
  if (!cityMesh || cityGrowing || cityGrow >= 1) return;
  cityGrowing = true;
  tween({
    dur: 2.2,
    update: (e) => { cityGrow = e; refreshCityMatrices(); },
    done: () => {
      cityGrowing = false;
      cityGrow = 1;
      refreshCityMatrices();
      buildCityEdges();
    },
  });
}

// Dark edge wireframe over every tower: without it the high-activity ridge
// blooms into one solid glow and the individual days disappear. One merged
// LineSegments (12 edges x 364 towers) built once the city is fully grown.
let cityEdges = null;
function buildCityEdges() {
  if (!cityMesh) return;
  if (cityEdges) {
    scene.remove(cityEdges);
    cityEdges.geometry.dispose();
    cityEdges.material.dispose();
  }
  const { weeks, days, cell, gap } = CITY;
  const step = cell + gap;
  const originX = (-(weeks - 1) / 2) * step;
  const originZ = (-(days - 1) / 2) * step;
  const heights = cityMesh.userData.heights;
  const inflate = 0.006; // keep lines just off the faces to avoid z-fighting
  const half = cell / 2 + inflate;
  const pts = [];
  for (let i = 0; i < weeks * days; i++) {
    const week = Math.floor(i / days);
    const day = i % days;
    const cx = originX + week * step;
    const cz = originZ + day * step;
    const x0 = cx - half, x1 = cx + half;
    const z0 = cz - half, z1 = cz + half;
    const y0 = 0.002, y1 = heights[i] + inflate;
    // top rectangle
    pts.push(x0, y1, z0, x1, y1, z0,  x1, y1, z0, x1, y1, z1,
             x1, y1, z1, x0, y1, z1,  x0, y1, z1, x0, y1, z0);
    // verticals
    pts.push(x0, y0, z0, x0, y1, z0,  x1, y0, z0, x1, y1, z0,
             x1, y0, z1, x1, y1, z1,  x0, y0, z1, x0, y1, z1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x02150e, transparent: true, opacity: 0 });
  cityEdges = new THREE.LineSegments(geo, mat);
  cityEdges.position.copy(cityMesh.position);
  scene.add(cityEdges);
  tween({ dur: 0.8, update: (e) => { mat.opacity = 0.85 * e; } });
}

async function loadContributions() {
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`);
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const recent = json.contributions.slice(-CITY.weeks * CITY.days);
    return { list: recent, total: json.total?.lastYear ?? recent.reduce((s, c) => s + c.count, 0) };
  } catch {
    const list = Array.from({ length: CITY.weeks * CITY.days }, (_, i) => ({
      count: Math.max(0, Math.round(6 * Math.abs(Math.sin(i / 9)) + (i % 13 === 0 ? 14 : 0) - 2)),
      date: "",
    }));
    return { list, total: list.reduce((s, c) => s + c.count, 0), offline: true };
  }
}

let introCityReady = false; // intro reached the city moment before data arrived
loadContributions().then((data) => {
  cityData = data;
  cityMesh = buildCity(data.list);
  refreshCityMatrices(); // all zero-height until grown
  scene.add(cityMesh);
  fillActivityStats();
  if (introCityReady) growCity();
});

function fillActivityStats() {
  if (!cityData) return;
  const totalEl = document.getElementById("stat-total");
  const maxEl = document.getElementById("stat-max");
  if (totalEl) totalEl.textContent = `${cityData.total.toLocaleString("en-US")}${cityData.offline ? " (cached)" : ""}`;
  if (maxEl) maxEl.textContent = String(Math.max(...cityData.list.map((c) => c.count)));
}

// ────────────────────────────────────────────────────────────────────────────
// Post-processing: bloom + CRT (scanlines, vignette, rgb shift, flicker)
// ────────────────────────────────────────────────────────────────────────────

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// tighter radius + higher threshold: glow hugs the geometry instead of
// smearing across neighbouring towers
const BLOOM_BASE = 0.38;
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BLOOM_BASE, 0.55, 0.36);
composer.addPass(bloom);

const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGlitch: { value: 0 },
    uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGlitch;
    uniform vec2 uRes;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      uv = 0.5 + c * (1.0 + 0.045 * dot(c, c));

      if (uGlitch > 0.001) {
        float band = step(0.96, hash(vec2(floor(uv.y * 28.0), floor(uTime * 22.0))));
        uv.x += band * uGlitch * (hash(vec2(uTime, uv.y)) - 0.5) * 0.12;
      }

      float ab = 0.0016 + uGlitch * 0.004;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + vec2(ab, 0.0)).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - vec2(ab, 0.0)).b;

      float scan = 0.90 + 0.10 * sin(uv.y * uRes.y * 1.35 + uTime * 7.0);
      col *= scan;
      col *= 0.97 + 0.03 * sin(uTime * 61.0);

      col = mix(col, col * vec3(0.87, 1.06, 0.97), 0.5);
      // aspect-corrected vignette: circular in screen space; the uv-space
      // version turned into a bright horizontal band on wide monitors
      vec2 cc = c * vec2(uRes.x / uRes.y, 1.0);
      float vig = smoothstep(1.05, 0.45, length(cc));
      col *= mix(0.72, 1.0, vig);

      col += (hash(uv * uRes + uTime) - 0.5) * 0.035;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
const crtPass = new ShaderPass(CRTShader);
composer.addPass(crtPass);
composer.addPass(new OutputPass());

// ────────────────────────────────────────────────────────────────────────────
// Interaction: stations, parallax, hover, clicks, glitch bursts
// ────────────────────────────────────────────────────────────────────────────

let station = 0;
let hudReady = false;

// Drag-to-orbit around the contribution city (ACTIVITY station only): tall
// days occlude the row behind them from a fixed angle, so let the visitor
// swing the camera. Spherical coords around the station's look-at point.
const orbit = { theta: 0, phi: 0, radius: 1, active: false, dragging: false };
function resetOrbitFromStation() {
  const offset = STATIONS[2].pos.clone().sub(STATIONS[2].look);
  const s = new THREE.Spherical().setFromVector3(offset);
  orbit.radius = s.radius;
  orbit.theta = s.theta;
  orbit.phi = s.phi;
}
resetOrbitFromStation();
function applyOrbit() {
  const offset = new THREE.Vector3().setFromSpherical(
    new THREE.Spherical(orbit.radius, orbit.phi, orbit.theta)
  );
  camTarget.copy(STATIONS[2].look).add(offset);
}
const camTarget = INTRO_POS.clone();
const lookCurrent = INTRO_LOOK.clone();
const lookTarget = INTRO_LOOK.clone();
const mouse = new THREE.Vector2();
const pointer = new THREE.Vector2(-2, -2);
const raycaster = new THREE.Raycaster();
const tipEl = document.getElementById("tip");
let tipXY = { x: 0, y: 0 };

// ---- typewriter: wrap every character in a slot-preserving span ----
let twSeq = 0; // supersedes the previous typing run
let twTimer = null;

function wrapChars(root, spans) {
  [...root.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const ch of node.textContent) {
        const s = document.createElement("span");
        s.className = "tw";
        s.textContent = ch;
        frag.appendChild(s);
        spans.push(s);
      }
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      wrapChars(node, spans);
    }
  });
}

function typewrite() {
  const seq = ++twSeq;
  clearInterval(twTimer);
  const title = document.getElementById("sc-title");
  const body = document.getElementById("sc-body");
  const titleSpans = [];
  const bodySpans = [];
  wrapChars(title, titleSpans);
  wrapChars(body, bodySpans);

  if (reduceMotion) {
    [...titleSpans, ...bodySpans].forEach((s) => s.classList.add("on"));
    return;
  }

  const caret = document.createElement("span");
  caret.className = "tw-caret";
  title.appendChild(caret);

  let ti = 0;
  let bi = 0;
  twTimer = setInterval(() => {
    if (seq !== twSeq) { clearInterval(twTimer); return; }
    if (ti < titleSpans.length) {
      // the title types deliberately, one glyph at a time
      titleSpans[ti].classList.add("on");
      titleSpans[ti].after(caret);
      ti += 1;
      return;
    }
    // the body streams in fast, several glyphs per tick; the caret retires
    // once the headline is done
    caret.remove();
    for (let n = 0; n < 4 && bi < bodySpans.length; n++, bi++) {
      bodySpans[bi].classList.add("on");
    }
    if (bi >= bodySpans.length) clearInterval(twTimer);
  }, 26);
}

function renderCard(index) {
  const card = STATION_CARDS[index];
  document.getElementById("sc-title").textContent = card.title;
  document.getElementById("sc-body").innerHTML = card.body;
  if (index === 2) fillActivityStats();
  typewrite();
}

let cardHeightClear = null;
function swapCard(index) {
  const inner = document.getElementById("sc-inner");
  const cardEl = document.getElementById("station-card");
  inner.classList.remove("in");
  inner.classList.add("out");
  setTimeout(() => {
    // FLIP the card height: lock the old height, swap content, measure the
    // new height, then let the CSS transition glide between the two
    clearTimeout(cardHeightClear); // a rapid re-swap must not un-pin mid-glide
    const h1 = cardEl.offsetHeight;
    renderCard(index);
    cardEl.style.height = "auto";
    const h2 = cardEl.offsetHeight;
    if (!reduceMotion && Math.abs(h2 - h1) > 1) {
      cardEl.style.height = `${h1}px`;
      void cardEl.offsetWidth;
      cardEl.style.height = `${h2}px`;
      cardHeightClear = setTimeout(() => { cardEl.style.height = ""; }, 460);
    } else {
      cardEl.style.height = "";
    }
    inner.classList.remove("out");
    void inner.offsetWidth;
    inner.classList.add("in");
  }, reduceMotion ? 0 : 210);
}

function setStation(index, animateCard = true) {
  const next = ((index % STATIONS.length) + STATIONS.length) % STATIONS.length;
  const changed = next !== station;
  station = next;
  camTarget.copy(STATIONS[station].pos);
  lookTarget.copy(STATIONS[station].look);
  document.querySelectorAll(".nav-item").forEach((b, i) => b.classList.toggle("active", i === station));
  document.body.classList.toggle("station-2", station === 2);
  orbit.active = station === 2;
  if (orbit.active) {
    resetOrbitFromStation();
    applyOrbit();
  }

  if (animateCard) swapCard(station);
  else renderCard(station);

  // ACTIVITY: power the product screens down so the city reads clearly
  panels.forEach((p, i) => {
    if (station === 2 && p.userData.on) powerOff(p, i * 0.08);
    if (station !== 2 && !p.userData.on && hudReady) powerOn(p, i * 0.12);
  });

  if (changed) glitchBurst(0.9);
}

document.getElementById("nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (btn) setStation(Number(btn.dataset.station));
});

let wheelLock = 0;
addEventListener("wheel", (e) => {
  const now2 = performance.now();
  if (now2 - wheelLock < 900 || Math.abs(e.deltaY) < 12) return;
  wheelLock = now2;
  setStation(station + (e.deltaY > 0 ? 1 : -1));
}, { passive: true });

addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowDown") setStation(station + 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") setStation(station - 1);
});

let touchY = null;
addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener("touchend", (e) => {
  // on the ACTIVITY station a touch drag orbits the camera instead
  if (touchY === null || orbit.active) { touchY = null; return; }
  const dy = touchY - e.changedTouches[0].clientY;
  if (Math.abs(dy) > 50) setStation(station + (dy > 0 ? 1 : -1));
  touchY = null;
}, { passive: true });

// ---- drag to orbit (mouse + touch) ----
let dragLast = null;
function orbitDragStart(x, y) {
  if (!orbit.active) return;
  orbit.dragging = true;
  dragLast = { x, y };
}
function orbitDragMove(x, y) {
  if (!orbit.dragging || !dragLast) return;
  const dx = x - dragLast.x;
  const dy = y - dragLast.y;
  dragLast = { x, y };
  orbit.theta -= dx * 0.005;
  orbit.phi = THREE.MathUtils.clamp(orbit.phi - dy * 0.004, 0.28, 1.42);
  applyOrbit();
}
function orbitDragEnd() {
  orbit.dragging = false;
  dragLast = null;
}
canvas.addEventListener("pointerdown", (e) => orbitDragStart(e.clientX, e.clientY));
addEventListener("pointermove", (e) => orbitDragMove(e.clientX, e.clientY));
addEventListener("pointerup", orbitDragEnd);
addEventListener("pointercancel", orbitDragEnd);
canvas.addEventListener("touchmove", (e) => {
  if (orbit.dragging && e.touches.length === 1) {
    orbitDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: true });

addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  pointer.copy(mouse);
  tipXY = { x: e.clientX, y: e.clientY };
  // follow the cursor every frame, not on the raycast interval — otherwise
  // the tooltip trails in visible steps
  if (!tipEl.hidden) {
    tipEl.style.left = `${tipXY.x}px`;
    tipEl.style.top = `${tipXY.y}px`;
  }
});

canvas.addEventListener("click", () => {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickables, false)[0];
  if (hit?.object.userData.url && hit.object.userData.group.userData.on) {
    window.open(hit.object.userData.url, "_blank", "noopener");
  }
});

// ---- hover: panels grow slightly, city towers report their day ----
let hoveredTower = -1;
const hoverColor = new THREE.Color();

function showTip(html) {
  tipEl.innerHTML = html;
  tipEl.hidden = false;
  tipEl.style.left = `${tipXY.x}px`;
  tipEl.style.top = `${tipXY.y}px`;
}

setInterval(() => {
  raycaster.setFromCamera(pointer, camera);

  // panels
  const panelHit = raycaster.intersectObjects(clickables, false)[0];
  panels.forEach((p) => {
    const isHit = panelHit?.object.userData.group === p && p.userData.on;
    p.userData.targetHover = isHit ? 1.06 : 1;
  });

  // city towers
  let towerHTML = null;
  if (cityMesh && cityGrow > 0.95) {
    const cityHit = raycaster.intersectObject(cityMesh)[0];
    const id = cityHit ? cityHit.instanceId : -1;
    if (id !== hoveredTower) {
      if (hoveredTower >= 0) {
        cityMesh.setColorAt(hoveredTower, cityColors[hoveredTower]);
        cityMesh.instanceColor.needsUpdate = true;
      }
      hoveredTower = id;
      if (id >= 0) {
        hoverColor.copy(WARN);
        cityMesh.setColorAt(id, hoverColor);
        cityMesh.instanceColor.needsUpdate = true;
      }
    }
    if (id >= 0 && cityData) {
      const d = cityData.list[id];
      towerHTML = `<span class="num">${d.count}</span> contribution${d.count === 1 ? "" : "s"}${d.date ? ` <span class="dim">· ${d.date}</span>` : ""}`;
    }
  }

  if (towerHTML) showTip(towerHTML);
  else tipEl.hidden = true;

  if (orbit.active) {
    canvas.style.cursor = orbit.dragging ? "grabbing" : "grab";
  } else {
    canvas.style.cursor = panelHit && panelHit.object.userData.group.userData.on ? "pointer" : "crosshair";
  }
}, 90);

let glitch = 0;
function glitchBurst(strength) {
  if (!reduceMotion) glitch = Math.max(glitch, strength);
}
setInterval(() => { if (Math.random() < 0.28) glitchBurst(0.3 + Math.random() * 0.4); }, 3400);

const nameEl = document.querySelector(".ident-name");
setInterval(() => {
  if (reduceMotion) return;
  nameEl.classList.add("glitching");
  setTimeout(() => nameEl.classList.remove("glitching"), 180 + Math.random() * 220);
}, 4200);

setInterval(() => {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString("en-GB");
}, 1000);

// ────────────────────────────────────────────────────────────────────────────
// Boot + intro timeline
// ────────────────────────────────────────────────────────────────────────────

renderCard(0);

const bootLines = [
  "ESTABLISHING CONNECTION…",
  "HANDSHAKE // SECTION 09 RELAY",
  "LOADING GHOST PROFILE: KOROTYCH_M",
  "SYNCING GITHUB TELEMETRY",
  "DIVE READY.",
];
(function boot() {
  const text = document.getElementById("boot-text");
  const fill = document.getElementById("boot-fill");
  let i = 0;
  const next = () => {
    if (i < bootLines.length) {
      text.textContent = bootLines[i];
      fill.style.width = `${((i + 1) / bootLines.length) * 100}%`;
      i += 1;
      setTimeout(next, reduceMotion ? 40 : 300);
    } else {
      document.getElementById("boot").classList.add("done");
      beginIntro();
    }
  };
  next();
})();

function beginIntro() {
  // warm the pipeline while still hidden, then reveal a clean first frame
  composer.render();
  canvas.style.visibility = "visible";

  // camera dive to station 0 (the frame-loop lerp does the easing)
  camTarget.copy(STATIONS[0].pos);
  lookTarget.copy(STATIONS[0].look);
  glitchBurst(1);

  // grid + motes fade in
  tween({ delay: 0.1, dur: 1.4, update: (e) => { grid.material.opacity = 0.5 * e; moteMat.opacity = 0.75 * e; } });

  // network globe unfolds
  tween({ delay: 0.5, dur: 1.1, ease: easeOutBack, update: (e) => dressing.scale.setScalar(Math.max(0.001, e)) });

  // product screens power on, one after another
  panels.forEach((p, i) => powerOn(p, 0.9 + i * 0.28));

  // the city rises from the grid
  tween({ delay: 1.5, dur: 0.01, update: () => {}, done: () => {
    introCityReady = true;
    growCity();
  } });

  // HUD elements slide in (staggered via --d in CSS); retype the card now
  // that it is actually visible
  setTimeout(() => {
    document.body.classList.remove("pre-intro");
    hudReady = true;
    const inner = document.getElementById("sc-inner");
    inner.classList.add("in");
    renderCard(station);
  }, reduceMotion ? 0 : 700);
}

// ────────────────────────────────────────────────────────────────────────────
// Frame loop
// ────────────────────────────────────────────────────────────────────────────

const clock = new THREE.Clock();
let lastT = 0;

function frame() {
  const t = clock.getElapsedTime();
  const dt = Math.min(t - lastT, 0.05);
  lastT = t;
  now = t;
  stepTweens();

  // parallax fights the orbit controls, so it rests on the ACTIVITY station
  const parallax = reduceMotion || orbit.active ? 0 : 1;
  const px = camTarget.x + mouse.x * 1.6 * parallax;
  const py = camTarget.y + mouse.y * 0.9 * parallax;
  camera.position.x += (px - camera.position.x) * 0.045;
  camera.position.y += (py - camera.position.y) * 0.045;
  camera.position.z += (camTarget.z - camera.position.z) * 0.045;
  lookCurrent.lerp(lookTarget, 0.05);
  camera.lookAt(lookCurrent);

  if (!reduceMotion) {
    globe.rotation.y = t * 0.12;
    globeCore.rotation.y = -t * 0.3;
    globeCore.rotation.x = t * 0.17;
    rings.forEach((r, i) => { r.rotation.z = t * (0.05 + i * 0.03); });
    motes.rotation.y = t * 0.008;
    panels.forEach((p, i) => {
      p.position.y = p.userData.baseY + Math.sin(t * 0.8 + i * 1.4) * 0.14;
      p.userData.hoverScale += (p.userData.targetHover - p.userData.hoverScale) * 0.12;
      const s = p.userData.hoverScale;
      p.scale.x = s;
      p.scale.z = s;
      if (p.userData.on && tweens.length === 0) p.scale.y = s;
    });
  }

  // The closer the camera gets to the city, the more screen area its bright
  // faces cover — unchecked, the bloom washes the edges out. Normalize by
  // easing both the city's emissive level and the bloom strength with
  // proximity, so a close-up ridge stays legible.
  if (cityMesh) {
    const cityDist = camera.position.distanceTo(cityMesh.position);
    const proximity = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(cityDist, 12, 40, 0, 1), 0, 1);
    const pulse = reduceMotion ? 0.9 : 0.9 + Math.sin(t * 1.6) * 0.12;
    cityMesh.material.emissiveIntensity = pulse * (0.45 + 0.55 * proximity);
    bloom.strength = BLOOM_BASE * (0.45 + 0.55 * proximity);
  }

  glitch = Math.max(0, glitch - dt * 2.2);
  crtPass.uniforms.uTime.value = t;
  crtPass.uniforms.uGlitch.value = glitch;

  composer.render();
  requestAnimationFrame(frame);
}
frame();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  crtPass.uniforms.uRes.value.set(innerWidth, innerHeight);
});
