// configuración global
const CONFIG = {
  video: {
    width: 1920,
    height: 1080,
    path: '/assets/videos/demo-7.mp4',
    inputSource: 'webcam', // video | webcam
    isWebcamFlipped: true,
    cameraIndex: 1,
  },
  pose: {
    endpoint: 'http://localhost:8000/detect',
    requestInterval: 60,
  },
}
