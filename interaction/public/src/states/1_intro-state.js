class IntroState {
  static INTRO_DURATION = 10

  constructor() {
    this.startTime = millis()
    this.init()
  }

  init() {
    return true
  }

  remove() {
    return true
  }

  draw() {
    push()
    tint(255, 255)
    image(introImg, 0, 0, width, height)
    pop()

    // verificar si han pasado 10 segundos
    if (millis() - this.startTime >= IntroState.INTRO_DURATION * 1000) {
      state = new CountDown1State()
      state.init()
    }
  }
}
