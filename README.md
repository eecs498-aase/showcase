# AASE Showcase

A static exhibition of student projects, with GitHub pull requests as the submission workflow. The gallery, project stories, maker pages, search, and filters run on GitHub Pages. Student applications stay on their own hosting.

The showcase lives at [eecs498-aase.github.io/showcase](https://eecs498-aase.github.io/showcase/). Submit through [eecs498-aase/showcase](https://github.com/eecs498-aase/showcase). The course website is maintained separately.

Start with the [student submission guide](docs/SUBMITTING.md). Staff must register your GitHub account before your first project PR. Students host their own applications and backends; this repository publishes project stories, images, and links.

## Run it locally

Use Node 22 or newer. From this directory:

```sh
npm ci --ignore-scripts
npm test
npm run build:demo
npm run preview
```

Open [the local gallery](http://127.0.0.1:8770/showcase/), or the address printed by the preview server if a different port is selected. The demo includes clearly labeled fictional projects, so the design can be reviewed without publishing student identities or work.

```sh
npm run validate          # Validate only the real dataset
npm run build             # Build only the real dataset
npm run build:production  # Also check launch configuration
```

All builds write `dist/`. Production builds exclude the `fixtures/` directory. The image pipeline decodes and re-encodes student images, strips metadata from published variants, and generates smaller thumbnails; uploaded originals still exist in public Git history.

## Submission flow

**Student PR → trusted validation → staff review → merge → Pages build.**

Staff verifies an account privately, registers the student's chosen public identity, and students contribute JSON plus raster images in one of three fixed slots. Checks compare the PR author's numeric GitHub ID with the registered owner and validate the complete merged dataset. The current policy is three distinct projects per student per semester; revisions keep a slot, and withdrawn projects still occupy theirs. Staff verifies each participant before their first submission.

| Directory | Purpose |
| --- | --- |
| `projects/f26/<github-id>/01/` | Project JSON and its local images; slots `01`–`03` |
| `participants/` | Staff-approved public identities; not an enrollment roster |
| `policy/` | Allowed vocabulary, limits, and withdrawal records |
| `templates/project.json` | Submission starter |
| `site/` | Templates, style, browser code, and site configuration |
| `scripts/` | Validation, build, image processing, and local preview |
| `fixtures/` | Fictional design/test content, never production content |
| `.github/` | Read-only PR checks, protected-main publication, and review templates |

The frontend retains the experimental course design: Anton headlines, Newsreader prose, IBM Plex Mono labels, paper/navy/maize colors, and a short skippable intro. Project imagery leads the gallery. Search and filter state can be shared by URL. Project pages and links work without JavaScript.

## Administration

[The repository and Pages setup guide](docs/SETUP.md) documents the required settings. The initial code owner is `@rushilkag`. Student PRs require staff approval and a passing, up-to-date submission check. The repository owner has a review exception for maintainer updates; required checks still apply. Only protected `main` deploys, and the `SHOWCASE_PUBLISH_ENABLED` repository variable controls publication. Keep the protections active; the variable alone is not a security boundary.

- [Student submission guide](docs/SUBMITTING.md)
- [Staff operations, withdrawals, and rollback](docs/OPERATIONS.md)
- [Trust boundaries and workflow design](docs/SECURITY.md)
- [Design proposal](docs/DESIGN.md)

There is no application server, database, custom login, comments, or voting in this first version. The participant registry starts empty; fictional preview projects never enter production builds.
