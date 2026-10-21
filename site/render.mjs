const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path = (base, suffix = '') => `${base.endsWith('/') ? base : `${base}/`}${suffix}`;
const list = participants => Array.isArray(participants) ? participants : Object.values(participants || {});
const maker = (p, participants) => list(participants).find(x => String(x.id ?? x.ownerId ?? x.githubId) === String(p.ownerId) && (!x.cohort || x.cohort === p.cohort)) || {displayName:p.makerName || 'AASE maker'};
const name = p => p.displayName || p.name || 'AASE maker';
const safeLink = value => {try {const url = new URL(value);return url.protocol === 'https:' ? url.href : '';}catch{return '';}};
const projectUrl = (p, b) => p.href || path(b, `${p.cohort}/projects/${p.ownerId}-${p.slot}/`);
const makerUrl = (p, b) => p.makerHref || path(b, `${p.cohort}/makers/${p.ownerId}/`);
const cover = p => p.coverUrl || p.cover?.url || '';
const cohortName = (cohort, config) => config.cohorts?.[cohort]?.label || (/^f\d{2}$/.test(cohort) ? `Fall 20${cohort.slice(1)}` : cohort);
const paragraphs = text => String(text || '').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${e(p)}</p>`).join('');
const arrow = '<span aria-hidden="true">↗</span>';
function shell({title,description,body,basePath='/',demo=false,config={},gallery=false,canonical='',image='',article=false}) {
  const b=basePath;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101e2c"><title>${e(title)} · AASE Showcase</title><meta name="description" content="${e(description)}"><meta property="og:title" content="${e(title)} · AASE Showcase"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="${article?'article':'website'}">${canonical&&!demo?`<link rel="canonical" href="${e(canonical)}"><meta property="og:url" content="${e(canonical)}">`: ''}${image&&!demo?`<meta property="og:image" content="${e(image)}">`:''}<link rel="icon" type="image/svg+xml" href="${e(path(b,'assets/favicon.svg'))}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Anton&family=Bricolage+Grotesque:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet"><link rel="stylesheet" href="${e(path(b,'assets/showcase.css'))}"><script src="${e(path(b,'assets/showcase.js'))}" defer></script></head><body${gallery?' data-gallery="true"':''}><a class="skip-link" href="#main">Skip to content</a>${gallery ? `<div id="intro" class="intro" hidden role="dialog" aria-modal="true" aria-label="Showcase introduction"><div class="intro-top"><span>AASE / STUDENT SHOWCASE</span><span>FALL 2026</span></div><div class="intro-center"><span class="intro-star" aria-hidden="true">✳</span><p>MADE<br><em>BY US.</em></p><div class="intro-rule" aria-hidden="true"></div></div><div class="intro-bottom"><span class="mono">EECS 498</span><button id="skip-intro" type="button">Skip intro ↗</button></div></div>` : ''}<div id="page" tabindex="-1">${demo?`<div class="preview-ribbon"><span><i></i> LOCAL PREVIEW <span class="ribbon-separator">/</span> SAMPLE PROJECTS</span><span>${gallery?'<button id="replay-intro" type="button">Replay intro ↻</button>':'FICTIONAL WORK FOR DESIGN REVIEW'}</span></div>`:''}<header class="masthead"><a class="wordmark" href="${e(b)}" aria-label="AASE Showcase home"><img src="${e(path(b,'assets/aase-mark.svg'))}" width="40" height="40" alt=""><span>AASE</span></a><span class="masthead-label">Showcase</span><button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav">Menu <span aria-hidden="true">+</span></button><nav id="main-nav" aria-label="Main navigation"><a href="${e(b)}#projects">Projects</a><a href="${e(path(b,'submit/'))}">Submit a project</a><a class="course-link" href="${e(safeLink(config.courseUrl)||'https://eecs498-aase.github.io/')}">Course ${arrow}</a></nav></header><main id="main">${body}</main><footer class="footer footer-compact"><a href="${e(safeLink(config.courseUrl)||'https://eecs498-aase.github.io/')}" class="footer-course">AASE <span>/</span> University of Michigan</a><div>${gallery&&!demo?'<button class="footer-replay" id="replay-intro" type="button">Replay intro ↻</button>':''}<a href="#main">Back to top ↑</a></div></footer></div></body></html>`;
}
function card(p,participant,b,index=0) {
  const search=[p.title,p.summary,name(participant),p.category,...(p.tags||[]),...(p.tools||[])].join(' ').toLowerCase();
  return `<article class="project-card" data-project data-search="${e(search)}" data-category="${e(p.category)}" data-tools="${e(JSON.stringify(p.tools||[]))}" data-cohort="${e(p.cohort)}"><a class="project-cover" href="${e(projectUrl(p,b))}" tabindex="-1" aria-hidden="true"><img src="${e(p.thumbnailUrl||cover(p))}"${p.thumbnailUrl?` srcset="${e(p.thumbnailUrl)} 640w, ${e(cover(p))} 1440w" sizes="(max-width:650px) 90vw, (max-width:900px) 44vw, 29vw"`: ''} alt="" width="1440" height="1000" loading="lazy"><span class="cover-index">${String(index+1).padStart(2,'0')} / AASE</span><span class="cover-arrow" aria-hidden="true">↗</span></a><div class="card-meta"><span>${e(p.category)}</span><span>${e(String(p.cohort||'').toUpperCase())}</span></div><h3><a href="${e(projectUrl(p,b))}">${e(p.title)}</a></h3><p class="card-summary">${e(p.summary)}</p><div class="card-tags">${(p.tags||[]).slice(0,3).map(t=>`<span>${e(t)}</span>`).join('')}</div><div class="card-maker"><a href="${e(makerUrl(p,b))}"><span class="maker-mark" aria-hidden="true">${e(name(participant).split(' ').map(x=>x[0]).slice(0,2).join(''))}</span>${e(name(participant))}</a><span aria-hidden="true">↗</span></div></article>`;
}
export function renderGallery({projects=[],participants=[],basePath='/showcase/',demo=false,config={}}) {
  const b=basePath;
  const categories=[...new Set(projects.map(p=>p.category))].sort();
  const tools=[...new Set(projects.flatMap(p=>p.tools||[]))].sort();
  const cohorts=[...new Set(projects.map(p=>p.cohort))].sort().reverse();
  const demoOrder=['Patch Notes','Field Notes','Office Hours'];
  const montage=(demo?[...projects].sort((a,b)=>(demoOrder.includes(a.title)?demoOrder.indexOf(a.title):99)-(demoOrder.includes(b.title)?demoOrder.indexOf(b.title):99)):[...projects].sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured)))).slice(0,3);
  const heroArt=montage.length?`
    <div class="exhibit-head"><span><i></i> ${demo?'SAMPLE PROJECTS':'SELECTED PROJECTS'}</span><span>${e(config.cohortLabel||'Fall 2026')}</span></div>
    <div class="exhibit-stage">${montage.map((p,i)=>`<a class="exhibit-piece piece-${i+1}" href="${e(projectUrl(p,b))}" aria-label="Explore ${e(p.title)}"><div class="piece-window" aria-hidden="true"><i></i><i></i><i></i><span>${e(p.title.toUpperCase())}</span></div><img src="${e(cover(p))}" alt="${e(p.cover?.alt||p.title)}" width="1200" height="800"><div class="piece-caption"><span>${e(p.title)}</span><span aria-hidden="true">↗</span></div></a>`).join('')}<span class="exhibit-cross" aria-hidden="true">✳</span></div>`:`
    <div class="blueprint" aria-hidden="true">
      <div class="blueprint-bar"><i></i><i></i><i></i><span>aase / showcase</span></div>
      <svg viewBox="0 0 500 330" fill="none">
        <g stroke="#a9b6cb" stroke-opacity=".32"><path d="M0 165H500M250 0V330" stroke-dasharray="3 7"/><circle cx="250" cy="165" r="126" stroke-dasharray="3 7"/><path d="M90 89H173L215 130M285 200L330 245H421M375 78L284 130M91 260L215 200"/></g>
        <g stroke="#6cc7f0" stroke-width="1.5"><rect x="40" y="62" width="98" height="58" rx="3"/><path d="M53 80L63 89L53 98M74 98H94"/><rect x="365" y="218" width="98" height="58" rx="3"/><path d="M379 235H445M379 246H421M379 257H437"/></g>
        <g stroke="#ffcb05"><circle cx="375" cy="78" r="12"/><circle cx="91" cy="260" r="7"/><path d="M368 78H382M375 71V85"/></g>
        <rect x="190" y="105" width="120" height="120" rx="16" fill="#ffcb05"/>
        <g stroke="#00274c" stroke-width="9" stroke-linecap="square"><path d="M204 199L228 131L252 199M213 173H243M248 199L272 131L296 199M257 173H287"/></g>
        <g fill="#6cc7f0"><circle cx="173" cy="89" r="3"/><circle cx="330" cy="245" r="3"/></g>
      </svg>
    </div>`;
  const filters=projects.length?`
    <form class="gallery-controls" id="gallery-filters" role="search" aria-label="Find projects">
      <div class="search-field"><label for="project-search">SEARCH</label><div><span aria-hidden="true">⌕</span><input id="project-search" name="q" type="search" placeholder="Project, tool, or maker" autocomplete="off"></div></div>
      <div class="select-field"><label for="category-filter">CATEGORY</label><select id="category-filter" name="category"><option value="">All categories</option>${categories.map(c=>`<option value="${e(c)}">${e(c)}</option>`).join('')}</select></div>
      <div class="select-field"><label for="tool-filter">TOOL</label><select id="tool-filter" name="tool"><option value="">All tools</option>${tools.map(t=>`<option value="${e(t)}">${e(t)}</option>`).join('')}</select></div>
      <div class="select-field"><label for="cohort-filter">SEMESTER</label><select id="cohort-filter" name="cohort"><option value="">All semesters</option>${cohorts.map(c=>`<option value="${e(c)}">${e(cohortName(c,config))}</option>`).join('')}</select></div>
      <button class="filter-apply" type="submit">Apply filters</button>
    </form>
    <noscript><p class="noscript-note">All projects are listed below. Enable JavaScript to filter.</p></noscript>
    <div class="results-bar"><p id="result-count" role="status" aria-live="polite">${projects.length} ${demo?'sample ':''}project${projects.length===1?'':'s'}</p><button id="clear-filters" type="button" hidden>Clear filters ×</button></div>`:'';
  return shell({title:'Built by AASE',description:'Projects by AASE students at the University of Michigan.',basePath:b,demo,config,gallery:true,body:`
    <section class="hero hero-quiet" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="eyebrow"><i></i> EECS 498 <span>/</span> ${e(config.cohortLabel||'Fall 2026')}</p>
        <h1 id="hero-title">BUILT<br>BY <span class="hero-aase">AASE<span class="period">.</span></span></h1>
        <div class="hero-bottom"><p>Student projects in agentic software engineering.</p><a class="text-link" href="${e(path(b,'submit/'))}">Submit a project ${arrow}</a></div>
      </div>
      <div class="hero-exhibit ${montage.length?'':'hero-blueprint'}">${heroArt}</div>
    </section>
    <section class="gallery-section gallery-quiet" id="projects" aria-labelledby="gallery-title">
      <div class="section-heading"><h2 id="gallery-title">Projects<span class="heading-dot">.</span></h2><span class="gallery-term">${e(config.cohortLabel||'Fall 2026')}</span></div>
      ${filters}<div class="project-grid" id="project-grid">${projects.map((p,i)=>card(p,maker(p,participants),b,i)).join('')}</div>
      <div class="empty-state empty-quiet" id="empty-state" ${projects.length?'hidden':''}><span aria-hidden="true">↳</span><div><h3>${projects.length?'No matches.':'First projects coming soon.'}</h3><p>${projects.length?'Try another search or clear the filters.':'Have something to share? Submit your first project.'}</p></div>${projects.length?'<button class="text-link" id="reset-search" type="button">Show all projects ↗</button>':''}</div>
    </section>`});
}
export function renderProject({project:p,participant,projects=[],basePath='/showcase/',demo=false,config={}}) {
  const b=basePath,who=participant||{displayName:p.makerName||'AASE maker'},related=projects.filter(x=>x.projectId!==p.projectId&&String(x.ownerId)===String(p.ownerId));
  const story=[['01','Problem','problem'],['02','The build','built'],['03','AI use','aiUse'],['04','Decisions','humanDecisions'],['05','Limitations','limitations']];
  const actions=[['demo','Try the demo'],['video','Watch the walkthrough'],['source','View source']].filter(([key])=>safeLink(p.links?.[key]));
  return shell({title:p.title,description:p.summary,basePath:b,demo,config,article:true,canonical:config.siteUrl?`${config.siteUrl.replace(/\/$/,'')}${projectUrl(p,b)}`:'',image:config.siteUrl?`${config.siteUrl.replace(/\/$/,'')}${cover(p)}`:'',body:`<article class="project-page"><div class="breadcrumb"><a href="${e(b)}#projects">← The collection</a><span>${e(cohortName(p.cohort,config))} / ${e(p.category)}</span></div><header class="project-header"><div><p class="eyebrow">${e(p.category)} <span>/</span> ${demo?'SAMPLE PROJECT':'STUDENT PROJECT'}</p><h1>${e(p.title)}<span>.</span></h1><p class="project-pitch">${e(p.summary)}</p></div><aside class="project-byline"><span class="mono">BUILT BY</span><a href="${e(makerUrl(p,b))}">${e(name(who))} ${arrow}</a><div class="card-tags">${(p.tags||[]).map(t=>`<span>${e(t)}</span>`).join('')}</div>${actions.length?`<div class="project-actions">${actions.map(([key,label],i)=>`<a class="button ${i?'button-outline':'button-dark'}" href="${e(safeLink(p.links[key]))}" rel="noopener noreferrer">${label} ${arrow}</a>`).join('')}</div>`:''}</aside></header><figure class="project-main-image"><img src="${e(cover(p))}" alt="${e(p.cover?.alt||p.title)}" width="1200" height="800"><figcaption><span>${demo?'ILLUSTRATIVE PROJECT STUDY':'PROJECT OVERVIEW'}</span><span>${e(p.title)} / ${e(name(who))}</span></figcaption></figure><div class="project-story-layout"><aside class="story-sidebar"><span class="eyebrow">THE BUILD NOTES</span><nav aria-label="Project story">${story.map(([n,title,key])=>`<a href="#${key}"><span>${n}</span>${title}</a>`).join('')}</nav><div class="stack-block"><span class="eyebrow">TOOLS & LANGUAGES</span>${(p.tools||[]).map(t=>`<span class="stack-tool">${e(t)}</span>`).join('')}</div>${p.updatedAt?`<p class="date-note">LAST UPDATED<br>${e(p.updatedAt)}</p>`:''}</aside><div class="story-sections">${story.map(([n,title,key])=>`<section class="story-section" id="${key}"><span class="story-number">${n}</span><h2>${title}</h2>${paragraphs(p.story?.[key])}</section>`).join('')}${p.screenshots?.length?`<section class="story-section screenshot-section"><span class="story-number">06</span><h2>Screenshots</h2>${p.screenshots.map(s=>`<figure><img src="${e(s.url)}" alt="${e(s.alt)}" loading="lazy" width="1200" height="800">${s.caption?`<figcaption>${e(s.caption)}</figcaption>`:''}</figure>`).join('')}</section>`:''}</div></div>${related.length?`<section class="related-section"><div class="section-meta"><span>MORE FROM ${e(name(who).toUpperCase())}</span><a href="${e(makerUrl(p,b))}">Meet the maker ↗</a></div><div class="project-grid">${related.map((q,i)=>card(q,who,b,i)).join('')}</div></section>`:''}<div class="project-end"><a class="button button-dark" href="${e(b)}#projects">Back to the collection ${arrow}</a></div></article>`});
}
export function renderMaker({participant,projects=[],basePath='/showcase/',demo=false,config={}}) {
  const b=basePath,gh=safeLink(participant.githubUrl || (typeof participant.github==='string'?participant.github:''));
  return shell({title:name(participant),description:participant.bio||`Projects by ${name(participant)}.`,basePath:b,demo,config,body:`<section class="maker-page"><div class="breadcrumb"><a href="${e(b)}#projects">← The collection</a><span>MAKER</span></div><header class="maker-header"><div><span class="eyebrow">${demo?'FICTIONAL MAKER / DESIGN PREVIEW':'STUDENT MAKER'}</span><h1>${e(name(participant))}<span>.</span></h1><p>${e(participant.bio||'Building, testing, and learning through software.')}</p>${gh?`<a class="text-link" href="${e(gh)}">GitHub ${arrow}</a>`:''}</div><div class="maker-monogram" aria-hidden="true">${e(name(participant).split(' ').map(x=>x[0]).slice(0,2).join(''))}<span>✳</span></div></header><div class="section-meta"><span>THE WORK / ${String(projects.length).padStart(2,'0')} PROJECT${projects.length===1?'':'S'}</span></div><div class="project-grid">${projects.map((p,i)=>card(p,participant,b,i)).join('')}</div></section>`});
}
export function renderSubmit({basePath='/showcase/',demo=false,config={}}) {
  const b=basePath,repo=safeLink(config.repositoryUrl);
  return shell({title:'Submit a project',description:'Register, add your project, and open a pull request.',basePath:b,demo,config,body:`
    <section class="submit-page submit-quiet">
      <div class="breadcrumb"><a href="${e(b)}">← Showcase</a></div>
      <header class="submit-header"><p class="eyebrow">FOR AASE STUDENTS</p><h1>Submit a <span>project.</span></h1><p class="submit-lede">Three projects per semester. Updates welcome.</p></header>
      ${(!repo||demo)?'<div class="submission-notice"><p>Design preview. Sample projects are fictional.</p></div>':''}
      <div class="submit-grid"><aside>
        <a class="button button-dark" href="${e(path(b,'template/project.json'))}" download="project.json">Get the template <span aria-hidden="true">↓</span></a>
        ${repo?`<a class="text-link repo-link" href="${e(repo)}">Open repository ${arrow}</a>`:''}
        <p class="aside-note">Host your app and backend yourself. Add the demo link here.</p>
      </aside><ol class="submission-steps">
        <li><span>01</span><div><h2>Register</h2><p>Send staff your GitHub username and public display name. Wait for confirmation.</p></div></li>
        <li><span>02</span><div><h2>Add your project</h2><p>Fork the repository. Copy the template to your slot, fill in your story, and add a cover image.</p><code class="path-example">projects/f26/YOUR_GITHUB_ID/01/project.json</code></div></li>
        <li><span>03</span><div><h2>Open a PR</h2><p>Submit your project files. Fix any failed checks and wait for staff review.</p></div></li>
        <li><span>04</span><div><h2>Go live</h2><p>Staff merges your PR. Your project appears after deployment. Use the same slot for updates.</p></div></li>
      </ol></div>
      <div class="submission-details">
        <details><summary>What goes in a project?</summary><p>A title, short pitch, tools, and five notes: the problem, the build, AI use, your decisions, and limitations. Demo, video, and source links are optional.</p></details>
        <details><summary>Images and file limits</summary><p>One cover and up to four screenshots. Use PNG, JPEG, or WebP, at most 1 MiB (1,048,576 bytes) and 4096 pixels per side. Add alt text. Keep images in the project folder; no scripts or HTML.</p></details>
        <details><summary>Slots and privacy</summary><p>Use slots 01–03 for three distinct projects per semester. Updates keep the same slot; withdrawals still count. Contact staff to withdraw a project.</p><p>Submit only work you want public. Keep private course code and personal information out. Removing a page does not erase PRs, forks, or Git history.</p></details>
        ${repo?`<a class="text-link full-guide" href="${e(repo.replace(/\/$/,''))}/blob/main/docs/SUBMITTING.md">Full submission instructions ${arrow}</a>`:''}
      </div>
    </section>`});
}
export function render404({basePath='/showcase/',demo=false,config={}}) {return shell({title:'Page not found',description:'This showcase page could not be found.',basePath,demo,config,body:`<section class="not-found"><span class="eyebrow">404 / OFF THE MAP</span><h1>NOT HERE.<br>YET<span>.</span></h1><p>This page may have moved or the project may no longer be listed.</p><a class="button button-dark" href="${e(basePath)}">Explore the collection ${arrow}</a></section>`});}
