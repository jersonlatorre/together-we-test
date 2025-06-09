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
      y1: height * 0.3,
      x2: width - 300,
      y2: height * 0.3,
    }
    // array para almacenar el factor de cada cabeza
    this.headFactors = []
    this.tweenSpeed = 0.1
    this.canInteract = false

    // efectos de alineación múltiple
    this.alignedHeads = []
    this.connectionOpacity = 0
    this.resonanceEffect = 0
    this.particles = []
    this.maxParticles = 50

    // colores progresivos
    this.alignmentColors = [
      [226, 231, 213], // 1 cabeza - #E2E7D5 (gris claro)
      [208, 238, 5], // 2 cabezas - #D0EE05 (verde lima)
      [0, 255, 79], // 3 cabezas - #00FF4F (verde brillante)
      [228, 108, 240], // 4+ cabezas - #E46CF0 (magenta)
    ]
  }

  draw(headData, dimensions) {
    if (!this.effectsLayer || !headData?.length) return

    const { scaledWidth, scaledHeight, x, y } = dimensions

    // asegurar que tenemos suficientes factores para todas las cabezas
    while (this.headFactors.length < headData.length) {
      this.headFactors.push({ current: 1, target: 1 })
    }

    // remover factores sobrantes si hay menos cabezas
    if (this.headFactors.length > headData.length) {
      this.headFactors = this.headFactors.slice(0, headData.length)
    }

    this.effectsLayer.clear()
    this.effectsLayer.push()
    this.effectsLayer.noFill()
    this.effectsLayer.stroke(255, 255, 255, 100)

    // detectar cabezas alineadas y calcular efectos
    this.alignedHeads = []
    for (let i = 0; i < headData.length; i++) {
      const head = headData[i]
      const coords = this.calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y)

      if (this.canInteract) {
        const distance = this.distanceToSegment(coords[0], coords[1], this.segment.x1, this.segment.y1, this.segment.x2, this.segment.y2)
        const isAligned = distance < 50
        this.headFactors[i].target = isAligned ? 4 : 1

        if (isAligned) {
          this.alignedHeads.push({ coords, index: i })
        }
      } else {
        this.headFactors[i].target = 1
      }

      // interpolar el factor actual hacia el objetivo para esta cabeza específica
      this.headFactors[i].current = lerp(this.headFactors[i].current, this.headFactors[i].target, this.tweenSpeed)
    }

    // calcular efectos basados en número de cabezas alineadas
    const alignedCount = this.alignedHeads.length
    this.connectionOpacity = lerp(this.connectionOpacity, alignedCount > 1 ? 255 : 0, 0.1)
    this.resonanceEffect = lerp(this.resonanceEffect, alignedCount * 0.3, 0.05)

    // generar partículas cuando hay múltiples alineadas
    if (alignedCount > 2 && this.particles.length < this.maxParticles) {
      this.generateParticles()
    }

    // dibujar conexiones entre cabezas alineadas
    if (alignedCount > 1) {
      this.drawConnections()
    }

    // dibujar partículas
    this.updateAndDrawParticles()

    // dibujar cabezas con efectos progresivos
    for (let i = 0; i < headData.length; i++) {
      const head = headData[i]
      const coords = this.calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y)
      const radius = 20 * this.headFactors[i].current

      // color progresivo basado en número de alineadas
      const colorIndex = Math.min(alignedCount - 1, this.alignmentColors.length - 1)
      const color = alignedCount > 0 ? this.alignmentColors[colorIndex] : [255, 255, 255]

      // efecto de resonancia
      const resonanceRadius = radius + sin(frameCount * 0.2 + i) * this.resonanceEffect * 5

      // dibuja el círculo central con color progresivo
      this.effectsLayer.noStroke()
      this.effectsLayer.fill(color[0], color[1], color[2])
      this.effectsLayer.circle(coords[0], coords[1], 20 * (this.headFactors[i].current - 1))

      // configurar stroke para las líneas de la estrella
      this.effectsLayer.noFill()
      this.effectsLayer.stroke(color[0], color[1], color[2], 100)

      // dibujar estrella con resonancia
      for (let j = 0; j < this.N; j++) {
        const angle = (2 * (j * PI)) / this.N
        const cosAngle = cos(angle)
        const sinAngle = sin(angle)

        const endX = coords[0] + cosAngle * resonanceRadius
        const endY = coords[1] + sinAngle * resonanceRadius
        const startX = coords[0] + cosAngle * (resonanceRadius * this.STAR_LINE_START_RATIO)
        const startY = coords[1] + sinAngle * (resonanceRadius * this.STAR_LINE_START_RATIO)

        this.effectsLayer.strokeWeight(sqrt(resonanceRadius) * 0.6)
        this.effectsLayer.line(startX, startY, endX, endY)
      }
    }

    this.effectsLayer.drawingContext.setLineDash([])
    this.effectsLayer.pop()
    image(this.effectsLayer, 0, 0)
  }

  drawConnections() {
    // calcular grosor basado en número de cabezas alineadas
    const alignedCount = this.alignedHeads.length
    const baseConnectionWeight = 2
    const maxConnectionWeight = 8
    const connectionWeight = Math.min(baseConnectionWeight + alignedCount * 1, maxConnectionWeight)

    this.effectsLayer.stroke(255, 255, 255, this.connectionOpacity * 0.8)
    this.effectsLayer.strokeWeight(connectionWeight)

    // conectar cabezas alineadas consecutivas
    for (let i = 0; i < this.alignedHeads.length - 1; i++) {
      const head1 = this.alignedHeads[i]
      const head2 = this.alignedHeads[i + 1]

      // línea ondulante entre cabezas
      const steps = 20
      this.effectsLayer.noFill()
      this.effectsLayer.beginShape()
      for (let j = 0; j <= steps; j++) {
        const t = j / steps
        const x = lerp(head1.coords[0], head2.coords[0], t)
        const y = lerp(head1.coords[1], head2.coords[1], t) + sin(t * PI * 2 + frameCount * 0.1) * 10
        this.effectsLayer.vertex(x, y)
      }
      this.effectsLayer.endShape()
    }
  }

  generateParticles() {
    if (this.alignedHeads.length === 0) return

    // generar partícula desde una cabeza alineada aleatoria
    const randomHead = this.alignedHeads[Math.floor(Math.random() * this.alignedHeads.length)]

    this.particles.push({
      x: randomHead.coords[0],
      y: randomHead.coords[1],
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1.0,
      decay: 0.02,
      size: Math.random() * 6 + 2,
    })
  }

  updateAndDrawParticles() {
    this.effectsLayer.noStroke()

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      // actualizar posición
      p.x += p.vx
      p.y += p.vy
      p.life -= p.decay

      // dibujar partícula
      const alpha = p.life * 255
      this.effectsLayer.fill(255, 255, 255, alpha)
      this.effectsLayer.circle(p.x, p.y, p.size * p.life)

      // remover partículas muertas
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  // método para resetear todos los factores a 1
  resetAllFactors() {
    for (const factor of this.headFactors) {
      factor.target = 1
    }
    this.alignedHeads = []
    this.connectionOpacity = 0
    this.resonanceEffect = 0
    this.particles = []
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
