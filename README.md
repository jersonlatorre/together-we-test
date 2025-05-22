# Together We Test

Sistema interactivo que combina detección de poses con interacción en tiempo real.

## Estructura del Proyecto

- `detector/`: Sistema de detección de poses usando YOLOv8
- `interaction/`: Sistema de interacción en tiempo real

## Requisitos

### Pose Detector
- Python 3.8+
- Dependencias listadas en `detector/requirements.txt`

### Interaction
- Sistema de interacción en tiempo real

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/together-we-test.git
cd together-we-test
```

2. Configurar el detector de poses:
```bash
cd detector
./run.sh
```

## Uso

1. Activar el detector de poses:
```bash
cd detector
source venv/bin/activate
python pose_detector.py
```

2. Iniciar el sistema de interacción (instrucciones específicas pendientes)

```bash
cd interaction/app
make run
```
