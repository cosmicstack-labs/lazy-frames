export type ChanProp =
  | 'x'
  | 'y'
  | 'xPct'
  | 'yPct'
  | 'scale'
  | 'rotate'
  | 'opacity'
  | 'blur'
  | 'clipTop'
  | 'clipBottom'
  | 'widthPct'
  | 'textCount';

export interface ChanKey {
  t: number;
  v: number;
  e?: string;
}

export interface ChanFormat {
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export interface Channel {
  el: string;
  p: ChanProp;
  k: ChanKey[];
  f?: ChanFormat;
}

export interface WireScene {
  id: string;
  s: number;
  e: number;
}
