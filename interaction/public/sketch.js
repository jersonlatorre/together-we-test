// configuración global
const CONFIG = {
  video: {
    width: 1920,
    height: 1080,
    path: '/assets/videos/demo-1.mp4',
    isWebcamFlipped: true,
  },
  pose: {
    endpoint: 'http://localhost:8000/detect',
    requestInterval: 100,
    confidenceThreshold: 0.3,
  },
  shader: {
    pixelSize: 1000.0,
    brightnessThreshold: 0,
  },
  keypoints: {
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
  },
}

// variables de estado
let state = {
  video: null,
  skeletonData: [],
  lineData: [],
  headData: [],
  lastRequestTime: 0,
  appStarted: true,
  inputSource: 'video',
  shader: null,
  videoBuffer: null,
  effectsLayer: null,
}

let video
let skeletonData = [] // almacena los esqueletos en crudo
let lineData = [] // generado localmente desde skeletonData
let headData = [] // generado localmente desde skeletonData
let lastRequestTime = 0
let requestInterval = 100
let videoWidth = 1920
let videoHeight = 1080
let poseDetectionEndpoint = 'http://localhost:8000/detect'
let linesLayer
let effectsLayer // capa para las cabezas
let appStarted = true // cambiado a true por defecto
// let inputSource = 'video'
let inputSource = 'video'
let videoPath = '/assets/videos/demo-1.mp4'
let showVideo = false // Controla si se dibuja el video
let s
let videoBuffer
let isWebcamFlipped = true // controla si la webcam está volteada

// constantes para los índices de keypoints de COCO
const HEAD = 0
const SHOULDER_L = 5
const SHOULDER_R = 6
const ELBOW_L = 7
const ELBOW_R = 8
const WRIST_L = 9
const WRIST_R = 10
const HIP_L = 11
const HIP_R = 12
const KNEE_L = 13
const KNEE_R = 14
const ANKLE_L = 15
const ANKLE_R = 16
const CONFIDENCE_THRESHOLD = 0.3

let fragShader = ''
let isFragShaderLoaded = false

async function setup() {
  try {
    // cargar y crear shader
    fragShader = await loadStrings('shaders/effect.frag')
    fragShader = fragShader.join('\n')

    // crear canvas antes del shader
    createCanvas(windowWidth, windowHeight)
    state.effectsLayer = createGraphics(windowWidth, windowHeight)
    state.videoBuffer = createGraphics(CONFIG.video.width, CONFIG.video.height)

    // crear shader después del canvas
    state.shader = createFilterShader(fragShader)
    if (!state.shader) {
      throw new Error('Failed to create shader')
    }

    // configurar shader
    state.shader.setUniform('pixelSize', CONFIG.shader.pixelSize)
    state.shader.setUniform('brightnessThreshold', CONFIG.shader.brightnessThreshold)
    state.shader.setUniform('canvasSize', [width, height])
    state.shader.setUniform('texelSize', [1.0 / width, 1.0 / height])

    isFragShaderLoaded = true
    console.log('Shader initialized successfully')
  } catch (error) {
    console.error('Error in setup:', error)
    return
  }

  // iniciar video
  if (state.inputSource === 'webcam') {
    state.video = createCapture(VIDEO)
    state.video.size(CONFIG.video.width, CONFIG.video.height)
    state.video.hide()
  } else {
    initVideoElement()
  }
}

function initVideoElement() {
  let videoElement = document.createElement('video')
  videoElement.src = CONFIG.video.path
  videoElement.muted = true
  videoElement.loop = true
  videoElement.setAttribute('playsinline', '')

  state.video = {
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

  state.video.size(CONFIG.video.width, CONFIG.video.height)
  state.video.hide()

  videoElement
    .play()
    .then(() => {
      state.video._playing = true
    })
    .catch(console.error)
}

function startApp() {
  startButton.style('display', 'none')
  state.appStarted = true

  if (state.inputSource === 'webcam') {
    state.video = createCapture(VIDEO)
    state.video.size(CONFIG.video.width, CONFIG.video.height)
    state.video.hide()
  } else {
    initVideoElement()
  }
}

// Función para procesar esqueletos y generar líneas
function processPoseData() {
  state.lineData = []
  state.headData = []

  if (!state.skeletonData?.length) return

  // cache de cálculos comunes
  const videoRatio = CONFIG.video.width / CONFIG.video.height
  const canvasRatio = width / height

  for (const skeleton of state.skeletonData) {
    const kps = skeleton.keypoints

    if (!kps || kps.length < 17) continue

    // procesar cabeza
    if (kps[CONFIG.keypoints.HEAD].confidence > CONFIG.pose.confidenceThreshold) {
      // verificar que los hombros se detectaron correctamente
      if (kps[CONFIG.keypoints.SHOULDER_L].confidence > CONFIG.pose.confidenceThreshold && kps[CONFIG.keypoints.SHOULDER_R].confidence > CONFIG.pose.confidenceThreshold) {
        // calcular distancia entre hombros
        const shoulderDistance = dist(
          kps[CONFIG.keypoints.SHOULDER_L].x,
          kps[CONFIG.keypoints.SHOULDER_L].y,
          kps[CONFIG.keypoints.SHOULDER_R].x,
          kps[CONFIG.keypoints.SHOULDER_R].y
        )
        state.headData.push({
          x: kps[CONFIG.keypoints.HEAD].x,
          y: kps[CONFIG.keypoints.HEAD].y,
          shoulderDistance: shoulderDistance,
        })
      }
    }

    // calcular puntos virtuales
    const virtualPoints = calculateVirtualPoints(kps)
    if (!virtualPoints) continue

    // agregar líneas
    addSkeletonLines(kps, virtualPoints)
  }
}

function calculateVirtualPoints(kps) {
  // verificar hombros
  if (kps[CONFIG.keypoints.SHOULDER_L].confidence <= CONFIG.pose.confidenceThreshold || kps[CONFIG.keypoints.SHOULDER_R].confidence <= CONFIG.pose.confidenceThreshold) {
    return null
  }

  // calcular nuca
  const nuca = {
    x: (kps[CONFIG.keypoints.SHOULDER_L].x + kps[CONFIG.keypoints.SHOULDER_R].x) / 2,
    y: (kps[CONFIG.keypoints.SHOULDER_L].y + kps[CONFIG.keypoints.SHOULDER_R].y) / 2,
    conf: Math.min(kps[CONFIG.keypoints.SHOULDER_L].confidence, kps[CONFIG.keypoints.SHOULDER_R].confidence),
  }

  // ajustar nuca hacia la cabeza si está disponible
  if (kps[CONFIG.keypoints.HEAD].confidence > CONFIG.pose.confidenceThreshold) {
    nuca.y = nuca.y * 0.8 + kps[CONFIG.keypoints.HEAD].y * 0.2
  }

  // calcular hombros virtuales
  const shoulders = {
    left:
      kps[CONFIG.keypoints.SHOULDER_L].confidence > CONFIG.pose.confidenceThreshold
        ? {
            x: (nuca.x + kps[CONFIG.keypoints.SHOULDER_L].x) / 2,
            y: (nuca.y + kps[CONFIG.keypoints.SHOULDER_L].y) / 2,
            conf: Math.min(nuca.conf, kps[CONFIG.keypoints.SHOULDER_L].confidence),
          }
        : null,
    right:
      kps[CONFIG.keypoints.SHOULDER_R].confidence > CONFIG.pose.confidenceThreshold
        ? {
            x: (nuca.x + kps[CONFIG.keypoints.SHOULDER_R].x) / 2,
            y: (nuca.y + kps[CONFIG.keypoints.SHOULDER_R].y) / 2,
            conf: Math.min(nuca.conf, kps[CONFIG.keypoints.SHOULDER_R].confidence),
          }
        : null,
  }

  return { nuca, shoulders }
}

function addSkeletonLines(kps, virtualPoints) {
  const { nuca, shoulders } = virtualPoints

  // función auxiliar para agregar líneas
  const addLine = (p1, p2, conf) => {
    if (conf > CONFIG.pose.confidenceThreshold) {
      state.lineData.push({
        start: { x: p1[0], y: p1[1] },
        end: { x: p2[0], y: p2[1] },
        confidence: conf,
      })
    }
  }

  // agregar líneas del esqueleto
  const lines = [
    // cabeza-nuca
    [[kps[CONFIG.keypoints.HEAD].x, kps[CONFIG.keypoints.HEAD].y], [nuca.x, nuca.y], Math.min(kps[CONFIG.keypoints.HEAD].confidence, nuca.conf)],
    // brazos izquierdos
    [
      [shoulders.left.x, shoulders.left.y],
      [kps[CONFIG.keypoints.ELBOW_L].x, kps[CONFIG.keypoints.ELBOW_L].y],
      Math.min(shoulders.left.conf, kps[CONFIG.keypoints.ELBOW_L].confidence),
    ],
    [
      [kps[CONFIG.keypoints.ELBOW_L].x, kps[CONFIG.keypoints.ELBOW_L].y],
      [kps[CONFIG.keypoints.WRIST_L].x, kps[CONFIG.keypoints.WRIST_L].y],
      Math.min(kps[CONFIG.keypoints.ELBOW_L].confidence, kps[CONFIG.keypoints.WRIST_L].confidence),
    ],
    // brazos derechos
    [
      [shoulders.right.x, shoulders.right.y],
      [kps[CONFIG.keypoints.ELBOW_R].x, kps[CONFIG.keypoints.ELBOW_R].y],
      Math.min(shoulders.right.conf, kps[CONFIG.keypoints.ELBOW_R].confidence),
    ],
    [
      [kps[CONFIG.keypoints.ELBOW_R].x, kps[CONFIG.keypoints.ELBOW_R].y],
      [kps[CONFIG.keypoints.WRIST_R].x, kps[CONFIG.keypoints.WRIST_R].y],
      Math.min(kps[CONFIG.keypoints.ELBOW_R].confidence, kps[CONFIG.keypoints.WRIST_R].confidence),
    ],
    // piernas izquierdas
    [
      [kps[CONFIG.keypoints.HIP_L].x, kps[CONFIG.keypoints.HIP_L].y],
      [kps[CONFIG.keypoints.KNEE_L].x, kps[CONFIG.keypoints.KNEE_L].y],
      Math.min(kps[CONFIG.keypoints.HIP_L].confidence, kps[CONFIG.keypoints.KNEE_L].confidence),
    ],
    [
      [kps[CONFIG.keypoints.KNEE_L].x, kps[CONFIG.keypoints.KNEE_L].y],
      [kps[CONFIG.keypoints.ANKLE_L].x, kps[CONFIG.keypoints.ANKLE_L].y],
      Math.min(kps[CONFIG.keypoints.KNEE_L].confidence, kps[CONFIG.keypoints.ANKLE_L].confidence),
    ],
    // piernas derechas
    [
      [kps[CONFIG.keypoints.HIP_R].x, kps[CONFIG.keypoints.HIP_R].y],
      [kps[CONFIG.keypoints.KNEE_R].x, kps[CONFIG.keypoints.KNEE_R].y],
      Math.min(kps[CONFIG.keypoints.HIP_R].confidence, kps[CONFIG.keypoints.KNEE_R].confidence),
    ],
    [
      [kps[CONFIG.keypoints.KNEE_R].x, kps[CONFIG.keypoints.KNEE_R].y],
      [kps[CONFIG.keypoints.ANKLE_R].x, kps[CONFIG.keypoints.ANKLE_R].y],
      Math.min(kps[CONFIG.keypoints.KNEE_R].confidence, kps[CONFIG.keypoints.ANKLE_R].confidence),
    ],
    // torso
    [[nuca.x, nuca.y], [shoulders.left.x, shoulders.left.y], Math.min(nuca.conf, shoulders.left.conf)],
    [[nuca.x, nuca.y], [shoulders.right.x, shoulders.right.y], Math.min(nuca.conf, shoulders.right.conf)],
    [[shoulders.left.x, shoulders.left.y], [kps[CONFIG.keypoints.HIP_L].x, kps[CONFIG.keypoints.HIP_L].y], Math.min(shoulders.left.conf, kps[CONFIG.keypoints.HIP_L].confidence)],
    [
      [shoulders.right.x, shoulders.right.y],
      [kps[CONFIG.keypoints.HIP_R].x, kps[CONFIG.keypoints.HIP_R].y],
      Math.min(shoulders.right.conf, kps[CONFIG.keypoints.HIP_R].confidence),
    ],
    [
      [kps[CONFIG.keypoints.HIP_L].x, kps[CONFIG.keypoints.HIP_L].y],
      [kps[CONFIG.keypoints.HIP_R].x, kps[CONFIG.keypoints.HIP_R].y],
      Math.min(kps[CONFIG.keypoints.HIP_L].confidence, kps[CONFIG.keypoints.HIP_R].confidence),
    ],
  ]

  lines.forEach(([p1, p2, conf]) => addLine(p1, p2, conf))
}

function draw() {
  if (!state.appStarted || !state.video || !isFragShaderLoaded || !state.shader) {
    console.log('Skipping draw:', {
      appStarted: state.appStarted,
      hasVideo: !!state.video,
      shaderLoaded: isFragShaderLoaded,
      hasShader: !!state.shader,
    })
    return
  }

  // procesar poses si es el momento
  if (millis() - state.lastRequestTime > CONFIG.pose.requestInterval) {
    requestPoses()
    state.lastRequestTime = millis()
  }

  // procesar datos de pose
  processPoseData()

  // dibujar video en buffer
  if (state.video && (state.video.loadedmetadata || state.video.elt)) {
    drawVideoToBuffer()
  }

  // calcular dimensiones
  const dimensions = calculateDimensions()

  // preparar datos para shader
  const { linesArray, count } = prepareLinesData(dimensions)
  const { headsArray, headCount } = prepareHeadsData(dimensions)

  // actualizar shader
  updateShader(linesArray, count, headsArray, headCount)

  // dibujar círculos en cabezas
  // drawHeadCircles(dimensions)
  drawStarLines(dimensions)
}

function drawVideoToBuffer() {
  state.videoBuffer.clear()
  if (state.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
    state.videoBuffer.push()
    state.videoBuffer.translate(CONFIG.video.width, 0)
    state.videoBuffer.scale(-1, 1)
    state.videoBuffer.image(state.video, 0, 0, CONFIG.video.width, CONFIG.video.height)
    state.videoBuffer.pop()
  } else {
    state.videoBuffer.image(state.video, 0, 0, CONFIG.video.width, CONFIG.video.height)
  }
}

function calculateDimensions() {
  const videoRatio = CONFIG.video.width / CONFIG.video.height
  const canvasRatio = width / height
  const scaledWidth = canvasRatio > videoRatio ? width : height * videoRatio
  const scaledHeight = canvasRatio > videoRatio ? width / videoRatio : height
  const x = (width - scaledWidth) / 2
  const y = (height - scaledHeight) / 2

  return { scaledWidth, scaledHeight, x, y }
}

function prepareLinesData({ scaledWidth, scaledHeight, x, y }) {
  const linesArray = []
  const count = Math.min(state.lineData.length, 600)

  for (let i = 0; i < count; i++) {
    const lineObj = state.lineData[i]
    const coords = calculateLineCoordinates(lineObj, scaledWidth, scaledHeight, x, y)
    linesArray.push(...coords)
  }

  // rellenar array hasta 400 elementos
  while (linesArray.length < 400) linesArray.push(0)

  return { linesArray, count }
}

function calculateLineCoordinates(lineObj, scaledWidth, scaledHeight, x, y) {
  if (state.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
    return [lineObj.start.x * scaledWidth + x, lineObj.start.y * scaledHeight + y, lineObj.end.x * scaledWidth + x, lineObj.end.y * scaledHeight + y]
  }

  return [lineObj.start.x * scaledWidth + x, lineObj.start.y * scaledHeight + y, lineObj.end.x * scaledWidth + x, lineObj.end.y * scaledHeight + y]
}

function prepareHeadsData({ scaledWidth, scaledHeight, x, y }) {
  const headsArray = []
  const headCount = Math.min(state.headData.length, 50)

  for (let i = 0; i < headCount; i++) {
    const h = state.headData[i]
    const coords = calculateHeadCoordinates(h, scaledWidth, scaledHeight, x, y)
    headsArray.push(...coords)
  }

  return { headsArray, headCount }
}

function calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y) {
  if (state.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
    return [head.x * scaledWidth + x, head.y * scaledHeight + y]
  }

  return [head.x * scaledWidth + x, head.y * scaledHeight + y]
}

function updateShader(linesArray, count, headsArray, headCount) {
  state.shader.setUniform('heads', headsArray)
  state.shader.setUniform('headCount', headCount)
  state.shader.setUniform('lines', linesArray)
  state.shader.setUniform('lineCount', count)
  state.shader.setUniform('canvasSize', [width, height])

  filter(state.shader)
}

function drawStarLines({ scaledWidth, scaledHeight, x, y }) {
  state.effectsLayer.clear()
  state.effectsLayer.push()
  state.effectsLayer.noFill()
  state.effectsLayer.stroke(255, 255, 255)
  // state.effectsLayer.strokeWeight(10)
  // state.effectsLayer.drawingContext.setLineDash([2, 2])

  for (const head of state.headData) {
    const coords = calculateHeadCoordinates(head, scaledWidth, scaledHeight, x, y)
    const radius = (head.shoulderDistance * scaledWidth) * 0.4

    // dibujar N líneas en ángulos distribuidos uniformemente
    let N = 12
    for (let i = 0; i < N; i++) {
      const angle = (2 * (i * PI)) / N // 36 grados entre cada línea
      const endX = coords[0] + cos(angle) * radius
      const endY = coords[1] + sin(angle) * radius

      // punto de inicio a mitad del radio
      const startX = coords[0] + cos(angle) * (radius * 0.85)
      const startY = coords[1] + sin(angle) * (radius * 0.85)
      state.effectsLayer.strokeWeight(1.5)
      state.effectsLayer.line(startX, startY, endX, endY)
    }
  }

  state.effectsLayer.drawingContext.setLineDash([])
  state.effectsLayer.pop()
  image(state.effectsLayer, 0, 0)
}

async function requestPoses() {
  if (!state.appStarted || !state.video?.elt) return

  try {
    const canvas = document.createElement('canvas')
    canvas.width = CONFIG.video.width
    canvas.height = CONFIG.video.height
    const ctx = canvas.getContext('2d')

    if (state.inputSource === 'webcam' && CONFIG.video.isWebcamFlipped) {
      ctx.scale(-1, 1)
      ctx.drawImage(state.video.elt, -CONFIG.video.width, 0, CONFIG.video.width, CONFIG.video.height)
    } else if (state.video.elt.readyState >= 2) {
      ctx.drawImage(state.video.elt, 0, 0, CONFIG.video.width, CONFIG.video.height)
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
      state.skeletonData = data.skeletons || []
    }
  } catch (error) {
    console.error('Error:', error)
  }
}
