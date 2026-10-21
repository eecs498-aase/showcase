# Submission trust boundaries

Student input is project JSON and local JPEG, PNG, or WebP files. It never supplies executable templates, scripts, HTML, SVG, packages, build commands, or embedded iframes. Text is escaped when rendered; project links are validated; the build does not fetch arbitrary student URLs. Published image variants are decoded and re-encoded. Students must remove private content and metadata before submitting, since originals can remain visible in repository history.

## Pull-request checks

`validate.yml` uses the ordinary `pull_request` event with read-only permissions. It checks out two trees:

- `trusted/`: the PR's base commit, which supplies the validator and staff-controlled policy, registry, and withdrawal records.
- `candidate/`: GitHub's synthetic merge commit, which is read as data.

The job never installs dependencies or runs scripts or tests from `candidate/`. A NUL-delimited Git diff lists additions, edits, deletions, and both sides of renames. The PR author's `pull_request.user.id` is compared with the registered owner; the person rerunning the workflow does not become the owner. No label, collaborator status, commit email, or claimed identity grants a bypass.

Content-only PRs must pass path, ownership, schema, image, immutable-identity, and full-dataset quota checks. Maintenance-only PRs receive dataset validation against the trusted base and structural validation of proposed configuration; proposed configuration does not grant submission rights. Their proposed code and policy changes require staff review and local tests. A PR mixing project files and maintenance files fails. Enrollment changes therefore land separately, before a student submits a project. Withdrawals use staff-controlled publication records rather than student deletion of occupied slots.

## What checks cannot guarantee

An ordinary PR may propose changes to the workflow itself. A passing status is **not** proof that a proposed validator or workflow is trustworthy. Required staff CODEOWNERS review, review dismissal on new commits, protected-main rules, and inspection of the changed paths are part of the design. Before approving a fork workflow run, staff should inspect any workflow changes. Do not enable privileged `pull_request_target` execution of student code.

Automated checks also cannot decide whether a project story is truthful, whether screenshots have publication permission, or whether a major revision is actually a different project. Staff makes those decisions. Enrollment verification stays private; only opted-in public identities appear in the registry.

Up-to-date required checks prevent stale quota decisions. The publish build validates the complete dataset again. Concurrency settings avoid overlapping publication but do not enforce quotas on their own. The merge queue is unsupported until a `merge_group` validator is added.

## Publication

Only protected-main code installs dependencies, runs the build, and publishes. Actions are pinned to verified official repository commit SHAs. The production build excludes fixtures and checks launch configuration. A repository variable keeps deployment disabled during setup. The build job has read-only repository permissions; the deployment job receives only the extra Pages and OIDC permissions required to deploy the generated artifact.

Review dependency and action updates through staff maintenance PRs. For a publication mistake, follow the withdrawal or rollback procedure in [operations](OPERATIONS.md).

References: [pull-request event behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request), [secure Actions use](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions), and [code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).
