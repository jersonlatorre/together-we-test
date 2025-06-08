class PoseManager {
  constructor(videoManager) {
    this.videoManager = videoManager
    this.CONFIDENCE_THRESHOLD = 0.3
    this.lastRequestTime = 0
    this.skeletonData = []
    
    // datos procesados
    this.lineData = []
    this.headData = []
  }

  async requestPoses() {
    const blob = await this.videoManager.captureFrame()
    if (!blob) {
      console.error('no se pudo capturar el frame')
      return
    }

    const formData = new FormData()
    formData.append('file', blob, 'webcam.jpg')

    try {
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
      this.processData()
    } catch (error) {
      console.error('Error requesting poses:', error)
    }
  }

  processData() {
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

  update() {
    if (millis() - this.lastRequestTime > CONFIG.pose.requestInterval) {
      this.requestPoses()
      this.lastRequestTime = millis()
    }
  }

  getSkeletonData() {
    return this.skeletonData
  }

  getLineData() {
    return this.lineData
  }

  getHeadData() {
    return this.headData
  }

  hasValidData() {
    return this.skeletonData && this.skeletonData.length > 0
  }
} 