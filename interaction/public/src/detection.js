class DetectionStates {
  static INIT = 0
  static CHALLENGE_1 = 1
  static CHALLENGE_2 = 2
}

class Detection {
  constructor() {
    // managers
    this.videoManager = new VideoManager()
    this.poseManager = new PoseManager(this.videoManager)

    // capas gráficas
    this.shaderLayer = null
    this.effectsLayer = null

    // shaders
    this.shader = null
    this.fragShader = ''

    // efectos y animaciones
    this.pendulums = null
    this.starHeads = null
    this.mstGraph = null

    // dimensiones calculadas una sola vez
    this.dimensions = calculateVideoDimensions(CONFIG.video.width, CONFIG.video.height, width, height)

    // estado de detección
    this.state = DetectionStates.INIT

    // valores
    this.lineOpacity = 0.5
    this.lineGlowStrength = 6.0
    this.headOpacity = 0.7
    this.headGlowStrength = 3.0

    // gsap
    this.shaderTween = null
  }

  async init() {
    await this.initShader()
    await this.videoManager.init()
    this.starHeads = new StarHeads(this.effectsLayer)
    this.pendulums = new Pendulums(this.effectsLayer)
    this.mstGraph = new MSTGraph(this.effectsLayer)
  }

  async initShader() {
    // obtener el pixelDensity del canvas principal
    const mainPixelDensity = pixelDensity()
    
    // crear las capas gráficas con el mismo pixelDensity que el canvas principal
    this.shaderLayer = createGraphics(width, height, WEBGL)
    this.shaderLayer.pixelDensity(mainPixelDensity)
    
    this.effectsLayer = createGraphics(width, height)
    this.effectsLayer.pixelDensity(mainPixelDensity)

    // cargar el shader con timestamp para evitar caché
    const timestamp = new Date().getTime()
    this.fragShader = (await loadStrings(`shaders/effect.frag?v=${timestamp}`)).join('\n')

    // crear el shader en el contexto de la capa WEBGL
    this.shader = this.shaderLayer.createFilterShader(this.fragShader)
    this.shader.setUniform('canvasSize', [width, height])
    this.shader.setUniform('texelSize', [1.0 / width, 1.0 / height])
  }

  draw() {
    this.poseManager.update()
    this.videoManager.update()

    switch (this.state) {
      case DetectionStates.INIT:
        this.drawInitState()
        break
      case DetectionStates.CHALLENGE_1:
        this.drawChallenge1State()
        break
      case DetectionStates.CHALLENGE_2:
        this.drawChallenge2State()
        break
    }
  }

  drawInitState() {
    const lineData = this.poseManager.getLineData()
    const headData = this.poseManager.getHeadData()

    const { linesArray, count } = prepareLinesData(lineData, this.dimensions)
    const { headsArray, headCount } = prepareHeadsData(headData, this.dimensions)

    // aplicar shader sobre la capa específica
    this.shaderLayer.shader(this.shader)
    this.shader.setUniform('lineCount', count)
    this.shader.setUniform('lines', linesArray)
    this.shader.setUniform('headCount', headCount)
    this.shader.setUniform('heads', headsArray)
    this.shader.setUniform('canvasSize', [width, height])
    this.shader.setUniform('lineOpacity', this.lineOpacity)
    this.shader.setUniform('lineGlowStrength', this.lineGlowStrength)
    this.shader.setUniform('headOpacity', this.headOpacity)
    this.shader.setUniform('headGlowStrength', this.headGlowStrength)

    // dibujar un rectángulo centrado para activar el shader en WEBGL
    this.shaderLayer.rect(-width/2, -height/2, width, height)

    // mostrar la capa en el canvas principal sin transformaciones adicionales
    image(this.shaderLayer, 0, 0)
  }

  drawChallenge1State() {
    const lineData = this.poseManager.getLineData()
    const headData = this.poseManager.getHeadData()

    const { linesArray, count } = prepareLinesData(lineData, this.dimensions)
    const { headsArray, headCount } = prepareHeadsData(headData, this.dimensions)

    // aplicar shader sobre la capa específica
    this.shaderLayer.shader(this.shader)
    this.shader.setUniform('lineCount', count)
    this.shader.setUniform('lines', linesArray)
    this.shader.setUniform('headCount', headCount)
    this.shader.setUniform('heads', headsArray)
    this.shader.setUniform('canvasSize', [width, height])
    this.shader.setUniform('lineOpacity', this.lineOpacity)
    this.shader.setUniform('lineGlowStrength', this.lineGlowStrength)
    this.shader.setUniform('headOpacity', this.headOpacity)
    this.shader.setUniform('headGlowStrength', this.headGlowStrength)

    // dibujar un rectángulo centrado para activar el shader en WEBGL
    this.shaderLayer.rect(-width/2, -height/2, width, height)

    // mostrar la capa en el canvas principal
    image(this.shaderLayer, 0, 0)
  }

  drawChallenge2State() {
    const lineData = this.poseManager.getLineData()
    const headData = this.poseManager.getHeadData()

    const { linesArray, count } = prepareLinesData(lineData, this.dimensions)
    const { headsArray, headCount } = prepareHeadsData(headData, this.dimensions)

    // aplicar shader sobre la capa específica
    this.shaderLayer.shader(this.shader)
    this.shader.setUniform('lineCount', count)
    this.shader.setUniform('lines', linesArray)
    this.shader.setUniform('headCount', headCount)
    this.shader.setUniform('heads', headsArray)
    this.shader.setUniform('canvasSize', [width, height])
    this.shader.setUniform('lineOpacity', this.lineOpacity)
    this.shader.setUniform('lineGlowStrength', this.lineGlowStrength)
    this.shader.setUniform('headOpacity', this.headOpacity)
    this.shader.setUniform('headGlowStrength', this.headGlowStrength)

    // dibujar un rectángulo centrado para activar el shader en WEBGL
    this.shaderLayer.rect(-width/2, -height/2, width, height)

    // mostrar la capa en el canvas principal
    image(this.shaderLayer, 0, 0)

    // dibujar el mst encima del shader
    this.mstGraph.draw(headData, this.dimensions)
  }

  // transitions
  goToInitStateWithNoDelay() {
    this.lineOpacity = 0.5
    this.lineGlowStrength = 4.0
    this.headOpacity = 0.7
    this.headGlowStrength = 2.0
    this.state = DetectionStates.INIT
  }

  goToInitState() {
    this.shaderTween?.kill()
    this.shaderTween = gsap.to(this, {
      lineOpacity: 0.5,
      lineGlowStrength: 4.0,
      headOpacity: 0.7,
      headGlowStrength: 2.0,
      duration: 2,
    })
    this.state = DetectionStates.INIT
  }

  goToChallenge1State() {
    this.shaderTween?.kill()
    this.shaderTween = gsap.to(this, {
      lineOpacity: 0.05,
      lineGlowStrength: 5.0,
      headOpacity: 1.0,
      headGlowStrength: 6.0,
      duration: 2,
    })
    this.state = DetectionStates.CHALLENGE_1
  }

  goToChallenge2State() {
    this.shaderTween?.kill()
    this.shaderTween = gsap.to(this, {
      lineOpacity: 0.03,
      lineGlowStrength: 5.0,
      headOpacity: 1.0,
      headGlowStrength: 6.0,
      duration: 2,
    })
    this.state = DetectionStates.CHALLENGE_2
  }
}
