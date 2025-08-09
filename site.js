
(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem('theme');
  const prefersDark=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved){ if(saved==='dark') root.classList.add('dark'); } else if(prefersDark){ root.classList.add('dark'); }
  window.__toggleTheme=()=>{ root.classList.toggle('dark'); localStorage.setItem('theme', root.classList.contains('dark')?'dark':'light'); };

  fetch('data/content.json').then(r=>r.json()).then(d=>{
    renderProfile(d.profile, d.socials);
    renderPubs(d.publications);
    renderProjects(d.projects);
    renderTeaching(d.teaching);
    renderChart(d.publications);
  });

  function el(s){return document.querySelector(s);}

  function renderProfile(p, socials){
    el('#name').textContent=p.name;
    el('#eyebrow-name').textContent=p.name;
    el('#titleloc').textContent=`${p.title} · ${p.location}`;
    el('#tagline').textContent=p.tagline;
    el('#email').href=`mailto:${p.email}`; el('#email').textContent=p.email;
    el('#cv').href=p.cv_url||'#';
    const img=el('#headshot'); img.src=p.headshot; img.alt=p.name;
    const s = el('#socials'); s.innerHTML=''; socials.forEach(x=>{ const a=document.createElement('a'); a.className='btn'; a.href=x.href; a.target='_blank'; a.rel='noreferrer'; a.textContent=x.label; s.appendChild(a); });
    el('#year').textContent=String(new Date().getFullYear());
  }

  const state={q:'',type:'all',sort:'desc'};

  function renderPubs(pubs){
    const qEl=el('#q'), typeEl=el('#type'), sortEl=el('#sort');
    function apply(){
      let items=pubs.slice();
      if(state.type!=='all') items=items.filter(p=>p.type===state.type);
      if(state.q){ const qq=state.q.toLowerCase(); items=items.filter(p=>(p.title+' '+(p.authors||[]).join(' ')+' '+(p.venue||'')).toLowerCase().includes(qq));}
      items.sort((a,b)=> state.sort==='desc' ? b.year-a.year : a.year-b.year);
      const list=el('#pub-list'); list.innerHTML='';
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
    qEl.addEventListener('input', e=>{state.q=e.target.value; apply();});
    typeEl.addEventListener('change', e=>{state.type=e.target.value; apply();});
    sortEl.addEventListener('change', e=>{state.sort=e.target.value; apply();});
    apply();
  }

  function renderProjects(rows){ const wrap=el('#projects-wrap'); wrap.innerHTML=''; rows.forEach(p=>{ const c=document.createElement('div'); c.className='card'; c.innerHTML=`<h3 class="kicker">${p.title}</h3><p class="pub-meta">${p.summary||''}</p><p><a class="btn ghost" href="${p.link||'#'}" target="_blank" rel="noreferrer">Learn more</a></p>`; wrap.appendChild(c); }); }
  function renderTeaching(rows){ const wrap=el('#teaching-wrap'); wrap.innerHTML=''; rows.forEach(t=>{ const c=document.createElement('div'); c.className='card'; c.innerHTML=`<h3 class="kicker">${t.course}</h3><p class="pub-meta">${t.role} · ${t.term}</p><p><a class="btn ghost" href="${t.link||'#'}" target="_blank" rel="noreferrer">Syllabus</a></p>`; wrap.appendChild(c); }); }

  function renderChart(pubs){
    const byYear={}; pubs.forEach(p=>{ byYear[p.year]=(byYear[p.year]||0)+1; });
    const years=Object.keys(byYear).map(Number).sort((a,b)=>a-b); if(!years.length) return;
    const max=Math.max(...years.map(y=>byYear[y])); const w=520,h=150,pad=24; const bw=(w-pad*2)/years.length*0.7;
    let svg=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Publications per year">`;
    svg+=`<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="currentColor" opacity="0.2"/>`;
    years.forEach((y,i)=>{ const x=pad+(i+0.15)*((w-pad*2)/years.length); const bh=(byYear[y]/max)*(h-pad*2); const yTop=(h-pad)-bh; svg+=`<rect x="${x}" y="${yTop}" width="${bw}" height="${bh}" rx="6" ry="6" fill="currentColor" opacity="0.2"></rect>`; svg+=`<text x="${x+bw/2}" y="${h-pad/2}" text-anchor="middle" class="small" fill="currentColor" opacity="0.6">${y}</text>`; });
    svg+='</svg>'; document.querySelector('#chart').innerHTML=svg;
  }
})(); 
