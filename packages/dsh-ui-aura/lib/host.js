import z from '@deepseek-ai/schemastery';
import { css, bootstrap, skinIds } from './bootstrap.generated.js';

// Host entry, independently reloadable from the browser bundle.
export const name = 'ui-aura';
export const inject = [];
export const UiSettings = z.object({
  skin: z.union(skinIds).default('catppuccin'),
  backdrop: z.union(['none', 'sun-grid', 'jali', 'peacock', 'custom']).default('none'),
  backdropSvg: z.string().default(''),
  opacity: z.number().min(0).max(25).default(8),
  blur: z.number().min(0).max(24).default(0),
  glow: z.number().min(0).max(100).default(55),
  border: z.number().min(0).max(8).default(2),
  arch: z.number().min(0).max(48).default(16),
  lattice: z.number().min(0).max(30).default(8),
});

export function validateUi(value) {
  if (!value.backdropSvg) return;
  if (value.backdropSvg.length > 45000 || !/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]*={0,2}$/.test(value.backdropSvg)) {
    throw Error('Backdrop must be a base64 SVG no larger than 32 KB.');
  }
  const svg = Buffer.from(value.backdropSvg.split(',')[1], 'base64').toString('utf8');
  if (Buffer.byteLength(svg) > 32768 || !/<svg\b/i.test(svg) || /<\s*(script|foreignObject|iframe|image|use)\b|\bon\w+\s*=|(?:href|src)\s*=|<!DOCTYPE|<!ENTITY|@import|url\s*\(/i.test(svg)) {
    throw Error('Use a self-contained SVG with paths and shapes only, without scripts or external resources.');
  }
}

export function apply(ctx) {
  ctx.inject(['settings'], settingsCtx => {
    settingsCtx.settings.register('ui-aura', UiSettings, { validate: validateUi });
  });
  ctx.on('webserver/index-inject', table => {
    const value = ctx.get('settings')?.get('ui-aura') ?? UiSettings({});
    table.push(
      { kind: 'global', name: '__AURA_BOOT__', value },
      { kind: 'html', placement: 'head', html: `<style data-plugin-css="dsh-ui-aura/aura.css">${css}</style>` },
      { kind: 'script', placement: 'body', text: bootstrap },
    );
  });
}
