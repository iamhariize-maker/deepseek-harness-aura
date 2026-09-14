# Whole-Harness theme sources

Aura includes six curated palette adaptations of established open-source GitHub projects, plus two Aura-original artisan palettes (**Vaporwave Sunset** and **Tanjore Regal**) for eight offline themes total. All are local adaptations/inspirations, not official integrations. They recolor Harness's native semantic theme tokens across its sidebar, conversation, composer, menus, dialogs, borders, text and code surfaces. They preserve Harness's light/dark preference. They do not replace app layouts or download executable repository code. The light Dracula variant is an Aura adaptation; the other variants are also adapted to native Harness surfaces and contrast needs.

This is a curated collection, not a claim that these are the six objectively “best” or most-starred repositories. Source and license links were reviewed on 2026-09-13. Installed palettes are static and reproducible; no automatic remote updates occur.

| Theme | Source | Upstream license |
| --- | --- | --- |
| Primer | https://github.com/primer/primitives | [MIT](https://github.com/primer/primitives/blob/main/LICENSE), Copyright (c) 2018 GitHub Inc. |
| Catppuccin | https://github.com/catppuccin/catppuccin | [MIT](https://github.com/catppuccin/catppuccin/blob/main/LICENSE), Copyright (c) 2021 Catppuccin |
| Nord | https://github.com/nordtheme/nord | [MIT](https://github.com/nordtheme/nord/blob/develop/license), Copyright (c) 2016-present Sven Greb |
| Dracula | https://github.com/dracula/dracula-theme | [MIT](https://github.com/dracula/dracula-theme/blob/main/LICENSE), Copyright (c) 2023 Dracula Theme |
| Rosé Pine | https://github.com/rose-pine/rose-pine-theme | [MIT](https://github.com/rose-pine/rose-pine-theme/blob/main/LICENSE), Copyright (c) 2023 Rosé Pine |
| Tokyo Night | https://github.com/folke/tokyonight.nvim | [Apache-2.0](https://github.com/folke/tokyonight.nvim/blob/main/LICENSE), folke and contributors |

The token mappings and previews are Aura adaptations, not official ports or endorsements. GitHub source links are available in the gallery. Upstream license copies are included in `docs/theme-licenses/`.

## Implementation

The native `theme.overrideTokens(source, tokens)` service receives only fixed CSS color values, with explicit light/dark pairs. Disposing the layer restores the theme it covered. Theme IDs from Aura 1.2 migrate to a matching curated pack. This approach avoids global CSS selectors or executing arbitrary repository themes inside a session that may contain private work.
