class CountDown1State {
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
    background('black')
    fill('white')
    textSize(30)
    textFont(fontLexend)
    textAlign(CENTER)
    text('¿ESTÁS LISTO PARA ACCIONAR?', width / 2, height / 2 - 30)
    text(this.count, width / 2, height / 2 + 30)

    // decrementar contador cada segundo
    const currentTime = millis()
    if (currentTime - this.lastUpdate >= 1000) {
      this.count = max(0, this.count - 1)
      this.lastUpdate = currentTime
    }
  }
}
