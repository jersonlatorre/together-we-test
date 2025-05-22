// MAX_POSES, PATTERNS y StateMachine se definen globalmente desde scripts

let video
let poses = []
let socket
let totalDetectedPoses = 0
const DETECTION_INTERVAL = 100
let isDetecting = false

let poseGraphics
let nextImg
let lineImg
let idleState
let font
let fontLoaded = false
let nextImgLoaded = false
let lineImgLoaded = false
let backgroundImg = null
let backgroundImgLoaded = false
let cameras = [] // array para almacenar las cámaras disponibles
let cameraSelect // elemento select para las cámaras
let cameraSelectInitialized = false

function preload() {
  console.log('iniciando preload')
  try {
    // cargar la fuente
    font = loadFont(
      'assets/fonts/Roboto-Regular.ttf',
      () => {
        fontLoaded = true
      },
      (err) => {
        console.error('error cargando fuente:', err)
      }
    )

    // cargar la imagen del botón next
    nextImg = loadImage(
      'assets/images/next.svg',
      () => {
        nextImgLoaded = true
      },
      (err) => {
        console.error('error cargando imagen next:', err)
      }
    )

    // cargar la imagen de línea
    lineImg = loadImage(
      'assets/images/line.png',
      () => {
        console.log('lineImg cargada correctamente')
        lineImgLoaded = true
      },
      (err) => {
        console.error('error cargando imagen line:', err)
      }
    )

    // cargar la imagen de fondo
    backgroundImg = loadImage(
      'assets/images/background.png',
      () => {
        console.log('backgroundImg cargada correctamente')
        backgroundImgLoaded = true
      },
      (err) => {
        console.error('error cargando imagen de fondo:', err)
      }
    )
  } catch (error) {
    console.error('error en preload:', error)
  }
}

// función para solicitar acceso a las cámaras y luego listarlas
async function setupCameras() {
  try {
    // primero pedimos permiso para acceder a la cámara para obtener las etiquetas completas
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    
    // ahora enumeramos todos los dispositivos
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(device => device.kind === 'videoinput')
    
    cameras = videoDevices
    console.log('cámaras detectadas:', videoDevices)
    
    // crear selector de cámara si hay más de una y no se ha inicializado
    if (videoDevices.length > 0 && !cameraSelectInitialized) {
      if (cameraSelect) {
        cameraSelect.remove()
      }
      
      cameraSelect = createSelect()
      cameraSelect.position(10, 10)
      cameraSelect.style('z-index', '9999')
      cameraSelect.style('background-color', '#333')
      cameraSelect.style('color', '#fff')
      cameraSelect.style('padding', '5px')
      cameraSelect.style('border', '1px solid #555')
      
      videoDevices.forEach((device, index) => {
        // asegurar que hay etiqueta, o usar un nombre predeterminado
        const label = device.label || `Cámara ${index + 1}`
        cameraSelect.option(label, device.deviceId)
      })
      
      cameraSelect.changed(changeCamera)
      cameraSelectInitialized = true
      
      // si hay más de una cámara, agregar un botón para refrescar la lista
      if (videoDevices.length > 1) {
        let refreshButton = createButton('↻')
        refreshButton.position(cameraSelect.width + 20, 10)
        refreshButton.style('z-index', '9999')
        refreshButton.style('background-color', '#333')
        refreshButton.style('color', '#fff')
        refreshButton.style('border', '1px solid #555')
        refreshButton.style('cursor', 'pointer')
        refreshButton.mousePressed(setupCameras)
      }
    }
  } catch (err) {
    console.error('error al configurar cámaras:', err)
  }
}

// función para cambiar cámara
function changeCamera() {
  const deviceId = cameraSelect.value()
  if (!deviceId) return
  
  // detener el video actual
  if (video) {
    video.remove()
  }
  
  // crear nuevo video con el dispositivo seleccionado
  const constraints = {
    video: {
      deviceId: { exact: deviceId },
      width: { ideal: width },
      height: { ideal: height }
    }
  }
  
  // crear nuevo video con el dispositivo seleccionado
  video = createCapture(constraints)
  video.size(width, height)
  video.hide()
  
  // invertir el video horizontalmente
  video.elt.style.transform = 'scaleX(-1)'
  
  // esperar a que el video esté listo antes de iniciar detección
  video.elt.addEventListener('loadedmetadata', () => {
    console.log('nueva cámara lista:', cameraSelect.selected())
  })
}

function setup() {
  // calcular dimensiones para ratio 2:1
  let canvasWidth = windowWidth
  let canvasHeight = windowWidth / 2

  // si la altura calculada es mayor que windowHeight, ajustar basado en windowHeight
  if (canvasHeight > windowHeight) {
    canvasHeight = windowHeight
    canvasWidth = windowHeight * 2
  }

  // forzar WebGL2
  let canvas = createCanvas(canvasWidth, canvasHeight, WEBGL)
  // verificar que estamos en WebGL2
  let gl = canvas.GL

  // configurar video con las mismas dimensiones que el canvas
  video = createCapture(VIDEO)
  video.size(canvasWidth, canvasHeight)
  video.hide()

  // invertir el video horizontalmente
  video.elt.style.transform = 'scaleX(-1)'

  // usar fuente solo si está cargada
  if (fontLoaded && font) {
    textFont(font)
  }

  // crear buffer gráfico con el mismo tamaño que el canvas principal
  poseGraphics = createGraphics(canvasWidth, canvasHeight, P2D)
  poseGraphics.clear()
  poseGraphics.blendMode(BLEND)
  // eliminar canvas secundario del dom
  poseGraphics.canvas.remove()

  // inicializar estado idle
  idleState = new IdleState(poseGraphics)
  idleState.onEnter()

  // inicializar socket
  socket = io()

  // esperar a que el video esté listo antes de iniciar detección
  video.elt.addEventListener('loadedmetadata', () => {
    // iniciar loop de detección
    setInterval(detectPoses, DETECTION_INTERVAL)
    
    // configurar cámaras después de que el video principal esté listo
    // esto asegura que tenemos permisos y podemos ver las etiquetas
    setupCameras()
  })
}

async function detectPoses() {
  if (!video || !video.loadedmetadata || isDetecting) return

  isDetecting = true

  try {
    // crear un canvas temporal para capturar el frame
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = video.width
    tempCanvas.height = video.height
    const tempCtx = tempCanvas.getContext('2d')

    // invertir el contexto horizontalmente
    tempCtx.translate(tempCanvas.width, 0)
    tempCtx.scale(-1, 1)

    // dibujar el frame actual
    tempCtx.drawImage(video.elt, 0, 0, video.width, video.height)

    // convertir a blob
    const blob = await new Promise((resolve) => tempCanvas.toBlob(resolve, 'image/jpeg', 0.8))

    // crear form data
    const formData = new FormData()
    formData.append('file', blob, 'frame.jpg')

    const response = await fetch('http://localhost:8000/detect', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) throw new Error('error en la detección')

    const data = await response.json()

    // actualizar poses
    if (data.poses) {
      poses = data.poses.map((pose) => ({
        id: pose.id,
        keypoints: pose.keypoints.map((kp) => ({
          x: kp.x * width,
          y: kp.y * height,
          confidence: kp.confidence,
        })),
        timestamp: millis(),
      }))
    }
  } catch (error) {
    console.error('error:', error)
  } finally {
    isDetecting = false
  }
}

function draw() {
  // Limpiar el canvas principal
  translate(-width / 2, -height / 2)
  idleState.draw(poses)
}

function windowResized() {
  // recalcular dimensiones para ratio 2:1
  let canvasWidth = windowWidth
  let canvasHeight = windowWidth / 2

  // si la altura calculada es mayor que windowHeight, ajustar basado en windowHeight
  if (canvasHeight > windowHeight) {
    canvasHeight = windowHeight
    canvasWidth = windowHeight * 2
  }

  resizeCanvas(canvasWidth, canvasHeight)
  poseGraphics.resizeCanvas(canvasWidth, canvasHeight)
  
  // ajustar posición del selector de cámaras
  if (cameraSelect) {
    cameraSelect.position(10, 10)
  }
}
