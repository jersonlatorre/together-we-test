class CountDown1State {
  static COUNTDOWN_DURATION = 5
  static COUNTDOWN_DELAY = 500
  static COUNTDOWN_ON_COMPLETE_DELAY = 500
  static COUNTDOWN_CIRCLE_SIZE = 100
  static COUNTDOWN_CIRCLE_OFFSET = 30

  constructor() {
    this.count = CountDown1State.COUNTDOWN_DURATION
    this.opacity = 0
    this.isCounting = false
    this.countTween = null
    this.opacityTween = null
    this.delayTimeout = null
    this.angle = 360
    this.init()
  }

  init() {
    // fade in con gsap
    this.opacityTween = gsap.to(this, {
      opacity: 255,
      duration: 1,
      onComplete: () => {
        this.isCounting = true
        this.animateCount()
      },
    })
    return true
  }

  animateCount() {
    this.countTween = gsap.to(this, {
      angle: 0,
      duration: CountDown1State.COUNTDOWN_DURATION,
      ease: 'none',
      onComplete: () => {
        this.delayTimeout = setTimeout(() => {
          this.countTween && this.countTween.kill()
          this.countTween = null
          this.delayTimeout && clearTimeout(this.delayTimeout)
          this.delayTimeout = null
          this.remove()
          state = new Challenge1State()
          state.init()
        }, CountDown1State.COUNTDOWN_ON_COMPLETE_DELAY)
      },
    })
  }

  remove() {
    this.opacityTween && this.opacityTween.kill()
    this.countTween && this.countTween.kill()
    gsap.killTweensOf(this)
    return true
  }

  draw() {
    // fondo
    tint(255, this.opacity)
    image(countdown1Img, 0, 0, width, height)

    // círculo tipo pizza que se despinta
    push()
    translate(width / 2, height / 2 + CountDown1State.COUNTDOWN_CIRCLE_OFFSET)
    scale(-1, 1)
    fill('#00FF4F')
    noStroke()
    arc(0, 0, CountDown1State.COUNTDOWN_CIRCLE_SIZE, CountDown1State.COUNTDOWN_CIRCLE_SIZE, -HALF_PI, radians(this.angle - 90), PIE)
    pop()
  }
}
