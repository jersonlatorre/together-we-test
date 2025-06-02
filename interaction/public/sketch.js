let detection

async function setup() {
  createCanvas(windowWidth, windowHeight)

  // inicializar detección
  detection = new Detection()
  await detection.init()
}

function draw() {
  detection.draw()
}
