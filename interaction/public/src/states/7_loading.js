class LoadingState {
  constructor() {
    this.duration = 5
    this.fadeOpacityTween = null
    this.fadeDelayedCall = null
    this.opacity = 0
    this.init()
  }

  init() {
    this.fadeOpacityTween = gsap.to(this, {
      opacity: 255,
      duration: 1,
      ease: 'power2.out',
    })

    this.fadeDelayedCall = gsap.delayedCall(this.duration, () => {
      this.fadeOpacityTween && this.fadeOpacityTween.kill()
      this.fadeOpacityTween = gsap.to(this, {
        opacity: 0,
        duration: 1,
        ease: 'power2.in',
        onComplete: () => {
          this.remove()
          detection.goToInitStateWithNoDelay()
          state = new Challenge0State()
          state.init()
        },
      })
    })
  }

  remove() {
    this.fadeOpacityTween && this.fadeOpacityTween.kill()
    this.fadeDelayedCall && this.fadeDelayedCall.kill()
    this.fadeOpacityTween = null
    this.fadeDelayedCall = null
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
