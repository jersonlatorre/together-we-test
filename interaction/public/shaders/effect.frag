precision mediump float;

// variables pasadas desde el shader de vértice
varying vec2 vTexCoord;

// uniforms proporcionados automáticamente por p5.js
uniform sampler2D tex0;
uniform vec2 canvasSize;
uniform vec2 texelSize;

// constantes
const int MAX_LINES = 600;
const int MAX_HEADS = 50;

// uniforms personalizados
uniform int lineCount;
uniform float lines[MAX_LINES];
uniform int headCount;
uniform float heads[MAX_HEADS];
uniform float lineOpacity;
uniform float headOpacity;
uniform float headGlowStrength;

// constantes
const vec3 BACKGROUND_COLOR = vec3(0.0, 0.0, 0.1);
const float LINE_GLOW_SOFTNESS = 4.5;
const vec3 LINE_COLOR = vec3(0.8, 0.8, 1.0);  // #CCCCFF
const vec3 HEAD_COLOR = vec3(0.9, 0.9, 0.89); // #EAE9D7

// función de ruido simple
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// función optimizada para calcular la distancia de un punto a una línea
float segmentGlow(vec2 p, vec2 a, vec2 b, float radius, float softness) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float dist = length(pa - ba * h) - radius;
  return exp(-pow(dist / softness, 0.8));
}

void main() {
  vec2 pixelCoord = vTexCoord * canvasSize;

  // calcular glow de líneas
  float glow = 0.0;
  float softness = LINE_GLOW_SOFTNESS;

  for (int i = 0; i < MAX_LINES; i++) {
    if (i >= lineCount)
      break;
    vec2 start = vec2(lines[i * 4], lines[i * 4 + 1]);
    vec2 end = vec2(lines[i * 4 + 2], lines[i * 4 + 3]);
    glow += segmentGlow(pixelCoord, start, end, 0.0, softness);
  }

  // calcular glow de cabezas
  float headGlow = 0.0;
  for (int i = 0; i < MAX_HEADS; i++) {
    if (i >= headCount)
      break;
    vec2 headPos = vec2(heads[i * 2], heads[i * 2 + 1]);
    float dist = length(pixelCoord - headPos);
    headGlow += headGlowStrength / (dist + 0.001);
  }

  // mezclar colores
  vec3 gradientColor =
      mix(BACKGROUND_COLOR * 2.2, BACKGROUND_COLOR, vTexCoord.y);
  vec3 baseColor = mix(gradientColor, LINE_COLOR, glow * lineOpacity);
  vec3 finalColor = mix(baseColor, HEAD_COLOR, headGlow * headOpacity);

  // aplicar ruido
  float noise = random(pixelCoord * 0.01) * 0.05;
  finalColor += vec3(noise);

  gl_FragColor = vec4(finalColor, 1.0);
}