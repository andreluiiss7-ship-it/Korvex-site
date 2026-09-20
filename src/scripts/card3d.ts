import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, Group, Shape, ExtrudeGeometry, PlaneGeometry, BoxGeometry,
  MeshPhysicalMaterial, CanvasTexture, PMREMGenerator,
  ACESFilmicToneMapping, SRGBColorSpace, Color, MathUtils,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

async function makeLogoTexture() {
  await Promise.race([
    document.fonts.load('800 150px "Inter Tight"').catch(() => {}),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 640;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.font = '800 150px "Inter Tight", system-ui';
  g.textBaseline = 'top';
  g.fillText('[K', 70, 60);
  g.font = '500 28px "Geist Mono", ui-monospace, monospace';
  (g as any).letterSpacing = '8px';
  g.fillText('KORVEX', 74, 520);
  g.fillText('••••  7291', 640, 520);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export async function mount(root: HTMLElement) {
  const canvas = root.querySelector('canvas') as HTMLCanvasElement;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const cam = new PerspectiveCamera(28, 1, 0.1, 20);
  cam.position.set(0, 0, 5.2);

  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const w = 3.2, h = 2.02, r = 0.22;
  const s = new Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 12 });
  geo.center();

  const body = new MeshPhysicalMaterial({
    color: new Color('#141820'),
    metalness: 0.9,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.2,
  });
  const card = new Group();
  card.add(new Mesh(geo, body));

  const tex = await makeLogoTexture();
  const decal = new Mesh(
    new PlaneGeometry(w * 0.92, h * 0.92),
    new MeshPhysicalMaterial({ map: tex, transparent: true, metalness: 1, roughness: 0.12, color: new Color('#dfe4ec') }),
  );
  decal.position.z = 0.046;
  card.add(decal);

  const chip = new Mesh(
    new BoxGeometry(0.42, 0.32, 0.02),
    new MeshPhysicalMaterial({ color: new Color('#C9A35E'), metalness: 1, roughness: 0.25, clearcoat: 0.6 }),
  );
  chip.position.set(-w / 2 + 0.55, -h / 2 + 0.75, 0.05);
  card.add(chip);

  scene.add(card);

  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  const hero = document.getElementById('topo') || document.body;
  hero.addEventListener('pointermove', (e: PointerEvent) => {
    const rect = hero.getBoundingClientRect();
    target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
    target.y = ((e.clientY - rect.top) / rect.height - 0.5) * -0.35;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; });

  const resize = () => {
    const { width, height } = root.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width * 1.24, height * 1.24, false);
    cam.aspect = width / height;
    cam.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(root);
  resize();

  let raf = 0;
  let visible = true;
  const t0 = performance.now();
  const loop = (t: number) => {
    if (!visible) return;
    const idle = (t - t0) * 0.00025;
    cur.x = MathUtils.lerp(cur.x, target.x, 0.06);
    cur.y = MathUtils.lerp(cur.y, target.y, 0.06);
    card.rotation.y = -0.28 + cur.x + Math.sin(idle) * 0.12;
    card.rotation.x = 0.16 + cur.y + Math.cos(idle * 0.8) * 0.04;
    renderer.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  const start = () => { cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(loop); };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && document.visibilityState === 'visible';
    start();
  }, { threshold: 0.05 }).observe(root);
  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible' && root.getBoundingClientRect().bottom > 0;
    start();
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    root.dataset.state = 'static';
  });

  renderer.render(scene, cam);
  root.dataset.state = 'webgl';
  start();
}
