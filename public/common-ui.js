(function(){
  const path=location.pathname;
  function pageLabel(){return ({
    "/host.html":"HOST CONSOLE","/join.html":"PARTICIPANT","/registered.html":"REGISTRATION",
    "/tv.html":"QUIZ TV","/audience.html":"AUDIENCE","/admin.html":"ADMIN PORTAL",
    "/payment.html":"ENTRY PAYMENT","/payment-inventory.html":"PAYMENT INVENTORY",
    "/card-match.html":"CARD MATCH","/color-war.html":"COLOR WAR","/color-war-tv.html":"COLOR WAR TV",
    "/quiz-tv.html":"KBC QUIZ TV","/games.html":"EXPLORE GAMES"
  })[path]||"GAMESARENA";}
  function init(){
    document.body.classList.add('gaCommonPage','gaUniversalShell');
    document.documentElement.dataset.gaUiVersion='20260812-final';
    if(!document.querySelector('link[data-ga-responsive-ui]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/responsive-ui.css?v=20260812-responsive-15in-2';l.dataset.gaResponsiveUi='1';document.head.appendChild(l);}
    // Remove legacy/page-specific shells so every page uses the exact same header/footer.
    document.querySelectorAll('body>header.sitebar,body>header.cwHeader,body>header.cwTvHeader,body>header.gaHeader,body>header.gaHeaderLogo,body>header.tvtop,body>header').forEach(h=>h.remove());
    document.querySelectorAll('.gaBackground,.gaAmbient,.gaGridGlow').forEach(el=>el.remove());
    document.querySelectorAll('body>footer:not(.gaCommonFooter)').forEach(f=>f.remove());
    // Shared animated background.
    if(!document.querySelector('.gaSharedBackground')){
      const bg=document.createElement('div');bg.className='gaSharedBackground';bg.setAttribute('aria-hidden','true');
      bg.innerHTML='<div class="gaSharedStars"></div><span class="gaSharedOrb o1"></span><span class="gaSharedOrb o2"></span><span class="gaSharedOrb o3"></span>';
      document.body.prepend(bg);
    }
    if(!document.querySelector('.gaCommonHeader')){
      const header=document.createElement('header');header.className='gaCommonHeader';
      header.innerHTML='<a class="gaCommonBrand" href="/" aria-label="GamesArena home"><img src="/assets/gamesarena-logo-premium.png" alt="GamesArena"><span class="gaCommonBrandText">GamesArena<small>PLAY • THINK • WIN • LIVE</small></span></a><button class="gaMenuToggle" type="button" aria-expanded="false" aria-controls="gaCommonNav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav class="gaCommonNav" id="gaCommonNav" aria-label="Main navigation"><span class="gaCommonLive"><i></i> LIVE PLATFORM</span><a href="/">Home</a><a href="/host.html">Host</a><a href="/payment.html">Payments</a></nav>';
      document.body.insertBefore(header,document.body.firstChild);
    }
    // Host-only utilities belong in the global header, never inside the host console.
    if(path === '/host.html'){
      const nav=document.querySelector('.gaCommonNav');
      if(nav && !nav.querySelector('[data-ga-host-db]')){
        const db=document.createElement('button');
        db.type='button'; db.className='gaHostHeaderAction'; db.dataset.gaHostDb='1';
        db.textContent='DB Status'; db.onclick=()=>window.checkDbStatus?.();
        const logout=document.createElement('button');
        logout.type='button'; logout.className='gaHostHeaderAction gaHostLogout';
        logout.textContent='Logout'; logout.onclick=()=>window.hostLogout?.();
        const home=nav.querySelector('a[href="/"]');
        nav.insertBefore(db, home || null);
        nav.insertBefore(logout, home || null);
      }
    }
    if(!document.querySelector('.gaCommonFooter')){
      const footer=document.createElement('footer');footer.className='gaCommonFooter';
      footer.innerHTML='<strong>GamesArena</strong><span>Play • Think • Win • Live</span><div class="gaCommonFooterLinks"><a href="/">Home</a><a href="/host.html">Host</a><a href="/payment.html">Payments</a></div><span>© '+new Date().getFullYear()+' GamesArena</span>';
      document.body.appendChild(footer);
    }
    const menu=document.querySelector('.gaMenuToggle'),nav=document.querySelector('.gaCommonNav');
    if(menu&&nav&&!menu.dataset.bound){menu.dataset.bound='1';menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');});nav.addEventListener('click',e=>{if(e.target.closest('a')){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}});}
    const current=location.pathname==='/'?'/':location.pathname;
    document.querySelectorAll('.gaCommonNav a').forEach(a=>{if(a.getAttribute('href')===current)a.classList.add('active');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();