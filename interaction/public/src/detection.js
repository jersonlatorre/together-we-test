class Detection {
  constructor() {
    // constantes y configuraciones
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
    this.CONFIDENCE_THRESHOLD = 0.3

    // estado de la detección
    this.lastRequestTime = 0

    // capas gráficas
    this.videoLayer = null
    this.shaderLayer = null
    this.effectsLayer = null

    // shaders
    this.shader = null
    this.fragShader = ''

    // entrada de video
    this.video = null

    // efectos y animaciones
    this.pendulums = new Map()
    this.starHeads = null

    // datos temporales
    this.skeletonData = []
    this.lineData = []
    this.headData = []

    // canvas para captura de frames
    this.captureCanvas = document.createElement('canvas')
    this.captureCanvas.width = CONFIG.video.width
    this.captureCanvas.height = CONFIG.video.height
    this.captureCtx = this.captureCanvas.getContext('2d')
  }

  async init() {
    try {
      await this.initShader()
      await this.initVideo()

      if (this.effectsLayer) {
        this.starHeads = new StarHeads(this.effectsLayer)
      } else {
        console.warn('effectsLayer no disponible para StarHeads')
      }

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
    if (this.shaderLayer) {
      this.shaderLayer.remove()
      this.shaderLayer = null
    }
    if (this.effectsLayer) {
      this.effectsLayer.remove()
      this.effectsLayer = null
    }
    if (this.videoLayer) {
      this.videoLayer.remove()
      this.videoLayer = null
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

    // limpiar star heads
    this.starHeads = null
  }

  async initShader() {
    // cargar el shader
    this.fragShader = (await loadStrings('shaders/effect.frag')).join('\n')
    this.shader = createFilterShader(this.fragShader)
    this.shader.setUniform('canvasSize', [width, height])
    this.shader.setUniform('texelSize', [1.0 / width, 1.0 / height])

    // crear las capas gráficas
    this.shaderLayer = createGraphics(windowWidth, windowHeight)
    this.effectsLayer = createGraphics(windowWidth, windowHeight)
    this.videoLayer = createGraphics(CONFIG.video.width, CONFIG.video.height)
  }

  async initVideo() {
    switch (CONFIG.video.inputSource) {
      case 'webcam':
        await this.initWebcam()
        break
      case 'video':
        this.initVideoElement()
        break
      default:
        throw new Error('Invalid video input source')
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
    videoElement.play()
  }

  drawVideoToLayer() {
    this.videoLayer.clear()
    if (CONFIG.video.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
      this.videoLayer.push()
      this.videoLayer.translate(CONFIG.video.width, 0)
      this.videoLayer.scale(-1, 1)
      this.videoLayer.image(this.video, 0, 0, CONFIG.video.width, CONFIG.video.height)
      this.videoLayer.pop()
    } else {
      this.videoLayer.image(this.video, 0, 0, CONFIG.video.width, CONFIG.video.height)
    }
  }

  async requestPoses(video) {
    if (!video?.elt) return

    if (!this.captureCtx) {
      console.error('no se pudo obtener el contexto del canvas')
      return
    }

    if (CONFIG.video.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
      this.captureCtx.scale(-1, 1)
      this.captureCtx.drawImage(video.elt, -CONFIG.video.width, 0, CONFIG.video.width, CONFIG.video.height)
      this.captureCtx.setTransform(1, 0, 0, 1, 0, 0) // resetear transformación
    } else if (video.elt.readyState >= 2) {
      this.captureCtx.drawImage(video.elt, 0, 0, CONFIG.video.width, CONFIG.video.height)
    } else {
      return
    }

    const blob = await new Promise((resolve) => this.captureCanvas.toBlob(resolve, 'image/jpeg'))
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
  }

  processPoseData() {
    this.lineData = []
    this.headData = []

    if (!this.skeletonData?.length) return

    for (const skeleton of this.skeletonData) {
      const kps = skeleton.keypoints
      if (!isValidSkeleton(kps)) continue

      // extraer datos de cabeza
      const headData = extractHeadData(kps)
      if (headData) {
        this.headData.push(headData)
      }

      // calcular puntos virtuales y generar líneas
      const virtualPoints = calculateVirtualPoints(kps)
      const lines = generateSkeletonLines(kps, virtualPoints)
      this.lineData.push(...lines)
    }
  }

  draw() {
    if (!this.shader || !this.video) {
      console.warn('no se puede dibujar')
      return
    }

    if (millis() - this.lastRequestTime > CONFIG.pose.requestInterval) {
      this.requestPoses(this.video)
      this.lastRequestTime = millis()
    }

    this.processPoseData()
    if (this.video && (this.video.loadedmetadata || this.video.elt)) {
      this.drawVideoToLayer()
    }

    const dimensions = calculateVideoDimensions(CONFIG.video.width, CONFIG.video.height, width, height)
    const { linesArray, count } = prepareLinesData(this.lineData, dimensions)
    const { headsArray, headCount } = prepareHeadsData(this.headData, dimensions)

    this.updateShader(linesArray, count, headsArray, headCount)
    this.starHeads?.draw(this.headData, dimensions)
    this.updatePendulums(dimensions)
    this.drawPendulums()
  }

  updateShader(linesArray, count, headsArray, headCount) {
    this.shader.setUniform('heads', headsArray)
    this.shader.setUniform('headCount', headCount)
    this.shader.setUniform('lines', linesArray)
    this.shader.setUniform('lineCount', count)
    this.shader.setUniform('canvasSize', [width, height])

    filter(this.shader)
  }

  updatePendulums(dimensions) {
    if (!this.skeletonData?.length) return

    // guardar los péndulos actuales
    const currentPendulums = new Map([...this.pendulums].filter(([_, pendulum]) => pendulum))

    this.pendulums.clear()

    for (const skeleton of this.skeletonData) {
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
      let pendulum = currentPendulums.get(trackId) || new Pendulum(length)
      pendulum.length = length
      pendulum.update({ x: coords.x, y: coords.y })

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
    image(this.effectsLayer, 0, 0)
  }
}
