class CountDown1State {
  static COUNTDOWN_DURATION = 5
  static COUNTDOWN_CIRCLE_SIZE = 100
  static COUNTDOWN_CIRCLE_OFFSET = 30

  constructor() {
    this.countdown = new Countdown({
      x: width / 2,
      y: height / 2 + CountDown1State.COUNTDOWN_CIRCLE_OFFSET,
      size: CountDown1State.COUNTDOWN_CIRCLE_SIZE,
      duration: CountDown1State.COUNTDOWN_DURATION,
      onComplete: () => {
        this.countdown.remove()
        state = new Challenge1State()
        state.init()
      }
    })
    this.init()
  }

  init() {
    this.countdown.start()
    return true
  }

  remove() {
    this.countdown.remove()
    return true
  }

  draw() {
    // fondo
    tint(255, this.countdown.opacity)
    image(countdown1Img, 0, 0, width, height)
    this.countdown.draw()
  }
}
