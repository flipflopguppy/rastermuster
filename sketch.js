/**
 * Generatives Grafik-Raster – PNG & SVG Export
 */
let paletteInput, gridSizeInput, repeatProbInput;
let svgData = ''; // SVG-String wird parallel zum Canvas aufgebaut

function setup() {
  let cnv = createCanvas(800, 800);
  cnv.parent(document.body);

  let yStart = 860;
  let lineH  = 35;

  createElement('label', 'Farben (kommagetrennt):').position(20, yStart);
  paletteInput = createInput('#B2BEB5,#3B9DDC,#F35B41,#F88C12,#C1D6F5');
  paletteInput.size(400);
  paletteInput.position(20, yStart + 20);

  createElement('label', 'Rastergröße:').position(20, yStart + lineH + 25);
  gridSizeInput = createInput('10');
  gridSizeInput.size(60);
  gridSizeInput.position(20, yStart + lineH + 45);

  createElement('label', 'Wiederholung (%):').position(120, yStart + lineH + 25);
  repeatProbInput = createInput('20');
  repeatProbInput.size(60);
  repeatProbInput.position(120, yStart + lineH + 45);

  let btn = createButton('Neu generieren');
  btn.position(20, yStart + lineH * 2 + 60);
  btn.mousePressed(() => redraw());

  let savePng = createButton('PNG speichern');
  savePng.position(160, yStart + lineH * 2 + 60);
  savePng.mousePressed(() => save('muster.png'));

  let saveSvg = createButton('SVG speichern');
  saveSvg.position(290, yStart + lineH * 2 + 60);
  saveSvg.mousePressed(downloadSVG);

  noLoop();
  rectMode(CORNER);
  angleMode(DEGREES);
  redraw();
}

function getPalette() {
  return paletteInput.value()
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

// SVG-Hilfsfunktionen
function svgRect(x, y, w, h, fill) {
  return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${fill}"/>`;
}
function svgEllipse(cx, cy, rx, ry, fill) {
  return `<ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${r(rx)}" ry="${r(ry)}" fill="${fill}"/>`;
}
function svgPath(d, fill) {
  return `<path d="${d}" fill="${fill}"/>`;
}
function svgGroup(content, tx, ty, rot) {
  let transform = `translate(${r(tx)},${r(ty)})`;
  if (rot) transform += ` rotate(${rot})`;
  return `<g transform="${transform}">${content}</g>`;
}
function r(n) { return Math.round(n * 100) / 100; } // auf 2 Dezimalen runden

function buildSVGShape(posX, posY, size, palette, type, bgIdx, fgIdx, rot) {
  let bg = palette[bgIdx];
  let fg = palette[fgIdx];
  let s2 = size / 2;
  let inner = '';

  // Hintergrundrechteck
  inner += svgRect(-s2, -s2, size, size, bg);

  switch (type) {
    case 0: // Kreis
      inner += svgEllipse(0, 0, s2, s2, fg);
      break;
    case 1: // Volles Rechteck
      inner += svgRect(-s2, -s2, size, size, fg);
      break;
    case 2: { // Halbkreis (CHORD-Arc)
      let rad = s2;
      // Arc von 0° bis 180° als Path
      let x1 = r(rad), y1 = 0;
      let x2 = r(-rad), y2 = 0;
      let d = `M ${x1} ${y1} A ${rad} ${rad} 0 0 1 ${x2} ${y2} Z`;
      inner += `<g transform="rotate(${rot})">${svgPath(d, fg)}</g>`;
      break;
    }
    case 3: { // Viertelkreis (PIE)
      let rad = size;
      let d = `M ${-s2} ${-s2} L ${r(-s2 + rad)} ${-s2} A ${rad} ${rad} 0 0 1 ${-s2} ${r(-s2 + rad)} Z`;
      inner += `<g transform="rotate(${rot})">${svgPath(d, fg)}</g>`;
      break;
    }
    case 4: { // Dreieck
      let pts = `${r(-s2)},${r(-s2)} ${r(s2)},${r(-s2)} ${r(-s2)},${r(s2)}`;
      inner += `<g transform="rotate(${rot})"><polygon points="${pts}" fill="${fg}"/></g>`;
      break;
    }
  }
  return svgGroup(inner, posX + s2, posY + s2, 0);
}

function draw() {
  background(255);

  let palette = getPalette();
  if (palette.length < 2) {
    fill(0); noStroke();
    textSize(16);
    text('Bitte mindestens 2 Farben eingeben.', 20, 40);
    svgData = '';
    return;
  }

  let gSize    = parseInt(gridSizeInput.value()) || 10;
  let prob     = parseInt(repeatProbInput.value()) || 0;
  let cellSize = width / gSize;
  let occupied = Array(gSize).fill().map(() => Array(gSize).fill(false));
  let lastState = { type: -1, bgIdx: -1, fgIdx: -1 };

  // SVG-Elemente sammeln
  let svgElements = [`<rect width="800" height="800" fill="white"/>`];

  for (let y = 0; y < gSize; y++) {
    for (let x = 0; x < gSize; x++) {
      if (occupied[x][y]) continue;

      let sF = 1;
      if (random() > 0.9 && canFit(x, y, 3, gSize, occupied)) sF = 3;
      else if (random() > 0.7 && canFit(x, y, 2, gSize, occupied)) sF = 2;
      markOccupied(x, y, sF, occupied);

      let t, bgI, fgI;
      if (lastState.type !== -1 && random(100) < prob) {
        t   = lastState.type;
        bgI = lastState.bgIdx;
        fgI = lastState.fgIdx;
      } else {
        t   = floor(random(5));
        bgI = floor(random(palette.length));
        let available = [];
        for (let i = 0; i < palette.length; i++) if (i !== bgI) available.push(i);
        fgI = available[floor(random(available.length))];
      }
      lastState = { type: t, bgIdx: bgI, fgIdx: fgI };

      let rot = floor(random(4)) * 90; // einmal würfeln, für Canvas & SVG gleich

      // Canvas zeichnen
      drawShapeCanvas(x * cellSize, y * cellSize, cellSize * sF, palette, t, bgI, fgI, rot);

      // SVG parallel aufbauen
      svgElements.push(buildSVGShape(x * cellSize, y * cellSize, cellSize * sF, palette, t, bgI, fgI, rot));
    }
  }

  svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">\n`
           + svgElements.join('\n')
           + `\n</svg>`;
}

function drawShapeCanvas(posX, posY, size, palette, type, bgIdx, fgIdx, rot) {
  push();
  translate(posX + size / 2, posY + size / 2);
  noStroke();
  fill(palette[bgIdx]);
  rect(-size / 2, -size / 2, size, size);
  fill(palette[fgIdx]);
  switch (type) {
    case 0: ellipse(0, 0, size); break;
    case 1: rect(-size / 2, -size / 2, size, size); break;
    case 2: rotate(rot); arc(0, 0, size, size, 0, 180, CHORD); break;
    case 3: rotate(rot); arc(-size / 2, -size / 2, size * 2, size * 2, 0, 90, PIE); break;
    case 4: rotate(rot); triangle(-size / 2, -size / 2, size / 2, -size / 2, -size / 2, size / 2); break;
  }
  pop();
}

function downloadSVG() {
  if (!svgData) return;
  let blob = new Blob([svgData], { type: 'image/svg+xml' });
  let url  = URL.createObjectURL(blob);
  let a    = document.createElement('a');
  a.href   = url;
  a.download = 'muster.svg';
  a.click();
  URL.revokeObjectURL(url);
}

function canFit(x, y, s, gSize, occupied) {
  if (x + s > gSize || y + s > gSize) return false;
  for (let i = x; i < x + s; i++)
    for (let j = y; j < y + s; j++)
      if (occupied[i][j]) return false;
  return true;
}

function markOccupied(x, y, s, occupied) {
  for (let i = x; i < x + s; i++)
    for (let j = y; j < y + s; j++)
      occupied[i][j] = true;
}

function mousePressed() {
  if (mouseY < 800) redraw();
}

function keyPressed() {
  if (key === 's' || key === 'S') save('muster.png');
  if (key === 'v' || key === 'V') downloadSVG();
}
