class Challenge1CompletedState {
  constructor() {
    this.count = 5
    this.lastUpdate = millis()
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

    fill('white')
    textFont(fontLexend)
    textSize(20)
    textAlign(CENTER)
    text('¡LO LOGRAMOS! \n¿QUÉ PASARÍA SI SEGUIMOS TRABAJANDO JUNTOS?', width / 2, height / 2 - 30)
    text(this.count, width / 2, height / 2 + 30)
    pop()

    // decrementar contador cada segundo
    const currentTime = millis()
    if (currentTime - this.lastUpdate >= 1000) {
      this.count = max(0, this.count - 1)
      this.lastUpdate = currentTime
    }
  }
}
