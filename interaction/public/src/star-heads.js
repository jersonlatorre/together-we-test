class StarHeads {
  constructor(effectsLayer) {
    this.effectsLayer = effectsLayer
    this.N = 12
    this.STAR_SIZE_RATIO = 0.25
    this.STAR_LINE_START_RATIO = 0.9
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
      const radius = head.shoulderDistance * scaledWidth * this.STAR_SIZE_RATIO

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
}
