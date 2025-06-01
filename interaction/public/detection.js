class Detection {
  constructor() {
    this.skeletonData = []
    this.lineData = []
    this.headData = []
    this.lastRequestTime = 0
    this.shader = null
    this.videoBuffer = null
    this.effectsLayer = null
    this.fragShader = ''
    this.isFragShaderLoaded = false
    this.video = null
    this.inputSource = 'video'
  }

  async init() {
    try {
      // cargar y crear shader
      this.fragShader = await loadStrings('shaders/effect.frag')
      this.fragShader = this.fragShader.join('\n')

      // crear buffers
      this.effectsLayer = createGraphics(windowWidth, windowHeight)
      this.videoBuffer = createGraphics(CONFIG.video.width, CONFIG.video.height)

      // crear shader
      this.shader = createFilterShader(this.fragShader)
      if (!this.shader) {
        throw new Error('Failed to create shader')
      }

      // configurar shader
      this.shader.setUniform('pixelSize', CONFIG.shader.pixelSize)
      this.shader.setUniform('brightnessThreshold', CONFIG.shader.brightnessThreshold)
      this.shader.setUniform('canvasSize', [width, height])
      this.shader.setUniform('texelSize', [1.0 / width, 1.0 / height])

      this.isFragShaderLoaded = true
      console.log('Shader initialized successfully')

      // iniciar video
      if (this.inputSource === 'webcam') {
        this.video = createCapture(VIDEO)
        this.video.size(CONFIG.video.width, CONFIG.video.height)
        this.video.hide()
      } else {
        this.initVideoElement()
      }

      return true
    } catch (error) {
      console.error('Error in init:', error)
      return false
    }
  }

  initVideoElement() {
    let videoElement = document.createElement('video')
    videoElement.src = CONFIG.video.path
    videoElement.muted = true
    videoElement.loop = true
    videoElement.setAttribute('playsinline', '')

    this.video = {
      elt: videoElement,
      _playing: false,
      size: function (w, h) {
        this.elt.width = w
        this.elt.height = h
      },
      hide: function () {
        this.elt.style.display = 'none'
      },
    }

    this.video.size(CONFIG.video.width, CONFIG.video.height)
    this.video.hide()

    videoElement
      .play()
      .then(() => {
        this.video._playing = true
      })
      .catch(console.error)
  }

  async requestPoses(video) {
    if (!video?.elt) return

    try {
      const canvas = document.createElement('canvas')
      canvas.width = CONFIG.video.width
      canvas.height = CONFIG.video.height
      const ctx = canvas.getContext('2d')

      if (video.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
        ctx.scale(-1, 1)
        ctx.drawImage(video.elt, -CONFIG.video.width, 0, CONFIG.video.width, CONFIG.video.height)
      } else if (video.elt.readyState >= 2) {
        ctx.drawImage(video.elt, 0, 0, CONFIG.video.width, CONFIG.video.height)
      } else {
        return
      }

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg'))
      const formData = new FormData()
      formData.append('file', blob, 'webcam.jpg')

      const response = await fetch(CONFIG.pose.endpoint, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        this.skeletonData = data.skeletons || []
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  processPoseData() {
    this.lineData = []
    this.headData = []

    if (!this.skeletonData?.length) return

    for (const skeleton of this.skeletonData) {
      const kps = skeleton.keypoints

      if (!kps || kps.length < 17) continue

      // procesar cabeza
      if (kps[CONFIG.keypoints.HEAD].confidence > CONFIG.pose.confidenceThreshold) {
        if (kps[CONFIG.keypoints.SHOULDER_L].confidence > CONFIG.pose.confidenceThreshold && 
            kps[CONFIG.keypoints.SHOULDER_R].confidence > CONFIG.pose.confidenceThreshold) {
          const shoulderDistance = dist(
            kps[CONFIG.keypoints.SHOULDER_L].x,
            kps[CONFIG.keypoints.SHOULDER_L].y,
            kps[CONFIG.keypoints.SHOULDER_R].x,
            kps[CONFIG.keypoints.SHOULDER_R].y
          )
          this.headData.push({
            x: kps[CONFIG.keypoints.HEAD].x,
            y: kps[CONFIG.keypoints.HEAD].y,
            shoulderDistance: shoulderDistance,
          })
        }
      }

      const virtualPoints = this.calculateVirtualPoints(kps)
      if (!virtualPoints) continue

      this.addSkeletonLines(kps, virtualPoints)
    }
  }

  calculateVirtualPoints(kps) {
    if (kps[CONFIG.keypoints.SHOULDER_L].confidence <= CONFIG.pose.confidenceThreshold || 
        kps[CONFIG.keypoints.SHOULDER_R].confidence <= CONFIG.pose.confidenceThreshold) {
      return null
    }

    const nuca = {
      x: (kps[CONFIG.keypoints.SHOULDER_L].x + kps[CONFIG.keypoints.SHOULDER_R].x) / 2,
      y: (kps[CONFIG.keypoints.SHOULDER_L].y + kps[CONFIG.keypoints.SHOULDER_R].y) / 2,
      conf: Math.min(kps[CONFIG.keypoints.SHOULDER_L].confidence, kps[CONFIG.keypoints.SHOULDER_R].confidence),
    }

    if (kps[CONFIG.keypoints.HEAD].confidence > CONFIG.pose.confidenceThreshold) {
      nuca.y = nuca.y * 0.8 + kps[CONFIG.keypoints.HEAD].y * 0.2
    }

    const shoulders = {
      left: kps[CONFIG.keypoints.SHOULDER_L].confidence > CONFIG.pose.confidenceThreshold
        ? {
            x: (nuca.x + kps[CONFIG.keypoints.SHOULDER_L].x) / 2,
            y: (nuca.y + kps[CONFIG.keypoints.SHOULDER_L].y) / 2,
            conf: Math.min(nuca.conf, kps[CONFIG.keypoints.SHOULDER_L].confidence),
          }
        : null,
      right: kps[CONFIG.keypoints.SHOULDER_R].confidence > CONFIG.pose.confidenceThreshold
        ? {
            x: (nuca.x + kps[CONFIG.keypoints.SHOULDER_R].x) / 2,
            y: (nuca.y + kps[CONFIG.keypoints.SHOULDER_R].y) / 2,
            conf: Math.min(nuca.conf, kps[CONFIG.keypoints.SHOULDER_R].confidence),
          }
        : null,
    }

    return { nuca, shoulders }
  }

  addSkeletonLines(kps, virtualPoints) {
    const { nuca, shoulders } = virtualPoints

    const addLine = (p1, p2, conf) => {
      if (conf > CONFIG.pose.confidenceThreshold) {
        this.lineData.push({
          start: { x: p1[0], y: p1[1] },
          end: { x: p2[0], y: p2[1] },
          confidence: conf,
        })
      }
    }

    const lines = [
      [[kps[CONFIG.keypoints.HEAD].x, kps[CONFIG.keypoints.HEAD].y], [nuca.x, nuca.y], Math.min(kps[CONFIG.keypoints.HEAD].confidence, nuca.conf)],
      [[shoulders.left.x, shoulders.left.y], [kps[CONFIG.keypoints.ELBOW_L].x, kps[CONFIG.keypoints.ELBOW_L].y], Math.min(shoulders.left.conf, kps[CONFIG.keypoints.ELBOW_L].confidence)],
      [[kps[CONFIG.keypoints.ELBOW_L].x, kps[CONFIG.keypoints.ELBOW_L].y], [kps[CONFIG.keypoints.WRIST_L].x, kps[CONFIG.keypoints.WRIST_L].y], Math.min(kps[CONFIG.keypoints.ELBOW_L].confidence, kps[CONFIG.keypoints.WRIST_L].confidence)],
      [[shoulders.right.x, shoulders.right.y], [kps[CONFIG.keypoints.ELBOW_R].x, kps[CONFIG.keypoints.ELBOW_R].y], Math.min(shoulders.right.conf, kps[CONFIG.keypoints.ELBOW_R].confidence)],
      [[kps[CONFIG.keypoints.ELBOW_R].x, kps[CONFIG.keypoints.ELBOW_R].y], [kps[CONFIG.keypoints.WRIST_R].x, kps[CONFIG.keypoints.WRIST_R].y], Math.min(kps[CONFIG.keypoints.ELBOW_R].confidence, kps[CONFIG.keypoints.WRIST_R].confidence)],
      [[kps[CONFIG.keypoints.HIP_L].x, kps[CONFIG.keypoints.HIP_L].y], [kps[CONFIG.keypoints.KNEE_L].x, kps[CONFIG.keypoints.KNEE_L].y], Math.min(kps[CONFIG.keypoints.HIP_L].confidence, kps[CONFIG.keypoints.KNEE_L].confidence)],
      [[kps[CONFIG.keypoints.KNEE_L].x, kps[CONFIG.keypoints.KNEE_L].y], [kps[CONFIG.keypoints.ANKLE_L].x, kps[CONFIG.keypoints.ANKLE_L].y], Math.min(kps[CONFIG.keypoints.KNEE_L].confidence, kps[CONFIG.keypoints.ANKLE_L].confidence)],
      [[kps[CONFIG.keypoints.HIP_R].x, kps[CONFIG.keypoints.HIP_R].y], [kps[CONFIG.keypoints.KNEE_R].x, kps[CONFIG.keypoints.KNEE_R].y], Math.min(kps[CONFIG.keypoints.HIP_R].confidence, kps[CONFIG.keypoints.KNEE_R].confidence)],
      [[kps[CONFIG.keypoints.KNEE_R].x, kps[CONFIG.keypoints.KNEE_R].y], [kps[CONFIG.keypoints.ANKLE_R].x, kps[CONFIG.keypoints.ANKLE_R].y], Math.min(kps[CONFIG.keypoints.KNEE_R].confidence, kps[CONFIG.keypoints.ANKLE_R].confidence)],
      [[nuca.x, nuca.y], [shoulders.left.x, shoulders.left.y], Math.min(nuca.conf, shoulders.left.conf)],
      [[nuca.x, nuca.y], [shoulders.right.x, shoulders.right.y], Math.min(nuca.conf, shoulders.right.conf)],
      [[shoulders.left.x, shoulders.left.y], [kps[CONFIG.keypoints.HIP_L].x, kps[CONFIG.keypoints.HIP_L].y], Math.min(shoulders.left.conf, kps[CONFIG.keypoints.HIP_L].confidence)],
      [[shoulders.right.x, shoulders.right.y], [kps[CONFIG.keypoints.HIP_R].x, kps[CONFIG.keypoints.HIP_R].y], Math.min(shoulders.right.conf, kps[CONFIG.keypoints.HIP_R].confidence)],
      [[kps[CONFIG.keypoints.HIP_L].x, kps[CONFIG.keypoints.HIP_L].y], [kps[CONFIG.keypoints.HIP_R].x, kps[CONFIG.keypoints.HIP_R].y], Math.min(kps[CONFIG.keypoints.HIP_L].confidence, kps[CONFIG.keypoints.HIP_R].confidence)],
    ]

    lines.forEach(([p1, p2, conf]) => addLine(p1, p2, conf))
  }

  drawVideoToBuffer() {
    this.videoBuffer.clear()
    if (this.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
      this.videoBuffer.push()
      this.videoBuffer.translate(CONFIG.video.width, 0)
      this.videoBuffer.scale(-1, 1)
      this.videoBuffer.image(this.video, 0, 0, CONFIG.video.width, CONFIG.video.height)
      this.videoBuffer.pop()
    } else {
      this.videoBuffer.image(this.video, 0, 0, CONFIG.video.width, CONFIG.video.height)
    }
  }

  calculateDimensions() {
    const videoRatio = CONFIG.video.width / CONFIG.video.height
    const canvasRatio = width / height
    const scaledWidth = canvasRatio > videoRatio ? width : height * videoRatio
    const scaledHeight = canvasRatio > videoRatio ? width / videoRatio : height
    const x = (width - scaledWidth) / 2
    const y = (height - scaledHeight) / 2

    return { scaledWidth, scaledHeight, x, y }
  }

  prepareLinesData({ scaledWidth, scaledHeight, x, y }) {
    const linesArray = []
    const count = Math.min(this.lineData.length, 600)

    for (let i = 0; i < count; i++) {
      const lineObj = this.lineData[i]
      const coords = this.calculateLineCoordinates(lineObj, scaledWidth, scaledHeight, x, y)
      linesArray.push(...coords)
    }

    // rellenar array hasta 400 elementos
    while (linesArray.length < 400) linesArray.push(0)

    return { linesArray, count }
  }

  calculateLineCoordinates(lineObj, scaledWidth, scaledHeight, x, y) {
    if (this.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
      return [lineObj.start.x * scaledWidth + x, lineObj.start.y * scaledHeight + y, lineObj.end.x * scaledWidth + x, lineObj.end.y * scaledHeight + y]
    }

    return [lineObj.start.x * scaledWidth + x, lineObj.start.y * scaledHeight + y, lineObj.end.x * scaledWidth + x, lineObj.end.y * scaledHeight + y]
  }

  prepareHeadsData({ scaledWidth, scaledHeight, x, y }) {
    const headsArray = []
    const headCount = Math.min(this.headData.length, 50)

    for (let i = 0; i < headCount; i++) {
      const h = this.headData[i]
      const coords = this.calculateHeadCoordinates(h, scaledWidth, scaledHeight, x, y)
      headsArray.push(...coords)
    }

    return { headsArray, headCount }
  }

  calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y) {
    if (this.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
      return [head.x * scaledWidth + x, head.y * scaledHeight + y]
    }

    return [head.x * scaledWidth + x, head.y * scaledHeight + y]
  }

  updateShader(linesArray, count, headsArray, headCount) {
    this.shader.setUniform('heads', headsArray)
    this.shader.setUniform('headCount', headCount)
    this.shader.setUniform('lines', linesArray)
    this.shader.setUniform('lineCount', count)
    this.shader.setUniform('canvasSize', [width, height])

    filter(this.shader)
  }

  drawStarLines({ scaledWidth, scaledHeight, x, y }) {
    this.effectsLayer.clear()
    this.effectsLayer.push()
    this.effectsLayer.noFill()
    this.effectsLayer.stroke(255, 255, 255)

    for (const head of this.headData) {
      const coords = this.calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y)
      const radius = head.shoulderDistance * scaledWidth * 0.4

      // dibujar N líneas en ángulos distribuidos uniformemente
      let N = 12
      for (let i = 0; i < N; i++) {
        const angle = (2 * (i * PI)) / N // 36 grados entre cada línea
        const endX = coords[0] + cos(angle) * radius
        const endY = coords[1] + sin(angle) * radius

        // punto de inicio a mitad del radio
        const startX = coords[0] + cos(angle) * (radius * 0.85)
        const startY = coords[1] + sin(angle) * (radius * 0.85)
        this.effectsLayer.strokeWeight(1.5)
        this.effectsLayer.line(startX, startY, endX, endY)
      }
    }

    this.effectsLayer.drawingContext.setLineDash([])
    this.effectsLayer.pop()
    image(this.effectsLayer, 0, 0)
  }

  draw() {
    if (!this.isFragShaderLoaded || !this.shader || !this.video) {
      console.log('Skipping draw:', {
        shaderLoaded: this.isFragShaderLoaded,
        hasShader: !!this.shader,
        hasVideo: !!this.video,
      })
      return
    }

    // procesar poses si es el momento
    if (millis() - this.lastRequestTime > CONFIG.pose.requestInterval) {
      this.requestPoses(this.video)
      this.lastRequestTime = millis()
    }

    // procesar datos de pose
    this.processPoseData()

    // dibujar video en buffer
    if (this.video && (this.video.loadedmetadata || this.video.elt)) {
      this.drawVideoToBuffer()
    }

    // calcular dimensiones
    const dimensions = this.calculateDimensions()

    // preparar datos para shader
    const { linesArray, count } = this.prepareLinesData(dimensions)
    const { headsArray, headCount } = this.prepareHeadsData(dimensions)

    // actualizar shader
    this.updateShader(linesArray, count, headsArray, headCount)

    // dibujar efectos
    this.drawStarLines(dimensions)
  }
}