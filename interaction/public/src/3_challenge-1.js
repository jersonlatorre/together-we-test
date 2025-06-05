class Challenge1State {
  constructor() {}

  init() {
    return true
  }

  remove() {
    return true
  }

  draw() {
    push()
    fill(0, 0, 0, 180)
    rect(0, 0, width, height)

    fill('white')
    textFont(fontLexend)
    textSize(20)
    textAlign(CENTER)
    text('RETO 1/2:\nSI NOS ALINEAMOS, CUMPLIREMOS NUESTROS OBJETIVOS', width / 2, height / 2)
    pop()
  }
}
