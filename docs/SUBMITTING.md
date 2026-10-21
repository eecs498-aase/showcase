# Submit a project

Submit to [eecs498-aase/showcase](https://github.com/eecs498-aase/showcase) after staff registers your account. Approved projects appear on [the showcase](https://eecs498-aase.github.io/showcase/) after the PR is merged and deployment succeeds.

The showcase is an opt-in public exhibition, separate from course grading. Ask staff about the private course submission route if you do not want your work or identity published. You do not need to make a private course repository public or host a live app to participate.

## Before your first project

Have staff verify your GitHub account through the course's private channel. Choose the display name you want visitors to see. Staff registers your numeric GitHub account ID and approved public identity before you submit. Do not add yourself to `participants/` in a project PR.

Each student has three slots per semester: `01`, `02`, and `03`. The current rule counts three **distinct** projects, including withdrawn projects. You may revise the same project without consuming another slot. Keep its `projectId`, `ownerId`, `cohort`, and `slot` unchanged. Ask staff before replacing a project with a different idea.

## Prepare the entry

[Fork the showcase repository](https://github.com/eecs498-aase/showcase/fork). Copy `templates/project.json` to an unused slot:

```text
projects/f26/YOUR_NUMERIC_GITHUB_ID/01/
  project.json
  cover.webp
  screenshot-01.webp
```

Replace `YOUR_NUMERIC_GITHUB_ID` with the ID staff registered. Fill out every required template field. The project ID follows `f26-ID-01`, using your numeric ID and chosen slot. Paths and IDs use the semester key such as `f26`, not a display name.

Write a short pitch and a story that explains the problem, what you built, how AI helped, the decisions you made and checked, and the project's current limitations. Choose a category and tools from `policy/showcase.json`. This is a project story, not a grade report.

Keep the title within 60 characters, the summary within 160, each story field within 2,000, and image descriptions within 240. You can include up to three topic tags and six tools. Keep `demo`, `video`, and `source` in the `links` object, using an absolute `https://` URL or `null` for each.

Add a cover image and up to four optional screenshots in the same directory. Use JPEG, PNG, or WebP, each no larger than 1 MiB (1,048,576 bytes) or 4096 pixels in either dimension. Give every image a useful text description. Avoid animations, HTML, SVG, scripts, and subdirectories. Use lowercase filenames made of letters, numbers, and hyphens, starting with a letter. Image references are filenames such as `cover.webp`, not remote URLs or paths into other projects.

Demo, video, and source links are optional. You are responsible for hosting your application and backend. Add its public HTTPS URL as the demo link; the showcase does not run your application. A private repository does not need a source link. Do not publish course keys, tokens, names of other students without permission, private feedback, or screenshots containing private information. Remove sensitive image metadata before uploading; the build cleans deployed variants but cannot undo publication in a PR or Git history.

## Open a pull request

In GitHub's web editor, create or upload the files in your fork, commit them on a new branch, and choose **Contribute → Open pull request**. With local Git, edit the same files on a branch and open a PR to the showcase's `main` branch. Submit only your project JSON and raster images.

Fill out the PR template and wait for validation. First-time contributors may need staff to approve the workflow run. A failed check explains the file and rule that needs attention; update the same branch and the check runs again. A staff reviewer then reviews the content and asks for changes or merges it. The page appears after a successful publication build.

To check your files locally before opening the PR:

```sh
npm ci --ignore-scripts
npm run validate
npm run build
npm run preview
```

These commands validate the whole local dataset and build real entries. GitHub also checks your PR author identity and changed paths against staff-controlled records, which a normal local preview cannot prove.

## Update or withdraw

For an update, edit the existing entry and images and open another PR. Keep its permanent ID and slot. Do not delete an occupied slot, rename the directory, or edit another student's files.

For a withdrawal, contact staff through the course's existing private channel. Staff hides the project from the next site build and records the occupied slot. The current website can stop displaying it, but earlier public PRs, forks, downloads, and history may remain available. If sensitive content was exposed, tell staff directly so they can handle more than the page removal.
