const Challenge1States = {
  INITIAL_MESSAGE_APPEARING: 0,
  INITIAL_MESSAGE_DISAPPEARING: 1,
  SHAPE_APPEARING: 2,
  GAMEPLAY: 3,
  SHAPE_DISAPPEARING: 4,
  COMPLETED: 5,
}

class Challenge1State {
  static APPEARING_DURATION = 2
  static DISAPPEARING_DURATION = 1
  static SHAPE_APPEARING_DURATION = 3
  static SHAPE_DISAPPEARING_DURATION = 2
  static DELAY_BEFORE_DISAPPEARING = 1000
  static DELAY_BEFORE_SHAPE_APPEARING = 1000
  static GAMEPLAY_DURATION = 10
  static TIMER_CIRCLE_SIZE = 60
  static TIMER_CIRCLE_OFFSET = 60

  constructor() {
    // state
    this.state = null
    this.shapeStartX = 300
    this.shapeEndX = width - 300

    // values
    this.opacityAppearing = 0
    this.opacityDisappearing = 255
    this.shapePercentage = 0

    // tweens
    this.opacityAppearingTween = null
    this.opacityDisappearingTween = null
    this.shapePercentageTween = null

    // timeouts
    this.initialMessageAppearingTimeout = null
    this.initialMessageDisappearingTimeout = null
    this.shapePercentageTimeout = null
    this.waitForShapeAppearingTimeout = null

    // countdown
    this.countdown = new Countdown({
      x: width - Challenge1State.TIMER_CIRCLE_OFFSET,
      y: Challenge1State.TIMER_CIRCLE_OFFSET,
      size: Challenge1State.TIMER_CIRCLE_SIZE,
      duration: Challenge1State.GAMEPLAY_DURATION,
      onComplete: () => {
        this.state = Challenge1States.SHAPE_DISAPPEARING
      },
    })

    detection.goToInitStateWithNoDelay()

    this.init()
  }

  init() {
    this.state = Challenge1States.INITIAL_MESSAGE_APPEARING
  }

  draw() {
    switch (this.state) {
      case Challenge1States.INITIAL_MESSAGE_APPEARING:
        this.initialMessageAppearing()
        break
      case Challenge1States.INITIAL_MESSAGE_DISAPPEARING:
        this.initialMessageDisappearing()
        break
      case Challenge1States.SHAPE_APPEARING:
        this.shapeAppearing()
        break
      case Challenge1States.GAMEPLAY:
        this.gameplay()
        break
      case Challenge1States.SHAPE_DISAPPEARING:
        this.shapeDisappearing()
        break
      case Challenge1States.COMPLETED:
        state.remove()
        state = new Challenge1CompletedState()
        state.init()
        break
    }
  }

  initialMessageAppearing() {
    push()
    background(0)
    tint(255, this.opacityAppearing)
    image(challenge1Img, 0, 0, width, height)
    pop()

    if (this.opacityAppearingTween) return

    this.opacityAppearingTween = gsap.to(this, {
      opacityAppearing: 255,
      duration: Challenge1State.APPEARING_DURATION,
      onComplete: () => {
        this.initialMessageAppearingTimeout = setTimeout(() => {
          this.opacityAppearingTween && this.opacityAppearingTween.kill()
          this.opacityAppearingTween = null
          this.initialMessageAppearingTimeout && clearTimeout(this.initialMessageAppearingTimeout)
          this.initialMessageAppearingTimeout = null
          this.state = Challenge1States.INITIAL_MESSAGE_DISAPPEARING
        }, Challenge1State.DELAY_BEFORE_DISAPPEARING)
      },
    })
    return true
  }

  initialMessageDisappearing() {
    push()
    tint(255, this.opacityDisappearing)
    image(challenge1Img, 0, 0, width, height)
    pop()

    if (this.opacityDisappearingTween) return

    this.opacityDisappearingTween = gsap.to(this, {
      opacityDisappearing: 0,
      duration: Challenge1State.DISAPPEARING_DURATION,
      onComplete: () => {
        this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
        this.opacityDisappearingTween = null
        this.initialMessageDisappearingTimeout && clearTimeout(this.initialMessageDisappearingTimeout)
        this.initialMessageDisappearingTimeout = null
        detection.goToChallenge1State()
        this.waitForShapeAppearingTimeout = setTimeout(() => {
          this.waitForShapeAppearingTimeout && clearTimeout(this.waitForShapeAppearingTimeout)
          this.waitForShapeAppearingTimeout = null
          this.state = Challenge1States.SHAPE_APPEARING
        }, 2000)
      },
    })
  }

  shapeAppearing() {
    push()
    stroke(226, 231, 213, 50)
    strokeWeight(50)
    line(this.shapeStartX, height / 2, this.shapeStartX + (this.shapeEndX - this.shapeStartX) * this.shapePercentage, height / 2)
    pop()

    if (this.shapePercentageTween) return

    // tween para que la línea aparezca
    this.shapePercentageTween = gsap.to(this, {
      shapePercentage: 1,
      duration: Challenge1State.SHAPE_APPEARING_DURATION,
      ease: 'power2.out',
      onComplete: () => {
        this.countdown.start()
        this.shapePercentageTween && this.shapePercentageTween.kill()
        this.shapePercentageTween = null
        this.shapePercentageTimeout && clearTimeout(this.shapePercentageTimeout)
        this.shapePercentageTimeout = null
        this.state = Challenge1States.GAMEPLAY
      },
    })
  }

  gameplay() {
    push()
    stroke(226, 231, 213, 50)
    strokeWeight(50)
    line(this.shapeStartX, height / 2, this.shapeEndX, height / 2)
    pop()

    this.countdown.draw()
  }

  shapeDisappearing() {
    push()
    stroke(226, 231, 213, 50)
    strokeWeight(50)
    line(this.shapeStartX, height / 2, this.shapeStartX + (this.shapeEndX - this.shapeStartX) * this.shapePercentage, height / 2)
    pop()

    if (this.shapePercentageTween) return

    this.shapePercentageTween = gsap.to(this, {
      shapePercentage: 0,
      duration: Challenge1State.SHAPE_DISAPPEARING_DURATION,
      ease: 'power2.in',
      onComplete: () => {
        this.shapePercentageTween && this.shapePercentageTween.kill()
        this.shapePercentageTween = null
        this.state = Challenge1States.COMPLETED
      },
    })
  }

  remove() {
    this.opacityAppearingTween && this.opacityAppearingTween.kill()
    this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
    this.shapePercentageTween && this.shapePercentageTween.kill()
    this.initialMessageAppearingTimeout && clearTimeout(this.initialMessageAppearingTimeout)
    this.initialMessageDisappearingTimeout && clearTimeout(this.initialMessageDisappearingTimeout)
    this.waitForShapeAppearingTimeout && clearTimeout(this.waitForShapeAppearingTimeout)
    this.shapePercentageTimeout && clearTimeout(this.shapePercentageTimeout)
    this.countdown.remove()
    gsap.killTweensOf(this)
    return true
  }
}
