// 全局类型定义

/** 关卡枚举 */
export type LevelId = 'jump' | 'beam' | 'memory' | 'rhythm' | 'aim';

/** 舞台阶段 */
export type Stage =
  | 'start'       // 开场
  | 'level-select'// 关卡选择
  | 'playing'     // 关卡进行中
  | 'finale';     // 终幕舞台

/** 全局游戏状态 */
export interface GameState {
  stage: Stage;
  currentLevel: LevelId | null;
  playNonce: number; // 每次开始关卡递增，用于强制重挂载
  unlockedStars: Record<LevelId, boolean>;
  totalStars: number;
  muted: boolean;
  completed: boolean; // 是否通关终幕
}

/** 关卡元信息 */
export interface LevelMeta {
  id: LevelId;
  title: string;
  subtitle: string;
  icon: string;
  emoji: string;
}