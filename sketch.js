/**
 * Generatives Grafik-Raster – ohne p5.svg
 */
let colorInputs = [];
let gridSizeInput, repeatProbInput;
const defaultPalette = ['#B2BEB5', '#3B9DDC', '#F35B41', '#F88C12', '#C1D6F5'];
let lastState = { type: -1, bgIdx: -1, fgIdx: -1 };

function setup() {
  let cnv = createCanvas(800, 800);
  cnv.parent(document.body);

  colorInputs = [];
  for (let i = 0; i < 5; i++) {
    let inp = createInput(defaultPalette[i]);
    inp.position(20, 820 + i * 30);
    colorInputs.push(inp);
  }

  gridSizeInput = createInput('10');
  gridSizeInput.position(250, 820);

  repeatProbInput = createInput('20');
  repeatProbInput.position(250, 855);

  // Neu-generieren Button
  let btn = createButton('Neu generieren');
  btn.position(20, 980);
  btn.mousePressed(() => redraw());

  // PNG-Export Button
  let saveBtn = createButton('PNG speichern');
  saveBtn.position(140, 980);
  saveBtn.mousePressed(() => save('muster.png'));

  noLoop();
  rectMode(CORNER);
  angleMode(DEGREES);
  redraw();
}

function draw() {
  background(255);

  let palette = colorInputs.map(inp => inp.value() || '#FFFFFF');
  let gSize = parseInt(gridSizeInput.value()) || 10;
  let prob = parseInt(repeatProbInput.value()) || 0;
  let cellSize = width / gSize;
  let occupied = Array(gSize).fill().map(() => Array(gSize).fill(false));

  lastState = { type: -1, bgIdx: -1, fgIdx: -1 };

  for (let y = 0; y < gSize; y++) {
    for (let x = 0; x < gSize; x++) {
      if (occupied[x][y]) continue;

      let sF = 1;
      if (random() > 0.9 && canFit(x, y, 3, gSize, occupied)) sF = 3;
      else if (random() > 0.7 && canFit(x, y, 2, gSize, occupied)) sF = 2;
      markOccupied(x, y, sF, occupied);

      let t, bgI, fgI;
      if (lastState.type !== -1 && random(100) < prob) {
        t = lastState.type;
        bgI = lastState.bgIdx;
        fgI = lastState.fgIdx;
      } else {
        t = floor(random(5));
        bgI = floor(random(palette.length));
        let available = [];
        for (let i = 0; i < palette.length; i++) if (i !== bgI) available.push(i);
        fgI = available[floor(random(available.length))]; // BUG FIX
      }
      lastState = { type: t, bgIdx: bgI, fgIdx: fgI };

      drawShape(x * cellSize, y * cellSize, cellSize * sF, palette, t, bgI, fgI);
    }
  }
}

function drawShape(posX, posY, size, palette, type, bgIdx, fgIdx) {
  push();
  translate(posX + size / 2, posY + size / 2);
  noStroke();

  fill(palette[bgIdx]);
  rect(-size / 2, -size / 2, size, size);

  fill(palette[fgIdx]);
  let rot = floor(random(4)) * 90;

  switch (type) {
    case 0:
      ellipse(0, 0, size);
      break;
    case 1:
      // Volles Rechteck = nur Hintergrundfarbe sichtbar, fgI als Vollrechteck drüber
      rect(-size / 2, -size / 2, size, size);
      break;
    case 2:
      rotate(rot);
      arc(0, 0, size, size, 0, 180, CHORD);
      break;
    case 3:
      rotate(rot);
      arc(-size / 2, -size / 2, size * 2, size * 2, 0, 90, PIE);
      break;
    case 4:
      rotate(rot);
      triangle(-size / 2, -size / 2, size / 2, -size / 2, -size / 2, size / 2);
      break;
  }
  pop();
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
}
