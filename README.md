# Together We Test

Sistema interactivo que combina detección de poses con interacción en tiempo real.

## Requisitos

- Python 3.10+
- Dependencias listadas en `detector/requirements.txt`

## Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/tu-usuario/together-we-test.git
cd together-we-test
```

## Uso

Ejecutar el sistema:

```bash
# En Windows
./run-detector.bat
./run-interaction.bat

# En Linux o macOS
./run-detector.sh
./run-interaction.sh
```

## Configuración

### Fuente de Video

El sistema puede usar dos tipos de entrada de video:

1. **Video Predefinido** (`inputSource: 'video'`):
   - Usa un archivo de video desde la ruta especificada
   - Por defecto: `/assets/videos/demo-7.mp4`

2. **Cámara Web** (`inputSource: 'webcam'`):
   - Usa la cámara web del dispositivo
   - `cameraIndex`: selecciona qué cámara usar cuando hay múltiples disponibles
     - `0`: cámara principal (por defecto)
     - `1`: segunda cámara
     - etc.

Para cambiar la configuración, edita `interaction/public/src/config.js`:

```javascript
const CONFIG = {
  video: {
    inputSource: 'video', // 'video' | 'webcam'
    cameraIndex: 0,       // índice de la cámara (solo para webcam)
    // ... otras configuraciones
  }
}
```
