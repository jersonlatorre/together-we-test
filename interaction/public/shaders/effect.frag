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

// constantes
const float LINE_SOFTNESS = 5.0;
const float HEAD_GLOW_STRENGTH = 10.0;
const float HEAD_GLOW_MAX = 0.5;
const float HEAD_GLOW_INNER_MAX = 0.5;
const float LINE_GLOW_MAX = 5.0;
const vec3 BACKGROUND_COLOR = vec3(0.0, 0.0, 0.1);
const vec3 GLOW_COLOR = vec3(0.8, 0.8, 1.0);                // #CCCCFF
const vec3 HEAD_COLOR = vec3(0.8, 0.8, 1.0);                // #CCCCFF
const vec3 HEAD_COLOR_INNER = vec3(0.9176, 0.9137, 0.8431); // #EAE9D7

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
  float softness = LINE_SOFTNESS;

  for (int i = 0; i < MAX_LINES; i++) {
    if (i >= lineCount)
      break;
    vec2 start = vec2(lines[i * 4], lines[i * 4 + 1]);
    vec2 end = vec2(lines[i * 4 + 2], lines[i * 4 + 3]);
    glow += segmentGlow(pixelCoord, start, end, 0.0, softness);
  }
  glow = min(glow, LINE_GLOW_MAX);

  // calcular glow de cabezas
  float headGlow = 0.0;
  float innerHeadGlow = 0.0;
  for (int i = 0; i < MAX_HEADS; i++) {
    if (i >= headCount)
      break;
    vec2 headPos = vec2(heads[i * 2], heads[i * 2 + 1]);
    float dist = length(pixelCoord - headPos);
    headGlow += HEAD_GLOW_STRENGTH / (dist + 0.001);
    innerHeadGlow += HEAD_GLOW_STRENGTH / (dist * 8.0 + 0.001);
  }
  headGlow = min(headGlow, HEAD_GLOW_MAX);
  innerHeadGlow = min(innerHeadGlow, HEAD_GLOW_INNER_MAX);

  // mezclar colores
  vec3 gradientColor =
      mix(BACKGROUND_COLOR * 2.5, BACKGROUND_COLOR, vTexCoord.y);
  vec3 baseColor = mix(gradientColor, GLOW_COLOR, glow);
  vec3 finalColor = mix(baseColor, HEAD_COLOR, headGlow);
  finalColor = mix(finalColor, HEAD_COLOR_INNER, innerHeadGlow);

  gl_FragColor = vec4(finalColor, 1.0);
}