// Generates a PNG icon from an SVG canvas drawing
// Run: node scripts/generate-icon.js

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const size = 512;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Background - rounded rect
const radius = size * 0.22;
ctx.beginPath();
ctx.moveTo(radius, 0);
ctx.lineTo(size - radius, 0);
ctx.quadraticCurveTo(size, 0, size, radius);
ctx.lineTo(size, size - radius);
ctx.quadraticCurveTo(size, size, size - radius, size);
ctx.lineTo(radius, size);
ctx.quadraticCurveTo(0, size, 0, size - radius);
ctx.lineTo(0, radius);
ctx.quadraticCurveTo(0, 0, radius, 0);
ctx.closePath();

// Gradient background
const bgGrad = ctx.createLinearGradient(0, 0, size, size);
bgGrad.addColorStop(0, '#0d1117');
bgGrad.addColorStop(1, '#161b22');
ctx.fillStyle = bgGrad;
ctx.fill();

// Helix strands
const cx = size / 2;
const startY = size * 0.15;
const endY = size * 0.85;
const amplitude = size * 0.15;
const steps = 100;

ctx.lineWidth = size * 0.045;
ctx.lineCap = 'round';

// Draw two intertwined helix strands
for (let strand = 0; strand < 2; strand++) {
  const phase = strand * Math.PI;
  const grad = ctx.createLinearGradient(0, startY, 0, endY);

  if (strand === 0) {
    grad.addColorStop(0, '#58a6ff');
    grad.addColorStop(0.5, '#bc8cff');
    grad.addColorStop(1, '#58a6ff');
  } else {
    grad.addColorStop(0, '#3fb950');
    grad.addColorStop(0.5, '#f78166');
    grad.addColorStop(1, '#3fb950');
  }

  ctx.strokeStyle = grad;
  ctx.beginPath();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = startY + t * (endY - startY);
    const x = cx + Math.sin(t * Math.PI * 3 + phase) * amplitude;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// Draw connection rungs between strands
ctx.lineWidth = size * 0.02;
ctx.strokeStyle = 'rgba(139, 148, 158, 0.3)';

for (let i = 0; i < 6; i++) {
  const t = (i + 0.5) / 6;
  const y = startY + t * (endY - startY);
  const x1 = cx + Math.sin(t * Math.PI * 3) * amplitude;
  const x2 = cx + Math.sin(t * Math.PI * 3 + Math.PI) * amplitude;

  // Only draw when strands cross (roughly)
  if (Math.abs(Math.sin(t * Math.PI * 3)) < 0.4) {
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
}

// Node dots at key points
const dotPositions = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1];
const dotColors = ['#58a6ff', '#bc8cff', '#3fb950', '#f78166', '#58a6ff', '#3fb950', '#bc8cff'];

for (let strand = 0; strand < 2; strand++) {
  const phase = strand * Math.PI;
  dotPositions.forEach((t, idx) => {
    const y = startY + t * (endY - startY);
    const x = cx + Math.sin(t * Math.PI * 3 + phase) * amplitude;
    const color = strand === 0 ? dotColors[idx] : dotColors[(idx + 3) % dotColors.length];

    // Glow
    ctx.beginPath();
    ctx.arc(x, y, size * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = color + '44';
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(x, y, size * 0.015, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

// Save
const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(outDir, 'icon.png'), buffer);

console.log('Icon generated: assets/icon.png (512x512)');
