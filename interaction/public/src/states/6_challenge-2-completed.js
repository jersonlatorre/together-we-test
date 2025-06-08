class Challenge2CompletedState {
  constructor() {
    this.count = 5
    this.lastUpdate = millis()
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
    image(challenge2CompletedImg, 0, 0, width, height)
    pop()

    // decrementar contador cada segundo
    const currentTime = millis()
    if (currentTime - this.lastUpdate >= 1000) {
      this.count = max(0, this.count - 1)
      this.lastUpdate = currentTime
    }
  }
}
