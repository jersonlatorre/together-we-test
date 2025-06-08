class Challenge1CompletedState {
  constructor() {
    this.duration = 3
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
    image(challenge1CompletedImg, 0, 0, width, height)
    pop()

    if (millis() - this.startTime >= this.duration * 1000) {
      state = new Challenge2State()
      state.init()
    }
  }
}
