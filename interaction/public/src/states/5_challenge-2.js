const Challenge2States = {
  INITIAL_MESSAGE_APPEARING: 0,
  INITIAL_MESSAGE_DISAPPEARING: 1,
  SHAPE_APPEARING: 2,
  GAMEPLAY: 3,
  COMPLETED: 4,
}

class Challenge2State {
  static APPEARING_DURATION = 0.5 // 1
  static DISAPPEARING_DURATION = 0.5 // 1
  static SHAPE_APPEARING_DURATION = 0.5 // 3
  static DELAY_BEFORE_DISAPPEARING = 200 // 1000
  static DELAY_BEFORE_SHAPE_APPEARING = 200 // 1000
  static GAMEPLAY_DURATION = 5 // 1
  static TIMER_CIRCLE_SIZE = 60
  static TIMER_CIRCLE_OFFSET = 60
  static CIRCLE_MAX_SIZE = 600

  constructor() {
    // state
    this.state = null
    this.circleSize = 0

    // values
    this.opacityAppearing = 0
    this.opacityDisappearing = 255
    this.angle = 360
    this.timerTween = null
    this.timerOpacity = 0

    // tweens
    this.opacityAppearingTween = null
    this.opacityDisappearingTween = null
    this.circleSizeTween = null
    this.timerOpacityTween = null

    // timeouts
    this.initialMessageAppearingTimeout = null
    this.initialMessageDisappearingTimeout = null
    this.circleSizeTimeout = null

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
      case Challenge2States.SHAPE_APPEARING:
        this.shapeAppearing()
        break
      case Challenge2States.GAMEPLAY:
        this.gameplay()
        break
      case Challenge2States.COMPLETED:
        this.completed()
        break
    }
  }

  initialMessageAppearing() {
    push()
    background(0)
    tint(255, this.opacityAppearing)
    image(challenge2Img, 0, 0, width, height)
    pop()

    if (this.opacityAppearingTween) return

    this.opacityAppearingTween = gsap.to(this, {
      opacityAppearing: 255,
      duration: Challenge1State.APPEARING_DURATION,
      onComplete: () => {
        this.initialMessageTimeout = setTimeout(() => {
          this.opacityAppearingTween && this.opacityAppearingTween.kill()
          this.opacityAppearingTween = null
          this.initialMessageAppearingTimeout && clearTimeout(this.initialMessageAppearingTimeout)
          this.initialMessageAppearingTimeout = null
          this.state = Challenge2States.INITIAL_MESSAGE_DISAPPEARING
        }, Challenge1State.DELAY_BEFORE_DISAPPEARING)
      },
    })
    return true
  }

  initialMessageDisappearing() {
    push()
    tint(255, this.opacityDisappearing)
    image(challenge2Img, 0, 0, width, height)
    pop()

    if (this.opacityDisappearingTween) return

    this.opacityDisappearingTween = gsap.to(this, {
      opacityDisappearing: 0,
      duration: Challenge1State.DISAPPEARING_DURATION,
      onComplete: () => {
        this.initialMessageDisappearingTimeout = setTimeout(() => {
          this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
          this.opacityDisappearingTween = null
          this.initialMessageDisappearingTimeout && clearTimeout(this.initialMessageDisappearingTimeout)
          this.initialMessageDisappearingTimeout = null
          this.state = Challenge2States.SHAPE_APPEARING
        }, Challenge1State.DELAY_BEFORE_SHAPE_APPEARING)
      },
    })
  }

  shapeAppearing() {
    push()
    fill(226, 231, 213, 50)
    noStroke()
    circle(width / 2, height / 2, this.circleSize)
    pop()

    // timer circle
    push()
    translate(width - Challenge1State.TIMER_CIRCLE_OFFSET, Challenge1State.TIMER_CIRCLE_OFFSET)
    fill(0, 255, 79, this.timerOpacity)
    noStroke()
    circle(0, 0, Challenge1State.TIMER_CIRCLE_SIZE)
    pop()

    if (this.circleSizeTween) return

    this.circleSizeTween = gsap.to(this, {
      circleSize: Challenge2State.CIRCLE_MAX_SIZE,
      duration: Challenge1State.SHAPE_APPEARING_DURATION,
      ease: 'power2.out',
      onComplete: () => {
        this.circleSizeTween && this.circleSizeTween.kill()
        this.circleSizeTween = null
        this.circleSizeTimeout && clearTimeout(this.circleSizeTimeout)
        this.circleSizeTimeout = null
        this.state = Challenge2States.GAMEPLAY
      },
    })

    if (!this.timerOpacityTween) {
      this.timerOpacityTween = gsap.to(this, {
        timerOpacity: 255,
        duration: Challenge1State.SHAPE_APPEARING_DURATION,
        ease: 'power2.out',
      })
    }
  }

  gameplay() {
    push()
    fill(226, 231, 213, 50)
    noStroke()
    circle(width / 2, height / 2, Challenge2State.CIRCLE_MAX_SIZE)
    pop()

    // timer
    push()
    translate(width - Challenge1State.TIMER_CIRCLE_OFFSET, Challenge1State.TIMER_CIRCLE_OFFSET)
    scale(-1, 1)
    fill('#00FF4F')
    noStroke()
    arc(0, 0, Challenge1State.TIMER_CIRCLE_SIZE, Challenge1State.TIMER_CIRCLE_SIZE, -HALF_PI, radians(this.angle - 90), PIE)
    pop()

    if (!this.timerTween) {
      this.timerTween = gsap.to(this, {
        angle: 0,
        duration: Challenge1State.GAMEPLAY_DURATION,
        ease: 'none',
        onComplete: () => {
          this.timerTween && this.timerTween.kill()
          this.timerTween = null
          this.state = Challenge2States.COMPLETED
        },
      })
    }
  }

  completed() {}

  remove() {
    this.opacityAppearingTween && this.opacityAppearingTween.kill()
    this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
    this.timerTween && this.timerTween.kill()
    this.timerOpacityTween && this.timerOpacityTween.kill()
    this.initialMessageAppearingTimeout && clearTimeout(this.initialMessageAppearingTimeout)
    this.initialMessageDisappearingTimeout && clearTimeout(this.initialMessageDisappearingTimeout)
    gsap.killTweensOf(this)
    return true
  }
}
