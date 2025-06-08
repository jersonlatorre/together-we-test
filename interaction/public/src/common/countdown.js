class Countdown {
  constructor({ x = 0, y = 0, size = 100, duration = 5, onComplete = () => {}, color = '#00FF4F', offset = 0 }) {
    this.x = x
    this.y = y
    this.size = size
    this.duration = duration
    this.onComplete = onComplete
    this.color = color
    this.offset = offset
    this.angle = 360
    this.tween = null
    this.opacity = 0
    this.opacityTween = null
  }

  start() {
    // fade in
    this.opacityTween = gsap.to(this, {
      opacity: 255,
      duration: 0.8,
      onComplete: () => {
        this.animate()
      },
    })
  }

  animate() {
    this.tween = gsap.to(this, {
      angle: 0,
      duration: this.duration,
      ease: 'none',
      onComplete: () => {
        this.tween?.kill()
        this.tween = null
        this.onComplete()
      },
    })
  }

  draw() {
    push()
    translate(this.x, this.y)
    scale(-1, 1)
    fill(this.color)
    noStroke()
    arc(0, 0, this.size, this.size, -HALF_PI, radians(this.angle - 90), PIE)
    pop()
  }

  remove() {
    this.tween?.kill()
    this.opacityTween?.kill()
    gsap.killTweensOf(this)
  }
}
