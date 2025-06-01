precision mediump float;

// variables pasadas desde el shader de vértice
varying vec2 vTexCoord;

// uniforms proporcionados automáticamente por p5.js
uniform sampler2D tex0;
uniform vec2 canvasSize;
uniform vec2 texelSize;

// uniforms personalizados
uniform int lineCount;
uniform float lines[600];
uniform int headCount;
uniform float heads[200];
uniform float pixelSize;
uniform float brightnessThreshold;

// constantes
const float LINE_SOFTNESS = 40.0;
const float HEAD_GLOW_STRENGTH = 10.0;
const float HEAD_GLOW_MIN_DIST = 0.01;
const vec3 BASE_COLOR = vec3(0.0, 0.0, 0.1);
const vec3 GLOW_COLOR = vec3(0.8, 0.8, 1.0); // #CCCCFF
// const vec3 GLOW_COLOR = vec3(0.5, 0.5, 0.65); // #CCCCFF
const vec3 HEAD_COLOR = vec3(0.8, 0.8, 1.0);
const vec3 HEAD_COLOR_INNER = vec3(0.9176, 0.9137, 0.8431);

// función optimizada para calcular la distancia de un punto a una línea
float segmentGlow(vec2 p, vec2 a, vec2 b, float radius, float softness) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float dist = length(pa - ba * h) - radius;
  return exp(-pow(dist / softness, 0.5));
}

void main() {
  // pixelación optimizada
  vec2 pixelatedCoord = floor(vTexCoord * pixelSize) / pixelSize;
  vec2 pixelCoord = pixelatedCoord * canvasSize;

  // calcular glow de líneas
  float glow = 0.0;
  float softness = LINE_SOFTNESS / sqrt(float(lineCount));

  for (int i = 0; i < 600; i++) {
    if (i >= lineCount)
      break;
    vec2 start = vec2(lines[i * 4], lines[i * 4 + 1]);
    vec2 end = vec2(lines[i * 4 + 2], lines[i * 4 + 3]);
    glow += segmentGlow(pixelCoord, start, end, 0.0, softness);
  }
  glow = min(glow, 1.0);

  // calcular glow de cabezas
  float headGlow = 0.0;
  float innerHeadGlow = 0.0;
  for (int i = 0; i < 50; i++) {
    if (i >= headCount)
      break;
    vec2 headPos = vec2(heads[i * 2], heads[i * 2 + 1]);
    float dist = length(pixelCoord - headPos);
    headGlow += HEAD_GLOW_STRENGTH / (dist + HEAD_GLOW_MIN_DIST);
    // círculo interior más pequeño
    innerHeadGlow += HEAD_GLOW_STRENGTH / (dist * 2.0 + HEAD_GLOW_MIN_DIST);
  }
  headGlow = min(headGlow, 1.0);
  innerHeadGlow = min(innerHeadGlow, 1.0);

  // mezclar colores
  vec3 baseColor = mix(BASE_COLOR, GLOW_COLOR, glow);
  vec3 finalColor = mix(baseColor, HEAD_COLOR, headGlow);
  finalColor = mix(finalColor, HEAD_COLOR_INNER, innerHeadGlow);

  // aplicar umbral de brillo
  float brightness = (finalColor.r + finalColor.g + finalColor.b) / 3.0;
  if (brightness < brightnessThreshold) {
    finalColor = vec3(0.0);
  }

  gl_FragColor = vec4(finalColor, 1.0);
}