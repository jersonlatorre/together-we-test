class MSTGraph {
  constructor(effectsLayer) {
    this.effectsLayer = effectsLayer
    this.edges = []
    this.vertices = []
    this.randomPoints = []
    this.screenOffset = 200
    this.minDistance = 150
    
    // fade in properties
    this.opacity = 0
    this.fadeInTween = null
  }

  generateRandomPoints() {
    this.randomPoints = []

    const pds = new PoissonDiskSampling({
      shape: [width - this.screenOffset * 2, height - this.screenOffset * 2],
      minDistance: this.minDistance,
      tries: 30,
    })

    const poissonPoints = pds.fill()

    // pre-calcular valores constantes
    const radiusBase = 20
    const radiusRange = 60
    const speedMultiplier = 0.08
    const twoPi = Math.PI * 2

    for (const point of poissonPoints) {
      this.randomPoints.push({
        centerX: point[0] + this.screenOffset,
        centerY: point[1] + this.screenOffset,
        radius: radiusBase + Math.random() * radiusRange,
        angle: Math.random() * twoPi,
        speed: (Math.random() - 0.5) * speedMultiplier,
        currentX: 0,
        currentY: 0,
      })
    }
  }

  startFadeIn() {
    this.fadeInTween?.kill()
    this.fadeInTween = gsap.to(this, {
      opacity: 1,
      duration: 2,
      ease: 'power2.out'
    })
  }

  resetOpacity() {
    this.fadeInTween?.kill()
    this.opacity = 0
  }

  remove() {
    this.fadeInTween?.kill()
    gsap.killTweensOf(this)
  }

  findMST(points) {
    if (points.length < 2) return []

    const pointsLength = points.length
    const edges = []

    // crear aristas con un solo bucle optimizado
    for (let i = 0; i < pointsLength - 1; i++) {
      const pointI = points[i]
      for (let j = i + 1; j < pointsLength; j++) {
        const pointJ = points[j]
        const dx = pointI.x - pointJ.x
        const dy = pointI.y - pointJ.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        edges.push({
          from: i,
          to: j,
          weight: distance,
          fromPoint: pointI,
          toPoint: pointJ,
        })
      }
    }

    // ordenar aristas por peso
    edges.sort((a, b) => a.weight - b.weight)

    // union-find optimizado
    const parent = new Array(pointsLength)
    const rank = new Array(pointsLength)

    for (let i = 0; i < pointsLength; i++) {
      parent[i] = i
      rank[i] = 0
    }

    const find = (x) => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]) // compresión de camino
      }
      return parent[x]
    }

    const union = (x, y) => {
      const rootX = find(x)
      const rootY = find(y)

      if (rootX === rootY) return false

      // unión por rango
      if (rank[rootX] < rank[rootY]) {
        parent[rootX] = rootY
      } else if (rank[rootX] > rank[rootY]) {
        parent[rootY] = rootX
      } else {
        parent[rootY] = rootX
        rank[rootX]++
      }
      return true
    }

    // construir mst
    const mstEdges = []
    const targetEdges = pointsLength - 1

    for (const edge of edges) {
      if (union(edge.from, edge.to)) {
        mstEdges.push(edge)
        if (mstEdges.length === targetEdges) break
      }
    }

    return mstEdges
  }

  updateRandomPoints() {
    for (const point of this.randomPoints) {
      point.angle += point.speed
      point.currentX = point.centerX + Math.cos(point.angle) * point.radius
      point.currentY = point.centerY + Math.sin(point.angle) * point.radius
    }
  }

  draw(headData, dimensions) {
    // no dibujar si la opacidad es 0
    if (this.opacity === 0) return
    
    const { scaledWidth, scaledHeight, x, y } = dimensions

    // actualizar posiciones de puntos aleatorios
    this.updateRandomPoints()

    // convertir datos de cabezas a puntos
    const points = []
    if (headData?.length) {
      for (const head of headData) {
        const point = {
          x: head.x * scaledWidth + x,
          y: head.y * scaledHeight + y,
        }
        points.push(point)
      }
    }

    // agregar puntos aleatorios
    for (const randomPoint of this.randomPoints) {
      points.push({
        x: randomPoint.currentX,
        y: randomPoint.currentY,
        isRandom: true,
      })
    }

    // encontrar mst
    const mstEdges = this.findMST(points)

    // dibujar directamente en el canvas principal
    push()

    // dibujar aristas del mst con opacidad aplicada
    for (const edge of mstEdges) {
      if (!edge.fromPoint.isRandom || !edge.toPoint.isRandom) {
        let distance = dist(edge.fromPoint.x, edge.fromPoint.y, edge.toPoint.x, edge.toPoint.y)
        let opacity = map(distance, 0, this.minDistance, 200, 30) * this.opacity
        stroke(255, 255, 255, opacity)
        strokeWeight(1)
      } else {
        stroke(255, 255, 255, 30 * this.opacity)
        strokeWeight(1)
      }
      line(edge.fromPoint.x, edge.fromPoint.y, edge.toPoint.x, edge.toPoint.y)
    }

    // dibujar vértices optimizado con opacidad aplicada
    noStroke()

    // dibujar puntos aleatorios
    fill(234, 233, 215, 255 * this.opacity)
    const headCount = headData?.length || 0
    for (let i = headCount; i < points.length; i++) {
      const point = points[i]
      circle(point.x, point.y, 4)
    }

    // dibujar puntos de cabezas si existen
    if (headCount > 0) {
      fill(255, 255, 255, 255 * this.opacity)
      for (let i = 0; i < headCount; i++) {
        const point = points[i]
        circle(point.x, point.y, 10)
      }
    }

    pop()
  }
}
