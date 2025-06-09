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
  static SHAPE_APPEARING_DURATION = 1
  static SHAPE_DISAPPEARING_DURATION = 1
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

    // flags para evitar ejecuciones múltiples
    this.shapeAppearingStarted = false
    this.shapeDisappearingStarted = false
    this.initialMessageDisappearingStarted = false

    // countdown
    this.countdown = new Countdown({
      x: width - Challenge1State.TIMER_CIRCLE_OFFSET,
      y: Challenge1State.TIMER_CIRCLE_OFFSET,
      size: Challenge1State.TIMER_CIRCLE_SIZE,
      duration: Challenge1State.GAMEPLAY_DURATION,
      onComplete: () => {
        console.log('countdown completed, changing to SHAPE_DISAPPEARING')
        this.state = Challenge1States.SHAPE_DISAPPEARING
        this.shapeDisappearingStarted = false
      },
    })

    detection.goToInitStateWithNoDelay()

    this.init()
  }

  init() {
    this.state = Challenge1States.INITIAL_MESSAGE_APPEARING
    this.initialMessageDisappearingStarted = false
  }

  draw() {
    console.log('draw - current state:', this.state)
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
        return
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
  }

  initialMessageDisappearing() {
    push()
    tint(255, this.opacityDisappearing)
    image(challenge1Img, 0, 0, width, height)
    pop()

    if (this.opacityDisappearingTween) return

    if (this.initialMessageDisappearingStarted) {
      console.log('initialMessageDisappearing - already started, returning')
      return
    }

    this.initialMessageDisappearingStarted = true
    console.log('initialMessageDisappearing - setting started to true')

    this.opacityDisappearingTween = gsap.to(this, {
      opacityDisappearing: 0,
      duration: Challenge1State.DISAPPEARING_DURATION,
      onComplete: () => {
        this.opacityDisappearingTween && this.opacityDisappearingTween.kill()
        this.opacityDisappearingTween = null
        this.initialMessageDisappearingTimeout && clearTimeout(this.initialMessageDisappearingTimeout)
        this.initialMessageDisappearingTimeout = null
        detection.goToChallenge1State()
        console.log('initialMessageDisappearing - setting timeout for SHAPE_APPEARING')
        this.waitForShapeAppearingTimeout = setTimeout(() => {
          console.log('initialMessageDisappearing - timeout completed, changing to SHAPE_APPEARING')
          this.waitForShapeAppearingTimeout && clearTimeout(this.waitForShapeAppearingTimeout)
          this.waitForShapeAppearingTimeout = null
          this.state = Challenge1States.SHAPE_APPEARING
          this.shapeAppearingStarted = false
        }, 2000)
      },
    })
  }

  shapeAppearing() {
    console.log('shapeAppearing - started:', this.shapeAppearingStarted)
    push()
    stroke(226, 231, 213, 50)
    strokeWeight(40)
    line(this.shapeStartX, height * 0.3, this.shapeStartX + (this.shapeEndX - this.shapeStartX) * this.shapePercentage, height * 0.3)
    pop()

    if (this.shapeAppearingStarted) {
      console.log('shapeAppearing - already started, returning')
      return
    }

    this.shapeAppearingStarted = true
    console.log('shapeAppearing - setting started to true')

    this.shapePercentageTween = gsap.to(this, {
      shapePercentage: 1,
      duration: Challenge1State.SHAPE_APPEARING_DURATION,
      ease: 'power2.out',
      onStart: () => {
        console.log('shapeAppearing - tween onStart, playing sound')
        if (getAudioContext().state === 'running') {
          soundSwipe.play()
        }
      },
      onComplete: () => {
        console.log('shapeAppearing - tween onComplete')
        // activar interacción de star-heads cuando termine la animación de la línea
        detection.starHeads.canInteract = true
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
    strokeWeight(40)
    line(this.shapeStartX, height * 0.3, this.shapeEndX, height * 0.3)
    pop()

    this.countdown.draw()
  }

  shapeDisappearing() {
    console.log('shapeDisappearing - started:', this.shapeDisappearingStarted)
    push()
    stroke(226, 231, 213, 50)
    strokeWeight(40)
    line(this.shapeStartX, height * 0.3, this.shapeStartX + (this.shapeEndX - this.shapeStartX) * this.shapePercentage, height * 0.3)
    pop()

    if (this.shapeDisappearingStarted) {
      console.log('shapeDisappearing - already started, returning')
      return
    }

    this.shapeDisappearingStarted = true
    console.log('shapeDisappearing - setting started to true')

    // resetear tamaño de star-heads y desactivar interacción
    detection.starHeads.resetAllFactors()
    detection.starHeads.canInteract = false

    // tween para que la línea desaparezca
    this.shapePercentageTween = gsap.to(this, {
      shapePercentage: 0,
      duration: Challenge1State.SHAPE_DISAPPEARING_DURATION,
      ease: 'power2.inOut',
      onStart: () => {
        console.log('shapeDisappearing - tween onStart, playing sound')
        if (getAudioContext().state === 'running') {
          soundSwipeBack.play()
        }
      },
      onComplete: () => {
        console.log('shapeDisappearing - tween onComplete')
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
    detection.starHeads.resetAllFactors()
    detection.starHeads.canInteract = false
    gsap.killTweensOf(this)
    return true
  }
}
