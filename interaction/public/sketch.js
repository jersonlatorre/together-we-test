let video
let poseData = []
let lastRequestTime = 0
let requestInterval = 100
let videoWidth = 640
let videoHeight = 480
let poseDetectionEndpoint = 'http://localhost:8000/detect'
let scaleRatio = 1
let offsetX = 0
let offsetY = 0

function setup() {
  createCanvas(windowWidth, windowHeight)

  video = createCapture(VIDEO)
  video.size(videoWidth, videoHeight)
  video.hide()
}

function draw() {
  background(20)

  // Calculate scaling factor to cover the canvas while maintaining aspect ratio
  let videoRatio = videoWidth / videoHeight
  let canvasRatio = width / height

  if (canvasRatio > videoRatio) {
    // Canvas is wider than video
    scaleRatio = width / videoWidth
    offsetX = 0
    offsetY = (height - videoHeight * scaleRatio) / 2
  } else {
    // Canvas is taller than video
    scaleRatio = height / videoHeight
    offsetX = (width - videoWidth * scaleRatio) / 2
    offsetY = 0
  }

  // push()
  // translate(width / 2, height / 2)
  // scale(-1, 1) // Flip horizontally
  // let scaledWidth = videoWidth * scaleRatio
  // let scaledHeight = videoHeight * scaleRatio
  // image(video, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
  // pop()

  if (millis() - lastRequestTime > requestInterval) {
    requestPoses()
    lastRequestTime = millis()
  }

  drawPoses()
}

async function requestPoses() {
  try {
    let canvas = document.createElement('canvas')
    canvas.width = videoWidth
    canvas.height = videoHeight
    let ctx = canvas.getContext('2d')

    ctx.scale(-1, 1)
    ctx.drawImage(video.elt, -videoWidth, 0, videoWidth, videoHeight)

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
      poseData = data.poses
      console.log('Poses detected:', poseData.length)
    } else {
      console.error('Error fetching poses:', response.statusText)
    }
  } catch (error) {
    console.error('Error requesting poses:', error)
  }
}

function drawPoses() {
  if (!poseData || poseData.length === 0) return

  push()
  translate(width / 2, height / 2)

  for (const pose of poseData) {
    const keypoints = pose.keypoints

    drawConnections(keypoints)
    for (const keypoint of keypoints) {
      if (keypoint.confidence > 0.3) {
        // Scale keypoints to match the video scaling
        const x = (keypoint.x - 0.5) * videoWidth * scaleRatio
        const y = (keypoint.y - 0.5) * videoHeight * scaleRatio

        fill(255, 0, 0)
        noStroke()
        ellipse(x, y, 10, 10)
      }
    }
  }

  pop()
}

function drawConnections(keypoints) {
  const connections = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [5, 7],
    [7, 9],
    [6, 8],
    [8, 10],
    [5, 6],
    [5, 11],
    [6, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
  ]

  stroke(0, 255, 0)
  strokeWeight(3)

  for (const [p1, p2] of connections) {
    const point1 = keypoints[p1]
    const point2 = keypoints[p2]

    if (point1 && point2 && point1.confidence > 0.3 && point2.confidence > 0.3) {
      // Scale connection points to match the video scaling
      const x1 = (point1.x - 0.5) * videoWidth * scaleRatio
      const y1 = (point1.y - 0.5) * videoHeight * scaleRatio
      const x2 = (point2.x - 0.5) * videoWidth * scaleRatio
      const y2 = (point2.y - 0.5) * videoHeight * scaleRatio

      line(x1, y1, x2, y2)
    }
  }
}
