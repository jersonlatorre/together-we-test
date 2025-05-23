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

## Uso

1. Primero, ejecutar el detector de poses:

```bash
./run-detector.bat # en windows
./run-detector.sh # en linux o macos
```

2. Luego, inicia el sistema de interacción:

```bash
./run-interaction.bat # en windows
./run-interaction.sh # en linux o macos
```