// 蜡笔小新风格的原创 Q 版角色 SVG
// 遵循"保留神韵(粗眉/马铃薯头/红T恤)、不照搬官方形象"原则
type Pose = 'idle' | 'run' | 'jump' | 'happy';

interface ShinchanProps {
  size?: number;
  pose?: Pose;
  flip?: boolean; // 水平翻转（面朝左）
  className?: string;
  expression?: 'smile' | 'grin' | 'excited';
}

export function Shinchan({
  size = 120,
  pose = 'idle',
  flip = false,
  className,
  expression = 'smile',
}: ShinchanProps) {
  // 肢体动态参数
  const arms = {
    idle: 'M40 52 C 30 60, 22 58, 18 52',
    run: 'M40 52 C 48 50, 56 44, 60 40',
    jump: 'M40 52 C 46 44, 54 44, 58 50',
    happy: 'M40 56 C 28 66, 20 66, 14 58 M56 50 C 54 48, 52 48, 50 50',
  }[pose];

  const bodyDy = pose === 'jump' ? -8 : 0;

  const mouth =
    expression === 'grin'
      ? 'M40 46 Q 48 54, 55 46'
      : expression === 'excited'
      ? 'M40 44 Q 48 58, 56 44'
      : 'M41 45 Q 47 51, 53 45';

  const eyeOpen = pose === 'happy' || expression === 'excited';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{
        transform: flip ? 'scaleX(-1)' : undefined,
        transformOrigin: 'center',
        overflow: 'visible',
      }}
      aria-hidden
    >
      {/* 尾巴 / 背景投影 */}
      <ellipse cx="40" cy={bodyDy + 70 - (pose === 'jump' ? 0 : 0)} rx="18" ry="4" fill="rgba(0,0,0,0.12)" />

      {/* 身体 - 红T恤 */}
      <path
        d={`M26 ${bodyDy + 40}
            C 26 ${bodyDy + 40}, 25 ${bodyDy + 62}, 34 ${bodyDy + 66}
            C 38 ${bodyDy + 67}, 42 ${bodyDy + 67}, 46 ${bodyDy + 66}
            C 55 ${bodyDy + 62}, 54 ${bodyDy + 40}, 54 ${bodyDy + 40}`}
        fill="#e63946"
        stroke="#3a1f0d"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* T恤领口 */}
      <path d={`M32 ${bodyDy + 41} Q 40 ${bodyDy + 46}, 48 ${bodyDy + 41}`} fill="#c72c3b" stroke="#3a1f0d" strokeWidth="1.5" fillOpacity="0.5" />
      {/* 手臂 */}
      <path d={arms} fill="none" stroke="#e6a37c" strokeWidth="5" strokeLinecap="round" />
      {/* 腿 */}
      <path
        d={`M32 ${bodyDy + 65} L 32 ${bodyDy + 72} M48 ${bodyDy + 65} L 48 ${bodyDy + 72}`}
        stroke="#e6a37c"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* 头 - 马铃薯形 */}
      <path
        d="M40 6
           C 54 6, 62 16, 61 28
           C 61 40, 54 50, 40 50
           C 26 50, 19 40, 19 28
           C 19 16, 27 6, 40 6 Z"
        fill="#f7cfa0"
        stroke="#3a1f0d"
        strokeWidth="2"
      />
      {/* 薯薯头发tuft */}
      <path
        d="M40 6 C 38 2, 42 2, 40 -1 C 43 2, 44 0, 46 3 C 43 4, 42 6, 40 6 Z"
        fill="#3a1f0d"
      />

      {/* 粗眉毛 */}
      <path d="M26 26 L 38 27 M42 27 L 54 26" stroke="#3a1f0d" strokeWidth="4.5" strokeLinecap="round" />
      {/* 眼睛 */}
      {eyeOpen ? (
        <g fill="none">
          <path d="M29 32 Q 32 34, 35 32" stroke="#3a1f0d" strokeWidth="2" strokeLinecap="round" />
          <path d="M45 32 Q 48 34, 51 32" stroke="#3a1f0d" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : (
        <g fill="#3a1f0d">
          <circle cx="32" cy="33" r="2.6" />
          <circle cx="48" cy="33" r="2.6" />
        </g>
      )}
      {/* 腮红 */}
      <circle cx="24" cy="37" r="3" fill="#f4a261" opacity="0.55" />
      <circle cx="56" cy="37" r="3" fill="#f4a261" opacity="0.55" />
      {/* 嘴巴 */}
      <path d={mouth} fill="none" stroke="#b3542a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}