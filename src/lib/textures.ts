import * as THREE from 'three';

/**
 * Procedural texture generators using HTML5 2D Canvas
 * Adheres strictly to Three.js directives:
 * - SRGBColorSpace for color maps
 * - High anisotropy
 * - Zero external 404 image dependencies
 */

export function createSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, '#fff2a8');
  grad.addColorStop(0.5, '#ffaa00');
  grad.addColorStop(0.85, '#ff4400');
  grad.addColorStop(1, '#991100');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 12 + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.4 ? 'rgba(255, 230, 100, 0.25)' : 'rgba(180, 40, 0, 0.35)';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, '#0a2342');
  oceanGrad.addColorStop(0.5, '#0d3b66');
  oceanGrad.addColorStop(1, '#0a2342');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = '#2d6a4f';
  ctx.beginPath();
  ctx.ellipse(540, 220, 200, 130, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(260, 250, 120, 190, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(820, 370, 70, 50, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b79257';
  ctx.beginPath();
  ctx.ellipse(520, 220, 90, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(230, 260, 30, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8f4f8';
  ctx.fillRect(0, 0, 1024, 30);
  ctx.fillRect(0, 485, 1024, 30);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 512;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.random() * 100 + 40, Math.random() * 20 + 8, Math.random(), 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8c92ac';
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = '#5c6170';
  ctx.beginPath();
  ctx.ellipse(200, 100, 70, 50, 0.3, 0, Math.PI * 2);
  ctx.ellipse(320, 120, 80, 60, -0.2, 0, Math.PI * 2);
  ctx.ellipse(150, 160, 50, 40, 0.1, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = Math.random() * 10 + 2;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#3f434d';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - 1, y - 1, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#c4c8d4';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createVolcanoRockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep basalt dark base with rocky noise
  ctx.fillStyle = '#26221f';
  ctx.fillRect(0, 0, 512, 512);

  // Basalt flow lines & crags
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = Math.random() * 40 + 10;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.4; // Downwards slope striations

    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(65, 55, 48, 0.4)' : 'rgba(15, 12, 10, 0.6)';
    ctx.lineWidth = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Oxidized reddish-brown spots
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 18 + 4;
    ctx.fillStyle = 'rgba(75, 40, 25, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

export function createVolcanoStrataTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Layered geological strata (Basalt, Andesite, Ash, Tuff, Lithic Crust)
  const colors = [
    '#3a332d', // Dark basalt
    '#5c4a3e', // Oxidized tuff
    '#2c241e', // Hard volcanic rock
    '#705844', // Pyroclastic ash layer
    '#4a3c30', // Andesite
    '#8a4b2a', // Iron-rich baked contact
    '#322822', // Subterranean basement
  ];

  const layerHeight = 512 / colors.length;
  colors.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, idx * layerHeight, 512, layerHeight);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, (idx + 1) * layerHeight);
    for (let x = 0; x <= 512; x += 30) {
      ctx.lineTo(x, (idx + 1) * layerHeight + (Math.random() * 6 - 3));
    }
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createMagmaGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, '#ffffdd');
  grad.addColorStop(0.3, '#ffaa00');
  grad.addColorStop(0.7, '#ff3300');
  grad.addColorStop(1, '#660000');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Boiling convection cells
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 8 + 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 240, 180, 0.4)';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Soft Radial Smoke Particle Texture (Smooth Gaussian edges, ZERO grey box artifacts!)
 */
export function createSmokeParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
  grad.addColorStop(0.0, 'rgba(160, 150, 160, 0.95)');
  grad.addColorStop(0.2, 'rgba(125, 115, 128, 0.75)');
  grad.addColorStop(0.45, 'rgba(85, 78, 90, 0.45)');
  grad.addColorStop(0.7, 'rgba(50, 45, 55, 0.18)');
  grad.addColorStop(0.9, 'rgba(30, 25, 35, 0.04)');
  grad.addColorStop(1.0, 'rgba(20, 15, 25, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Incandescent Glowing Lava Ember Particle Texture (Additive core)
 */
export function createLavaEmberTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.18, 'rgba(255, 235, 140, 0.95)');
  grad.addColorStop(0.4, 'rgba(255, 130, 20, 0.75)');
  grad.addColorStop(0.7, 'rgba(230, 50, 0, 0.35)');
  grad.addColorStop(0.9, 'rgba(160, 10, 0, 0.08)');
  grad.addColorStop(1.0, 'rgba(100, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Crater Glow Texture for summit radiant lighting
 */
export function createCraterGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255, 240, 180, 1.0)');
  grad.addColorStop(0.25, 'rgba(255, 140, 20, 0.8)');
  grad.addColorStop(0.6, 'rgba(220, 50, 0, 0.3)');
  grad.addColorStop(1.0, 'rgba(150, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
