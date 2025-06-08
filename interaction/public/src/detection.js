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

    // dimensiones calculadas una sola vez
    this.dimensions = calculateVideoDimensions(CONFIG.video.width, CONFIG.video.height, width, height)

    // estado de detección
    this.state = DetectionStates.INIT
  }

  async init() {
    await this.initShader()
    await this.videoManager.init()
    this.starHeads = new StarHeads(this.effectsLayer)
    this.pendulums = new Pendulums(this.effectsLayer)
  }

  async initShader() {
    // cargar el shader con timestamp para evitar caché
    const timestamp = new Date().getTime()
    this.fragShader = (await loadStrings(`shaders/effect.frag?v=${timestamp}`)).join('\n')
    this.shader = createFilterShader(this.fragShader)
    this.shader.setUniform('canvasSize', [width, height])
    this.shader.setUniform('texelSize', [1.0 / width, 1.0 / height])

    // crear las capas gráficas
    this.shaderLayer = createGraphics(windowWidth, windowHeight)
    this.effectsLayer = createGraphics(windowWidth, windowHeight)
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

    // shader
    this.shader.setUniform('lineCount', count)
    this.shader.setUniform('headGlowStrength', 3.0)
    this.shader.setUniform('lines', linesArray)
    this.shader.setUniform('headCount', headCount)
    this.shader.setUniform('heads', headsArray)
    this.shader.setUniform('canvasSize', [width, height])
    this.shader.setUniform('lineOpacity', 0.2)
    this.shader.setUniform('headOpacity', 1.0)
    filter(this.shader)
  }

  drawChallenge1State() {}

  drawChallenge2State() {}
}
