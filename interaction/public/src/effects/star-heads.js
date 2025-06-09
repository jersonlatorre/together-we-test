class StarHeadsState {
  static APPEARING = 0
  static CHALLENGE = 1
  static DISAPPEARING = 2
}

class StarHeads {
  constructor(effectsLayer) {
    this.effectsLayer = effectsLayer
    this.N = 12
    this.STAR_SIZE_RATIO = 0.25
    this.STAR_LINE_START_RATIO = 0.9
    this.segment = {
      x1: 300,
      y1: height / 2,
      x2: width - 300,
      y2: height / 2,
    }
    this.currentFactor = 1
    this.targetFactor = 1
    this.tweenSpeed = 0.1
  }

  draw(headData, dimensions) {
    if (!this.effectsLayer || !headData?.length) return

    const { scaledWidth, scaledHeight, x, y } = dimensions

    this.effectsLayer.clear()
    this.effectsLayer.push()
    this.effectsLayer.noFill()
    this.effectsLayer.stroke(255, 255, 255, 100)

    for (const head of headData) {
      const coords = this.calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y)
      const distance = this.distanceToSegment(coords[0], coords[1], this.segment.x1, this.segment.y1, this.segment.x2, this.segment.y2)
      this.targetFactor = distance < 50 ? 4 : 1
      this.currentFactor = lerp(this.currentFactor, this.targetFactor, this.tweenSpeed)
      const radius = 20 * this.currentFactor

      // dibuja el círculo central
      this.effectsLayer.fill(255)
      this.effectsLayer.noStroke()
      this.effectsLayer.circle(coords[0], coords[1], 20 * (this.currentFactor - 1))
      this.effectsLayer.noFill()
      this.effectsLayer.stroke(255, 255, 255, 100)

      for (let i = 0; i < this.N; i++) {
        const angle = (2 * (i * PI)) / this.N
        const cosAngle = cos(angle)
        const sinAngle = sin(angle)

        const endX = coords[0] + cosAngle * radius
        const endY = coords[1] + sinAngle * radius
        const startX = coords[0] + cosAngle * (radius * this.STAR_LINE_START_RATIO)
        const startY = coords[1] + sinAngle * (radius * this.STAR_LINE_START_RATIO)

        this.effectsLayer.strokeWeight(sqrt(radius) * 0.6)
        this.effectsLayer.line(startX, startY, endX, endY)
      }
    }

    this.effectsLayer.drawingContext.setLineDash([])
    this.effectsLayer.pop()
    image(this.effectsLayer, 0, 0)
  }

  calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y) {
    return [head.x * scaledWidth + x, head.y * scaledHeight + y]
  }

  distanceToSegment(x, y, x1, y1, x2, y2) {
    // calcula la distancia al cuadrado del segmento
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSquared = dx * dx + dy * dy

    // si el segmento es un punto, retorna la distancia al punto
    if (lengthSquared === 0) {
      return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
    }

    // calcula la proyección del punto sobre el segmento
    const t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared))
    const projectionX = x1 + t * dx
    const projectionY = y1 + t * dy

    // retorna la distancia al punto proyectado
    return sqrt((x - projectionX) * (x - projectionX) + (y - projectionY) * (y - projectionY))
  }
}
