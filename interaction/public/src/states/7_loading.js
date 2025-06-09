class LoadingState {
  constructor() {
    this.duration = 3
    this.opacityTween = null
    this.delayTween = null
    this.delayedCall = null
    this.opacity = 0
    this.init()
  }

  init() {
    this.opacityTween = gsap.to(this, {
      opacity: 255,
      duration: 1,
      ease: 'power2.out',
    })

    this.delayedCall = gsap.delayedCall(this.duration, () => {
      this.opacityTween && this.opacityTween.kill()
      this.opacityTween = gsap.to(this, {
        opacity: 0,
        duration: 1,
        ease: 'power2.in',
        onComplete: () => {
          this.remove()
          detection.goToInitStateWithNoDelay()
          state = new IntroState()
          state.init()
        },
      })
    })
  }

  remove() {
    this.opacityTween && this.opacityTween.kill()
    this.delayedCall && this.delayedCall.kill()
    this.opacityTween = null
    this.delayedCall = null
    this.opacity = 0
  }

  draw() {
    push()
    background(0)
    tint(255, this.opacity)
    image(loadingImg, 0, 0, width, height)
    pop()
  }
}
