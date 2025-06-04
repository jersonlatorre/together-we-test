class Pendulum {
  constructor(length) {
    this.length = length
    this.damping = 0.9
    this.gravity = 8
    this.anchor = { x: 0, y: 0 }
    this.bob = { x: 0, y: 0 }
    this.prevBob = { x: 0, y: 0 }
    this.initialized = false

    // Crear array de puntos para efectos visuales
    this.points = Array(10)
      .fill(0)
      .map(() => ({ x: random(-1, 1), y: random(-1, 1) }))
  }

  update(anchor) {
    this.anchor = anchor

    if (!this.initialized) {
      this.bob.x = anchor.x
      this.bob.y = anchor.y + this.length
      this.prevBob = { ...this.bob }
      this.initialized = true
      return
    }

    // Calcular velocidad basada en posición anterior
    const vx = (this.bob.x - this.prevBob.x) * this.damping
    const vy = (this.bob.y - this.prevBob.y) * this.damping

    // Guardar posición actual como anterior
    this.prevBob = { ...this.bob }

    // Aplicar velocidad y gravedad
    this.bob.x += vx
    this.bob.y += vy + this.gravity

    // Restricción de distancia (péndulo)
    const dx = this.bob.x - this.anchor.x
    const dy = this.bob.y - this.anchor.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Ajustar posición para mantener longitud fija
    const angle = Math.atan2(dy, dx)
    this.bob.x = this.anchor.x + Math.cos(angle) * this.length
    this.bob.y = this.anchor.y + Math.sin(angle) * this.length
  }

  draw() {
    // Dibujar el círculo del péndulo
    noStroke()
    fill('#5555aa88')
    circle(this.bob.x, this.bob.y, this.length * 0.5)
  }
}
