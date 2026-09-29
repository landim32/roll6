import { hexCenter } from '../../lib/hexGrid';
import { pieceGeometry, pieceImage } from '../../lib/pieceDrawing';
import { MAP_TOKEN_TYPE, POSTURE } from '../../types/mapToken';
import type { MapTokenInfo } from '../../types/mapToken';

interface TokenLayerProps {
  tokens: MapTokenInfo[];
  hexSize: number;
  /** A piece being moved: drawn at this position and facing instead of the saved ones (015). */
  preview?: { mapTokenId: number; x: number; y: number; look: number } | null;
}

/** Disc color class per piece type: blue characters, red NPCs, gray objects. */
const pieceClass = (tokenType: number): string => {
  if (tokenType === MAP_TOKEN_TYPE.character) return ' is-character';
  if (tokenType === MAP_TOKEN_TYPE.npc) return ' is-npc';
  return '';
};

/** Token images are drawn looking down (the bottom side, look 3). */
const IMAGE_LOOK = 3;

/** Extra classes of a piece: disc color by type and black and white when out of combat. */
const pieceClasses = (token: MapTokenInfo): string =>
  `stm-map-token${pieceClass(token.tokenType)}${token.posture === POSTURE.outOfCombat ? ' is-out' : ''}`;

/** The name's initial when the token has no image. */
const Initial = ({ name, size }: { name: string; size: number }) => (
  <text textAnchor="middle" dominantBaseline="central" fontSize={size}>
    {name.trim().charAt(0).toUpperCase() || '?'}
  </text>
);

/** Front mark: a small triangle pointing out of the front edge. */
const FrontMark = ({ y, mark }: { y: number; mark: number }) => (
  <path className="stm-map-token-front" d={`M${-mark} ${y - 1}L0 ${y + mark}L${mark} ${y - 1}Z`} />
);

/** A 1-hex piece: the image in a circle on a translucent disc (standing, or lying — turned or the down image). */
const SingleHexPiece = ({ token, hexSize }: { token: MapTokenInfo; hexSize: number }) => {
  const radius = hexSize * 0.8;
  const clipId = `stm-token-clip-${token.mapTokenId}`;
  const image = pieceImage(token);
  return (
    <>
      <circle className="stm-map-token-disc" r={radius} />
      {image.url ? (
        <>
          <clipPath id={clipId}>
            <circle r={radius} />
          </clipPath>
          <image
            href={image.url}
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
            transform={image.sideways ? 'rotate(90)' : undefined}
          />
        </>
      ) : (
        <Initial name={token.name} size={radius} />
      )}
      <FrontMark y={radius} mark={hexSize * 0.18} />
    </>
  );
};

/**
 * A piece of several hexes (031): the disc fills its whole shape (outlined only on the outer edges) and the image
 * covers the rectangle around it, clipped to the shape. Lying pieces without a down image turn the standing one 90°.
 */
const MultiHexPiece = ({ token, hexSize }: { token: MapTokenInfo; hexSize: number }) => {
  const geometry = pieceGeometry(token.space, hexSize);
  const { box } = geometry;
  const clipId = `stm-token-clip-${token.mapTokenId}`;
  const image = pieceImage(token);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Turned sideways, the image rectangle swaps its sides to still cover the box.
  const [width, height] = image.sideways ? [box.height, box.width] : [box.width, box.height];
  return (
    <>
      <path className="stm-map-token-disc stm-map-token-area" d={geometry.fillPath} />
      {image.url ? (
        <>
          <clipPath id={clipId}>
            <path d={geometry.fillPath} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <image
              href={image.url}
              x={cx - width / 2}
              y={cy - height / 2}
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid slice"
              transform={image.sideways ? `rotate(90 ${cx} ${cy})` : undefined}
            />
          </g>
        </>
      ) : (
        <Initial name={token.name} size={hexSize * 0.8} />
      )}
      <path className="stm-map-token-edge" d={geometry.edgePath} />
      <FrontMark y={geometry.front.y} mark={hexSize * 0.18} />
    </>
  );
};

/**
 * Pieces of the map, each on its hex (or its whole shape, 031): the image, or the name's initial. The disc behind it
 * is translucent — blue for campaign characters, red for NPCs, gray for objects. A piece facing `look` is turned by
 * (look − 3) × 60° from its downward-looking image, with a small mark on the front side (drawn on the bottom edge,
 * turning with it). Down / out-of-combat pieces lie; out of combat ones are in black and white.
 */
export const TokenLayer = ({ tokens, hexSize, preview = null }: TokenLayerProps) => (
  <g className="stm-map-tokens">
    {tokens.map((saved) => {
      const token = preview && preview.mapTokenId === saved.mapTokenId ? { ...saved, ...preview } : saved;
      const center = hexCenter(token.x, token.y, hexSize);
      return (
        <g
          key={token.mapTokenId}
          className={pieceClasses(token)}
          transform={`translate(${center.x} ${center.y}) rotate(${(token.look - IMAGE_LOOK) * 60})`}
        >
          <title>{token.name}</title>
          {token.space > 1
            ? <MultiHexPiece token={token} hexSize={hexSize} />
            : <SingleHexPiece token={token} hexSize={hexSize} />}
        </g>
      );
    })}
  </g>
);

export default TokenLayer;
