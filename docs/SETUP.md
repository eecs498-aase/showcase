# Launch setup

This is the configuration runbook for [eecs498-aase/showcase](https://github.com/eecs498-aase/showcase), publishing to [the showcase](https://eecs498-aase.github.io/showcase/). Use it to verify or recreate the infrastructure; it is not evidence of current GitHub settings.

## 1. Public submission policy

Confirm opt-in participation, the private alternative for course submissions, the three-distinct-projects-per-semester rule, and who reviews withdrawals. Verify identities through a private course channel. A public PR is public before it is accepted; deleting a page does not erase its public fork or history.

## 2. Create the separate repository

The dedicated public repository is `eecs498-aase/showcase`, with `main` as its default branch. Add only this repository's files. Keep course materials and the existing course website in their current repositories. Do not copy student enrollment records into the public repository.

The project-site address is `https://eecs498-aase.github.io/showcase/`. Set `site/config.json`:

- `repositoryUrl`: the actual `https://github.com/<owner>/<repo>` URL.
- `siteUrl`: the Pages origin, without the `/showcase/` path.
- `basePath`: the repository site's path, including leading and trailing slashes.

The first trusted push bootstraps the validators and workflows. Keep student submissions closed until the protections below are active.

## 3. Configure staff review

The initial code owner is the existing organization administrator `@rushilkag`. Additional staff reviewers should be verified and added through a reviewed maintenance PR. GitHub does not allow self-approval. The owner `@rushilkag` has an explicit review exception for maintainer updates, authorized by the repository owner. Student submissions continue to require staff review; required checks remain enforced for everyone. Students contribute through forks; do not grant repository write access just to submit projects. Keep an active wildcard rule in `.github/CODEOWNERS` covering all files. A future staff team must actually exist and have write access.

Create a ruleset or branch protection for `main`:

1. Require pull requests and at least one approving staff code-owner review.
2. Dismiss stale approvals after new commits; require approval of the most recent reviewable push.
3. Require **Showcase submission validation** and require branches to be up to date before merging. Open a harmless bootstrap documentation PR if GitHub needs to observe the check before it is selectable.
4. Restrict direct pushes, force pushes, and deletion. Apply the rules to administrators as well. The only review bypass is `@rushilkag` for owner-requested maintenance; do not add students or automation accounts. This exception does not waive required status checks.
5. Keep the merge queue disabled for now. This implementation does not yet validate `merge_group` events.

Review the changed-file list before accepting a green check. A PR can propose modifications to its own `pull_request` workflow. The workflow's trusted-base validator helps for ordinary content PRs; it does not remove the need to protect and review workflow files themselves.

Repository protections are external GitHub settings. The local production preflight cannot verify that they are enabled or that a named team has the correct access. See [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## 4. Configure Actions and Pages

- Set Actions' default token permissions to read-only. Do not supply deployment secrets to pull-request workflows.
- Require approval for external fork workflow runs according to the organization's policy. A first-time student's run may wait for staff approval; approve only after checking the proposed workflow changes.
- In **Settings → Pages**, select **GitHub Actions** as the source.
- Create/configure the `github-pages` environment so only protected `main` can deploy. A staff reviewer for the first production deployment is useful while completing setup.
- Leave repository variable `SHOWCASE_PUBLISH_ENABLED` unset or `false` until the launch checks pass.

The publish workflow reads existing Pages configuration; it does not create or enable Pages automatically. Only its deployment job receives `pages: write` and `id-token: write`. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 5. Exercise the submission path

Use an authorized participating account and publication-safe test content, or a separate private test repository. Public test content creates public history. Test:

- A valid submission from its registered owner.
- A submission under someone else's ID and a fourth-slot submission, both rejected.
- A project PR that also changes a policy/workflow file, rejected as mixed maintenance and content.
- An update to the same project, a withdrawn project, and competing PRs refreshed against the current main branch.
- A staff maintenance-only PR. The PR job runs trusted validation against the existing policy; proposed scripts are not executed. Staff reviews and runs the proposed code locally, and main CI runs it after merge.

Run `npm ci --ignore-scripts`, `npm test`, and `npm run build:production` locally after configuring the site and code owners. Review the actual empty gallery or opted-in real projects at the configured base path. Do not deploy the demo fixture build.

## 6. Enable publication

Set the repository variable `SHOWCASE_PUBLISH_ENABLED` to exactly `true`. Run **Publish showcase** manually on `main`, or merge an approved change. Confirm the deployment URL, direct project and maker links, images, search, and mobile navigation. Subsequent merges to protected `main` rebuild and publish automatically.

Local previews never push or deploy. Publication runs only from the configured repository on protected `main`.
