class IntroState {
  constructor() {}

  init() {
    return true
  }

  remove() {
    return true
  }

  draw() {
    push()
    fill(0, 0, 0, 60)
    rect(0, 0, width, 40)

    fill('white')
    textFont(fontLexend)
    textSize(14)
    textAlign(CENTER)
    text('SI NOS MOVEMOS, DESCUBRIREMOS EL PODER DE NUESTRAS ACCIONES', width / 2, 25)
    pop()
  }
}
