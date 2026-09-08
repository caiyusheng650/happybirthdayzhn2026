// 可复用星形图标
interface StarIconProps {
  size?: number;
  filled?: boolean;
  className?: string;
}
export function StarIcon({ size = 24, filled = true, className = 'star' }: StarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        d="M12 2 L14.9 8.6 L22 9.3 L16.7 14 L18.2 21 L12 17.3 L5.8 21 L7.3 14 L2 9.3 L9.1 8.6 Z"
        fill={filled ? '#ffd166' : 'rgba(0,0,0,0.08)'}
      />
    </svg>
  );
}