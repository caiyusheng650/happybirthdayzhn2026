// 蜡笔手绘质感：SVG feTurbulence 位移滤镜，给图案加蜡笔抖动边缘
// 该滤镜定义一次，全局通过 CSS filter: url(#crayonXYZ) 引用
export function CrayonFilters() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
      <defs>
        {/* 强抖动：适合粗线条角色 */}
        <filter id="crayon-strong" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06 0.09"
            numOctaves="3"
            result="noise"
            seed="2"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* 轻微抖动：适合文字细节 */}
        <filter id="crayon-soft" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.15 0.2"
            numOctaves="2"
            result="noise"
            seed="7"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* 纸张颗粒背景 */}
        <filter id="paper-texture">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="11"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"
          />
        </filter>
      </defs>
    </svg>
  );
}