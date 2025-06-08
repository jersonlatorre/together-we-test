let state
let detection
const FACTOR = 1
let fontLexend
let fontMorganite
let introImg
let countdown1Img
let challenge1Img
let challenge1CompletedImg
let challenge2Img
let challenge2CompletedImg
let loadingImg

async function setup() {
  fontLexend = await loadFont('../assets/fonts/LexendGiga-SemiBold.ttf')
  fontMorganite = await loadFont('../assets/fonts/Morganite-Bold.ttf')
  introImg = await loadImage('../assets/images/1_intro.png')
  countdown1Img = await loadImage('../assets/images/2_countdown-1.png')
  challenge1Img = await loadImage('../assets/images/3_challenge-1.png')
  challenge1CompletedImg = await loadImage('../assets/images/4_challenge-1-completed.png')
  challenge2Img = await loadImage('../assets/images/5_challenge-2.png')
  challenge2CompletedImg = await loadImage('../assets/images/6_challenge-2-completed.png')
  loadingImg = await loadImage('../assets/images/7_loading.png')

  createCanvas(2352 * FACTOR, 840 * FACTOR)
  frameRate(30)

  detection = new Detection()
  state = new IntroState()

  await detection.init()
}

function draw() {
  detection.draw()
  state.draw()
}

async function keyPressed() {
  if (key === '1') {
    state.remove()
    state = new IntroState()
    detection.goToInitState()
  }

  if (key === '2') {
    state.remove()
    state = new CountDown1State()
  }

  if (key === '3') {
    state.remove()
    state = new Challenge1State()
  }

  if (key === '4') {
    state.remove()
    state = new Challenge1CompletedState()
  }

  if (key === '5') {
    state.remove()
    state = new Challenge2State()
  }

  if (key === '6') {
    state.remove()
    state = new Challenge2CompletedState()
  }

  if (key === '7') {
    state.remove()
    state = new LoadingState()
  }
}
