import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { getBlob, ref } from 'firebase/storage';
import { storage } from '../../lib/firebase';

type SecureStorageImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  source: string;
};

export function SecureStorageImage({ source, alt, ...imageProps }: SecureStorageImageProps) {
  const [imageUrl, setImageUrl] = useState(source.startsWith('gs://') ? '' : source);

  useEffect(() => {
    if (!source.startsWith('gs://')) {
      setImageUrl(source);
      return;
    }

    let active = true;
    let objectUrl = '';

    getBlob(ref(storage, source))
      .then((blob) => {
        if (!active) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) {
          setImageUrl('');
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [source]);

  if (!imageUrl) {
    return <div className={imageProps.className} aria-label={alt} />;
  }

  return <img src={imageUrl} alt={alt} {...imageProps} />;
}
