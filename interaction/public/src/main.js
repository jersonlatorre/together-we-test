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

  detection = new Detection()
  state = new IntroState()

  // inicializar detección
  await detection.init()
  await state.init()
}

function draw() {
  detection.draw()
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
    state.init()
  }

  if (key === '3') {
    state.remove()
    state = new Challenge1State()
    state.init()
  }

  if (key === '4') {
    state.remove()
    state = new Challenge1CompletedState()
    state.init()
  }

  if (key === '5') {
    state.remove()
    state = new Challenge2State()
    state.init()
  }

  if (key === '6') {
    state.remove()
    state = new Challenge2CompletedState()
    state.init()
  }
}
