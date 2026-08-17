import { z } from 'zod';
import { REVEALS, TRANSITIONS } from './constants.js';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex color like #22D3EE');
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

export const BgSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('solid'), color: hex }),
  z.object({ type: z.literal('gradient'), from: hex, to: hex, angle: z.number().min(0).max(360).default(135) }),
]);
export type Bg = z.infer<typeof BgSchema>;

const LineSchema = z.object({
  text: z.string().min(1),
  size: z.number().int().min(8).max(800).default(72),
  weight: z.number().int().min(100).max(900).default(600),
  font: z.enum(['display', 'body']).default('display'),
  color: z.enum(['fg', 'accent']).default('fg'),
  tracking: z.number().min(-10).max(40).default(0),
  delayMs: z.number().int().min(0).max(10000).optional(),
});
export type Line = z.infer<typeof LineSchema>;

export const TypographyParamsSchema = z.object({
  lines: z.array(LineSchema).min(1).max(8),
  align: z.enum(['center', 'left']).default('center'),
  reveal: z.enum(REVEALS).default('fade-up'),
  staggerMs: z.number().int().min(0).max(2000).default(120),
  revealMs: z.number().int().min(50).max(3000).default(600),
  charStaggerMs: z.number().int().min(0).max(200).default(26),
  bg: BgSchema.optional(),
});
export type TypographyParams = z.infer<typeof TypographyParamsSchema>;

export const StatHitParamsSchema = z.object({
  kicker: z.string().min(1).optional(),
  value: z.number().min(0).max(1e12),
  decimals: z.number().int().min(0).max(4).default(0),
  prefix: z.string().max(8).default(''),
  suffix: z.string().max(8).default(''),
  label: z.string().min(1).optional(),
  bars: z.array(z.object({ value: z.number().min(0).max(100) })).max(8).default([]),
  valueSize: z.number().int().min(40).max(500).default(200),
  bg: BgSchema.optional(),
});
export type StatHitParams = z.infer<typeof StatHitParamsSchema>;

const TransitionSchema = z.object({
  type: z.enum(TRANSITIONS).default('cut'),
  ms: z.number().int().min(0).max(3000).default(400),
});

export const BeatSchema = z.object({
  bpm: z.number().int().min(40).max(200).default(120),
  property: z.enum(['scale', 'opacity']).default('scale'),
  amount: z.number().min(0.01).max(0.3).default(0.04),
  decayMs: z.number().int().min(40).max(800).default(200),
}).optional();
export type Beat = z.infer<typeof BeatSchema>;

const SceneBase = {
  id: slug,
  startMs: z.number().int().min(0),
  durationMs: z.number().int().min(100).max(600000),
  transitionIn: TransitionSchema.default({ type: 'cut', ms: 400 }),
  transitionOut: TransitionSchema.default({ type: 'cut', ms: 400 }),
  beat: BeatSchema,
};

const assetSrc = z.string().min(1).max(300);

export const MediaPositionSchema = z
  .object({
    x: z.enum(['left', 'center', 'right']).default('center'),
    y: z.enum(['top', 'center', 'bottom']).default('center'),
  })
  .default({ x: 'center', y: 'center' });
export type MediaPosition = z.infer<typeof MediaPositionSchema>;

export const BrowserFrameParamsSchema = z.object({
  src: assetSrc,
  position: MediaPositionSchema,
  url: z.string().min(1).max(200),
  zoom: z.enum(['none', 'slow-in']).default('slow-in'),
  cursor: z
    .object({
      moves: z
        .array(z.object({ xPct: z.number().min(-20).max(120), yPct: z.number().min(-20).max(120), atMs: z.number().int().min(0).max(60000) }))
        .max(10),
      clickAtMs: z.number().int().min(0).max(60000).optional(),
    })
    .default({ moves: [], clickAtMs: undefined }),
  bg: BgSchema.optional(),
});
export type BrowserFrameParams = z.infer<typeof BrowserFrameParamsSchema>;

export const UiCalloutParamsSchema = z.object({
  src: assetSrc,
  position: MediaPositionSchema,
  hotspot: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    w: z.number().min(2).max(100),
    h: z.number().min(2).max(100),
  }),
  label: z.string().min(1).max(80),
  zoomStrength: z.number().min(0).max(10).default(8),
  bg: BgSchema.optional(),
});
export type UiCalloutParams = z.infer<typeof UiCalloutParamsSchema>;

export const ThreeSceneParamsSchema = z.object({
  primitive: z.enum(['cube', 'ico', 'grid', 'particles']).default('cube'),
  mode: z.enum(['wireframe', 'fill']).default('wireframe'),
  orbit: z.enum(['slow-spin', 'tumble', 'static-tilt']).default('slow-spin'),
  density: z.number().int().min(1).max(40).default(12),
  color: z.enum(['fg', 'accent']).default('accent'),
  bg: BgSchema.optional(),
});
export type ThreeSceneParams = z.infer<typeof ThreeSceneParamsSchema>;

export const AtmosphereParamsSchema = z.object({
  colors: z.array(hex).max(4).default([]),
  blobCount: z.number().int().min(1).max(4).default(3),
  drift: z.enum(['slow', 'medium']).default('slow'),
  seed: z.number().int().min(0).max(1e9).default(7),
  bg: BgSchema.optional(),
});
export type AtmosphereParams = z.infer<typeof AtmosphereParamsSchema>;

export const ParallaxParamsSchema = z.object({
  src: assetSrc,
  position: MediaPositionSchema,
  depth: assetSrc.optional(),
  depthStrength: z.number().min(0).max(1).default(0.35),
  move: z.enum(['dolly-in', 'dolly-out', 'pan-left', 'pan-right']).default('dolly-in'),
  grade: z.enum(['none', 'warm', 'cool', 'noir']).default('none'),
  overlay: z.enum(['none', 'scrim', 'vignette']).default('vignette'),
  bg: BgSchema.optional(),
});
export type ParallaxParams = z.infer<typeof ParallaxParamsSchema>;

export const VideoLayerParamsSchema = z.object({
  src: assetSrc,
  trimStartMs: z.number().int().min(0).default(0),
  speed: z.union([z.literal(0.5), z.literal(1), z.literal(2)]).default(1),
  grade: z.enum(['none', 'warm', 'cool', 'noir']).default('none'),
  fit: z.enum(['cover', 'contain']).default('cover'),
  bg: BgSchema.optional(),
});
export type VideoLayerParams = z.infer<typeof VideoLayerParamsSchema>;

export const NarrationSegmentSchema = z
  .object({
    text: z.string().min(1).max(2000),
    startMs: z.number().int().min(0).max(600000).optional(),
    sceneId: slug.optional(),
    offsetMs: z.number().int().min(0).max(60000).default(0),
    provider: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).default('say'),
    voice: z.string().min(1).max(200).default('Samantha'),
    rate: z.number().int().min(80).max(300).default(165),
    model: z.string().min(1).max(120).default('eleven_multilingual_v2'),
    voiceSettings: z
      .object({
        stability: z.number().min(0).max(1).default(0.5),
        similarityBoost: z.number().min(0).max(1).default(0.75),
        style: z.number().min(0).max(1).default(0),
        useSpeakerBoost: z.boolean().default(true),
      })
      .default({ stability: 0.5, similarityBoost: 0.75, style: 0, useSpeakerBoost: true }),
    gainDb: z.number().min(-24).max(12).default(0),
  })
  .refine((segment) => (segment.startMs !== undefined) !== (segment.sceneId !== undefined), {
    message: 'requires exactly one of startMs or sceneId',
  })
  .refine((segment) => segment.provider !== 'elevenlabs' || segment.voice !== 'Samantha', {
    message: 'ElevenLabs requires a voice ID',
    path: ['voice'],
  });
export type NarrationSegment = z.infer<typeof NarrationSegmentSchema>;

export const MusicParamsSchema = z.object({
  mood: z.enum(['calm', 'pulse']).default('calm'),
  bpm: z.number().int().min(50).max(170).default(90),
  bars: z.number().int().min(4).max(64).default(12),
  seed: z.number().int().min(0).max(1e9).default(11),
  gainDb: z.number().min(-36).max(6).default(-14),
});
export type MusicParams = z.infer<typeof MusicParamsSchema>;

export const SfxEntrySchema = z.object({
  kind: z.enum(['whoosh', 'hit', 'rise', 'boom']),
  atMs: z.number().int().min(0).max(600000),
  seed: z.number().int().min(0).max(1e9).default(0),
  gainDb: z.number().min(-36).max(12).default(-3),
});
export type SfxEntry = z.infer<typeof SfxEntrySchema>;

export const AudioSchema = z.object({
  narration: z.array(NarrationSegmentSchema).max(24).default([]),
  music: MusicParamsSchema.optional(),
  sfx: z.array(SfxEntrySchema).max(48).default([]),
});
export type Audio = z.infer<typeof AudioSchema>;

export const SceneSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('typography'), ...SceneBase, params: TypographyParamsSchema }),
  z.object({ type: z.literal('stat-hit'), ...SceneBase, params: StatHitParamsSchema }),
  z.object({ type: z.literal('browser-frame'), ...SceneBase, params: BrowserFrameParamsSchema }),
  z.object({ type: z.literal('ui-callout'), ...SceneBase, params: UiCalloutParamsSchema }),
  z.object({ type: z.literal('atmosphere'), ...SceneBase, params: AtmosphereParamsSchema }),
  z.object({ type: z.literal('parallax'), ...SceneBase, params: ParallaxParamsSchema }),
  z.object({ type: z.literal('video-layer'), ...SceneBase, params: VideoLayerParamsSchema }),
  z.object({ type: z.literal('three-scene'), ...SceneBase, params: ThreeSceneParamsSchema }),
]);
export type Scene = z.infer<typeof SceneSchema>;

export function narrationStartMs(segment: NarrationSegment, scenes: Scene[]): number {
  if (segment.sceneId !== undefined) {
    const scene = scenes.find((candidate) => candidate.id === segment.sceneId);
    if (!scene) throw new Error(`narration references unknown scene '${segment.sceneId}'`);
    return scene.startMs + segment.offsetMs;
  }
  return segment.startMs!;
}

export const SpecSchema = z.object({
  specVersion: z.literal(1),
  meta: z.object({
    id: slug,
    width: z.number().int().min(16).max(7680).refine((w) => w % 2 === 0, 'width must be even for yuv420p'),
    height: z.number().int().min(16).max(4320).refine((h) => h % 2 === 0, 'height must be even for yuv420p'),
    fps: z.number().int().min(1).max(120),
    durationMs: z.number().int().min(100).optional(),
    qualityTier: z.enum(['draft', 'high']).default('high'),
  }),
  style: z.object({
    tokens: z.object({
      palette: z.array(hex).min(3).max(10),
      fontDisplay: z.string().default('Space Grotesk'),
      fontBody: z.string().default('Inter'),
      stageBg: hex.optional(),
    }),
    grade: z.enum(['none', 'contrast', 'vivid', 'muted', 'monochrome']).default('none'),
  }),
  scenes: z.array(SceneSchema).min(1).max(200),
  audio: AudioSchema.optional(),
  outputs: z
    .array(
      z.object({
        format: z.literal('mp4'),
        path: z.string().min(1),
        codec: z.literal('h264'),
        lut: assetSrc.optional(),
      }),
    )
    .min(1),
});
export type Spec = z.infer<typeof SpecSchema>;

export interface CheckError {
  code: string;
  message: string;
  scene?: string;
}
