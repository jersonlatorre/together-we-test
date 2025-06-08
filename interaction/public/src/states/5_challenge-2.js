const Challenge2States = {
  INITIAL_MESSAGE_APPEARING: 0,
  INITIAL_MESSAGE_DISAPPEARING: 1,
  GAMEPLAY: 2,
  COMPLETED: 3,
}

class Challenge2State {
  static APPEARING_DURATION = 1
  static DISAPPEARING_DURATION = 1
  static DELAY_BEFORE_DISAPPEARING = 1000
  static GAMEPLAY_DURATION = 10
  static TIMER_CIRCLE_SIZE = 60
  static TIMER_CIRCLE_OFFSET = 60

  constructor() {
    // state
    this.state = null

    // values
    this.opacityAppearing = 0
    this.opacityDisappearing = 255
    this.backgroundOpacity = 255

    // tweens
    this.opacityAppearingTween = null
    this.opacityDisappearingTween = null
    this.backgroundOpacityTween = null

    // timeouts
    this.initialMessageAppearingTimeout = null
    this.initialMessageDisappearingTimeout = null

    // countdown
    this.countdown = new Countdown({
      x: width - Challenge2State.TIMER_CIRCLE_OFFSET,
      y: Challenge2State.TIMER_CIRCLE_OFFSET,
      size: Challenge2State.TIMER_CIRCLE_SIZE,
      duration: Challenge2State.GAMEPLAY_DURATION,
      onComplete: () => {
        this.state = Challenge2States.COMPLETED
      },
    })

    detection.goToInitStateWithNoDelay()

    this.init()
  }

  init() {
    this.state = Challenge2States.INITIAL_MESSAGE_APPEARING
  }

  draw() {
    switch (this.state) {
      case Challenge2States.INITIAL_MESSAGE_APPEARING:
        this.initialMessageAppearing()
        break
      case Challenge2States.INITIAL_MESSAGE_DISAPPEARING:
        this.initialMessageDisappearing()
        break
      case Challenge2States.GAMEPLAY:
        this.gameplay()
        break
      case Challenge2States.COMPLETED:
        state.remove()
        state = new Challenge2CompletedState()
        state.init()
        break
    }
  }

  initialMessageAppearing() {
    // fondo negro fijo
    push()
    fill(0)
    rect(0, 0, width, height)
    pop()

    // imagen que aparece
    push()
    tint(255, this.opacityAppearing)
    image(challenge2Img, 0, 0, width, height)
    pop()

    if (this.opacityAppearingTween) return

    this.opacityAppearingTween = gsap.to(this, {
      opacityAppearing: 255,
      duration: Challenge2State.APPEARING_DURATION,
      onComplete: () => {
        this.initialMessageAppearingTimeout = setTimeout(() => {
          this.opacityAppearingTween && this.opacityAppearingTween.kill()
          this.opacityAppearingTween = null
          this.initialMessageAppearingTimeout && clearTimeout(this.initialMessageAppearingTimeout)
          this.initialMessageAppearingTimeout = null
          this.state = Challenge2States.INITIAL_MESSAGE_DISAPPEARING
        }, Challenge2State.DELAY_BEFORE_DISAPPEARING)
      },
    })
  }

  initialMessageDisappearing() {
    // fondo negro que desaparece
    push()
    fill(0, this.backgroundOpacity)
    rect(0, 0, width, height)
    pop()

    // imagen que desaparece
    push()
    tint(255, this.opacityDisappearing)
    image(challenge2Img, 0, 0, width, height)
    pop()

    if (this.opacityDisappearingTween) return

    this.opacityDisappearingTween = gsap.to(this, {
      opacityDisappearing: 0,
      duration: Challenge2State.DISAPPEARING_DURATION,
      onComplete: () => {
        this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
        this.opacityDisappearingTween = null
        this.backgroundOpacityTween && this.backgroundOpacityTween.kill()
        this.backgroundOpacityTween = null
        this.state = Challenge2States.GAMEPLAY
        this.countdown.start()
        this.delayTimeout && clearTimeout(this.delayTimeout)
        this.delayTimeout = null
        detection.goToChallenge2State()

        detection.mstGraph.startFadeIn()
        detection.mstGraph.generateRandomPoints()
      },
    })

    this.backgroundOpacityTween = gsap.to(this, {
      backgroundOpacity: 0,
      duration: Challenge2State.DISAPPEARING_DURATION,
    })
  }

  gameplay() {
    this.countdown.draw()
  }

  remove() {
    this.opacityAppearingTween && this.opacityAppearingTween.kill()
    this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
    this.backgroundOpacityTween && this.backgroundOpacityTween.kill()
    this.initialMessageAppearingTimeout && clearTimeout(this.initialMessageAppearingTimeout)
    this.initialMessageDisappearingTimeout && clearTimeout(this.initialMessageDisappearingTimeout)
    this.delayTimeout && clearTimeout(this.delayTimeout)
    this.delayTimeout = null
    this.countdown.remove()
    gsap.killTweensOf(this)
    return true
  }
}
