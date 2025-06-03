class Pendulum {
  constructor(length) {
    this.length = length
    this.damping = 0.9
    this.gravity = 8
    this.anchor = { x: 0, y: 0 }
    this.bob = { x: 0, y: 0 }
    this.prevBob = { x: 0, y: 0 }

    this.initialized = false
    this.points = Array(10)
      .fill(0)
      .map((_, i) => ({ x: random(-1, 1), y: random(-1, 1) }))
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

    const pos = this.bob
    const prev = this.prevBob

    let vx = (pos.x - prev.x) * this.damping
    let vy = (pos.y - prev.y) * this.damping

    this.prevBob = { ...pos }

    this.bob.x += vx
    this.bob.y += vy + this.gravity

    let dx = this.bob.x - this.anchor.x
    let dy = this.bob.y - this.anchor.y
    let dist = sqrt(dx * dx + dy * dy)
    let diff = dist - this.length
    let percent = diff / dist

    this.bob.x -= dx * percent
    this.bob.y -= dy * percent

    if (dist !== this.length) {
      const angle = atan2(dy, dx)
      this.bob.x = this.anchor.x + cos(angle) * this.length
      this.bob.y = this.anchor.y + sin(angle) * this.length
    }
  }

  draw() {
    // this.points = Array(10)
    //   .fill(0)
    //   .map((_, i) => ({ x: random(-1, 1), y: random(-1, 1) }))

    // noFill()
    // stroke('white')
    // strokeWeight(2)
    // line(this.anchor.x, this.anchor.y, this.bob.x, this.bob.y)

    // stroke('tomato')
    // strokeWeight(4)
    // beginShape()
    // for (const point of this.points) {
    //   splineVertex(this.bob.x + point.x * this.length * 0.2, this.bob.y + point.y * this.length * 0.2)
    // }
    // endShape()

    noStroke()
    fill('#5555aa88')
    circle(this.bob.x, this.bob.y, this.length * 0.5)
  }
}
