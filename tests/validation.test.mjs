import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { deflateSync } from 'node:zlib';
import { validateRepository, ValidationError } from '../scripts/validate.mjs';

const policy = {
  maxProjectsPerStudent: 3, quotaMode: 'distinct-per-cohort', maxImageBytes: 1048576,
  maxImageDimension: 4096, categories: ['Developer tools', 'Learning', 'Everyday tools', 'Research'],
  tools: ['Python', 'TypeScript', 'Codex', 'Aider', 'SQLite', 'React', 'Local models'], cohorts: ['f26'],
};
const registry = { cohort: 'f26', participants: [
  { id: 101, displayName: 'Example Maker', bio: '', github: null },
  { id: 202, displayName: 'Another Maker', bio: '', github: 'https://github.com/example' },
] };
function png(width = 2, height = 2) {
  function chunk(type, data) {
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of typeAndData) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, typeAndData, checksum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const pixels = Buffer.alloc((width * 3 + 1) * height, 120);
  for (let row = 0; row < height; row++) pixels[row * (width * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
async function writeJSON(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}
async function repository(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'showcase-validation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await writeJSON(path.join(root, 'policy/showcase.json'), policy);
  await writeJSON(path.join(root, 'policy/publication.json'), { withdrawals: [], featuredProjectId: null });
  await writeJSON(path.join(root, 'participants/f26.json'), registry);
  await fs.mkdir(path.join(root, 'projects'));
  return root;
}
function entry(ownerId = 101, slot = '01') {
  return {
    schemaVersion: 1, projectId: `f26-${ownerId}-${slot}`, ownerId, cohort: 'f26', slot,
    title: 'A useful project', summary: 'A small project for understanding software changes.', category: 'Developer tools',
    tags: ['Code review'], tools: ['Python', 'Codex'], cover: { src: 'cover.png', alt: 'A project screen with a list of changes' },
    story: { problem: 'A real problem.', built: 'A small tool.', aiUse: 'Reviewed AI assistance.', humanDecisions: 'I checked the evidence.', limitations: 'A limited prototype.' },
    links: { demo: 'https://example.org/project?q=one&sort=two#preview', video: null, source: null },
  };
}
async function add(root, project = entry()) {
  const dir = path.join(root, 'projects', project.cohort, String(project.ownerId), project.slot);
  await writeJSON(path.join(dir, 'project.json'), project);
  await fs.writeFile(path.join(dir, 'cover.png'), png());
  return dir;
}
async function clone(t, source) {
  const root = await repository(t);
  await fs.cp(source, root, { recursive: true });
  return root;
}
function student(baseRoot, changedPaths = ['projects/f26/101/01/project.json'], authorId = 101) {
  return { baseRoot, authorId, changedPaths };
}
async function rejects(root, pattern, options) {
  await assert.rejects(validateRepository(root, options), error => error instanceof ValidationError && pattern.test(error.message));
}

test('accepts complete content and returns absolute source dirs with flat public makers', async t => {
  const root = await repository(t); await add(root);
  const result = await validateRepository(root);
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].sourceDir, path.join(root, 'projects/f26/101/01'));
  assert.equal(result.participants[0].cohort, 'f26');
  assert.equal(result.policy.featuredProjectId, null);
});
test('empty production tree and fixtures sharing a separate trusted policy are supported', async t => {
  const policyRoot = await repository(t), root = await repository(t);
  await fs.rm(path.join(root, 'policy'), { recursive: true });
  await fs.writeFile(path.join(root, 'projects/.gitkeep'), '');
  assert.equal((await validateRepository(root, { policyRoot })).projects.length, 0);
  await add(root);
  assert.equal((await validateRepository(root, { policyRoot })).projects.length, 1);
});
test('accepts a registered student submission and ordinary same-slot revisions', async t => {
  const base = await repository(t), candidate = await clone(t, base);
  await add(candidate);
  assert.equal((await validateRepository(candidate, student(base))).projects.length, 1);
  await add(base);
  const project = entry(); project.title = 'A revised project'; await add(candidate, project);
  assert.equal((await validateRepository(candidate, student(base))).projects[0].title, 'A revised project');
});
test('enforces exactly three slots and rejects a fourth project directory', async t => {
  const root = await repository(t);
  for (const slot of ['01', '02', '03']) await add(root, entry(101, slot));
  assert.equal((await validateRepository(root)).projects.length, 3);
  await add(root, entry(101, '04'));
  await rejects(root, /three-project cap/);
});
test('deduplicates retained withdrawals, prevents withdrawn slot reuse, and allows remaining slots', async t => {
  const base = await repository(t); await add(base, entry(101, '02'));
  const withdrawal = { projectId: 'f26-101-01', ownerId: 101, cohort: 'f26', slot: '01' };
  await writeJSON(path.join(base, 'policy/publication.json'), { withdrawals: [withdrawal], featuredProjectId: null });
  const candidate = await clone(t, base); await add(candidate, entry(101, '03'));
  assert.equal((await validateRepository(candidate, student(base, ['projects/f26/101/03/project.json']))).projects.length, 2);
  await add(candidate, entry(101, '01'));
  await rejects(candidate, /withdrawn slot/, student(base));
  // Staff may retain the withdrawn project's source. It counts once in the union.
  assert.equal((await validateRepository(candidate)).projects.length, 3);
});
test('rejects deleting an accepted entry or moving its project identity to another slot', async t => {
  const base = await repository(t); await add(base);
  const candidate = await clone(t, base);
  await fs.rm(path.join(candidate, 'projects/f26/101/01'), { recursive: true });
  await rejects(candidate, /accepted project cannot be deleted/, student(base));
  await add(candidate, entry(101, '02'));
  await rejects(candidate, /accepted project cannot be deleted/, student(base, ['projects/f26/101/01/project.json', 'projects/f26/101/02/project.json']));
});
test('rejects unknown authors, wrong path owners, and unregistered cohorts', async t => {
  const base = await repository(t), candidate = await clone(t, base); await add(candidate);
  await rejects(candidate, /PR author 303 is not registered/, student(base, undefined, 303));
  await rejects(candidate, /cannot change owner 101/, student(base, undefined, 202));
  await rejects(candidate, /not registered for f27/, student(base, ['projects/f27/101/01/project.json']));
});
test('cannot register oneself by tampering with candidate registry or policy', async t => {
  const base = await repository(t), candidate = await clone(t, base);
  await writeJSON(path.join(candidate, 'participants/f26.json'), { cohort: 'f26', participants: [...registry.participants, { id: 303, displayName: 'Unverified', bio: '', github: null }] });
  await add(candidate, entry(303));
  await rejects(candidate, /not in the trusted opt-in registry/, student(base, ['participants/f26.json', 'projects/f26/303/01/project.json'], 303));
  await writeJSON(path.join(candidate, 'policy/showcase.json'), { ...policy, maxProjectsPerStudent: 10 });
  await rejects(candidate, /three-project cap/, student(base, ['policy/showcase.json'], 303));
});
test('protected paths, traversal, absolute paths and arbitrary project files are rejected', async t => {
  const base = await repository(t), candidate = await clone(t, base); await add(candidate);
  for (const name of ['.github/workflows/publish.yml', 'site/index.html', 'policy/publication.json', '../projects/f26/101/01/project.json', '/projects/f26/101/01/project.json', 'projects\\f26\\101\\01\\cover.png', 'projects/f26/101/01/../../policy/showcase.json', 'projects/f26/101/01/evil.js']) {
    await rejects(candidate, /student PRs may change only|unsafe repository path/, student(base, [name]));
  }
});
test('fingerprints catch another owner’s changed image even if the diff omits that path', async t => {
  const base = await repository(t); await add(base, entry(202));
  const candidate = await clone(t, base); await add(candidate);
  await fs.writeFile(path.join(candidate, 'projects/f26/202/01/cover.png'), png(3, 3));
  await rejects(candidate, /cannot modify another student's existing project/, student(base));
});
test('path and declared owner/slot/project ID must agree', async t => {
  const root = await repository(t), dir = await add(root);
  const project = entry(); project.ownerId = 202; project.slot = '02'; project.projectId = 'another-id';
  await writeJSON(path.join(dir, 'project.json'), project);
  await rejects(root, /ownerId: must match path owner/);
  await rejects(root, /projectId: must be f26-101-01/);
});
test('unsafe link protocols, credentials and obfuscated URL forms are rejected', async t => {
  const root = await repository(t), dir = await add(root);
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'http://example.org', 'https://user:secret@example.org', 'https://:@example.org', 'https://example.org\\@evil.org', ' https://example.org', 'https://example.org\n']) {
    const project = entry(); project.links.demo = url; await writeJSON(path.join(dir, 'project.json'), project);
    await rejects(root, /https:\/\/ URL|control characters/);
  }
});
test('unknown keys, blank text, oversize strings, duplicate tags and excess screenshots fail', async t => {
  const root = await repository(t), dir = await add(root);
  const project = entry(); project.script = 'alert(1)'; project.summary = 'x'.repeat(161); project.title = '   ';
  project.tags = ['Agents', 'agents']; project.tools = ['Python', 'python']; project.story.hidden = 'extra';
  project.screenshots = Array.from({ length: 5 }, () => ({ src: 'cover.png', alt: 'Image' }));
  await writeJSON(path.join(dir, 'project.json'), project);
  await rejects(root, /unknown field script/); await rejects(root, /duplicate value/); await rejects(root, /at most four/);
});
test('duplicate JSON keys are rejected instead of silently taking the last owner', async t => {
  const root = await repository(t), dir = await add(root);
  const content = JSON.stringify(entry()).replace('"ownerId":101', '"ownerId":202,"ownerId":101');
  await fs.writeFile(path.join(dir, 'project.json'), content);
  await rejects(root, /Duplicate JSON key/);
});
test('rejects renamed HTML, corrupt PNGs, overlarge dimensions, oversized files and unsafe image paths', async t => {
  const root = await repository(t), dir = await add(root);
  for (const image of [Buffer.from('<svg onload="alert(1)"></svg>'), png().subarray(0, 25), Buffer.alloc(1048577), png(4097, 1)]) {
    await fs.writeFile(path.join(dir, 'cover.png'), image);
    await rejects(root, /PNG|exceeds|dimensions/);
  }
  const corrupt = png(); corrupt[45] ^= 1; await fs.writeFile(path.join(dir, 'cover.png'), corrupt);
  await rejects(root, /checksum/);
  const project = entry(); project.cover.src = '../../../../outside.png'; await writeJSON(path.join(dir, 'project.json'), project);
  await rejects(root, /flat lowercase/);
});
test('rejects symlinked screenshots, project dirs, participant dirs and data roots', async t => {
  const root = await repository(t), dir = await add(root);
  await fs.rename(path.join(dir, 'cover.png'), path.join(root, 'outside.png'));
  await fs.symlink(path.join(root, 'outside.png'), path.join(dir, 'cover.png'));
  await rejects(root, /symlinks are not allowed/);
  await fs.rm(path.join(dir, 'cover.png')); await fs.copyFile(path.join(root, 'outside.png'), path.join(dir, 'cover.png'));
  await fs.rename(path.join(root, 'projects/f26'), path.join(root, 'outside-projects'));
  await fs.symlink(path.join(root, 'outside-projects'), path.join(root, 'projects/f26'));
  await rejects(root, /symlinks are not allowed/);
  await fs.rm(path.join(root, 'projects/f26')); await fs.rename(path.join(root, 'outside-projects'), path.join(root, 'projects/f26'));
  await fs.rename(path.join(root, 'participants'), path.join(root, 'outside-participants'));
  await fs.symlink(path.join(root, 'outside-participants'), path.join(root, 'participants'));
  await rejects(root, /symlinks are not allowed/);
  const holder = await repository(t); await fs.symlink(root, path.join(holder, 'linked-root'));
  await rejects(path.join(holder, 'linked-root'), /symlinks are not allowed/);
});
test('accepts structurally valid JPEG and WebP, rejects truncated or mislabeled variants', async t => {
  const examples = {
    jpg: '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCtgIIYP//Z',
    webp: 'UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoCAAIAAUAmJaACdLoB+AADsAD+9imf/yn75T98p+/5T9/8zQzyUeOAAAA=',
  };
  for (const [extension, encoded] of Object.entries(examples)) {
    const root = await repository(t), dir = await add(root), project = entry();
    project.cover.src = `cover.${extension}`;
    await writeJSON(path.join(dir, 'project.json'), project);
    await fs.rm(path.join(dir, 'cover.png'));
    const buffer = Buffer.from(encoded, 'base64');
    await fs.writeFile(path.join(dir, project.cover.src), buffer);
    assert.equal((await validateRepository(root)).projects.length, 1);
    await fs.writeFile(path.join(dir, project.cover.src), buffer.subarray(0, buffer.length - 4));
    await rejects(root, /truncated|invalid/);
    await fs.writeFile(path.join(dir, project.cover.src), png());
    await rejects(root, /JPEG|WebP/);
  }
});
test('rejects unreferenced scripts and nested directories in a project', async t => {
  const root = await repository(t), dir = await add(root);
  await fs.writeFile(path.join(dir, 'app.js'), 'alert(1)'); await fs.mkdir(path.join(dir, 'nested'));
  await rejects(root, /unexpected file/);
});
test('duplicate registrations, tombstones and invalid featured selections fail', async t => {
  const root = await repository(t);
  await writeJSON(path.join(root, 'participants/f26.json'), { cohort: 'f26', participants: [registry.participants[0], registry.participants[0]] });
  await rejects(root, /duplicate participant ID/);
  await writeJSON(path.join(root, 'participants/f26.json'), registry);
  const record = { projectId: 'f26-101-01', ownerId: 101, cohort: 'f26', slot: '01' };
  await writeJSON(path.join(root, 'policy/publication.json'), { withdrawals: [record, record], featuredProjectId: null });
  await rejects(root, /duplicate project ID/);
  await writeJSON(path.join(root, 'policy/publication.json'), { withdrawals: [], featuredProjectId: 'f26-101-01' });
  await rejects(root, /existing, non-withdrawn project/);
});
test('maintenance mode validates proposed configuration while retaining trusted base rules', async t => {
  const base = await repository(t), candidate = await clone(t, base);
  await writeJSON(path.join(candidate, 'participants/f26.json'), { cohort: 'f26', participants: [...registry.participants, { id: 303, displayName: 'New approved maker', bio: '', github: null }] });
  assert.equal((await validateRepository(candidate, { baseRoot: base })).participants.length, 2);
  await writeJSON(path.join(candidate, 'policy/publication.json'), { withdrawals: [], featuredProjectId: 'missing' });
  await rejects(candidate, /candidate configuration/, { baseRoot: base });
});
test('malformed identity objects produce actionable validation errors, never conversion crashes', async t => {
  const root = await repository(t), dir = await add(root);
  const project = entry(); project.cohort = {}; project.ownerId = {}; project.slot = {}; project.projectId = {};
  await writeJSON(path.join(dir, 'project.json'), project);
  await rejects(root, /positive numeric GitHub account ID/);
});
