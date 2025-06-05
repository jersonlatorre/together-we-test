let state
let detection
const FACTOR = 0.6
let fontLexend
let fontMorganite

async function setup() {
  fontLexend = await loadFont('../assets/fonts/LexendGiga-SemiBold.ttf')
  fontMorganite = await loadFont('../assets/fonts/Morganite-Bold.ttf')

  // createCanvas(windowWidth, windowHeight)
  createCanvas(2352 * FACTOR, 840 * FACTOR)
  frameRate(24)

  state = new IntroState()

  // inicializar detección
  await state.init()
}

function draw() {
  state.draw()
}

async function keyPressed() {
  if (key === '1') {
    state.remove()
    state = new IntroState()
    await state.init()
  }

  if (key === '2') {
    state.remove()
    state = new CountDown1State()
    await state.init()
  }
}
