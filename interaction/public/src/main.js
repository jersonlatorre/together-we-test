let state
let detection
const FACTOR = 1

// fonts
let fontLexend
let fontMorganite

// images
let challenge0Img
let challenge0CompletedImg
let challenge1Img
let challenge1CompletedImg
let challenge2Img
let challenge2CompletedImg
let loadingImg

// sounds
let soundSwipe
let soundSwipeBack
let soundYes

// función para iniciar el audio
function startAudio() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume()
  }
}

async function setup() {
  pixelDensity(1)

  // load assets
  fontLexend = await loadFont('../assets/fonts/LexendGiga-SemiBold.ttf')
  fontMorganite = await loadFont('../assets/fonts/Morganite-Bold.ttf')

  // load images
  challenge0Img = await loadImage('../assets/images/1_challenge-0.png')
  challenge0CompletedImg = await loadImage('../assets/images/2_challenge-0-completed.png')
  challenge1Img = await loadImage('../assets/images/3_challenge-1.png')
  challenge1CompletedImg = await loadImage('../assets/images/4_challenge-1-completed.png')
  challenge2Img = await loadImage('../assets/images/5_challenge-2.png')
  challenge2CompletedImg = await loadImage('../assets/images/6_challenge-2-completed.png')
  loadingImg = await loadImage('../assets/images/7_loading.png')

  // load sounds
  soundSwipe = await loadSound('../assets/sounds/swoosh-1.mp3')
  soundSwipeBack = await loadSound('../assets/sounds/swoosh-2.mp3')
  soundYes = await loadSound('../assets/sounds/yes.mp3')

  createCanvas(2352 * FACTOR, 840 * FACTOR)
  frameRate(30)

  detection = new Detection()
  state = new Challenge0State()

  await detection.init()

  // agregar evento de clic para iniciar audio
  document.addEventListener('click', startAudio)
}

function draw() {
  detection.draw()
  state.draw()
}

async function keyPressed() {
  if (key === '1') {
    state.remove()
    state = new Challenge0State()
    state.init()
    detection.goToInitState()
  }

  if (key === '2') {
    state.remove()
    state = new Challenge0CompletedState()
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

  if (key === '7') {
    state.remove()
    state = new LoadingState()
    state.init()
  }
}
