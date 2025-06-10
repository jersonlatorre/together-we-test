class Challenge0CompletedState {
  static FADE_IN_DURATION = 1

  constructor() {
    this.duration = 3
    this.startTime = millis()
    this.opacity = 0
    this.fadeInOpacityTween = null
    this.init()
  }

  init() {
    this.fadeInOpacityTween = gsap.to(this, {
      opacity: 255,
      duration: Challenge0CompletedState.FADE_IN_DURATION,
      ease: 'power2.out'
    })
  }

  remove() {
    this.fadeInOpacityTween && this.fadeInOpacityTween.kill()
    gsap.killTweensOf(this)
  }

  draw() {
    push()
    background(0)
    tint(255, this.opacity)
    image(challenge0CompletedImg, 0, 0, width, height)
    pop()

    if (millis() - this.startTime >= this.duration * 1000) {
      this.remove()
      state = new Challenge1State()
      state.init()
    }
  }
}