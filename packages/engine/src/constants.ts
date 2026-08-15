export const EASE_NAMES = [
  'linear',
  'outCubic',
  'inOutCubic',
  'outExpo',
  'outQuint',
  'inOutSine',
  'outBack',
] as const;

export type EaseName = (typeof EASE_NAMES)[number];

export const TRANSITIONS = ['cut', 'fade', 'dissolve', 'whip-pan', 'light-leak', 'dip-to-black', 'luma-wipe'] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

export const SCENE_TYPES = [
  'typography',
  'stat-hit',
  'browser-frame',
  'ui-callout',
  'atmosphere',
  'parallax',
  'video-layer',
  'three-scene',
] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

export const REVEALS = ['fade-up', 'letter-stagger', 'mask-wipe', 'scale-in'] as const;
export type RevealType = (typeof REVEALS)[number];
