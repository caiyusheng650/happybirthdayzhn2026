import { useState } from 'react';
import html2canvas from 'html2canvas';

interface ShareButtonProps {
  targetSelector?: string; // 需要截图的元素选择器，默认截图整个可视区
  label?: string;
  className?: string;
}

/** 截图当前场景并分享/下载 */
export function ShareButton({
  targetSelector,
  label = '分享此刻',
  className,
}: ShareButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    setBusy(true);
    try {
      const target = targetSelector
        ? (document.querySelector(targetSelector) as HTMLElement)
        : document.getElementById('share-root');

      if (!target) {
        throw new Error('未找到分享目标');
      }

      const canvas = await html2canvas(target, {
        backgroundColor: '#ffeecb',
        scale: Math.min(2, window.devicePixelRatio || 1),
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('生成图片失败');

      const file = new File([blob], 'dreamstar-birthday.png', { type: 'image/png' });

      // 优先使用系统分享（移动端 Web Share API）
      const nav = navigator as Navigator & {
        canShare?: (data: unknown) => boolean;
        share?: (data: unknown) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: '祝你生日快乐 🎂' });
        return;
      }

      // 桌面端回退：触发下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dreamstar-birthday.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('分享失败', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={className || 'btn-crayon green'}
      onClick={handleShare}
      disabled={busy}
    >
      {busy ? '生成中…' : `📤 ${label}`}
    </button>
  );
}