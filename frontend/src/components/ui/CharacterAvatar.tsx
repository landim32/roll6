interface CharacterAvatarProps {
  name: string;
  imageUrl?: string | null;
  /** Diameter in px. */
  size?: number;
}

/** Round character picture, or the initial of the name when there is no image. */
export const CharacterAvatar = ({ name, imageUrl, size = 36 }: CharacterAvatarProps) => {
  const style = { width: size, height: size, fontSize: size * 0.45 };
  if (imageUrl) return <img className="stm-avatar" src={imageUrl} alt={name} style={style} />;
  return (
    <span className="stm-avatar" style={style} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
};

export default CharacterAvatar;
