/**
 * Depth of the 2,5D figures for the 3D models' layer (057). The raycaster paints the figures and knows, per pixel, how
 * far the figure it painted is (its perpendicular distance, which is exactly the view-space depth of the models'
 * camera — `lib/modelCamera`: same eye, same yaw, no tilt). The model layer writes that distance into its depth buffer
 * before drawing the models, so a model behind a nearer figure is hidden there. Pure: shared by the shader (as GLSL) and
 * the tests, which check it against three.js's own projection.
 */

/** How much a figure is pulled toward the camera, as a share of its depth: a model at exactly the same depth stays behind. */
export const FIGURE_DEPTH_BIAS = 1e-4;

export const figureDepthBias = (depth: number): number => depth * (1 - FIGURE_DEPTH_BIAS);

/** The value a perspective camera with `near`/`far` writes in the depth buffer for a point `depth` units ahead. */
export const depthBufferValue = (depth: number, near: number, far: number): number =>
  ((far + near) / (far - near) - (2 * far * near) / ((far - near) * depth)) * 0.5 + 0.5;

/** The same formula for the shader. */
export const FIGURE_DEPTH_GLSL = `
float depthBufferValue(float d, float near, float far) {
  return ((far + near) / (far - near) - (2.0 * far * near) / ((far - near) * d)) * 0.5 + 0.5;
}
`;
