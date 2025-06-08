class LoadingState {
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
    image(loadingImg, 0, 0, width, height)
    pop()
  }
}
