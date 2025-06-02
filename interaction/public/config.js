// configuración global
const CONFIG = {
  video: {
    width: 1920,
    height: 1080,
    path: '/assets/videos/demo-7.mp4',
    isWebcamFlipped: true,
    cameraIndex: 0,
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
