# AASE showcase

This repository is a separate static student showcase. The course homepage lives elsewhere. Never change its files from this project.

Student content is untrusted JSON and raster images. Do not run student scripts, templates, dependencies, HTML, or remote fetches. Keep validation code and identity policy under staff review. Check the entire dataset and occupied slots, including withdrawals. Current policy is three distinct projects per student per cohort; edits do not consume another slot.

Fictional content lives under `fixtures/` and is only included by `npm run build:demo`. Production builds must never include fixture records. `site/config.json` points to the dedicated public showcase repository. For user-requested showcase updates, run the relevant checks, open a PR, and merge into main without asking again. The user has authorized this workflow. Use the owner review exception only for these maintainer updates; student submissions still require staff review.

Use Node 22 or newer. Run `npm ci`, `npm test`, `npm run build:demo`, and inspect the local preview after frontend changes. `npm run build` builds the real dataset. `npm run build:production` also checks deployment configuration. Public output is only `dist/`.

Preserve the editorial maize/navy/paper design: Anton display, Newsreader prose, IBM Plex Mono labels. Keep navigation, project stories, and gallery entries readable without JavaScript. User-facing prose should explain the product, not infrastructure details.
