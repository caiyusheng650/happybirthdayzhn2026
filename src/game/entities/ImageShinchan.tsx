import { useState } from 'react';
import { Shinchan } from './Shinchan';

interface ImageShinchanProps {
  size?: number;
  src?: string;
  alt?: string;
  flip?: boolean;
  style?: React.CSSProperties;
}

// 现成的蜡笔小新图片（个人使用，无需担心版权）
const DEFAULT_SRC =
  'https://aka.doubaocdn.com/s/MVzseN7X1R'; // 奔跑的小新 PNG

/** 优先加载现有小新图片，加载失败时回退到内置 SVG 形象 */
export function ImageShinchan({
  size = 120,
  src = DEFAULT_SRC,
  alt = '蜡笔小新',
  flip = false,
  style,
}: ImageShinchanProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div style={{ width: size, height: size, ...style }}>
        <Shinchan size={size} flip={flip} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      crossOrigin="anonymous"
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        transform: flip ? 'scaleX(-1)' : undefined,
        ...style,
      }}
    />
  );
}