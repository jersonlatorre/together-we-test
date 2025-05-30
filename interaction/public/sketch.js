let video
let lineData = []
let lastRequestTime = 0
let requestInterval = 100
let videoWidth = 1920
let videoHeight = 1080
let poseDetectionEndpoint = 'http://localhost:8000/detect'
let linesLayer
let startButton
let appStarted = false
let inputSource = 'video'
let videoPath = '/assets/videos/demo-2.mp4'
let showVideo = false // Controla si se dibuja el video
let s
let videoBuffer

let fragShader = `
precision mediump float;

// Variables pasadas desde el shader de vértice
varying vec2 vTexCoord;

// Uniforms proporcionados automáticamente por p5.js
uniform sampler2D tex0; // Textura de entrada (canvas)
uniform vec2 canvasSize; // Tamaño del canvas sin densidad de píxeles
uniform vec2 texelSize; // Tamaño de un píxel físico incluyendo densidad

// Uniforms personalizados
uniform float pixelSize;

void main() {
    // Obtener coordenadas de textura
    vec2 uv = vTexCoord;
    
    // Convertir a coordenadas de píxeles
    vec2 pixelCoord = uv * canvasSize;
    
    // Aplicar efecto de pixelación
    pixelCoord = floor(pixelCoord / pixelSize) * pixelSize + pixelSize * 0.5;
    
    // Volver a normalizar a [0,1]
    vec2 pixelatedUV = pixelCoord / canvasSize;
    
    // Muestrear la textura con las coordenadas pixeladas
    vec4 color = texture2D(tex0, pixelatedUV);
    
    // Salida final
    gl_FragColor = color;
}
`

function setup() {
  createCanvas(windowWidth, windowHeight)

  startButton = select('#startButton')
  startButton.mousePressed(startApp)
  linesLayer = createGraphics(windowWidth, windowHeight)
  s = createFilterShader(fragShader)
  videoBuffer = createGraphics(videoWidth, videoHeight)
}

function startApp() {
  startButton.style('display', 'none')
  appStarted = true

  if (inputSource === 'webcam') {
    video = createCapture(VIDEO)
    video.size(videoWidth, videoHeight)
    video.hide()
  } else {
    let videoElement = document.createElement('video')
    videoElement.src = videoPath
    videoElement.muted = true
    videoElement.loop = true
    videoElement.setAttribute('playsinline', '')

    video = {
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

    video.size(videoWidth, videoHeight)
    video.hide()

    videoElement
      .play()
      .then(() => {
        video._playing = true
      })
      .catch(console.error)
  }
}

function draw() {
  background(20)
  if (!appStarted || !video) return

  let videoRatio = videoWidth / videoHeight
  let canvasRatio = width / height
  let scaledWidth, scaledHeight

  if (canvasRatio > videoRatio) {
    scaledWidth = width
    scaledHeight = width / videoRatio
  } else {
    scaledHeight = height
    scaledWidth = height * videoRatio
  }

  let x = (width - scaledWidth) / 2
  let y = (height - scaledHeight) / 2

  // Draw video directly to the canvas if showVideo is true
  if (showVideo) {
    if (inputSource === 'webcam') {
      push()
      translate(width, 0)
      scale(-1, 1)
      image(video, width - scaledWidth - x, y, scaledWidth, scaledHeight)
      pop()
    } else if (video.elt) {
      drawingContext.drawImage(video.elt, x, y, scaledWidth, scaledHeight)
    }
  }

  // Draw lines on top of the video
  linesLayer.clear()
  drawLines(linesLayer)
  image(linesLayer, 0, 0, width, height)

  if (millis() - lastRequestTime > requestInterval) {
    requestPoses()
    lastRequestTime = millis()
  }

  // Dibujar el video en el buffer compatible
  if (video && (video.loadedmetadata || video.elt)) {
    videoBuffer.clear();
    if (inputSource === 'webcam') {
      // Invertir horizontalmente para webcam
      videoBuffer.push();
      videoBuffer.translate(videoWidth, 0);
      videoBuffer.scale(-1, 1);
      videoBuffer.image(video, 0, 0, videoWidth, videoHeight);
      videoBuffer.pop();
    } else {
      videoBuffer.image(video, 0, 0, videoWidth, videoHeight);
    }
  }

  s.setUniform('pixelSize', 10.0)
  filter(s)
}

async function requestPoses() {
  if (!appStarted || !video?.elt) return

  try {
    let canvas = document.createElement('canvas')
    canvas.width = videoWidth
    canvas.height = videoHeight
    let ctx = canvas.getContext('2d')

    if (inputSource === 'webcam') {
      ctx.scale(-1, 1)
      ctx.drawImage(video.elt, -videoWidth, 0, videoWidth, videoHeight)
    } else if (video.elt.readyState >= 2) {
      ctx.drawImage(video.elt, 0, 0, videoWidth, videoHeight)
    } else {
      return
    }

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg')
    })

    const formData = new FormData()
    formData.append('file', blob, 'webcam.jpg')

    const response = await fetch(poseDetectionEndpoint, {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      lineData = data.lines || []
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

function drawLines(gfx) {
  if (!lineData?.length) return

  let videoRatio = videoWidth / videoHeight
  let canvasRatio = width / height
  let scaledWidth, scaledHeight

  if (canvasRatio > videoRatio) {
    scaledWidth = width
    scaledHeight = width / videoRatio
  } else {
    scaledHeight = height
    scaledWidth = height * videoRatio
  }

  // Centrar el video en la pantalla
  let x = (width - scaledWidth) / 2
  let y = (height - scaledHeight) / 2

  gfx.push()
  gfx.stroke(0, 255, 0)
  gfx.strokeWeight(10) // Grosor de línea adecuado

  for (const lineObj of lineData) {
    // Calcular las coordenadas ajustadas al tamaño original del video
    let x1, y1, x2, y2

    if (inputSource === 'webcam') {
      // Para webcam (invertida)
      x1 = width - (lineObj.start.x * scaledWidth + x)
      y1 = lineObj.start.y * scaledHeight + y
      x2 = width - (lineObj.end.x * scaledWidth + x)
      y2 = lineObj.end.y * scaledHeight + y
    } else {
      // Para video (sin invertir)
      x1 = lineObj.start.x * scaledWidth + x
      y1 = lineObj.start.y * scaledHeight + y
      x2 = lineObj.end.x * scaledWidth + x
      y2 = lineObj.end.y * scaledHeight + y
    }

    gfx.line(x1, y1, x2, y2)
  }

  gfx.pop()
}
