class IntroState {
  static INTRO_DURATION = 10

  constructor() {
    this.startTime = millis()
    this.fadeOpacity = 255
    this.fadeOpacityTween = null
    this.init()
  }

  init() {
    this.fadeOpacityTween = gsap.to(this, {
      fadeOpacity: 0,
      duration: 1,
      ease: 'none'
    })
  }

  remove() {
    if (this.fadeOpacityTween) {
      this.fadeOpacityTween.kill()
    }
  }

  draw() {
    push()
    tint(255, 255)
    image(introImg, 0, 0, width, height)
    pop()
    
    fill(0, this.fadeOpacity)
    rect(0, 0, width, height)

    // verificar si han pasado 10 segundos
    if (millis() - this.startTime >= IntroState.INTRO_DURATION * 1000) {
      state = new CountDown1State()
      state.init()
    }
  }
}
