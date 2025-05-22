class IdleState {
  constructor(poseGraphics) {
    this.poseGraphics = poseGraphics
    this.nosePositions = []
    this.skeletonLines = []
    this.HEAD_SIZE = width / 20
    this.SMALL_HEAD_SIZE = width / 60
    this.BIG_HEAD_SIZE = width / 30
    this.OFF_COLOR = [30, 40, 60]
    this.ON_COLOR = [255, 255, 0]
    this.INTENSE_COLOR = [255, 255, 0]
    this.LIGHT_COLOR = [255, 255, 200]
    this.SMALL_HEAD_COLOR = [100, 100, 100]
    this.headColor = this.OFF_COLOR
    this.PROXIMITY_THRESHOLD = 50
    this.lastValidNose = null
    this.currentPattern = PATTERNS.FULL_BODY
  }

  onEnter() {
    clear()
    resetMatrix()
    background(0)
    this.nosePositions = []
    this.skeletonLines = []
    this.headColor = this.OFF_COLOR
  }

  draw(poses) {
    this.updatePoseData(poses)
    this.drawSkeletonInPoseGraphics(poses)
    this.drawGraphicsBuffer()
  }

  drawSkeletonInPoseGraphics(poses) {
    this.poseGraphics.clear()
    this.poseGraphics.push()
    this.poseGraphics.imageMode(CORNER)

    if (backgroundImg && backgroundImgLoaded) {
      this.poseGraphics.push()
      this.poseGraphics.translate(0, 0)
      this.poseGraphics.image(backgroundImg, 0, 0, this.poseGraphics.width, this.poseGraphics.height)
      this.poseGraphics.pop()
    } else {
      this.poseGraphics.background(0, 0, 50)
    }

    const validPoses = poses.filter((pose) => millis() - pose.timestamp < POSE_TIMEOUT).slice(0, MAX_POSES)
    
    validPoses.forEach((pose) => {
      const connections = PATTERN_CONNECTIONS[this.currentPattern]
      if (connections) {
        connections.forEach(([startKpIndex, endKpIndex]) => {
          const startPoint = pose.keypoints[startKpIndex]
          const endPoint = pose.keypoints[endKpIndex]
          if (startPoint?.confidence > 0.3 && endPoint?.confidence > 0.3) {
            const isZeroLine = startPoint.x === 0 && startPoint.y === 0 && endPoint.x === 0 && endPoint.y === 0
            const isDiagFull = startPoint.x === 0 && startPoint.y === 0 && endPoint.x === width && endPoint.y === height
            if (!isZeroLine && !isDiagFull) {
              this.poseGraphics.strokeWeight(20)
              this.poseGraphics.stroke(this.OFF_COLOR[0], this.OFF_COLOR[1], this.OFF_COLOR[2])
              this.poseGraphics.line(startPoint.x, startPoint.y, endPoint.x, endPoint.y)
            }
          }
        })
      }
    })

    validPoses.forEach((pose) => {
      const nose = pose.keypoints[KEYPOINT_MAP.NOSE]
      if (nose?.confidence > 0.3) {
        const isValidPoint = nose.x !== 0 || nose.y !== 0
        if (isValidPoint) {
          this.lastValidNose = { 
            x: nose.x, 
            y: nose.y, 
            confidence: nose.confidence,
            valid: true,
            timestamp: millis()
          }
          
          let currentHeadSize = this.SMALL_HEAD_SIZE
          let currentHeadColor = this.SMALL_HEAD_COLOR

          const distance = this.distanceToSegment(
            { x: nose.x, y: nose.y },
            { x: this.poseGraphics.width * 0.125, y: this.poseGraphics.height / 2 },
            { x: this.poseGraphics.width * 0.875, y: this.poseGraphics.height / 2 }
          )

          if (distance < this.PROXIMITY_THRESHOLD) {
            currentHeadSize = this.BIG_HEAD_SIZE
            currentHeadColor = this.INTENSE_COLOR
          }

          this.poseGraphics.fill(currentHeadColor[0], currentHeadColor[1], currentHeadColor[2])
          this.poseGraphics.noStroke()
          this.poseGraphics.circle(nose.x, nose.y, currentHeadSize)
        }
      }
    })

    this.poseGraphics.pop()
  }

  drawGraphicsBuffer() {
    push()
    resetMatrix()
    translate(-width / 2, -height / 2)
    imageMode(CORNER)
    image(this.poseGraphics, 0, 0, width, height)
    pop()
  }

  updatePoseData(poses) {
    const validPoses = poses.filter((pose) => millis() - pose.timestamp < POSE_TIMEOUT).slice(0, MAX_POSES)

    this.nosePositions = []
    this.skeletonLines = []

    validPoses.forEach((pose) => {
      const nose = pose.keypoints[KEYPOINT_MAP.NOSE]
      if (nose?.confidence > 0.4) {
        this.nosePositions.push(nose.x, nose.y)
      }

      const connections = PATTERN_CONNECTIONS[this.currentPattern]
      if (connections) {
        connections.forEach(([startKpIndex, endKpIndex]) => {
          if (this.skeletonLines.length / 4 < MAX_SKELETON_LINES) {
            const startPoint = pose.keypoints[startKpIndex]
            const endPoint = pose.keypoints[endKpIndex]
            if (startPoint?.confidence > 0.3 && endPoint?.confidence > 0.3) {
              const isZeroLine = startPoint.x === 0 && startPoint.y === 0 && endPoint.x === 0 && endPoint.y === 0
              const isDiagFull = startPoint.x === 0 && startPoint.y === 0 && endPoint.x === width && endPoint.y === height
              if (!isZeroLine && !isDiagFull) {
                this.skeletonLines.push(startPoint.x, startPoint.y, endPoint.x, endPoint.y)
              }
            }
          }
        })
      }
    })
  }

  setHeadColor(r, g, b) {
    this.headColor = [r, g, b]
  }

  distanceToSegment(point, lineStart, lineEnd) {
    const x = point.x
    const y = point.y
    const x1 = lineStart.x
    const y1 = lineStart.y
    const x2 = lineEnd.x
    const y2 = lineEnd.y

    const A = x - x1
    const B = y - y1
    const C = x2 - x1
    const D = y2 - y1

    const dot = A * C + B * D
    const len_sq = C * C + D * D
    let param = -1

    if (len_sq !== 0) {
      param = dot / len_sq
    }

    let xx, yy

    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * C
      yy = y1 + param * D
    }

    const dx = x - xx
    const dy = y - yy

    return Math.sqrt(dx * dx + dy * dy)
  }
}
