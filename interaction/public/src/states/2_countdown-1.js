class CountDown1State {
  static COUNTDOWN_DURATION = 5
  static COUNTDOWN_CIRCLE_SIZE = 100
  static COUNTDOWN_CIRCLE_OFFSET = 30

  constructor() {
    this.countdownOpacity = 0
    this.countdownOpacityTween = null

    // countdown
    this.countdown = new Countdown({
      x: width / 2,
      y: height / 2 + CountDown1State.COUNTDOWN_CIRCLE_OFFSET,
      size: CountDown1State.COUNTDOWN_CIRCLE_SIZE,
      duration: CountDown1State.COUNTDOWN_DURATION,
      onComplete: () => {
        this.remove()
        state = new Challenge1State()
        state.init()
      },
    })

    this.init()
  }
  
  init() {
    this.countdown.start()
    this.countdownOpacityTween = gsap.to(this, {
      countdownOpacity: 255,
      duration: 1,
      onComplete: () => {
        this.countdownOpacityTween = null
      },
    })
  }

  remove() {
    if (this.countdown) {
      this.countdown.remove()
    }
    this.countdown = null
    this.countdownOpacityTween = null
    this.countdownOpacity = 0
  }

  draw() {
    // fondo
    tint(255, this.countdownOpacity)
    image(countdown1Img, 0, 0, width, height)
    if (this.countdown) {
      this.countdown.draw()
    }
  }
}
