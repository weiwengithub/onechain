import DefaultCoinImage from '@/assets/images/coin/defaultCoin.png';

type ImageProps = {
  src?: string | null;
  defaultImgSrc?: string;
  alt?: string;
  className?: string;
};

export default function Image({ src, defaultImgSrc = DefaultCoinImage, alt, className }: ImageProps) {
  const validSrc = src || defaultImgSrc;

  return (
    <img
      className={className}
      src={validSrc}
      alt={alt}
      onError={(event) => {
        event.currentTarget.onerror = null;

        event.currentTarget.src = defaultImgSrc;
      }}
    />
  );
}
