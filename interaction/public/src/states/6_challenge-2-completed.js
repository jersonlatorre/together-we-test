class Challenge2CompletedState {
  static FADE_IN_DURATION = 1

  constructor() {
    this.count = 5
    this.lastUpdate = millis()
    this.opacity = 0
    this.fadeInTween = null
    this.init()
  }

  init() {
    this.fadeInTween = gsap.to(this, {
      opacity: 255,
      duration: Challenge2CompletedState.FADE_IN_DURATION,
      ease: 'power2.out',
    })
  }

  remove() {
    this.fadeInTween && this.fadeInTween.kill()
    gsap.killTweensOf(this)
  }

  draw() {
    push()
    tint(255, this.opacity)
    image(challenge2CompletedImg, 0, 0, width, height)
    pop()

    // decrementar contador cada segundo
    const currentTime = millis()
    if (currentTime - this.lastUpdate >= 1000) {
      this.count = max(0, this.count - 1)
      this.lastUpdate = currentTime

      // cuando el contador llega a 0, volver al inicio
      if (this.count === 0) {
        detection.goToInitStateWithNoDelay()
        state.remove()
        state = new LoadingState()
        state.init()
      }
    }
  }
}
