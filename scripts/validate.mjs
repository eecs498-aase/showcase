#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inspectImage } from './lib/images.mjs';
import { parseUniqueJSON } from './lib/json.mjs';

const SLOT = /^(01|02|03)$/;
const COHORT = /^[a-z][a-z0-9-]{1,15}$/;
const OWNER = /^[1-9]\d{0,15}$/;
const IMAGE = /^[a-z][a-z0-9-]{0,59}\.(?:png|jpe?g|webp)$/;
const PROJECT_KEYS = ['schemaVersion', 'projectId', 'ownerId', 'cohort', 'slot', 'title', 'summary', 'category', 'tags', 'tools', 'cover', 'story', 'links'];
const STORY_KEYS = ['problem', 'built', 'aiUse', 'humanDecisions', 'limitations'];

export class ValidationError extends Error {
  constructor(errors) {
    super(`Showcase validation failed (${errors.length} ${errors.length === 1 ? 'issue' : 'issues'}):\n${errors.map(message => `  • ${message}`).join('\n')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

function object(value, at, required, optional, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${at}: expected an object`); return false;
  }
  for (const key of required) if (!Object.hasOwn(value, key)) errors.push(`${at}: missing required field ${key}`);
  for (const key of Object.keys(value)) if (![...required, ...optional].includes(key)) errors.push(`${at}: unknown field ${key}`);
  return true;
}
function text(value, at, max, errors, { allowEmpty = false, multiline = false } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > max) {
    errors.push(`${at}: expected ${allowEmpty ? '0' : '1'}–${max} characters of text`); return false;
  }
  if ((multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) {
    errors.push(`${at}: control characters are not permitted`); return false;
  }
  return true;
}
function positiveId(value, at, errors) {
  if (!Number.isSafeInteger(value) || value <= 0) { errors.push(`${at}: expected a positive numeric GitHub account ID`); return false; }
  return true;
}
function strings(value, at, maxItems, maxLength, errors, vocabulary = null) {
  if (!Array.isArray(value) || value.length > maxItems) { errors.push(`${at}: expected an array with at most ${maxItems} items`); return; }
  const seen = new Set();
  value.forEach((item, index) => {
    if (!text(item, `${at}[${index}]`, maxLength, errors)) return;
    const normalized = item.trim().toLocaleLowerCase('en-US');
    if (seen.has(normalized)) errors.push(`${at}: duplicate value ${JSON.stringify(item)}`);
    seen.add(normalized);
    if (vocabulary && !vocabulary.includes(item)) errors.push(`${at}[${index}]: choose one of ${vocabulary.join(', ')}`);
  });
}
function safeURL(value, at, errors) {
  if (value === null) return;
  if (!text(value, at, 2048, errors)) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || value !== value.trim() || /[\s\\]/.test(value) || !value.startsWith('https://') || value.slice(8).split(/[/?#]/, 1)[0].includes('@')) throw new Error();
  } catch { errors.push(`${at}: use an absolute https:// URL without credentials, whitespace, or backslashes, or null`); }
}

async function directory(dir, at, errors, { missing = false } = {}) {
  try {
    const stat = await fs.lstat(dir);
    if (stat.isSymbolicLink()) { errors.push(`${at}: symlinks are not allowed`); return null; }
    if (!stat.isDirectory()) { errors.push(`${at}: expected a directory`); return null; }
    const entries = await fs.readdir(dir, { withFileTypes: true });
    if (entries.length > 10000) { errors.push(`${at}: too many directory entries`); return null; }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (missing && error.code === 'ENOENT') return [];
    errors.push(`${at}: cannot read directory (${error.code ?? error.message})`); return null;
  }
}
async function bytes(file, at, maximum, errors) {
  try {
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink()) { errors.push(`${at}: symlinks are not allowed`); return null; }
    if (!stat.isFile()) { errors.push(`${at}: expected a regular file`); return null; }
    if (stat.size > maximum) { errors.push(`${at}: file exceeds ${maximum} bytes`); return null; }
    return await fs.readFile(file);
  } catch (error) { errors.push(`${at}: cannot read file (${error.code ?? error.message})`); return null; }
}
async function json(file, at, maximum, errors) {
  const content = await bytes(file, at, maximum, errors);
  if (!content) return null;
  try { return parseUniqueJSON(new TextDecoder('utf-8', { fatal: true }).decode(content)); }
  catch (error) { errors.push(`${at}: invalid JSON (${error.message})`); return null; }
}

async function configuration(dataRoot, policyRoot, errors) {
  if (!(await directory(policyRoot, 'policy root', errors))) return null;
  if (!(await directory(path.join(policyRoot, 'policy'), 'policy/', errors))) return null;
  const policy = await json(path.join(policyRoot, 'policy/showcase.json'), 'policy/showcase.json', 65536, errors);
  const publication = await json(path.join(policyRoot, 'policy/publication.json'), 'policy/publication.json', 1024 * 1024, errors);
  if (!object(policy, 'policy/showcase.json', ['maxProjectsPerStudent', 'quotaMode', 'maxImageBytes', 'maxImageDimension', 'categories', 'tools', 'cohorts'], [], errors)) return null;
  if (policy.maxProjectsPerStudent !== 3) errors.push('policy/showcase.json.maxProjectsPerStudent: this implementation requires the three-project cap');
  if (policy.quotaMode !== 'distinct-per-cohort') errors.push('policy/showcase.json.quotaMode: only distinct-per-cohort is implemented');
  if (!Number.isSafeInteger(policy.maxImageBytes) || policy.maxImageBytes < 1 || policy.maxImageBytes > 1048576) errors.push('policy/showcase.json.maxImageBytes: must be between 1 and 1048576');
  if (!Number.isSafeInteger(policy.maxImageDimension) || policy.maxImageDimension < 1 || policy.maxImageDimension > 4096) errors.push('policy/showcase.json.maxImageDimension: must be between 1 and 4096');
  strings(policy.categories, 'policy.categories', 30, 60, errors);
  strings(policy.tools, 'policy.tools', 100, 60, errors);
  strings(policy.cohorts, 'policy.cohorts', 50, 16, errors);
  if (![policy.categories, policy.tools, policy.cohorts].every(Array.isArray)) return null;
  if (!policy.cohorts.length || !policy.categories.length || !policy.tools.length) errors.push('policy/showcase.json: cohorts, categories and tools cannot be empty');
  for (const cohort of policy.cohorts) if (typeof cohort !== 'string' || !COHORT.test(cohort)) errors.push('policy.cohorts: use lowercase cohort identifiers such as f26');
  const safeCohorts = policy.cohorts.filter(cohort => typeof cohort === 'string' && COHORT.test(cohort));
  const participants = [];
  const participantEntries = await directory(path.join(dataRoot, 'participants'), 'participants/', errors);
  for (const entry of participantEntries ?? []) {
    if (entry.isSymbolicLink()) errors.push(`participants/${entry.name}: symlinks are not allowed`);
    else if (!entry.isFile() || !safeCohorts.some(cohort => entry.name === `${cohort}.json`)) errors.push(`participants/${entry.name}: unexpected registry file`);
  }
  if (participantEntries) for (const cohort of safeCohorts) {
    const at = `participants/${cohort}.json`;
    const registry = await json(path.join(dataRoot, at), at, 2 * 1024 * 1024, errors);
    if (!object(registry, at, ['cohort', 'participants'], [], errors)) continue;
    if (registry.cohort !== cohort) errors.push(`${at}.cohort: must match the filename`);
    if (!Array.isArray(registry.participants) || registry.participants.length > 10000) { errors.push(`${at}.participants: expected up to 10000 public participant records`); continue; }
    const seen = new Set();
    for (const participant of registry.participants) {
      const itemAt = `${at}.participants[${participants.length}]`;
      if (!object(participant, itemAt, ['id', 'displayName', 'bio', 'github'], [], errors)) continue;
      positiveId(participant.id, `${itemAt}.id`, errors);
      if (seen.has(participant.id)) errors.push(`${at}: duplicate participant ID ${JSON.stringify(participant.id)}`);
      seen.add(participant.id);
      text(participant.displayName, `${itemAt}.displayName`, 80, errors);
      text(participant.bio, `${itemAt}.bio`, 300, errors, { allowEmpty: true });
      if (participant.github !== null) {
        safeURL(participant.github, `${itemAt}.github`, errors);
        if (typeof participant.github !== 'string' || !/^https:\/\/github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/?$/.test(participant.github)) errors.push(`${itemAt}.github: use a GitHub profile URL or null`);
      }
      participants.push({ ...participant, cohort });
    }
  }
  const withdrawals = [];
  let featuredProjectId = null;
  if (object(publication, 'policy/publication.json', ['withdrawals', 'featuredProjectId'], [], errors)) {
    if (!Array.isArray(publication.withdrawals) || publication.withdrawals.length > 30000) errors.push('policy/publication.json.withdrawals: expected an array of at most 30000 records');
    else for (const record of publication.withdrawals) {
      if (!object(record, 'withdrawal', ['projectId', 'ownerId', 'cohort', 'slot'], [], errors)) continue;
      const validOwner = positiveId(record.ownerId, 'withdrawal.ownerId', errors);
      if (!safeCohorts.includes(record.cohort)) errors.push(`withdrawal ${JSON.stringify(record.projectId)}: unknown cohort`);
      if (typeof record.slot !== 'string' || !SLOT.test(record.slot)) errors.push(`withdrawal ${JSON.stringify(record.projectId)}: slot must be 01, 02 or 03`);
      if (!validOwner || typeof record.cohort !== 'string' || typeof record.slot !== 'string' || typeof record.projectId !== 'string') { errors.push('withdrawal: ID, cohort and slot must be strings with a numeric owner ID'); continue; }
      if (record.projectId !== `${record.cohort}-${record.ownerId}-${record.slot}`) errors.push(`withdrawal ${record.projectId}: ID must match cohort, owner and slot`);
      if (withdrawals.some(previous => previous.projectId === record.projectId)) errors.push(`withdrawals: duplicate project ID ${record.projectId}`);
      withdrawals.push(record);
    }
    featuredProjectId = publication.featuredProjectId;
    if (featuredProjectId !== null) text(featuredProjectId, 'publication.featuredProjectId', 80, errors);
  }
  return { policy: { ...policy, featuredProjectId }, participants, withdrawals };
}

function validateProject(project, at, expected, policy, participants, errors) {
  if (!object(project, at, PROJECT_KEYS, ['screenshots'], errors)) return false;
  if (project.schemaVersion !== 1) errors.push(`${at}.schemaVersion: expected 1`);
  positiveId(project.ownerId, `${at}.ownerId`, errors);
  if (project.ownerId !== Number(expected.owner)) errors.push(`${at}.ownerId: must match path owner ${expected.owner}`);
  if (project.cohort !== expected.cohort || !policy.cohorts.includes(project.cohort)) errors.push(`${at}.cohort: must match the registered cohort in its path`);
  if (project.slot !== expected.slot || typeof project.slot !== 'string' || !SLOT.test(project.slot)) errors.push(`${at}.slot: must match path slot 01, 02 or 03`);
  if (project.projectId !== `${expected.cohort}-${expected.owner}-${expected.slot}`) errors.push(`${at}.projectId: must be ${expected.cohort}-${expected.owner}-${expected.slot}`);
  if (!participants.some(participant => participant.id === project.ownerId && participant.cohort === project.cohort)) errors.push(`${at}.ownerId: owner is not in the trusted opt-in registry for ${expected.cohort}`);
  text(project.title, `${at}.title`, 60, errors);
  text(project.summary, `${at}.summary`, 160, errors);
  if (!policy.categories.includes(project.category)) errors.push(`${at}.category: choose one of ${policy.categories.join(', ')}`);
  strings(project.tags, `${at}.tags`, 3, 30, errors);
  strings(project.tools, `${at}.tools`, 6, 60, errors, policy.tools);
  if (object(project.story, `${at}.story`, STORY_KEYS, [], errors)) for (const key of STORY_KEYS) text(project.story[key], `${at}.story.${key}`, 2000, errors, { multiline: true });
  if (object(project.links, `${at}.links`, ['demo', 'video', 'source'], [], errors)) for (const key of ['demo', 'video', 'source']) safeURL(project.links[key], `${at}.links.${key}`, errors);
  return Number.isSafeInteger(project.ownerId) && typeof project.cohort === 'string' && typeof project.slot === 'string' && typeof project.projectId === 'string';
}

async function projectsFrom(dataRoot, config, errors) {
  const projects = [];
  const root = path.join(dataRoot, 'projects');
  const cohorts = await directory(root, 'projects/', errors, { missing: true });
  if (!cohorts) return projects;
  for (const cohort of cohorts) {
    const cohortAt = `projects/${cohort.name}`;
    if (cohort.name === '.gitkeep' && cohort.isFile()) { if ((await bytes(path.join(root, cohort.name), cohortAt, 0, errors))?.length) errors.push(`${cohortAt}: sentinel must be empty`); continue; }
    if (cohort.isSymbolicLink()) { errors.push(`${cohortAt}: symlinks are not allowed`); continue; }
    if (!cohort.isDirectory() || !COHORT.test(cohort.name) || !config.policy.cohorts.includes(cohort.name)) { errors.push(`${cohortAt}: expected a configured cohort directory`); continue; }
    const owners = await directory(path.join(root, cohort.name), cohortAt, errors);
    for (const owner of owners ?? []) {
      const ownerAt = `${cohortAt}/${owner.name}`;
      if (owner.isSymbolicLink()) { errors.push(`${ownerAt}: symlinks are not allowed`); continue; }
      if (!owner.isDirectory() || !OWNER.test(owner.name) || !Number.isSafeInteger(Number(owner.name))) { errors.push(`${ownerAt}: expected a numeric GitHub account ID directory without leading zeros`); continue; }
      const slots = await directory(path.join(root, cohort.name, owner.name), ownerAt, errors);
      for (const slot of slots ?? []) {
        const slotAt = `${ownerAt}/${slot.name}`;
        if (slot.isSymbolicLink()) { errors.push(`${slotAt}: symlinks are not allowed`); continue; }
        if (!slot.isDirectory() || !SLOT.test(slot.name)) { errors.push(`${slotAt}: only slots 01, 02 and 03 are allowed (three-project cap)`); continue; }
        const sourceDir = path.join(root, cohort.name, owner.name, slot.name);
        const entries = await directory(sourceDir, slotAt, errors);
        if (!entries) continue;
        const project = await json(path.join(sourceDir, 'project.json'), `${slotAt}/project.json`, 32768, errors);
        if (!validateProject(project, `${slotAt}/project.json`, { cohort: cohort.name, owner: owner.name, slot: slot.name }, config.policy, config.participants, errors)) continue;
        const images = [];
        if (object(project.cover, `${slotAt}/project.json.cover`, ['src', 'alt'], [], errors)) images.push(project.cover);
        if (Object.hasOwn(project, 'screenshots')) {
          if (!Array.isArray(project.screenshots) || project.screenshots.length > 4) errors.push(`${slotAt}/project.json.screenshots: at most four additional screenshots are allowed`);
          else project.screenshots.forEach((image, index) => { if (object(image, `${slotAt}/project.json.screenshots[${index}]`, ['src', 'alt'], [], errors)) images.push(image); });
        }
        const referenced = new Set();
        for (const image of images) {
          text(image.alt, `${slotAt} image alt`, 240, errors);
          if (typeof image.src !== 'string' || !IMAGE.test(image.src)) { errors.push(`${slotAt}: image src must be a flat lowercase PNG, JPEG or WebP filename such as cover.webp`); continue; }
          if (referenced.has(image.src.toLowerCase())) { errors.push(`${slotAt}: duplicate image reference ${image.src}`); continue; }
          referenced.add(image.src.toLowerCase());
          const content = await bytes(path.join(sourceDir, image.src), `${slotAt}/${image.src}`, config.policy.maxImageBytes, errors);
          if (content) try { inspectImage(content, path.extname(image.src), config.policy); }
          catch (error) { errors.push(`${slotAt}/${image.src}: ${error.message}`); }
        }
        const filenames = new Set();
        for (const entry of entries) {
          if (filenames.has(entry.name.toLowerCase())) errors.push(`${slotAt}: duplicate filename differing only by case`);
          filenames.add(entry.name.toLowerCase());
          if (entry.isSymbolicLink()) errors.push(`${slotAt}/${entry.name}: symlinks are not allowed`);
          else if (!entry.isFile() || (entry.name !== 'project.json' && !referenced.has(entry.name))) errors.push(`${slotAt}/${entry.name}: unexpected file; include only project.json and its referenced raster images`);
        }
        projects.push({ ...project, sourceDir });
      }
    }
  }
  const identities = new Map();
  for (const project of projects) {
    if (identities.has(project.projectId)) errors.push(`projects: duplicate project ID ${project.projectId}`);
    identities.set(project.projectId, project);
  }
  const occupied = new Map();
  for (const record of [...projects, ...config.withdrawals]) {
    const owner = `${record.cohort}/${record.ownerId}`;
    if (!occupied.has(owner)) occupied.set(owner, new Set());
    occupied.get(owner).add(record.projectId);
  }
  for (const [owner, ids] of occupied) if (ids.size > config.policy.maxProjectsPerStudent) errors.push(`${owner}: ${ids.size} distinct projects exceed the three-project cap; withdrawn projects still count`);
  if (config.policy.featuredProjectId !== null && (!identities.has(config.policy.featuredProjectId) || config.withdrawals.some(record => record.projectId === config.policy.featuredProjectId))) errors.push('publication.featuredProjectId: must refer to an existing, non-withdrawn project');
  return projects;
}

async function fingerprint(project) {
  const hash = createHash('sha256');
  const files = ['project.json', project.cover.src, ...(project.screenshots ?? []).map(image => image.src)].sort();
  for (const name of files) { hash.update(name); hash.update('\0'); hash.update(await fs.readFile(path.join(project.sourceDir, name))); hash.update('\0'); }
  return hash.digest('hex');
}

/** Validate an entire candidate tree. Student mode additionally authenticates every changed slot. */
export async function validateRepository(dataRoot, { policyRoot = dataRoot, baseRoot = null, authorId = null, changedPaths = null } = {}) {
  const errors = [];
  dataRoot = path.resolve(dataRoot);
  policyRoot = path.resolve(baseRoot ?? policyRoot);
  baseRoot = baseRoot === null ? null : path.resolve(baseRoot);
  const studentMode = authorId !== null || changedPaths !== null;
  if (studentMode && (!baseRoot || !Number.isSafeInteger(authorId) || authorId <= 0 || !Array.isArray(changedPaths))) throw new ValidationError(['student PR mode requires baseRoot, numeric authorId and a changedPaths array together']);
  if (!(await directory(dataRoot, 'data root', errors))) throw new ValidationError(errors);
  const config = await configuration(baseRoot ?? dataRoot, policyRoot, errors);
  if (!config || errors.length) throw new ValidationError(errors);
  const projects = await projectsFrom(dataRoot, config, errors);
  if (baseRoot && baseRoot !== dataRoot) {
    // Proposed maintenance configs must themselves be valid, but never grant submission rights.
    try { await validateRepository(dataRoot); }
    catch (error) { errors.push(...(error.errors ?? [error.message]).map(message => `candidate configuration: ${message}`)); }
  }
  if (studentMode) {
    if (!config.participants.some(participant => participant.id === authorId)) errors.push(`PR author ${authorId} is not registered; staff must verify and register the account first`);
    if (!changedPaths.length) errors.push('student PR has no changed submission paths');
    const withdrawn = new Set(config.withdrawals.map(record => record.projectId));
    for (const changed of changedPaths) {
      if (typeof changed !== 'string' || changed.includes('\\') || changed.includes('\0') || changed.startsWith('/') || changed.split('/').some(segment => !segment || segment === '.' || segment === '..')) { errors.push(`changed path ${JSON.stringify(changed)}: unsafe repository path`); continue; }
      const match = /^projects\/([a-z][a-z0-9-]{1,15})\/([1-9]\d{0,15})\/(01|02|03)\/([^/]+)$/.exec(changed);
      if (!match || (match[4] !== 'project.json' && !IMAGE.test(match[4]))) { errors.push(`${changed}: student PRs may change only project.json and raster images inside their three project slots`); continue; }
      const [, cohort, owner, slot] = match;
      if (Number(owner) !== authorId) errors.push(`${changed}: PR author ${authorId} cannot change owner ${owner}'s project`);
      if (!config.participants.some(participant => participant.id === authorId && participant.cohort === cohort)) errors.push(`${changed}: PR author is not registered for ${cohort}`);
      if (withdrawn.has(`${cohort}-${owner}-${slot}`)) errors.push(`${changed}: withdrawn slot ${slot} remains occupied and cannot be changed or reused by students`);
    }
    let base;
    try { base = await validateRepository(baseRoot); }
    catch (error) { errors.push(...(error.errors ?? [error.message]).map(message => `trusted base: ${message}`)); }
    if (base && !errors.length) {
      const current = new Map(projects.map(project => [project.projectId, project]));
      for (const prior of base.projects) {
        const candidate = current.get(prior.projectId);
        if (!candidate) errors.push(`${prior.projectId}: an accepted project cannot be deleted or assigned a new ID by a student; request a staff withdrawal`);
        else if (await fingerprint(prior) !== await fingerprint(candidate)) {
          if (candidate.ownerId !== authorId) errors.push(`${candidate.projectId}: cannot modify another student's existing project`);
          if (withdrawn.has(candidate.projectId)) errors.push(`${candidate.projectId}: withdrawn projects cannot be edited by students`);
        }
      }
      const oldIDs = new Set(base.projects.map(project => project.projectId));
      for (const project of projects) if (!oldIDs.has(project.projectId)) {
        if (project.ownerId !== authorId) errors.push(`${project.projectId}: cannot add a project for another student`);
        if (withdrawn.has(project.projectId)) errors.push(`${project.projectId}: a withdrawn slot cannot be reused`);
      }
    }
  }
  if (errors.length) throw new ValidationError([...new Set(errors)]);
  return { projects, ...config };
}

async function cli() {
  const args = process.argv.slice(2), values = {};
  const flags = new Set(['--root', '--policy-root', '--base-root', '--author-id', '--changed-files']);
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!flags.has(flag) || !value || value.startsWith('--') || Object.hasOwn(values, flag)) throw new Error('Usage: node scripts/validate.mjs --root PATH [--policy-root PATH] [--base-root PATH] [--author-id NUM --changed-files PATH]');
    values[flag] = value;
  }
  let changedPaths = null;
  if (values['--changed-files']) {
    const errors = [];
    changedPaths = await json(path.resolve(values['--changed-files']), 'changed-files', 4 * 1024 * 1024, errors);
    if (errors.length) throw new ValidationError(errors);
  }
  const author = values['--author-id'];
  if (author && (!OWNER.test(author) || !Number.isSafeInteger(Number(author)))) throw new Error('--author-id must be a positive numeric GitHub account ID');
  const data = await validateRepository(values['--root'] ?? process.cwd(), {
    policyRoot: values['--policy-root'] ?? values['--root'] ?? process.cwd(),
    baseRoot: values['--base-root'] ?? null, authorId: author ? Number(author) : null, changedPaths,
  });
  console.log(`Showcase validation passed: ${data.projects.length} projects, ${data.participants.length} registered makers, ${data.withdrawals.length} withdrawals.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli().catch(error => { console.error(error.message); process.exitCode = 1; });
}
