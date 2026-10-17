/** An image read into RGBA pixels (row 0 = the top of the image). */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
