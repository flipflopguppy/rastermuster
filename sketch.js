/**
 * Generatives Grafik-Raster – PNG & SVG Export
 */
let paletteInput, gridSizeInput, repeatProbInput;
let svgData = '';
let colorPreviewDiv;

function setup() {
  let cnv = createCanvas(800, 800);
  cnv.parent(document.body);

  let yStart = 860;
  let lineH  = 35;

  createElement('label', 'Farben (kommagetrennt):').position(20, yStart);
  paletteInput = createInput('#B2BEB5,#3B9DDC,#F35B41,#F88C12,#C1D6F5');
  paletteInput.size(400);
  paletteInput.position(20, yStart + 20);
  paletteInput.input(updateColorPreview); // bei jeder Änderung aktualisieren

  // Div für Farbvorschau-Quadrate
  colorPreviewDiv = createDiv('');
  colorPreviewDiv.position(20, yStart + 48);

  createElement('label', 'Rastergröße:').position(20, yStart + lineH + 70);
  gridSizeInput = createInput('10');
  gridSizeInput.size(60);
  gridSizeInput.position(20, yStart + lineH + 90);

  createElement('label', 'Wiederholung (%):').position(120, yStart + lineH + 70);
  repeatProbInput = createInput('20');
  repeatProbInput.size(60);
  repeatProbInput.position(120, yStart + lineH + 90);

  let btn = createButton('Neu generieren');
  btn.position(20, yStart + lineH * 2 + 105);
  btn.mousePressed(() => redraw());

  let savePng = createButton('PNG speichern');
  savePng.position(160, yStart + lineH * 2 + 105);
  savePng.mousePressed(() => save('muster.png'));

  let saveSvg = createButton('SVG speichern');
  saveSvg.position(290, yStart + lineH * 2 + 105);
  saveSvg.mousePressed(downloadSVG);

  noLoop();
  rectMode(CORNER);
  angleMode(DEGREES);
  updateColorPreview();
  redraw();
}

function updateColorPreview() {
  let palette = getPalette();
  colorPreviewDiv.html(''); // leeren
  palette.forEach(col => {
    let swatch = createDiv('');
    swatch.parent(colorPreviewDiv);
    swatch.style('display', 'inline-block');
    swatch.style('width', '24px');
    swatch.style('height', '24px');
    swatch.style('background-color', col);
    swatch.style('margin-right', '4px');
    swatch.style('border', '1px solid #aaa');
    swatch.style('border-radius', '3px');
  });
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
  return `<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`;
}
function svgGroup(content, tx, ty) {
  return `<g transform="translate(${r(tx)},${r(ty)})">${content}</g>`;
}
function r(n) { return Math.round(n * 100) / 100; }

function buildSVGShape(posX, posY, size, palette, type, bgIdx, fgIdx, rot) {
  let bg = palette[bgIdx];
  let fg = palette[fgIdx];
  let s2 = size / 2;
  let inner = '';

  inner += svgRect(-s2, -s2, size, size, bg);

  switch (type) {
    case 0: // Kreis
      inner += svgEllipse(0, 0, s2, s2, fg);
      break;
    case 1: // Volles Rechteck
      inner += svgRect(-s2, -s2, size, size, fg);
      break;
    case 2: { // Halbkreis
      let d = `M ${r(s2)} 0 A ${r(s2)} ${r(s2)} 0 0 1 ${r(-s2)} 0 Z`;
      inner += `<g transform="rotate(${rot})">${svgPath(d, fg)}</g>`;
      break;
    }
    case 3: { // Viertelkreis
      let d = `M ${r(-s2)} ${r(-s2)} L ${r(s2)} ${r(-s2)} A ${r(size)} ${r(size)} 0 0 1 ${r(-s2)} ${r(s2)} Z`;
      inner += `<g transform="rotate(${rot})">${svgPath(d, fg)}</g>`;
      break;
    }
    case 4: { // Dreieck
      let pts = `${r(-s2)},${r(-s2)} ${r(s2)},${r(-s2)} ${r(-s2)},${r(s2)}`;
      inner += `<g transform="rotate(${rot})"><polygon points="${pts}" fill="${fg}"/></g>`;
      break;
    }
    case 5: { // Ring
      let outerR = s2;
      let innerR = s2 / 2;
      // Zwei Kreise mit fill-rule evenodd erzeugen das Loch
      let d = `M ${r(outerR)} 0 A ${r(outerR)} ${r(outerR)} 0 1 0 ${r(-outerR)} 0 A ${r(outerR)} ${r(outerR)} 0 1 0 ${r(outerR)} 0 Z `
            + `M ${r(innerR)} 0 A ${r(innerR)} ${r(innerR)} 0 1 0 ${r(-innerR)} 0 A ${r(innerR)} ${r(innerR)} 0 1 0 ${r(innerR)} 0 Z`;
      inner += svgPath(d, fg);
      break;
    }
  }
  return svgGroup(inner, posX + s2, posY + s2);
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
        t   = floor(random(6)); // 0–5 statt 0–4
        bgI = floor(random(palette.length));
        let available = [];
        for (let i = 0; i < palette.length; i++) if (i !== bgI) available.push(i);
        fgI = available[floor(random(available.length))];
      }
      lastState = { type: t, bgIdx: bgI, fgIdx: fgI };

      let rot = floor(random(4)) * 90;

      drawShapeCanvas(x * cellSize, y * cellSize, cellSize * sF, palette, t, bgI, fgI, rot);
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
    case 5: { // Ring mit beginContour / endContour
      let outerR = size / 2;
      let innerR = size / 4;
      beginShape();
      for (let a = 0; a < 360; a += 5) {
        vertex(cos(a) * outerR, sin(a) * outerR);
      }
      beginContour();
      for (let a = 360; a >= 0; a -= 5) {
        vertex(cos(a) * innerR, sin(a) * innerR);
      }
      endContour();
      endShape(CLOSE);
      break;
    }
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
