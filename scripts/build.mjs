import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { validateRepository } from './validate.mjs';
import { renderGallery, renderProject, renderMaker, renderSubmit, render404 } from '../site/render.mjs';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function normalizeBasePath(value) {
  if (typeof value !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(value)) {
    throw new Error('basePath must start and end with / and contain only simple path segments.');
  }
  return value;
}
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = async file => fs.access(file).then(() => true, () => false);

async function preflight(root, config, demo) {
  if (demo) throw new Error('Production builds cannot include demonstration fixtures.');
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(config.repositoryUrl || '')) {
    throw new Error('Deployment is not configured: set site/config.json repositoryUrl to the authorized showcase repository.');
  }
  const codeowners = await fs.readFile(path.join(root, '.github/CODEOWNERS'), 'utf8').catch(() => '');
  if (!/^\*\s+@[A-Za-z0-9_.\/-]+/m.test(codeowners)) {
    throw new Error('Deployment is not configured: assign an actual staff owner to * in .github/CODEOWNERS.');
  }
}

export async function buildSite({ root = repoRoot, outDir = path.join(root, 'dist'), demo = false, production = false, basePath } = {}) {
  const config = await json(path.join(root, 'site/config.json'));
  basePath = normalizeBasePath(basePath ?? config.basePath);
  if (production) await preflight(root, config, demo);
  const dataRoot = demo ? path.join(root, 'fixtures') : root;
  const data = await validateRepository(dataRoot, { policyRoot: demo ? dataRoot : root });
  const withdrawn = new Set(data.withdrawals.map(item => item.projectId));
  const projects = data.projects.filter(item => !withdrawn.has(item.projectId));
  const stage = await fs.mkdtemp(path.join(root, '.build-'));
  const routeFiles = [];
  const write = async (relative, content) => {
    const target = path.join(stage, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
    routeFiles.push(relative);
  };
  try {
    await fs.cp(path.join(root, 'site/assets'), path.join(stage, 'assets'), { recursive: true });
    for (const project of projects) {
      const media = `media/${project.cohort}/${project.ownerId}/${project.slot}`;
      await fs.mkdir(path.join(stage, media), { recursive: true });
      for (const [index, image] of [project.cover, ...(project.screenshots || [])].entries()) {
        const imageName = index === 0 ? 'cover' : `screen-${index}`;
        const source = path.join(project.sourceDir, image.src);
        const pipeline = sharp(source, { limitInputPixels: 4096 * 4096, failOn: 'warning' }).rotate();
        const meta = await pipeline.metadata();
        if (meta.pages && meta.pages > 1) throw new Error(`${source}: animated or multipage images are not allowed.`);
        await pipeline.clone().resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(stage, media, `${imageName}.webp`));
        image.url = `${basePath}${media}/${imageName}.webp`;
        if (index === 0) {
          await pipeline.clone().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(stage, media, 'cover-small.webp'));
          project.coverUrl = image.url;
          project.thumbnailUrl = `${basePath}${media}/cover-small.webp`;
        }
      }
      project.href = `${basePath}${project.cohort}/projects/${project.ownerId}-${project.slot}/`;
      project.makerHref = `${basePath}${project.cohort}/makers/${project.ownerId}/`;
      project.makerName = data.participants.find(person => person.id === project.ownerId && person.cohort === project.cohort)?.displayName;
      project.featured = data.policy.featuredProjectId === project.projectId;
    }
    projects.sort((a, b) => a.title.localeCompare(b.title));
    const participants = data.participants.filter(person => projects.some(project => project.ownerId === person.id && project.cohort === person.cohort));
    const shared = { projects, participants, basePath, demo, config };
    await write('index.html', renderGallery(shared));
    for (const project of projects) {
      const participant = participants.find(person => person.id === project.ownerId && person.cohort === project.cohort);
      await write(`${project.cohort}/projects/${project.ownerId}-${project.slot}/index.html`, renderProject({ ...shared, project, participant }));
    }
    for (const participant of participants) {
      await write(`${participant.cohort}/makers/${participant.id}/index.html`, renderMaker({ ...shared, participant, projects: projects.filter(item => item.ownerId === participant.id && item.cohort === participant.cohort) }));
    }
    await write('submit/index.html', renderSubmit(shared));
    await write('404.html', render404(shared));
    await write('search.json', JSON.stringify(projects.map(({ projectId, title, summary, tags, tools, category, cohort, href, makerName, coverUrl, thumbnailUrl, makerHref }) => ({ projectId, title, summary, tags, tools, category, cohort, href, makerName, coverUrl, thumbnailUrl, makerHref })), null, 2));
    await write('template/project.json', await fs.readFile(path.join(root, 'templates/project.json'), 'utf8'));
    await write('.nojekyll', '');
    await write('robots.txt', demo ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: ${basePath}\n`);
    const files = await fs.readdir(stage, { recursive: true, withFileTypes: true });
    let bytes = 0;
    for (const file of files) {
      if (file.isFile()) bytes += (await fs.stat(path.join(file.parentPath ?? file.path, file.name))).size;
    }
    if (bytes > 900_000_000) throw new Error('Build exceeds the 900 MB artifact budget. Reduce images or archived content.');
    await write('build-info.json', JSON.stringify({ mode: demo ? 'demo' : 'production-data', projectCount: projects.length, makerCount: participants.length, basePath, bytes, routes: routeFiles.filter(file => file.endsWith('.html')) }, null, 2));
    const prior = `${outDir}.previous`;
    await fs.rm(prior, { recursive: true, force: true });
    const hadPrior = await exists(outDir);
    if (hadPrior) await fs.rename(outDir, prior);
    try { await fs.rename(stage, outDir); }
    catch (error) { if (hadPrior) await fs.rename(prior, outDir); throw error; }
    await fs.rm(prior, { recursive: true, force: true });
    return { outDir, projects: projects.length, makers: participants.length, basePath, bytes, mode: demo ? 'demo' : 'production-data' };
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const allowed = new Set(['--demo', '--production', '--base-path']);
  let basePath;
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw new Error(`Unknown build argument: ${args[i]}`);
    if (args[i] === '--base-path') basePath = args[++i];
  }
  try { console.log(JSON.stringify(await buildSite({ demo: args.includes('--demo'), production: args.includes('--production'), basePath }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
