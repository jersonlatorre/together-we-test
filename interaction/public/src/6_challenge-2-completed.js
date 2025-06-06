class Challenge2CompletedState {
  constructor() {
    this.count = 5
    this.lastUpdate = millis()
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
    fill(0, 0, 0, 180)
    rect(0, 0, width, height)

    fill('#E2E7D5')
    textFont(fontLexend)
    textSize(20)
    textAlign(CENTER)
    text('¡LO LOGRAMOS! \nESTAMOS LISTOS PARA DAR EL SIGUIENTE PASO', width / 2, height / 2 - 30)
    textSize(14)
    text('Visita la Próxima Sala', width / 2, height / 2 + 30)
    pop()

    // decrementar contador cada segundo
    const currentTime = millis()
    if (currentTime - this.lastUpdate >= 1000) {
      this.count = max(0, this.count - 1)
      this.lastUpdate = currentTime
    }
  }
}
