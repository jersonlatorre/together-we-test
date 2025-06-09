class Challenge1CompletedState {
  static FADE_IN_DURATION = 1

  constructor() {
    this.duration = 3
    this.startTime = millis()
    this.opacity = 0
    this.fadeInTween = null
    this.init()
  }

  init() {
    this.fadeInTween = gsap.to(this, {
      opacity: 255,
      duration: Challenge1CompletedState.FADE_IN_DURATION,
      ease: 'power2.out'
    })
  }

  remove() {
    this.fadeInTween && this.fadeInTween.kill()
    gsap.killTweensOf(this)
  }

  draw() {
    push()
    tint(255, this.opacity)
    image(challenge1CompletedImg, 0, 0, width, height)
    pop()

    if (millis() - this.startTime >= this.duration * 1000) {
      state.remove()
      state = new Challenge2State()
      state.init()
    }
  }
}
