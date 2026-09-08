import { LevelMeta } from './types';

export const LEVELS: LevelMeta[] = [
  {
    id: 'jump',
    title: '跳跳大冒险',
    subtitle: '踩着屋顶和小白追逐星星',
    icon: '🦘',
    emoji: '⭐',
  },
  {
    id: 'beam',
    title: '动感光波',
    subtitle: '用动感光波击落飞来的零食',
    icon: '⚡',
    emoji: '🌟',
  },
  {
    id: 'memory',
    title: '记忆翻牌',
    subtitle: '找出春日部的好伙伴',
    icon: '🃏',
    emoji: '✨',
  },
  {
    id: 'rhythm',
    title: '节奏打call',
    subtitle: '跟着节拍，让小新跳起来',
    icon: '🎵',
    emoji: '💫',
  },
  {
    id: 'aim',
    title: '追踪星星',
    subtitle: '60 秒点亮 72 颗漂动的小星星',
    icon: '🎯',
    emoji: '🌠',
  },
];

export const LEVEL_MAP = Object.fromEntries(
  LEVELS.map((l) => [l.id, l])
) as Record<string, LevelMeta>;