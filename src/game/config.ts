import { LevelMeta } from './types';

export const LEVELS: LevelMeta[] = [
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
    subtitle: '找出所有可爱的好伙伴',
    icon: '🃏',
    emoji: '✨',
  },
  {
    id: 'cake',
    title: '叠蛋糕',
    subtitle: '看准时机，把蛋糕一层层叠到塔顶',
    icon: '🎂',
    emoji: '🍰',
  },
];

export const LEVEL_MAP = Object.fromEntries(
  LEVELS.map((l) => [l.id, l])
) as Record<string, LevelMeta>;