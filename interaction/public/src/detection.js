class Detection {
  constructor() {
    // datos para dibujar
    this.skeletonData = []
    this.lineData = []
    this.headData = []

    // datos para la detección
    this.lastRequestTime = 0

    // shaders
    this.shader = null
    this.videoBuffer = null
    this.effectsLayer = null
    this.fragShader = ''
    this.isFragShaderLoaded = false

    // input
    this.video = null

    // pendulums
    this.pendulums = new Map()

    // constantes específicas
    this.KEYPOINTS = {
      HEAD: 0,
      SHOULDER_L: 5,
      SHOULDER_R: 6,
      ELBOW_L: 7,
      ELBOW_R: 8,
      WRIST_L: 9,
      WRIST_R: 10,
      HIP_L: 11,
      HIP_R: 12,
      KNEE_L: 13,
      KNEE_R: 14,
      ANKLE_L: 15,
      ANKLE_R: 16,
    }

    this.CONFIDENCE_THRESHOLD = 0.1
  }

  async init() {
    try {
      await this.initShader()
      await this.initVideo()
      return true
    } catch (error) {
      console.error('Error in init:', error)
      return false
    }
  }

  remove() {
    // limpiar arrays
    this.skeletonData = []
    this.lineData = []
    this.headData = []

    // limpiar shader
    this.shader = null

    // limpiar buffers gráficos
    if (this.effectsLayer) {
      this.effectsLayer.remove()
      this.effectsLayer = null
    }
    if (this.videoBuffer) {
      this.videoBuffer.remove()
      this.videoBuffer = null
    }

    // limpiar video
    if (this.video) {
      if (this.video.elt) {
        this.video.elt.pause()
        this.video.elt.srcObject = null
        this.video.elt.remove()
      }
      this.video = null
    }

    // limpiar pendulums
    this.pendulums.clear()
  }

  async initShader() {
    this.fragShader = (await loadStrings('shaders/effect.frag')).join('\n')
    this.effectsLayer = createGraphics(windowWidth, windowHeight)
    this.videoBuffer = createGraphics(CONFIG.video.width, CONFIG.video.height)

    this.shader = createFilterShader(this.fragShader)
    if (!this.shader) throw new Error('Failed to create shader')

    this.shader.setUniform('canvasSize', [width, height])
    this.shader.setUniform('texelSize', [1.0 / width, 1.0 / height])

    this.isFragShaderLoaded = true
    console.log('Shader initialized successfully')
  }

  async initVideo() {
    if (CONFIG.video.inputSource === 'webcam') {
      await this.initWebcam()
    } else {
      this.initVideoElement()
    }
  }

  async initWebcam() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === 'videoinput')

      console.log(
        'dispositivos de video encontrados:',
        videoDevices.map((d, i) => ({ id: d.deviceId, label: d.label, index: i }))
      )

      if (videoDevices.length === 0) {
        throw new Error('no se encontraron cámaras')
      }

      const constraints = {
        video: {
          deviceId: videoDevices[CONFIG.video.cameraIndex]?.deviceId || undefined,
        },
      }

      console.log('usando cámara:', videoDevices[CONFIG.video.cameraIndex]?.label || 'no encontrada')
      this.video = createCapture(VIDEO, constraints)
      this.video.size(CONFIG.video.width, CONFIG.video.height)
      this.video.hide()
    } catch (error) {
      console.error('error al inicializar la cámara:', error)
    }
  }

  initVideoElement() {
    const videoElement = document.createElement('video')
    videoElement.src = CONFIG.video.path
    videoElement.muted = true
    videoElement.loop = true
    videoElement.setAttribute('playsinline', '')

    this.video = {
      elt: videoElement,
      _playing: false,
      size: (w, h) => {
        videoElement.width = w
        videoElement.height = h
      },
      hide: () => {
        videoElement.style.display = 'none'
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

  drawVideoToBuffer() {
    this.videoBuffer.clear()
    if (CONFIG.video.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
      this.videoBuffer.push()
      this.videoBuffer.translate(CONFIG.video.width, 0)
      this.videoBuffer.scale(-1, 1)
      this.videoBuffer.image(this.video, 0, 0, CONFIG.video.width, CONFIG.video.height)
      this.videoBuffer.pop()
    } else {
      this.videoBuffer.image(this.video, 0, 0, CONFIG.video.width, CONFIG.video.height)
    }
  }

  async requestPoses(video) {
    if (!video?.elt) return

    try {
      const canvas = document.createElement('canvas')
      canvas.width = CONFIG.video.width
      canvas.height = CONFIG.video.height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        console.error('no se pudo obtener el contexto del canvas')
        return
      }

      if (CONFIG.video.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
        ctx.scale(-1, 1)
        ctx.drawImage(video.elt, -CONFIG.video.width, 0, CONFIG.video.width, CONFIG.video.height)
      } else if (video.elt.readyState >= 2) {
        ctx.drawImage(video.elt, 0, 0, CONFIG.video.width, CONFIG.video.height)
      } else {
        return
      }

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg'))
      if (!blob) {
        console.error('no se pudo crear el blob de la imagen')
        return
      }

      const formData = new FormData()
      formData.append('file', blob, 'webcam.jpg')

      const response = await fetch(CONFIG.pose.endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`error en la petición: ${response.status}`)
      }

      const data = await response.json()
      if (!data?.skeletons) {
        console.warn('no se recibieron datos de esqueletos')
        return
      }

      this.skeletonData = data.skeletons
    } catch (error) {
      console.error('error al procesar poses:', error)
      this.skeletonData = []
    }
  }

  // función helper para verificar si un esqueleto es válido para procesamiento
  isValidSkeleton(kps) {
    if (!kps) return false
    
    const { SHOULDER_L, SHOULDER_R } = this.KEYPOINTS
    
    // verificar que existan los hombros (mínimo requerido)
    if (!kps[SHOULDER_L] || !kps[SHOULDER_R]) return false
    
    // verificar confianza mínima para hombros
    return (
      kps[SHOULDER_L].confidence > this.CONFIDENCE_THRESHOLD &&
      kps[SHOULDER_R].confidence > this.CONFIDENCE_THRESHOLD
    )
  }

  processPoseData() {
    this.lineData = []
    this.headData = []

    if (!this.skeletonData?.length) return

    for (const skeleton of this.skeletonData) {
      const kps = skeleton.keypoints
      if (!this.isValidSkeleton(kps)) continue

      const { HEAD, SHOULDER_L, SHOULDER_R } = this.KEYPOINTS
      const shoulderDistance = dist(kps[SHOULDER_L].x, kps[SHOULDER_L].y, kps[SHOULDER_R].x, kps[SHOULDER_R].y)

      // solo agregar cabeza si existe y tiene confianza suficiente
      if (kps[HEAD] && kps[HEAD].confidence > this.CONFIDENCE_THRESHOLD) {
        this.headData.push({
          x: kps[HEAD].x,
          y: kps[HEAD].y,
          shoulderDistance,
        })
      }

      const virtualPoints = this.calculateVirtualPoints(kps)
      this.addSkeletonLines(kps, virtualPoints)
    }
  }

  calculateVirtualPoints(kps) {
    const { HEAD, SHOULDER_L, SHOULDER_R } = this.KEYPOINTS

    const nape = {
      x: (kps[SHOULDER_L].x + kps[SHOULDER_R].x) / 2,
      y: (kps[SHOULDER_L].y + kps[SHOULDER_R].y) / 2,
      conf: Math.min(kps[SHOULDER_L].confidence, kps[SHOULDER_R].confidence),
    }

    // solo ajustar posición de nuca si hay cabeza con confianza suficiente
    if (kps[HEAD] && kps[HEAD].confidence > this.CONFIDENCE_THRESHOLD) {
      nape.y = nape.y * 0.8 + kps[HEAD].y * 0.2
    }

    return {
      nape,
      shoulders: {
        left: {
          x: (nape.x + kps[SHOULDER_L].x) / 2,
          y: (nape.y + kps[SHOULDER_L].y) / 2,
          conf: Math.min(nape.conf, kps[SHOULDER_L].confidence),
        },
        right: {
          x: (nape.x + kps[SHOULDER_R].x) / 2,
          y: (nape.y + kps[SHOULDER_R].y) / 2,
          conf: Math.min(nape.conf, kps[SHOULDER_R].confidence),
        },
      },
    }
  }

  draw() {
    if (!this.isFragShaderLoaded || !this.shader || !this.video) {
      console.warn('no se puede dibujar')
      return
    }

    if (millis() - this.lastRequestTime > CONFIG.pose.requestInterval) {
      this.requestPoses(this.video)
      this.lastRequestTime = millis()
    }

    this.processPoseData()
    if (this.video && (this.video.loadedmetadata || this.video.elt)) {
      this.drawVideoToBuffer()
    }

    const dimensions = this.calculateDimensions()
    const { linesArray, count } = this.prepareLinesData(dimensions)
    const { headsArray, headCount } = this.prepareHeadsData(dimensions)

    this.updateShader(linesArray, count, headsArray, headCount)
    this.drawStarLines(dimensions)
    this.updatePendulums(dimensions)
    this.drawPendulums()
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
    this.effectsLayer.stroke(255, 255, 255, 100)
    const N = 12
    const STAR_SIZE_RATIO = 0.25
    const STAR_LINE_START_RATIO = 0.9

    for (const head of this.headData) {
      const coords = this.calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y)
      const radius = head.shoulderDistance * scaledWidth * STAR_SIZE_RATIO

      for (let i = 0; i < N; i++) {
        const angle = (2 * (i * PI)) / N
        const cosAngle = cos(angle)
        const sinAngle = sin(angle)

        const endX = coords[0] + cosAngle * radius
        const endY = coords[1] + sinAngle * radius
        const startX = coords[0] + cosAngle * (radius * STAR_LINE_START_RATIO)
        const startY = coords[1] + sinAngle * (radius * STAR_LINE_START_RATIO)

        this.effectsLayer.strokeWeight(sqrt(radius) * 0.6)
        this.effectsLayer.line(startX, startY, endX, endY)
      }
    }

    this.effectsLayer.drawingContext.setLineDash([])
    this.effectsLayer.pop()
    image(this.effectsLayer, 0, 0)
  }

  prepareLinesData({ scaledWidth, scaledHeight, x, y }) {
    const linesArray = []
    const count = Math.min(this.lineData.length, 600)

    for (let i = 0; i < count; i++) {
      const lineObj = this.lineData[i]
      const coords = this.calculateLineCoordinates(lineObj, scaledWidth, scaledHeight, x, y)
      linesArray.push(...coords)
    }

    // Asegurar que el array tenga un tamaño mínimo para el shader
    while (linesArray.length < 400) linesArray.push(0)
    return { linesArray, count }
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

  calculateLineCoordinates(lineObj, scaledWidth, scaledHeight, x, y) {
    return [lineObj.start.x * scaledWidth + x, lineObj.start.y * scaledHeight + y, lineObj.end.x * scaledWidth + x, lineObj.end.y * scaledHeight + y]
  }

  calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y) {
    return [head.x * scaledWidth + x, head.y * scaledHeight + y]
  }

  addSkeletonLines(kps, virtualPoints) {
    const { nape, shoulders } = virtualPoints
    const KP = this.KEYPOINTS

    // umbral más bajo para líneas principales del cuerpo
    const BODY_THRESHOLD = this.CONFIDENCE_THRESHOLD * 0.6
    // umbral normal para extremidades
    const LIMB_THRESHOLD = this.CONFIDENCE_THRESHOLD

    // líneas principales del cuerpo
    const bodyLines = [
      // nuca a hombro izquierdo
      [[nape.x, nape.y], [shoulders.left.x, shoulders.left.y], Math.min(nape.conf, shoulders.left.conf)],
      // nuca a hombro derecho
      [[nape.x, nape.y], [shoulders.right.x, shoulders.right.y], Math.min(nape.conf, shoulders.right.conf)],
      // hombro izquierdo a cadera izquierda
      [[shoulders.left.x, shoulders.left.y], [kps[KP.HIP_L].x, kps[KP.HIP_L].y], Math.min(shoulders.left.conf, kps[KP.HIP_L].confidence)],
      // hombro derecho a cadera derecha
      [[shoulders.right.x, shoulders.right.y], [kps[KP.HIP_R].x, kps[KP.HIP_R].y], Math.min(shoulders.right.conf, kps[KP.HIP_R].confidence)],
      // cadera izquierda a cadera derecha
      [[kps[KP.HIP_L].x, kps[KP.HIP_L].y], [kps[KP.HIP_R].x, kps[KP.HIP_R].y], Math.min(kps[KP.HIP_L].confidence, kps[KP.HIP_R].confidence)],
    ]

    // línea de cabeza a nuca (solo si hay cabeza)
    if (kps[KP.HEAD] && kps[KP.HEAD].confidence > this.CONFIDENCE_THRESHOLD) {
      bodyLines.push([
        [kps[KP.HEAD].x, kps[KP.HEAD].y], 
        [nape.x, nape.y], 
        Math.min(kps[KP.HEAD].confidence, nape.conf)
      ])
    }

    // líneas de extremidades (con umbral normal)
    const limbLines = [
      // hombro izquierdo a codo izquierdo
      [[shoulders.left.x, shoulders.left.y], [kps[KP.ELBOW_L].x, kps[KP.ELBOW_L].y], Math.min(shoulders.left.conf, kps[KP.ELBOW_L].confidence)],
      // codo izquierdo a muñeca izquierda
      [[kps[KP.ELBOW_L].x, kps[KP.ELBOW_L].y], [kps[KP.WRIST_L].x, kps[KP.WRIST_L].y], Math.min(kps[KP.ELBOW_L].confidence, kps[KP.WRIST_L].confidence)],
      // hombro derecho a codo derecho
      [[shoulders.right.x, shoulders.right.y], [kps[KP.ELBOW_R].x, kps[KP.ELBOW_R].y], Math.min(shoulders.right.conf, kps[KP.ELBOW_R].confidence)],
      // codo derecho a muñeca derecha
      [[kps[KP.ELBOW_R].x, kps[KP.ELBOW_R].y], [kps[KP.WRIST_R].x, kps[KP.WRIST_R].y], Math.min(kps[KP.ELBOW_R].confidence, kps[KP.WRIST_R].confidence)],
      // cadera izquierda a rodilla izquierda
      [[kps[KP.HIP_L].x, kps[KP.HIP_L].y], [kps[KP.KNEE_L].x, kps[KP.KNEE_L].y], Math.min(kps[KP.HIP_L].confidence, kps[KP.KNEE_L].confidence)],
      // rodilla izquierda a tobillo izquierdo
      [[kps[KP.KNEE_L].x, kps[KP.KNEE_L].y], [kps[KP.ANKLE_L].x, kps[KP.ANKLE_L].y], Math.min(kps[KP.KNEE_L].confidence, kps[KP.ANKLE_L].confidence)],
      // cadera derecha a rodilla derecha
      [[kps[KP.HIP_R].x, kps[KP.HIP_R].y], [kps[KP.KNEE_R].x, kps[KP.KNEE_R].y], Math.min(kps[KP.HIP_R].confidence, kps[KP.KNEE_R].confidence)],
      // rodilla derecha a tobillo derecho
      [[kps[KP.KNEE_R].x, kps[KP.KNEE_R].y], [kps[KP.ANKLE_R].x, kps[KP.ANKLE_R].y], Math.min(kps[KP.KNEE_R].confidence, kps[KP.ANKLE_R].confidence)],
    ]

    // agregar líneas principales del cuerpo con umbral más permisivo
    bodyLines.forEach(([p1, p2, conf]) => {
      if (conf > BODY_THRESHOLD) {
        this.lineData.push({
          start: { x: p1[0], y: p1[1] },
          end: { x: p2[0], y: p2[1] },
          confidence: conf,
        })
      }
    })

    // agregar líneas de extremidades con umbral normal
    limbLines.forEach(([p1, p2, conf]) => {
      if (conf > LIMB_THRESHOLD) {
        this.lineData.push({
          start: { x: p1[0], y: p1[1] },
          end: { x: p2[0], y: p2[1] },
          confidence: conf,
        })
      }
    })
  }

  updatePendulums({ scaledWidth, scaledHeight, x, y }) {
    if (!this.skeletonData?.length) return

    // guardar los péndulos actuales
    const currentPendulums = new Map([...this.pendulums].filter(([_, pendulum]) => pendulum))

    this.pendulums.clear()

    for (const skeleton of this.skeletonData) {
      const kps = skeleton.keypoints
      if (!this.isValidSkeleton(kps)) continue

      const virtualPoints = this.calculateVirtualPoints(kps)
      if (!virtualPoints) continue

      // validar que el track_id sea válido
      const trackId = skeleton.track_id
      if (typeof trackId !== 'number' || trackId < 0) continue

      const coords = [virtualPoints.nape.x * scaledWidth + x, virtualPoints.nape.y * scaledHeight + y]

      // calcular la distancia entre hombros en píxeles
      const { SHOULDER_L, SHOULDER_R } = this.KEYPOINTS
      const shoulderDistance = dist(
        kps[SHOULDER_L].x * scaledWidth + x,
        kps[SHOULDER_L].y * scaledHeight + y,
        kps[SHOULDER_R].x * scaledWidth + x,
        kps[SHOULDER_R].y * scaledHeight + y
      )

      // calcular la longitud del péndulo basada en la distancia entre hombros
      const length = shoulderDistance * 0.4

      // reutilizar el péndulo existente o crear uno nuevo
      let pendulum = currentPendulums.get(trackId) || new Pendulum(length)
      pendulum.length = length
      pendulum.update({ x: coords[0], y: coords[1] })

      this.pendulums.set(trackId, pendulum)
    }
  }

  drawPendulums() {
    this.effectsLayer.push()
    this.effectsLayer.stroke(255, 255, 255, 100)
    this.effectsLayer.strokeWeight(2)
    this.effectsLayer.noFill()

    for (const pendulum of this.pendulums.values()) {
      pendulum.draw()
    }

    this.effectsLayer.pop()
  }
}
