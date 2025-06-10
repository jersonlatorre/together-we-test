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
    // array para almacenar el factor de cada cabeza
    this.headFactors = []
    this.tweenSpeed = 0.1
    this.canInteract = false
    // array para rastrear qué cabezas ya han sonado
    this.soundedHeads = []
    // array para almacenar los osciladores
    this.oscillators = []
    // notas del acorde de Fa mayor en tres octavas (en Hz)
    this.pentatonicNotes = [
      174.61,
      220.0,
      261.63, // F3, A3, C4 (octava baja)
      349.23,
      440.0,
      523.25, // F4, A4, C5 (octava media)
    ]

    // efectos de alineación múltiple
    this.alignedHeads = []
    this.resonanceEffect = 0
    this.particleSystem = new ParticleSystem()

    // colores progresivos
    this.alignmentColors = [
      [226, 231, 213], // 1 cabeza - #E2E7D5 (gris claro)
      [208, 238, 5], // 2 cabezas - #D0EE05 (verde lima)
      [0, 255, 79], // 3 cabezas - #00FF4F (verde brillante)
      [228, 108, 240], // 4+ cabezas - #E46CF0 (magenta)
    ]

    // vibración para cabezas alineadas
    this.vibrationIntensity = 0.15
    this.vibrationSpeed = 1.2
  }

  draw(headData, dimensions) {
    if (!this.effectsLayer || !headData?.length) return

    const { scaledWidth, scaledHeight, x, y } = dimensions

    // asegurar que tenemos suficientes factores para todas las cabezas
    while (this.headFactors.length < headData.length) {
      this.headFactors.push({ current: 1, target: 1 })
      // crear un nuevo oscilador para cada cabeza
      const osc = new p5.Oscillator('sine')
      osc.amp(0.3) // volumen al 30%
      this.oscillators.push(osc)
    }

    // remover factores sobrantes si hay menos cabezas
    if (this.headFactors.length > headData.length) {
      this.headFactors = this.headFactors.slice(0, headData.length)
      this.soundedHeads = this.soundedHeads.slice(0, headData.length)
      // detener y remover osciladores sobrantes
      for (let i = headData.length; i < this.oscillators.length; i++) {
        this.oscillators[i].stop()
      }
      this.oscillators = this.oscillators.slice(0, headData.length)
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
        const distance = this.distanceToSegment(coords[0], coords[1], 300, height * 0.3, width - 300, height * 0.3)
        const isAligned = distance < 50
        this.headFactors[i].target = isAligned ? 4 : 1

        if (isAligned) {
          this.alignedHeads.push({ coords, index: i })
          // emitir partículas desde la cabeza alineada
          this.particleSystem.emitFromAlignedHead(coords[0], coords[1])
          // reproducir nota solo si la cabeza no ha sonado antes
          if (!this.soundedHeads[i] && getAudioContext().state === 'running') {
            const randomIndex = Math.floor(Math.random() * this.pentatonicNotes.length)
            const note = this.pentatonicNotes[randomIndex]
            this.oscillators[i].freq(note)
            this.oscillators[i].start()
            this.soundedHeads[i] = true
          }
        } else {
          // detener el oscilador cuando la cabeza sale del área
          this.oscillators[i].stop()
          this.soundedHeads[i] = false
        }
      } else {
        this.headFactors[i].target = 1
      }

      // interpolar el factor actual hacia el objetivo para esta cabeza específica
      this.headFactors[i].current = lerp(this.headFactors[i].current, this.headFactors[i].target, this.tweenSpeed)
    }

    // calcular efectos basados en número de cabezas alineadas
    const alignedCount = this.alignedHeads.length
    this.resonanceEffect = lerp(this.resonanceEffect, alignedCount * 0.3, 0.05)

    // actualizar y dibujar partículas
    this.particleSystem.update()
    this.particleSystem.draw()

    // dibujar cabezas con efectos progresivos
    for (let i = 0; i < headData.length; i++) {
      const head = headData[i]
      const coords = this.calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y)

      const radius = 20 * this.headFactors[i].current

      // color progresivo basado en número de alineadas
      const colorIndex = Math.min(alignedCount - 1, this.alignmentColors.length - 1)
      const color = alignedCount > 0 ? this.alignmentColors[colorIndex] : [255, 255, 255]

      // efecto de resonancia y vibración
      const isAligned = this.alignedHeads.some((alignedHead) => alignedHead.index === i)
      const vibrationFactor = isAligned ? sin(frameCount * this.vibrationSpeed + i * 2) * this.vibrationIntensity : 0
      const resonanceRadius = radius + sin(frameCount * 0.2 + i) * this.resonanceEffect * 5
      const finalRadius = resonanceRadius * (1 + vibrationFactor)

      // dibuja el círculo central con color progresivo
      this.effectsLayer.noStroke()
      this.effectsLayer.fill(color[0], color[1], color[2])
      this.effectsLayer.circle(coords[0], coords[1], 20 * (this.headFactors[i].current - 1))

      // configurar stroke para las líneas de la estrella
      this.effectsLayer.noFill()
      this.effectsLayer.stroke(color[0], color[1], color[2], 100)
      this.effectsLayer.strokeWeight(2)

      // dibujar estrella con resonancia y vibración
      for (let j = 0; j < this.N; j++) {
        const angle = (2 * (j * PI)) / this.N
        const cosAngle = cos(angle)
        const sinAngle = sin(angle)

        const endX = coords[0] + cosAngle * finalRadius
        const endY = coords[1] + sinAngle * finalRadius
        const startX = coords[0] + cosAngle * (finalRadius * this.STAR_LINE_START_RATIO)
        const startY = coords[1] + sinAngle * (finalRadius * this.STAR_LINE_START_RATIO)

        this.effectsLayer.strokeWeight(sqrt(finalRadius) * 0.6)
        this.effectsLayer.line(startX, startY, endX, endY)
      }
    }

    this.effectsLayer.drawingContext.setLineDash([])
    this.effectsLayer.pop()
    image(this.effectsLayer, 0, 0)
  }

  resetAllFactors() {
    for (const factor of this.headFactors) {
      factor.target = 1
    }
    this.alignedHeads = []
    this.resonanceEffect = 0
    this.particleSystem.clear()
    this.soundedHeads = []
    // detener todos los osciladores
    for (const osc of this.oscillators) {
      osc.stop()
    }
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
