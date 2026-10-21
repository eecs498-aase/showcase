import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { deflateSync } from 'node:zlib';
import { buildSite, normalizeBasePath, repoRoot } from '../scripts/build.mjs';

async function temporary(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aase-showcase-build-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('demo generates deep routes, optimized images, and a base-aware gallery without publishing private metadata', async t => {
  const temp = await temporary(t);
  const outDir = path.join(temp, 'site');
  const result = await buildSite({ demo: true, outDir });
  assert.equal(result.projects, 6);
  assert.equal(result.makers, 4);
  const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
  assert.match(html, /Patch Notes/);
  assert.match(html, /sample|fictional/i);
  assert.match(html, /\/showcase\/f26\/projects\/900000001-01\//);
  const index = JSON.parse(await fs.readFile(path.join(outDir, 'search.json'), 'utf8'));
  assert.equal(index.length, 6);
  assert.equal(index.some(item => 'sourceDir' in item || 'bio' in item), false);
  for (const entry of index) {
    const relative = entry.href.replace('/showcase/', '');
    await fs.access(path.join(outDir, relative, 'index.html'));
    await fs.access(path.join(outDir, entry.coverUrl.replace('/showcase/', '')));
    await fs.access(path.join(outDir, entry.thumbnailUrl.replace('/showcase/', '')));
  }
  const project = await fs.readFile(path.join(outDir, 'f26/projects/900000001-01/index.html'), 'utf8');
  assert.match(project, /Maya Chen/);
  assert.match(project, /human|decisions/i);
  await assert.rejects(fs.access(path.join(outDir, 'participants/f26.json')));
  await assert.rejects(fs.access(path.join(outDir, 'policy/showcase.json')));
});

test('real-data build excludes demonstration content and unregistered profiles', async t => {
  const temp = await temporary(t);
  const root = path.join(temp, 'repo');
  for (const dir of ['site', 'fixtures', 'policy', 'templates']) {
    await fs.cp(path.join(repoRoot, dir), path.join(root, dir), { recursive: true });
  }
  await fs.mkdir(path.join(root, 'participants'), { recursive: true });
  const policy = JSON.parse(await fs.readFile(path.join(root, 'policy/showcase.json'), 'utf8'));
  for (const cohort of policy.cohorts) {
    await fs.writeFile(path.join(root, 'participants', `${cohort}.json`), JSON.stringify({ cohort, participants: [] }));
  }
  await fs.writeFile(path.join(root, 'policy/publication.json'), JSON.stringify({ withdrawals: [], featuredProjectId: null }));
  const outDir = path.join(temp, 'site');
  const result = await buildSite({ root, outDir });
  assert.equal(result.projects, 0);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(outDir, 'search.json'), 'utf8')), []);
  const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /Patch Notes|Maya Chen|900000001/);
  await assert.rejects(fs.access(path.join(outDir, 'f26/makers/900000001/index.html')));
});

test('image decode failure after validation preserves the last successful local build', async t => {
  const temp = await temporary(t);
  const root = path.join(temp, 'repo');
  for (const dir of ['site', 'fixtures', 'participants', 'projects', 'policy', 'templates']) {
    await fs.cp(path.join(repoRoot, dir), path.join(root, dir), { recursive: true });
  }
  const outDir = path.join(root, 'dist');
  await buildSite({ root, outDir, demo: true });
  const before = await fs.readFile(path.join(outDir, 'index.html'));
  const projectDir = path.join(root, 'fixtures/projects/f26/900000001/01');
  const project = JSON.parse(await fs.readFile(path.join(projectDir, 'project.json'), 'utf8'));
  project.cover.src = 'cover.png';
  await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(project));
  await fs.rm(path.join(projectDir, 'cover.webp'));
  // A structurally valid PNG with valid CRCs, but an invalid decoded scanline filter.
  // Byte checks accept the envelope; Sharp must refuse to publish it.
  const chunk = (type, data) => {
    const payload = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of payload) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, payload, checksum]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  await fs.writeFile(path.join(projectDir, 'cover.png'), Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([5,0,0,0,255]))), chunk('IEND', Buffer.alloc(0))]));
  await assert.rejects(buildSite({ root, outDir, demo: true }), /png|filter|decode|image|libspng/i);
  assert.deepEqual(await fs.readFile(path.join(outDir, 'index.html')), before);
});

test('withdrawal removes pages, maker listings, search entries, and media but preserves other work', async t => {
  const temp = await temporary(t);
  const root = path.join(temp, 'repo');
  for (const dir of ['site', 'fixtures', 'policy', 'templates']) await fs.cp(path.join(repoRoot, dir), path.join(root, dir), { recursive: true });
  await fs.writeFile(path.join(root, 'fixtures/policy/publication.json'), JSON.stringify({ withdrawals: [{ projectId: 'f26-900000001-01', ownerId: 900000001, cohort: 'f26', slot: '01' }], featuredProjectId: null }));
  const outDir = path.join(root, 'dist');
  const result = await buildSite({ root, outDir, demo: true });
  assert.equal(result.projects, 5);
  const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /Patch Notes/);
  const profile = await fs.readFile(path.join(outDir, 'f26/makers/900000001/index.html'), 'utf8');
  assert.doesNotMatch(profile, /Patch Notes/);
  assert.match(profile, /Field Notes/);
  const search = await fs.readFile(path.join(outDir, 'search.json'), 'utf8');
  assert.doesNotMatch(search, /f26-900000001-01/);
  await assert.rejects(fs.access(path.join(outDir, 'f26/projects/900000001-01/index.html')));
  await assert.rejects(fs.access(path.join(outDir, 'media/f26/900000001/01')));
});

test('deployment fails closed until configured and never permits demo production', async t => {
  const root = await temporary(t);
  await fs.mkdir(path.join(root, 'site'), { recursive: true });
  await fs.writeFile(path.join(root, 'site/config.json'), JSON.stringify({ basePath: '/showcase/', repositoryUrl: null }));
  await assert.rejects(buildSite({ root, production: true }), /not configured/);
  await assert.rejects(buildSite({ root, production: true, demo: true }), /cannot include demonstration/);
});

test('base paths reject traversal and malformed prefixes', () => {
  assert.equal(normalizeBasePath('/'), '/');
  assert.equal(normalizeBasePath('/showcase/'), '/showcase/');
  for (const path of ['showcase', '/showcase', '//', '/../', '/a/../../', '/?query/']) {
    assert.throws(() => normalizeBasePath(path));
  }
});
