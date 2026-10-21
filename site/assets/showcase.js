(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The brand sequence is optional. The entire page is usable without JavaScript.
  const intro=$('#intro'), page=$('#page'), replay=$('#replay-intro');
  let introTimer, watchdog, closeTimer, introFocus, introScroll=0;
  function releaseIntro() {
    if(!intro)return;
    clearTimeout(introTimer);clearTimeout(watchdog);clearTimeout(closeTimer);
    intro.hidden=true;intro.classList.remove('intro-leaving');
    if(page)page.inert=false;
    document.body.classList.remove('intro-open');document.body.classList.add('is-ready');
    window.scrollTo(0,introScroll);
    if(introFocus && typeof introFocus.focus==='function')introFocus.focus({preventScroll:true});
  }
  function closeIntro(immediate=false) {
    if(!intro||intro.hidden)return;
    clearTimeout(introTimer);
    if(immediate||reduced.matches){releaseIntro();return;}
    intro.classList.add('intro-leaving');closeTimer=setTimeout(releaseIntro,280);
  }
  function playIntro(manual=false) {
    if(!intro)return;
    if(reduced.matches){document.body.classList.add('is-ready');return;}
    introScroll=window.scrollY;introFocus=manual?replay:page;
    watchdog=setTimeout(releaseIntro,2100);
    intro.hidden=false;intro.classList.remove('intro-leaving');
    document.body.classList.remove('is-ready');document.body.classList.add('intro-open');
    if(page)page.inert=true;
    $('#skip-intro')?.focus({preventScroll:true});
    introTimer=setTimeout(()=>closeIntro(),1250);
    try{sessionStorage.setItem('aase-showcase-intro','seen');}catch{}
  }
  if(intro){
    $('#skip-intro')?.addEventListener('click',()=>closeIntro(true));
    replay?.addEventListener('click',()=>playIntro(true));
    intro.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeIntro(true);}if(event.key==='Tab'){event.preventDefault();$('#skip-intro')?.focus();}});
    reduced.addEventListener?.('change',()=>{if(reduced.matches&&!intro.hidden)releaseIntro();});
    let seen=false;try{seen=sessionStorage.getItem('aase-showcase-intro')==='seen';}catch{}
    if(!seen&&!reduced.matches&&!location.hash&&!location.search)playIntro();else document.body.classList.add('is-ready');
  }else document.body.classList.add('is-ready');
  // Keep the mobile navigation a small, ordinary disclosure.
  const toggle=$('#menu-toggle'),nav=$('#main-nav');
  function closeMenu(){if(!nav||!toggle)return;nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');}
  toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav?.classList.toggle('is-open',open);});
  nav?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}});
  document.addEventListener('click',event=>{if(nav&&toggle&&!nav.contains(event.target)&&!toggle.contains(event.target))closeMenu();});
  window.matchMedia('(min-width: 651px)').addEventListener?.('change',event=>{if(event.matches)closeMenu();});
  // Filter pre-rendered cards, so navigation and content need no API or JS runtime.
  const form=$('#gallery-filters');if(!form)return;
  const search=$('#project-search'),category=$('#category-filter'),tool=$('#tool-filter'),cohort=$('#cohort-filter');
  const cards=$$('[data-project]'),counter=$('#result-count'),empty=$('#empty-state'),clear=$('#clear-filters');
  const fields={q:search,category,tool,cohort};
  const isDemo=Boolean($('.preview-ribbon'));
  function readURL(){const params=new URLSearchParams(location.search);Object.entries(fields).forEach(([key,input])=>{if(!input)return;const value=params.get(key)||'';input.value=input.tagName==='SELECT'&&!Array.from(input.options).some(o=>o.value===value)?'':value;});}
  function apply(updateURL=true){
    const terms=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);let visible=0;
    cards.forEach(card=>{let cardTools=[];try{cardTools=JSON.parse(card.dataset.tools||'[]');}catch{}
      const matches=terms.every(t=>card.dataset.search.includes(t))&&(!category.value||card.dataset.category===category.value)&&(!tool.value||cardTools.includes(tool.value))&&(!cohort.value||card.dataset.cohort===cohort.value);
      card.hidden=!matches;if(matches)visible++;
    });
    const active=Object.values(fields).some(input=>Boolean(input.value.trim()));
    if(counter)counter.textContent=`${visible} ${isDemo?'sample ':''}project${visible===1?'':'s'}${active?` of ${cards.length}`:''}`;
    if(empty)empty.hidden=visible!==0;if(clear)clear.hidden=!active;
    if(updateURL){const url=new URL(location.href);Object.entries(fields).forEach(([key,input])=>{const value=input.value.trim();if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);});history.replaceState(null,'',url);}
  }
  function reset(){Object.values(fields).forEach(input=>input.value='');apply();search.focus({preventScroll:true});}
  form.addEventListener('submit',event=>{event.preventDefault();apply();});
  search.addEventListener('input',()=>apply());[category,tool,cohort].forEach(input=>input.addEventListener('change',()=>apply()));
  clear?.addEventListener('click',reset);$('#reset-search')?.addEventListener('click',reset);
  window.addEventListener('popstate',()=>{readURL();apply(false);});
  readURL();apply(false);
})();
