class VideoManager {
  constructor() {
    this.video = null
    this.videoLayer = null

    // canvas para captura de frames
    this.captureCanvas = document.createElement('canvas')
    this.captureCanvas.width = CONFIG.video.width
    this.captureCanvas.height = CONFIG.video.height
    this.captureCtx = this.captureCanvas.getContext('2d')
  }

  async init() {
    try {
      this.videoLayer = createGraphics(CONFIG.video.width, CONFIG.video.height)

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

      return true
    } catch (error) {
      console.error('Error initializing video:', error)
      return false
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

  update() {
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

  async captureFrame() {
    if (!this.video?.elt) return null

    if (!this.captureCtx) {
      console.error('no se pudo obtener el contexto del canvas')
      return null
    }

    if (CONFIG.video.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
      this.captureCtx.scale(-1, 1)
      this.captureCtx.drawImage(this.video.elt, -CONFIG.video.width, 0, CONFIG.video.width, CONFIG.video.height)
      this.captureCtx.setTransform(1, 0, 0, 1, 0, 0) // resetear transformación
    } else if (this.video.elt.readyState >= 2) {
      this.captureCtx.drawImage(this.video.elt, 0, 0, CONFIG.video.width, CONFIG.video.height)
    } else {
      return null
    }

    return new Promise((resolve) => this.captureCanvas.toBlob(resolve, 'image/jpeg'))
  }

  getVideo() {
    return this.video
  }

  getVideoLayer() {
    return this.videoLayer
  }

  remove() {
    if (this.video) {
      if (this.video.elt) {
        this.video.elt.pause()
        this.video.elt.srcObject = null
        this.video.elt.remove()
      }
      this.video = null
    }

    if (this.videoLayer) {
      this.videoLayer.remove()
      this.videoLayer = null
    }
  }
}
