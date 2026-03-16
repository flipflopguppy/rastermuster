/**
 * Generatives Grafik-Raster (SVG-Export)
 * - Robuste Initialisierung für GitHub Pages
 */

let colorInputs = [];
let gridSizeInput, repeatProbInput;
const defaultPalette = ['#B2BEB5', '#3B9DDC', '#F35B41', '#F88C12', '#C1D6F5'];
let lastState = { type: -1, bgIdx: -1, fgIdx: -1 }; 
let isInitialized = false; // Sicherheits-Schalter

function setup() {
  // 1. Warten bis SVG definiert ist
  if (typeof SVG === 'undefined') {
    setTimeout(setup, 100);
    return;
  }

  createCanvas(800, 800, SVG);
  
  // UI Styles
  let labelStyle = "font-family: Helvetica; font-size: 14px; color: black; margin: 0; padding: 0;";
  
  // 2. Inputs erstellen
  colorInputs = []; // Sicherstellen, dass das Array leer startet
  for (let i = 0; i < 5; i++) {
    let inp = createInput(defaultPalette[i]);
    inp.position(20, 820 + (i * 30));
    colorInputs.push(inp);
  }
  
  createP('Rastergröße (z.B. 10):').style(labelStyle).position(250, 810);
  gridSizeInput = createInput('10');
  gridSizeInput.position(250, 835);
  
  createP('Wdh.-Wahrsch. (0-100%):').style(labelStyle).position(250, 865);
  repeatProbInput = createInput('20');
  repeatProbInput.position(250, 890);
  
  noLoop();
  rectMode(CORNER);
  angleMode(DEGREES);
  
  isInitialized = true; // Jetzt ist alles bereit
  redraw(); // Einmal zeichnen
}

function draw() {
  // Abbrechen, wenn setup() noch nicht fertig ist
  if (!isInitialized) return;

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
        for(let i=0; i<palette.length; i++) if(i !== bgI) available.push(i);
        fgI = random(available);
      }
      lastState = { type: t, bgIdx: bgI, fgIdx: fgI };
      
      drawShape(x * cellSize, y * cellSize, cellSize * sF, palette, t, bgI, fgI);
    }
  }
}

function drawShape(posX, posY, size, palette, type, bgIdx, fgIdx) {
  push();
  translate(posX + size/2, posY + size/2);
  noStroke();
  fill(palette[bgIdx]);
  rect(-size/2, -size/2, size, size);

  fill(palette[fgIdx]);
  switch (type) {
    case 0: ellipse(0, 0, size); break;
    case 1: rect(-size/2, -size/2, size, size); break;
    case 2: rotate(floor(random(4))*90); arc(0, 0, size, size, 0, 180, CHORD); break;
    case 3: rotate(floor(random(4))*90); arc(-size/2, -size/2, size*2, size*2, 0, 90, PIE); break;
    case 4: rotate(floor(random(4))*90); triangle(-size/2, -size/2, size/2, -size/2, -size/2, size/2); break;
  }
  pop();
}

function canFit(x, y, s, gSize, occupied) {
  if (x + s > gSize || y + s > gSize) return false;
  for (let i = x; i < x + s; i++) {
    for (let j = y; j < y + s; j++) {
      if (occupied[i][j]) return false;
    }
  }
  return true;
}

function markOccupied(x, y, s, occupied) {
  for (let i = x; i < x + s; i++) {
    for (let j = y; j < y + s; j++) {
      occupied[i][j] = true;
    }
  }
}

function mousePressed() { 
  if(isInitialized && mouseY < 800) redraw(); 
}

function keyPressed() {
  if (isInitialized && (key === 's' || key === 'S')) save("muster.svg");
}
