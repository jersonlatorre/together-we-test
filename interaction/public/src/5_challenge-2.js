class Challenge2State {
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
    text('RETO 2/2:\nSI SOMOS MÁS, AMPLIFICAMOS NUESTRO IMPACTO', width / 2, height / 2)
    pop()
  }
}
