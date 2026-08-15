import { z } from 'zod';
import { REVEALS, TRANSITIONS } from './constants.js';
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex color like #22D3EE');
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
export const BgSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('solid'), color: hex }),
    z.object({ type: z.literal('gradient'), from: hex, to: hex, angle: z.number().min(0).max(360).default(135) }),
]);
const LineSchema = z.object({
    text: z.string().min(1),
    size: z.number().int().min(8).max(800).default(72),
    weight: z.number().int().min(100).max(900).default(600),
    font: z.enum(['display', 'body']).default('display'),
    color: z.enum(['fg', 'accent']).default('fg'),
    tracking: z.number().min(-10).max(40).default(0),
    delayMs: z.number().int().min(0).max(10000).optional(),
});
export const TypographyParamsSchema = z.object({
    lines: z.array(LineSchema).min(1).max(8),
    align: z.enum(['center', 'left']).default('center'),
    reveal: z.enum(REVEALS).default('fade-up'),
    staggerMs: z.number().int().min(0).max(2000).default(120),
    revealMs: z.number().int().min(50).max(3000).default(600),
    charStaggerMs: z.number().int().min(0).max(200).default(26),
    bg: BgSchema.optional(),
});
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
const TransitionSchema = z.object({
    type: z.enum(TRANSITIONS).default('cut'),
    ms: z.number().int().min(0).max(3000).default(400),
});
const SceneBase = {
    id: slug,
    startMs: z.number().int().min(0),
    durationMs: z.number().int().min(100).max(600000),
    transitionIn: TransitionSchema.default({ type: 'cut', ms: 400 }),
    transitionOut: TransitionSchema.default({ type: 'cut', ms: 400 }),
};
export const SceneSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('typography'), ...SceneBase, params: TypographyParamsSchema }),
    z.object({ type: z.literal('stat-hit'), ...SceneBase, params: StatHitParamsSchema }),
]);
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
    }),
    scenes: z.array(SceneSchema).min(1).max(200),
    audio: z.unknown().optional(),
    outputs: z
        .array(z.object({ format: z.literal('mp4'), path: z.string().min(1), codec: z.literal('h264') }))
        .min(1),
});
