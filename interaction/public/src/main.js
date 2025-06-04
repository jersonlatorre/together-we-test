let detection
const FACTOR = 0.6

async function setup() {
  // createCanvas(windowWidth, windowHeight)
  createCanvas(2352 * FACTOR, 840 * FACTOR)
  frameRate(24)

  // inicializar detección
  detection = new Detection()
  await detection.init()
}

function draw() {
  detection.draw()
}
