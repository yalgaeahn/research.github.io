(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem('theme');
  const prefersDark=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved){ if(saved==='dark') root.classList.add('dark'); } else if(prefersDark){ root.classList.add('dark'); }
  window.__toggleTheme=()=>{ root.classList.toggle('dark'); localStorage.setItem('theme', root.classList.contains('dark')?'dark':'light'); };

  // sidebar collapse toggle (persisted)
  if(localStorage.getItem('sidebar')==='collapsed'){
    document.body.classList.add('sidebar-collapsed');
  }
  window.__toggleSidebar = ()=>{
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebar', collapsed ? 'collapsed' : 'expanded');
  };

  fetch('data/content.json').then(r=>r.json()).then(d=>{
    renderProfile(d.profile, d.socials);
    renderPubs(d.publications);
    renderProjects(d.projects);
    renderTeaching(d.teaching);
    renderChart(d.publications);
  });

  function el(s){return document.querySelector(s);} 

  // --- inline SVG icon helper so icons follow currentColor and work in dark mode ---
  async function inlineIcon(anchorEl, key, label){
    // prevent double-insert if already inlined or in progress
    if (anchorEl?.dataset?.iconLoaded === '1' || anchorEl?.dataset?.iconPending === '1') {
      return true;
    }
    if (anchorEl && anchorEl.dataset) anchorEl.dataset.iconPending = '1';
    try{
      const res = await fetch(`assets/icons/${key}.svg`);
      if(!res.ok) throw new Error('missing svg');
      let svg = await res.text();
      // strip hard-coded fills/strokes so CSS can colorize with currentColor
      svg = svg.replace(/\sfill="[^"]*"/gi, '')
               .replace(/\sstroke="[^"]*"/gi, '');
      // Ensure pending flag is set (keep as is)
      if (anchorEl && anchorEl.dataset) anchorEl.dataset.iconPending = '1';
      anchorEl.insertAdjacentHTML('afterbegin', svg);
      const s = anchorEl.querySelector('svg');
      if(s){
        s.setAttribute('width','18');
        s.setAttribute('height','18');
        s.setAttribute('aria-hidden','true');
        s.setAttribute('focusable','false');
      }
      if(!anchorEl.querySelector('.sr-only')){
        const sr=document.createElement('span');
        sr.className='sr-only'; sr.textContent=label||key; anchorEl.appendChild(sr);
      }
      anchorEl.classList.add('icon-btn');
      // Mark as loaded and clear pending
      if(anchorEl && anchorEl.dataset){
        anchorEl.dataset.iconLoaded = '1';
        delete anchorEl.dataset.iconPending;
      }
      return true;
    }catch(e){
      // Clear pending flag so callers can retry
      if(anchorEl && anchorEl.dataset){ delete anchorEl.dataset.iconPending; }
      return false;
    }
  }

  function upgradeStaticIcons(){
    document.querySelectorAll('a[data-icon]').forEach(a=>{
      const key=(a.getAttribute('data-icon')||'').toLowerCase();
      const label=a.getAttribute('aria-label')||key;
      inlineIcon(a, key, label).then(ok=>{
        if(!ok){
          // fallback to text if svg not found
          if(!a.textContent.trim()) a.textContent = label.toUpperCase();
          a.classList.remove('icon-btn');
          a.classList.add('btn','small');
        }
      });
    });
  }

  // Note: we no longer inject a #hero or <style> — index.html owns the hero markup & CSS.
  function renderProfile(p, socials){
    // Populate existing hero elements in index.html
    el('#name').textContent=p.name;
    el('#eyebrow-name').textContent=p.name;
    el('#titleloc').textContent=`${p.title} · ${p.location}`;
    el('#tagline').innerHTML=p.tagline;
    const aff = p.affiliation || null;
    const affEl = el('#affiliation');
    if(affEl){
      if(aff && (aff.name || aff.url)){
        affEl.textContent = aff.name || aff.url || '';
        if(aff.url) { affEl.href = aff.url; affEl.target = '_blank'; affEl.rel = 'noreferrer'; }
        affEl.parentElement && (affEl.parentElement.style.display = 'block');
      }else{
        // hide the paragraph if no affiliation provided
        affEl.parentElement && (affEl.parentElement.style.display = 'none');
      }
    }
    const emailLink = el('#email-link');
    if(emailLink){ emailLink.href = `mailto:${p.email}`; emailLink.textContent = p.email; }
    const emailIcon = el('#email-icon');
    if(emailIcon){
      emailIcon.href = `mailto:${p.email}`;
      emailIcon.setAttribute('aria-label', p.email);
      if (
        !emailIcon.querySelector('svg') &&
        emailIcon.dataset.iconLoaded !== '1' &&
        emailIcon.dataset.iconPending !== '1'
      ) {
        inlineIcon(emailIcon, 'mail', 'Email');
      }
    }
    el('#cv').href=p.cv_url||'#';
    const img=el('#headshot'); if(img){ img.src='assets/Me.png'; img.setAttribute('data-default-src','assets/Me.png'); img.alt=p.name; }
    const s = el('#socials');
    if(s){
      s.innerHTML='';
      const ICON_MAP = { orcid:'orcid', github:'github', gitHub:'github', linkedin:'linkedin', linkedIn:'linkedin' };
      (socials||[]).forEach(x=>{
        const a=document.createElement('a');
        a.href=x.href; a.target='_blank'; a.rel='noreferrer';
        a.setAttribute('aria-label', x.label || 'social');
        // try to infer icon key from provided x.icon, label, or href
        const label=(x.icon||x.label||'').toLowerCase();
        let key = ICON_MAP[label];
        if(!key && x.href){
          if(/orcid\.org/i.test(x.href)) key='orcid';
          else if(/github\.com/i.test(x.href)) key='github';
          else if(/linkedin\.com/i.test(x.href)) key='linkedin';
        }
        if(key){
          a.className='icon-btn';
          inlineIcon(a, key, x.label||key).then(ok=>{
            if(!ok){ a.className='btn small'; a.textContent=x.label||key; }
          });
        }else{
          a.className='btn small'; a.textContent=x.label||x.href;
        }
        s.appendChild(a);
      });
    }
    const y = el('#year'); if(y) y.textContent=String(new Date().getFullYear());

    const seeBtn = el('#see-you');
    if (seeBtn && p.personal_blog) {
      seeBtn.addEventListener('click', () => {
        window.open(p.personal_blog, '_blank', 'noopener');
      });
    }
  }

  const state={q:'',type:'all',sort:'desc'};

  function renderPubs(pubs){
    const qEl=el('#q'), typeEl=el('#type'), sortEl=el('#sort');
    function apply(){
      let items=pubs.slice();
      if(state.type!=='all') items=items.filter(p=>p.type===state.type);
      if(state.q){ const qq=state.q.toLowerCase(); items=items.filter(p=>(p.title+' '+(p.authors||[]).join(' ')+' '+(p.venue||'')).toLowerCase().includes(qq));}
      items.sort((a,b)=> state.sort==='desc' ? b.year-a.year : a.year-b.year);
      const list=el('#pub-list'); if(!list) return; list.innerHTML='';
      if(items.length===0){ list.innerHTML='<p class="small">No matches. Try a different query.</p>'; return; }
      items.forEach(p=>{
        const div=document.createElement('div'); div.className='pub';
        const t=document.createElement('div'); t.className='pub-title';
        const a=document.createElement('a'); a.href=p.link||'#'; a.target='_blank'; a.rel='noreferrer'; a.textContent=p.title; t.appendChild(a);
        const meta=document.createElement('div'); meta.className='pub-meta'; meta.textContent=`${(p.authors||[]).join(', ')} • ${(p.venue||'')} ${p.year||''}`;
        const tags=document.createElement('div'); (p.tags||[]).forEach(tag=>{ const b=document.createElement('span'); b.className='badge'; b.textContent=tag; tags.appendChild(b); });
        div.appendChild(t); div.appendChild(meta); div.appendChild(tags); list.appendChild(div);
      });
    }
    if(qEl) qEl.addEventListener('input', e=>{state.q=e.target.value; apply();});
    if(typeEl) typeEl.addEventListener('change', e=>{state.type=e.target.value; apply();});
    if(sortEl) sortEl.addEventListener('change', e=>{state.sort=e.target.value; apply();});
    apply();
  }

  function renderProjects(rows){ const wrap=el('#projects-wrap'); if(!wrap) return; wrap.innerHTML=''; rows.forEach(p=>{ const c=document.createElement('div'); c.className='card'; c.innerHTML=`<h3 class="kicker">${p.title}</h3><p class="pub-meta">${p.summary||''}</p><p><a class="btn ghost" href="${p.link||'#'}" target="_blank" rel="noreferrer">Learn more</a></p>`; wrap.appendChild(c); }); }
  function renderTeaching(rows){ const wrap=el('#teaching-wrap'); if(!wrap) return; wrap.innerHTML=''; rows.forEach(t=>{ const c=document.createElement('div'); c.className='card'; c.innerHTML=`<h3 class="kicker">${t.course}</h3><p class="pub-meta">${t.role} · ${t.term}</p><p><a class="btn ghost" href="${t.link||'#'}" target="_blank" rel="noreferrer">Syllabus</a></p>`; wrap.appendChild(c); }); }

  function renderChart(pubs){
    const byYear={}; pubs.forEach(p=>{ byYear[p.year]=(byYear[p.year]||0)+1; });
    const years=Object.keys(byYear).map(Number).sort((a,b)=>a-b); if(!years.length) return;
    const max=Math.max(...years.map(y=>byYear[y])); const w=520,h=150,pad=24; const bw=(w-pad*2)/years.length*0.7;
    let svg=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Publications per year">`;
    svg+=`<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="currentColor" opacity="0.2"/>`;
    years.forEach((y,i)=>{ const x=pad+(i+0.15)*((w-pad*2)/years.length); const bh=(byYear[y]/max)*(h-pad*2); const yTop=(h-pad)-bh; svg+=`<rect x="${x}" y="${yTop}" width="${bw}" height="${bh}" rx="6" ry="6" fill="currentColor" opacity="0.2"></rect>`; svg+=`<text x="${x+bw/2}" y="${h-pad/2}" text-anchor="middle" class="small" fill="currentColor" opacity="0.6">${y}</text>`; });
    svg+='</svg>'; const chart=el('#chart'); if(chart) chart.innerHTML=svg;
  }

  // --- OpenAI-like hero category interactions (left sidebar -> right image/glow) ---
  (function(){
    function setup(){
      const cats = document.querySelectorAll('.side-cats .cat');
      const right = document.querySelector('.hero-right');
      const img = document.getElementById('headshot');
      if(!cats.length || !right || !img) return;

      // keep original image as fallback
      const defaultSrc = img.getAttribute('data-default-src') || img.getAttribute('data-default') || img.src;
      const cache = new Map();
      function preload(src){
        return new Promise((resolve)=>{
          if(!src){ resolve(false); return; }
          if(cache.has(src)) { resolve(cache.get(src)); return; }
          const im = new Image();
          im.onload = ()=>{ cache.set(src,true); resolve(true); };
          im.onerror = ()=>{ cache.set(src,false); resolve(false); };
          im.src = src;
        });
      }

      async function activate(a){
        cats.forEach(c=>c.classList.remove('active'));
        a.classList.add('active');
        const nextBg = a.getAttribute('data-bg');
        if(nextBg) right.style.setProperty('--hero-bg', nextBg);
        // lock headshot to a fixed image regardless of category
        if(img) img.src = 'assets/Me.png';
      }

      cats.forEach(a=>{
        a.addEventListener('mouseenter', ()=>activate(a));
        a.addEventListener('focus', ()=>activate(a));
        a.addEventListener('click', e=>{ e.preventDefault(); activate(a); const href=a.getAttribute('href'); if(href && href.startsWith('#')){ const t=document.querySelector(href); if(t) t.scrollIntoView({behavior:'smooth'}); }});
      });

      const initial = document.querySelector('.side-cats .cat.active') || cats[0];
      if(initial) activate(initial);
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', setup); else setup();
  })();
  // --- end ---
  // --- end reactive quantum glow ---
  upgradeStaticIcons();
})();