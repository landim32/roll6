interface ImageLayerProps {
  url: string | null;
  left: number;
  top: number;
  width: number | null;
  height: number | null;
}

/**
 * Scene image under the fixed grid: the grid starts at (0, 0) and the image is drawn at
 * (−left, −top) with its display size; negative values move it right/down. The stored file is
 * never changed.
 */
export const ImageLayer = ({ url, left, top, width, height }: ImageLayerProps) => {
  if (!url || !width || !height) return null;
  return <image href={url} x={-left} y={-top} width={width} height={height} preserveAspectRatio="none" />;
};

export default ImageLayer;
