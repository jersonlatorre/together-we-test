const Challenge0States = {
  INITIAL_MESSAGE_APPEARING: 0,
  INITIAL_MESSAGE_DISAPPEARING: 1,
  GAMEPLAY: 2,
  COMPLETED: 3,
}

class Challenge0State {
  static APPEARING_DURATION = 2
  static DISAPPEARING_DURATION = 1
  static DELAY_BEFORE_DISAPPEARING = 1000
  static GAMEPLAY_DURATION = 20
  static TIMER_CIRCLE_SIZE = 60
  static TIMER_CIRCLE_OFFSET = 60

  constructor() {
    // state
    this.state = null

    // values
    this.opacityAppearing = 0
    this.opacityDisappearing = 255

    // tweens
    this.opacityAppearingTween = null
    this.opacityDisappearingTween = null

    // timeouts
    this.initialMessageAppearingTimeout = null
    this.initialMessageDisappearingTimeout = null

    // countdown
    this.countdown = new Countdown({
      x: width - Challenge0State.TIMER_CIRCLE_OFFSET,
      y: Challenge0State.TIMER_CIRCLE_OFFSET,
      size: Challenge0State.TIMER_CIRCLE_SIZE,
      duration: Challenge0State.GAMEPLAY_DURATION,
      onComplete: () => {
        this.state = Challenge0States.COMPLETED
      },
    })

    this.init()
  }

  init() {
    detection.goToInitStateWithNoDelay()
    this.state = Challenge0States.INITIAL_MESSAGE_APPEARING
  }

  draw() {
    switch (this.state) {
      case Challenge0States.INITIAL_MESSAGE_APPEARING:
        this.initialMessageAppearing()
        break
      case Challenge0States.INITIAL_MESSAGE_DISAPPEARING:
        this.initialMessageDisappearing()
        break
      case Challenge0States.GAMEPLAY:
        this.gameplay()
        break
      case Challenge0States.COMPLETED:
        this.remove()
        state = new Challenge0CompletedState()
        state.init()
        break
    }
  }

  initialMessageAppearing() {
    push()
    background(0)
    tint(255, this.opacityAppearing)
    image(challenge0Img, 0, 0, width, height)
    pop()

    if (this.opacityAppearingTween) return

    this.opacityAppearingTween = gsap.to(this, {
      opacityAppearing: 255,
      duration: Challenge0State.APPEARING_DURATION,
      ease: 'power2.out',
      onComplete: () => {
        this.initialMessageAppearingTimeout = setTimeout(() => {
          this.opacityAppearingTween && this.opacityAppearingTween.kill()
          this.opacityAppearingTween = null
          this.initialMessageAppearingTimeout && clearTimeout(this.initialMessageAppearingTimeout)
          this.initialMessageAppearingTimeout = null
          this.state = Challenge0States.INITIAL_MESSAGE_DISAPPEARING
        }, Challenge0State.DELAY_BEFORE_DISAPPEARING)
      }
    })
  }

  initialMessageDisappearing() {
    push()
    background(0)
    tint(255, this.opacityDisappearing)
    image(challenge0Img, 0, 0, width, height)
    pop()

    if (this.opacityDisappearingTween) return

    this.opacityDisappearingTween = gsap.to(this, {
      opacityDisappearing: 0,
      duration: Challenge0State.DISAPPEARING_DURATION,
      ease: 'power2.in',
      onComplete: () => {
        this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
        this.opacityDisappearingTween = null
        this.state = Challenge0States.GAMEPLAY
        this.countdown.start()
        detection.goToChallenge0State()
      }
    })
  }

  gameplay() {
    // aquí solo se muestran las siluetas y el shader
    this.countdown.draw()
  }

  remove() {
    this.opacityAppearingTween && this.opacityAppearingTween.kill()
    this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
    this.initialMessageAppearingTimeout && clearTimeout(this.initialMessageAppearingTimeout)
    this.initialMessageDisappearingTimeout && clearTimeout(this.initialMessageDisappearingTimeout)
    this.countdown.remove()
    gsap.killTweensOf(this)
  }
}