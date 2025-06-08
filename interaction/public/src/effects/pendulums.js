class Pendulums {
  constructor(effectsLayer) {
    this.effectsLayer = effectsLayer
    this.pendulums = new Map()
  }

  draw(skeletonData, dimensions) {
    if (!this.effectsLayer || !skeletonData?.length) return

    // guardar los péndulos actuales
    const currentPendulums = new Map([...this.pendulums].filter(([_, pendulum]) => pendulum))

    this.pendulums.clear()

    for (const skeleton of skeletonData) {
      const kps = skeleton.keypoints
      if (!isValidSkeleton(kps)) continue

      const virtualPoints = calculateVirtualPoints(kps)
      if (!virtualPoints) continue

      // validar que el track_id sea válido
      const trackId = skeleton.track_id
      if (typeof trackId !== 'number' || trackId < 0) continue

      const coords = videoToCanvasCoords(virtualPoints.nape.x, virtualPoints.nape.y, dimensions)

      // calcular la distancia entre hombros en píxeles
      const shoulderDistance = calculateShoulderDistance(kps)
      const scaledShoulderDistance = shoulderDistance * dimensions.scaledWidth

      // calcular la longitud del péndulo basada en la distancia entre hombros
      const length = scaledShoulderDistance * 0.4

      // reutilizar el péndulo existente o crear uno nuevo
      let pendulum = currentPendulums.get(trackId) || new Pendulum(length, this.effectsLayer)
      pendulum.length = length
      pendulum.update({ x: coords.x, y: coords.y })

      this.pendulums.set(trackId, pendulum)
    }

    this.effectsLayer.clear()

    for (const pendulum of this.pendulums.values()) {
      pendulum.draw()
    }

    push()
    image(this.effectsLayer, 0, 0)
    pop()
  }

  clear() {
    this.pendulums.clear()
  }
}

class Pendulum {
  constructor(length, effectsLayer) {
    this.length = length
    this.effectsLayer = effectsLayer
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
    this.effectsLayer.push()
    this.effectsLayer.stroke(255, 255, 255, 100)
    this.effectsLayer.strokeWeight(2)
    this.effectsLayer.line(this.anchor.x, this.anchor.y, this.bob.x, this.bob.y)
    this.effectsLayer.noStroke()
    this.effectsLayer.fill('#5555aa88')
    this.effectsLayer.circle(this.bob.x, this.bob.y, this.length * 0.2)
    this.effectsLayer.pop()
  }
}
