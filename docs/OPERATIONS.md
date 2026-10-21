# Staff operations

Public showcase review is separate from grading. Keep student verification records, private feedback, and participation decisions in existing private course systems.

## Register a participating student

Verify the account and public display name privately. Add the approved public identity to the correct `participants/<cohort>.json` file in a **maintenance-only** PR. Use the numeric account ID as the key; names and GitHub handles do not establish ownership. Register at most one account per student per cohort. Do not add a full class roster or publish nonparticipants.

The following record is fictional; replace it with the verified opted-in identity. `bio` can be empty, and `github` can be `null` when a profile link is not wanted:

```json
{
  "cohort": "f26",
  "participants": [
    { "id": 12345678, "displayName": "Chosen public name", "bio": "", "github": null }
  ]
}
```

Review and merge the registry change before the student opens a project PR. Project files and maintenance files cannot be changed together. Account migrations require a staff-reviewed plan; a student cannot rename their own ownership directory or occupied project identity.

## Review a project PR

1. Inspect the changed files before approving a first-time fork workflow run. A content PR should contain only that student's project JSON and raster images.
2. Require **Showcase submission validation** against the current base and the configured staff code-owner approval. If `main` advances, update the PR and wait for the new result.
3. Read the story, inspect the images, check links manually, and confirm the material is appropriate for publication. Tests cannot judge the truth of claims or publication rights.
4. Merge through the protected branch. A successful merge starts the publish workflow only when publication has been enabled. Confirm the deployment succeeded before telling the student the page is live.

The pipeline never visits arbitrary submitted URLs or runs student applications. Opening a demo to review its content is a staff decision. Do not accept private course-source exposure as a prerequisite for showcasing a project.

## Maintenance PRs

Keep templates, browser code, validation rules, policy, registry, workflows, and documentation changes separate from project files. The read-only PR workflow validates current project data using the trusted base; it does **not** run proposed code from the PR. Staff must inspect the changes and run the proposed tests/build locally. Main CI runs the newly trusted code after merge, and publication independently validates and tests it again.

Before merging a maintenance PR, run:

```sh
npm ci --ignore-scripts
npm test
npm run validate
npm run build:demo
```

For a launch configuration change, also run `npm run build:production` and inspect the real dataset. Never publish `dist/` left over from a demo build manually.

## Withdraw a project

Confirm the request through the private course channel. Add the project's permanent ID, owner, cohort, and slot to `policy/publication.json`'s `withdrawals` array in a staff maintenance PR. Preserve its identity and occupied slot. The build omits withdrawn projects from the gallery, project pages, maker listings, search index, and published media. A maker with no published projects is omitted too.

For example, the fictional entry `f26-12345678-01` needs this record in the existing array; retain any other records and the `featuredProjectId` field:

```json
{ "projectId": "f26-12345678-01", "ownerId": 12345678, "cohort": "f26", "slot": "01" }
```

Keep the source project files in place for this initial workflow; mixed content and maintenance PRs are deliberately rejected. Routine source-file deletion is not supported through the student submission path. A separate reviewed maintenance procedure would be needed if staff decides to remove current-tree source files while retaining withdrawal records.

After merging, confirm the Pages deployment completed and direct page/media URLs no longer serve current content. A public Git history, forks, cached copies, or downloads are not erased by a withdrawal. For exposed secrets or sensitive material, disable publication if needed and use the host's incident/removal process in addition to withdrawing the page.

## Pause publishing or restore a version

To pause future publication, set repository variable `SHOWCASE_PUBLISH_ENABLED` to `false`. This does not remove the currently published site. To remove the site entirely, use the repository's Pages settings after obtaining the appropriate authorization.

For an ordinary regression, create a new staff PR that reverts the faulty maintenance change, test it, and merge through the same protections. Preserve newer accepted projects and withdrawal records; do not reset the entire repository to an old commit or force-push history. Reverting a content correction requires a PR authored by the registered owner or a separately reviewed staff process.

The next successful build publishes the corrected site. Failed validation or builds do not replace the last successful deployment. Deployment runs reject a commit that has already been superseded on `main`; rerunning an old workflow is not the rollback process.

## Start another semester

Add the new cohort key to trusted policy and a corresponding empty participant registry in a maintenance PR. Register new opt-ins and confirm the cohort label/site copy. Each participant receives a new allowance in the new cohort; existing project URLs and withdrawals retain their original cohort. Keep old work only under the agreed publication policy. The three-project rule is per cohort, not a lifetime limit.
