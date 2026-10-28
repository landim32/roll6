import { Vector2 } from 'three';
import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { LIGHT_FEATHER_PX, lightRadiusPx } from '../../lib/isoLight';

/**
 * The light of the isometric view (103) inside the materials: every material of the scene is patched so the color of
 * each fragment is multiplied by how lit it is — `lib/isoLight.lightFactor` of its distance on the floor to the light's
 * center (keep the two formulas together). The floor and the grid fade into a slow dark fog past the circle; the pieces
 * are cut at the radius (the part outside is discarded, so it never covers the lit floor) — in their shadow pass too, so
 * a piece in the dark casts no shadow into the light; the shadows on the floor fade with the light. All patched materials
 * share one set of uniforms: moving the light or changing its radius is changing a uniform, nothing is rebuilt.
 */
export interface LightUniforms {
  lightCenter: { value: Vector2 };
  lightRadius: { value: number };
  lightFeather: { value: number };
  fogTime: { value: number };
}

export type LightKind = 'floor' | 'piece' | 'shadow';

export const createLightUniforms = (): LightUniforms => ({
  lightCenter: { value: new Vector2(0, 0) },
  lightRadius: { value: lightRadiusPx() },
  lightFeather: { value: LIGHT_FEATHER_PX },
  fogTime: { value: 0 },
});

const VERTEX_HEADER = 'varying vec3 vIsoWorld;\n';
// `transformed` is the vertex after skinning/morphing (object space): the world position of what is drawn.
const VERTEX_WORLD = '#include <project_vertex>\nvIsoWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n';

const FRAGMENT_HEADER = `varying vec3 vIsoWorld;
uniform vec2 lightCenter;
uniform float lightRadius;
uniform float lightFeather;
uniform float fogTime;

float isoHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float isoNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(isoHash(i), isoHash(i + vec2(1.0, 0.0)), u.x), mix(isoHash(i + vec2(0.0, 1.0)), isoHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

const LIT = `float isoDist = length(vIsoWorld.xz - lightCenter);
float isoLit = 1.0 - smoothstep(lightRadius - lightFeather, lightRadius, isoDist);
`;

const FLOOR_END = `${LIT}
// A slow dark fog past the circle: two octaves of value noise drifting, thinning out far away.
vec2 isoFogAt = vIsoWorld.xz / 260.0;
float isoFog = isoNoise(isoFogAt + vec2(fogTime * 0.05, fogTime * 0.03)) * 0.65
  + isoNoise(isoFogAt * 2.3 - vec2(fogTime * 0.04, 0.0)) * 0.35;
float isoFar = 1.0 - smoothstep(lightRadius * 1.5, lightRadius * 6.0, isoDist);
vec3 isoFogColor = vec3(0.055, 0.065, 0.085) * (0.35 + 0.65 * isoFog) * isoFar;
gl_FragColor.rgb = gl_FragColor.rgb * isoLit + isoFogColor * (1.0 - isoLit);
#include <dithering_fragment>`;

const PIECE_END = `${LIT}
if (isoDist > lightRadius) discard;
gl_FragColor.rgb *= isoLit;
#include <dithering_fragment>`;

// The shadow-receiving floor (`ShadowMaterial`, which has no dithering step): its shadows fade out with the light.
const SHADOW_END = `${LIT}
gl_FragColor.a *= isoLit;
#include <premultiplied_alpha_fragment>`;

// The depth pass of a piece's shadow (`MeshDepthMaterial`): the part in the dark casts nothing.
const DEPTH_END = `${LIT}
if (isoDist > lightRadius) discard;
}`;

/** Patches `material` (a built-in three.js material) with the light; `uniforms` are shared by every patched material. */
export const applyLight = (material: Material, uniforms: LightUniforms, kind: LightKind): void => {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERTEX_HEADER + shader.vertexShader.replace('#include <project_vertex>', VERTEX_WORLD);
    shader.fragmentShader = FRAGMENT_HEADER + (kind === 'shadow'
      ? shader.fragmentShader.replace('#include <premultiplied_alpha_fragment>', SHADOW_END)
      : shader.fragmentShader.replace('#include <dithering_fragment>', kind === 'floor' ? FLOOR_END : PIECE_END));
  };
  material.customProgramCacheKey = () => `roll6-iso-${kind}`;
  material.needsUpdate = true;
};

/**
 * The depth material a patched piece casts its shadow with: the default one would let the part in the dark (discarded
 * when drawn) still throw a shadow into the light. Ends `main` with the cut, after the depth is written.
 */
export const applyLightToDepth = (material: Material, uniforms: LightUniforms): void => {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERTEX_HEADER + shader.vertexShader.replace('#include <project_vertex>', VERTEX_WORLD);
    const body = shader.fragmentShader.trimEnd();
    shader.fragmentShader = FRAGMENT_HEADER + body.slice(0, body.lastIndexOf('}')) + DEPTH_END;
  };
  material.customProgramCacheKey = () => 'roll6-iso-depth';
  material.needsUpdate = true;
};
