// constantes para keypoints del cuerpo
const KEYPOINTS = {
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

// umbrales de confianza
const CONFIDENCE_THRESHOLD = 0.3
const BODY_THRESHOLD = CONFIDENCE_THRESHOLD * 0.6
const LIMB_THRESHOLD = CONFIDENCE_THRESHOLD

// validar si un esqueleto es válido para procesamiento
function isValidSkeleton(kps) {
  if (!kps) return false

  const { SHOULDER_L, SHOULDER_R } = KEYPOINTS

  // verificar que existan los hombros (mínimo requerido)
  if (!kps[SHOULDER_L] || !kps[SHOULDER_R]) return false

  // verificar confianza mínima para hombros
  return kps[SHOULDER_L].confidence > CONFIDENCE_THRESHOLD && kps[SHOULDER_R].confidence > CONFIDENCE_THRESHOLD
}

// calcular puntos virtuales del cuerpo (nuca, hombros ajustados)
function calculateVirtualPoints(kps) {
  const { HEAD, SHOULDER_L, SHOULDER_R } = KEYPOINTS

  const nape = {
    x: (kps[SHOULDER_L].x + kps[SHOULDER_R].x) / 2,
    y: (kps[SHOULDER_L].y + kps[SHOULDER_R].y) / 2,
    conf: Math.min(kps[SHOULDER_L].confidence, kps[SHOULDER_R].confidence),
  }

  // solo ajustar posición de nuca si hay cabeza con confianza suficiente
  if (kps[HEAD] && kps[HEAD].confidence > CONFIDENCE_THRESHOLD) {
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

// generar líneas del esqueleto
function generateSkeletonLines(kps, virtualPoints) {
  const { nape, shoulders } = virtualPoints
  const KP = KEYPOINTS
  const lines = []

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
  if (kps[KP.HEAD] && kps[KP.HEAD].confidence > CONFIDENCE_THRESHOLD) {
    bodyLines.push([[kps[KP.HEAD].x, kps[KP.HEAD].y], [nape.x, nape.y], Math.min(kps[KP.HEAD].confidence, nape.conf)])
  }

  // líneas de extremidades
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
      lines.push({
        start: { x: p1[0], y: p1[1] },
        end: { x: p2[0], y: p2[1] },
        confidence: conf,
      })
    }
  })

  // agregar líneas de extremidades con umbral normal
  limbLines.forEach(([p1, p2, conf]) => {
    if (conf > LIMB_THRESHOLD) {
      lines.push({
        start: { x: p1[0], y: p1[1] },
        end: { x: p2[0], y: p2[1] },
        confidence: conf,
      })
    }
  })

  return lines
}

// calcular dimensiones de escalado para video
function calculateVideoDimensions(videoWidth, videoHeight, canvasWidth, canvasHeight) {
  const videoRatio = videoWidth / videoHeight
  const canvasRatio = canvasWidth / canvasHeight
  const scaledWidth = canvasRatio > videoRatio ? canvasWidth : canvasHeight * videoRatio
  const scaledHeight = canvasRatio > videoRatio ? canvasWidth / videoRatio : canvasHeight
  const x = (canvasWidth - scaledWidth) / 2
  const y = (canvasHeight - scaledHeight) / 2

  return { scaledWidth, scaledHeight, x, y }
}

// convertir coordenadas de video a canvas
function videoToCanvasCoords(videoX, videoY, dimensions) {
  const { scaledWidth, scaledHeight, x, y } = dimensions
  return {
    x: videoX * scaledWidth + x,
    y: videoY * scaledHeight + y,
  }
}

// calcular coordenadas de línea para shader
function calculateLineCoordinates(lineObj, dimensions) {
  const { scaledWidth, scaledHeight, x, y } = dimensions
  return [lineObj.start.x * scaledWidth + x, lineObj.start.y * scaledHeight + y, lineObj.end.x * scaledWidth + x, lineObj.end.y * scaledHeight + y]
}

// preparar datos de líneas para shader
function prepareLinesData(lineData, dimensions) {
  const linesArray = []
  const count = Math.min(lineData.length, 600)

  for (let i = 0; i < count; i++) {
    const lineObj = lineData[i]
    const coords = calculateLineCoordinates(lineObj, dimensions)
    linesArray.push(...coords)
  }

  // asegurar que el array tenga un tamaño mínimo para el shader
  while (linesArray.length < 400) linesArray.push(0)
  return { linesArray, count }
}

// preparar datos de cabezas para shader
function prepareHeadsData(headData, dimensions) {
  const headsArray = []
  const headCount = Math.min(headData.length, 50)

  for (let i = 0; i < headCount; i++) {
    const h = headData[i]
    const coords = videoToCanvasCoords(h.x, h.y, dimensions)
    headsArray.push(coords.x, coords.y)
  }

  return { headsArray, headCount }
}

// calcular distancia entre hombros
function calculateShoulderDistance(kps) {
  const { SHOULDER_L, SHOULDER_R } = KEYPOINTS
  if (!kps[SHOULDER_L] || !kps[SHOULDER_R]) return 0

  return dist(kps[SHOULDER_L].x, kps[SHOULDER_L].y, kps[SHOULDER_R].x, kps[SHOULDER_R].y)
}

// extraer datos de cabeza válidos
function extractHeadData(kps) {
  const { HEAD } = KEYPOINTS

  if (!kps[HEAD] || kps[HEAD].confidence <= CONFIDENCE_THRESHOLD) return null

  const shoulderDistance = calculateShoulderDistance(kps)

  return {
    x: kps[HEAD].x,
    y: kps[HEAD].y,
    shoulderDistance,
  }
}