class IntroState {
  constructor() {
    this.init()
  }

  init() {
    return true
  }

  remove() {
    return true
  }

  draw() {
    push()
    image(introImg, 0, 0, width, height)
    pop()
  }
}
