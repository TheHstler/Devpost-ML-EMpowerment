
/* ════════════════════════════════════
   STATE
════════════════════════════════════ */
let messages     = [];
let isLoading    = false;
let lastPrompt   = null;
const picks      = { type: null, dur: null, energy: null };
let pickedArtist = null;
let isSurprise   = false;

/* ════════════════════════════════════
   GLOBAL HELPERS — defined first so
   every function below can use them
════════════════════════════════════ */
function esc(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function fmt(t){
  return String(t)
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/\n/g,'<br>');
}

/* ════════════════════════════════════
   SYSTEM PROMPT
════════════════════════════════════ */
const SYSTEM_PROMPT = `You are GymBeat, an AI gym and music coach.

Always respond with ONLY a valid JSON object — no markdown, no backticks, no extra text.

Format:
{
  "sessionTitle": "SHORT PUNCHY SESSION NAME IN CAPS (e.g. LEG DAY: NO EXCUSES)",
  "sessionMeta": ["45 MIN", "LOWER BODY", "HIGH ENERGY"],
  "message": "1-2 sentence motivating intro",
  "phases": [
    {
      "name": "Warm-Up",
      "emoji": "🟡",
      "duration": "~8 mins",
      "exercises": [
        "Jumping Jacks – 2×30 secs",
        "Hip Circles – 30 secs each side",
        "Bodyweight Squat – 2×10"
      ],
      "music": {
        "genre": "Genre (e.g. Hip-Hop / R&B)",
        "bpm": "90–110 BPM",
        "energyLevel": 2,
        "songs": [
          { "title": "Real Song Title", "artist": "Real Artist Name" },
          { "title": "Real Song Title", "artist": "Real Artist Name" },
          { "title": "Real Song Title", "artist": "Real Artist Name" }
        ]
      }
    },
    {
      "name": "Main Set",
      "emoji": "🔴",
      "duration": "~30 mins",
      "exercises": [
        "Barbell Squat – 4×8",
        "Romanian Deadlift – 3×10",
        "Leg Press – 3×12",
        "Walking Lunges – 3×12 each leg",
        "Leg Curl – 3×12"
      ],
      "music": {
        "genre": "Trap / Hip-Hop",
        "bpm": "140–160 BPM",
        "energyLevel": 5,
        "songs": [
          { "title": "Real Song Title", "artist": "Real Artist Name" },
          { "title": "Real Song Title", "artist": "Real Artist Name" },
          { "title": "Real Song Title", "artist": "Real Artist Name" }
        ]
      }
    },
    {
      "name": "Cool-Down",
      "emoji": "🟢",
      "duration": "~7 mins",
      "exercises": [
        "Standing Quad Stretch – 30 secs each",
        "Seated Hamstring Stretch – 45 secs each",
        "Child's Pose – 60 secs",
        "Deep Breathing – 60 secs"
      ],
      "music": {
        "genre": "Chill / Acoustic",
        "bpm": "60–80 BPM",
        "energyLevel": 1,
        "songs": [
          { "title": "Real Song Title", "artist": "Real Artist Name" },
          { "title": "Real Song Title", "artist": "Real Artist Name" },
          { "title": "Real Song Title", "artist": "Real Artist Name" }
        ]
      }
    }
  ]
}

RULES:
- ARTIST MODE: if prompt contains "ARTIST MODE:[artist]" — EVERY song across ALL phases must be by that exact artist. Match energy: calmer songs for warm-up/cool-down, hype tracks for main set. Never mix in other artists.
- DURATION: scale phases to fit the total time. Use "~" prefix on durations to show they're estimates.
- ENERGY: energyLevel is 1–5 (1=chill, 5=maximum). Match to phase intensity.
- SURPRISE ME: if prompt says "SURPRISE ME" choose everything — workout type, duration, energy, music genre.
- Use real, well-known, currently popular songs and artists. Never invent song titles.
- Exercise format: "Exercise Name – sets×reps" or "Exercise Name – duration".
- For general questions (no workout): { "sessionTitle": "", "sessionMeta": [], "message": "your helpful answer", "phases": [] }
- Return ONLY valid JSON. No text before or after it.`;

/* ════════════════════════════════════
   PARTICLES
════════════════════════════════════ */
(function(){
  const c=document.getElementById('particles');
  for(let i=0;i<18;i++){
    const p=document.createElement('div');
    p.className='pt';
    p.style.cssText=`left:${Math.random()*100}vw;width:${Math.random()*3+1}px;height:${Math.random()*3+1}px;background:${Math.random()>.5?'var(--pt)':'var(--pt2)'};animation-duration:${Math.random()*14+8}s;animation-delay:${Math.random()*14}s`;
    c.appendChild(p);
  }
})();

/* ════════════════════════════════════
   THEME
════════════════════════════════════ */
function toggleTheme(){
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  const next = dark?'light':'dark';
  document.documentElement.setAttribute('data-theme', next);
  document.getElementById('themeIcon').textContent=dark?'🌊':'🌸';
  safeSetLS('gymbeat_theme', next);
}
function restoreTheme(){
  const saved = safeGetLS('gymbeat_theme');
  if(saved==='light'){
    document.documentElement.setAttribute('data-theme','light');
    const icon = document.getElementById('themeIcon');
    if(icon) icon.textContent='🌊';
  }
}

/* ════════════════════════════════════
   PREVIEW DATA TABLES
════════════════════════════════════ */
const PHASE_DATA={
  'Upper Body':{warm:'Dynamic shoulder circles, band pull-aparts, push-up holds',main:'Push-ups, dumbbell press, rows, shoulder press, tricep dips',cool:'Chest opener, cross-body shoulder stretch, thoracic rotation'},
  'Lower Body':{warm:'Hip circles, leg swings, bodyweight squats, glute bridges',main:'Barbell squat, Romanian deadlift, leg press, walking lunges',cool:'Quad stretch, hamstring stretch, pigeon pose, calf stretch'},
  'Full Body':{warm:'Jumping jacks, arm circles, hip hinges, bodyweight squats',main:'Compound lifts, push/pull supersets, core finisher',cool:'Full body stretch sequence, deep breathing, foam roll'},
  'Cardio':{warm:'Light jog, dynamic stretches, leg swings',main:'Intervals, steady state, sprints or cycling',cool:'Walk-down, static stretches, breathing exercises'},
  'Recovery':{warm:'Gentle walking, slow breath work, light mobility',main:'Yoga flows, foam rolling, band stretches, active recovery',cool:'Deep stretching, meditation, body scan'},
  'default':{warm:'Mobility, activation &amp; light cardio to prime your body',main:'Compound movements &amp; targeted exercises for your goal',cool:'Stretching &amp; recovery to close out the session'}
};
const MUSIC_BY_ENERGY={
  'Low':{desc:'Chill, lo-fi and acoustic vibes to keep you moving without overdoing it.',flames:1,bpm:'60–90 BPM',artists:['SZA','Frank Ocean','Daniel Caesar']},
  'Medium':{desc:'Steady hip-hop, R&B and mid-tempo beats to keep you locked in.',flames:3,bpm:'100–130 BPM',artists:['Drake','J. Cole','Tyler, The Creator']},
  'Hyped':{desc:'High-BPM trap, hip-hop and EDM to push you past your limits.',flames:5,bpm:'140–165 BPM',artists:['Travis Scott','Kendrick Lamar','Playboi Carti']},
  'Angry':{desc:'Hard-hitting rap and heavy beats to channel that aggression.',flames:5,bpm:'145–170 BPM',artists:['Eminem','DMX','Denzel Curry']},
  'default':{desc:'GymBeat will pick a soundtrack that shifts with every phase of your workout.',flames:3,bpm:'Auto',artists:[]}
};

/* Session vibe copy per type */
const VIBE_COPY={
  'Upper Body':'Focused pressing and pulling work matched with a driving soundtrack.',
  'Lower Body':'Heavy compound leg work paired with music that keeps you under the bar.',
  'Full Body':'Explosive full-body training matched with a high-energy soundtrack.',
  'Cardio':'Sustained conditioning with music timed to your working pace.',
  'Recovery':'Gentle movement and mobility with a calm, restorative soundtrack.',
  'default':'Make your choices on the left and this preview updates instantly.'
};

/* Build the equalizer bars once */
(function buildEqualizer(){
  const eq=document.getElementById('equalizer');
  if(!eq) return;
  for(let i=0;i<14;i++){
    const b=document.createElement('div');
    b.className='eq-bar';
    b.style.animationDelay=(Math.random()*1).toFixed(2)+'s';
    b.style.animationDuration=(0.6+Math.random()*0.7).toFixed(2)+'s';
    eq.appendChild(b);
  }
})();

function updatePreview(){
  const type   =picks.type;
  const dur    =picks.dur||(document.getElementById('customDur').value?document.getElementById('customDur').value+' mins':null);
  const energy =picks.energy;
  const artist =document.getElementById('artistInput').value.trim()||pickedArtist;
  const surprise=isSurprise;

  // ── Hero name: "45 MIN FULL BODY" ──
  let name;
  if(surprise){
    name='SURPRISE SESSION';
  } else if(type&&dur){
    name=dur.toString().replace(' mins',' MIN').toUpperCase()+' '+type.toUpperCase();
  } else if(type){
    name=type.toUpperCase();
  } else if(dur){
    name=dur.toString().replace(' mins',' MIN').toUpperCase()+' SESSION';
  } else {
    name='YOUR SESSION';
  }
  document.getElementById('previewName').textContent=name;

  // ── Energy line ──
  const energyLine=document.getElementById('previewEnergyLine');
  if(surprise) energyLine.textContent='GYMBEAT DECIDES';
  else if(energy) energyLine.textContent=energy.toUpperCase()+' ENERGY';
  else energyLine.textContent='AWAITING YOUR CHOICES';

  // ── Tags ──
  document.getElementById('previewTagType').textContent =surprise?'SURPRISE':(type||'—');
  document.getElementById('previewTagDur').textContent  =dur?dur.toString().replace(' mins',' MIN'):'—';
  document.getElementById('previewTagEnergy').textContent=energy?energy.toUpperCase():'—';

  // ── Vibe line ──
  let vibe;
  if(surprise){
    vibe='You gave GymBeat control — it picks the workout, the intensity and the soundtrack.';
  } else {
    vibe=VIBE_COPY[type]||VIBE_COPY['default'];
  }
  document.getElementById('previewMeta').textContent=vibe;

  // ── Status ──
  document.getElementById('previewStatus').textContent=(surprise||type||dur||energy)?'READY TO BUILD':'AWAITING CHOICES';

  // ── Phase durations ──
  const totalMins=dur?parseInt(dur):null;
  if(totalMins&&!isNaN(totalMins)){
    const w=Math.round(totalMins*.15),c=Math.round(totalMins*.15),m=totalMins-w-c;
    document.getElementById('prevDurWarm').textContent='~'+w+' min';
    document.getElementById('prevDurMain').textContent='~'+m+' min';
    document.getElementById('prevDurCool').textContent='~'+c+' min';
  } else {
    document.getElementById('prevDurWarm').textContent='~5–10 min';
    document.getElementById('prevDurMain').textContent='~20–40 min';
    document.getElementById('prevDurCool').textContent='~5–7 min';
  }

  // ── Phase descriptions ──
  const pd=(type&&PHASE_DATA[type])||PHASE_DATA['default'];
  document.getElementById('prevDescWarm').innerHTML=surprise?'GymBeat picks a warm-up matched to your surprise workout':pd.warm;
  document.getElementById('prevDescMain').innerHTML=surprise?'GymBeat chooses your workout type &amp; exercises for you':pd.main;
  document.getElementById('prevDescCool').innerHTML=surprise?'A cool-down matched to whatever GymBeat builds':pd.cool;

  // ── Soundtrack ──
  const me=(energy&&MUSIC_BY_ENERGY[energy])||MUSIC_BY_ENERGY['default'];
  const descEl   =document.getElementById('prevMusicDesc');
  const artistsEl=document.getElementById('prevMusicArtists');

  if(artist){
    descEl.textContent='Every track will be by '+artist+', matched to each phase of your session.';
    artistsEl.innerHTML='<span class="artist-pill">'+esc(artist)+'</span>';
  } else {
    descEl.textContent=me.desc;
    artistsEl.innerHTML=me.artists.length
      ? me.artists.map(a=>'<span class="artist-pill">'+esc(a)+'</span>').join('')
      : '<span class="artist-pill">GymBeat picks for you</span>';
  }

  document.getElementById('prevBpm').textContent=me.bpm;
  document.getElementById('prevFlames').innerHTML=flames(me.flames);
}

/* ════════════════════════════════════
   BUILDER PICKS
════════════════════════════════════ */
function pick(btn,group){
  if(group==='type') unmarkSurprise();
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b=>b.classList.remove('picked'));
  btn.classList.add('picked');
  // Prefer explicit data-value (type cards), fall back to text content (pills)
  picks[group]= btn.dataset.value || btn.textContent.trim().replace(/^[^\w\s]*/,'').trim();
  if(group==='dur') document.getElementById('customDur').value='';
  updatePreview();
}

function pickCustomDur(el){
  document.querySelectorAll('[data-group="dur"]').forEach(b=>b.classList.remove('picked'));
  const raw = el.value.trim();
  const num = parseInt(raw, 10);
  if(raw && (!isNaN(num) && num >= 1 && num <= 300)){
    picks.dur = num + ' mins';
    el.setCustomValidity('');
    el.style.borderColor='';
  } else if(raw){
    picks.dur = null;
    el.setCustomValidity('Enter a number between 1 and 300');
    el.style.borderColor='rgba(255,80,80,.7)';
  } else {
    picks.dur = null;
    el.setCustomValidity('');
    el.style.borderColor='';
  }
  updatePreview();
}

function pickArtist(btn){
  document.querySelectorAll('.a-chip').forEach(b=>b.classList.remove('picked'));
  btn.classList.add('picked');
  pickedArtist=btn.textContent.trim();
  document.getElementById('artistInput').value=pickedArtist;
  updatePreview();
}

function pickSurprise(){
  isSurprise=true;
  document.querySelectorAll('[data-group]').forEach(b=>b.classList.remove('picked'));
  document.querySelectorAll('.a-chip').forEach(b=>b.classList.remove('picked'));
  document.getElementById('artistInput').value='';
  document.getElementById('customDur').value='';
  picks.type=null;picks.dur=null;picks.energy=null;pickedArtist=null;
  document.getElementById('surpriseBtn').classList.add('picked');
  updatePreview();
}

function unmarkSurprise(){
  isSurprise=false;
  document.getElementById('surpriseBtn').classList.remove('picked');
}

/* ════════════════════════════════════
   LOCK IN
════════════════════════════════════ */
function lockIn(){
  if(isLoading) return;
  if(isSurprise||document.getElementById('surpriseBtn').classList.contains('picked')){
    sendRaw('SURPRISE ME — choose everything: workout type, duration, energy level and music. Be creative and unexpected.','🎲 Surprise Me — GymBeat chooses everything', true);
    return;
  }
  const type  =picks.type;
  const dur   =picks.dur||(document.getElementById('customDur').value?document.getElementById('customDur').value+' mins':null);
  const energy=picks.energy;
  const artist=document.getElementById('artistInput').value.trim()||pickedArtist;
  let parts=[];
  if(type)   parts.push(type);
  if(dur)    parts.push(dur);
  if(energy) parts.push(energy+' energy');
  if(!parts.length) parts.push('full body workout, 45 mins, medium energy');
  let prompt=parts.join(', ');
  if(artist) prompt=`ARTIST MODE:${artist} | `+prompt;
  const display=[artist?`🎤 ${artist}`:null,type,dur,energy?energy+' energy':null].filter(Boolean).join(' · ')||'GymBeat Session';
  sendRaw(prompt, display, false);
}

/* ════════════════════════════════════
   RESET
════════════════════════════════════ */
function resetBuilder(){
  setState('builder');
  const _r=document.getElementById('results');
  _r.innerHTML='';
  _r.classList.remove('visible');
  _r.style.display='none';
  messages=[];lastPrompt=null;
  document.querySelectorAll('[data-group],.a-chip').forEach(b=>b.classList.remove('picked'));
  document.getElementById('surpriseBtn').classList.remove('picked');
  document.getElementById('artistInput').value='';
  document.getElementById('customDur').value='';
  picks.type=null;picks.dur=null;picks.energy=null;
  pickedArtist=null;isSurprise=false;
  updatePreview();
}

/* ════════════════════════════════════
   STATE MANAGEMENT
   States: "builder" | "generating" | "result"
════════════════════════════════════ */
let appState = 'builder'; // explicit state — never blank

function setState(state, isSurpriseSession){
  appState = state;
  const homeLayout  = document.getElementById('homeLayout');
  const genScreen   = document.getElementById('generatingScreen');
  const results     = document.getElementById('results');
  const main        = document.getElementById('main');
  const inputArea   = document.getElementById('globalInputArea');
  // Input only shown during builder state
  if(inputArea) inputArea.style.display = (state === 'builder') ? '' : 'none';

  if(state === 'builder'){
    homeLayout.style.display = 'grid';
    genScreen.style.display  = 'none';
    genScreen.setAttribute('aria-busy','false');
    results.style.display    = 'none';
    main.classList.remove('results-mode');
  }
  else if(state === 'generating'){
    homeLayout.style.display = 'none';
    genScreen.style.display  = 'flex';
    genScreen.setAttribute('aria-busy','true');
    results.style.display    = 'none';
    main.classList.remove('results-mode');
    // Populate the generating screen copy
    if(isSurpriseSession){
      document.getElementById('genTitle').textContent = 'SURPRISE SESSION INCOMING';
      document.getElementById('genSub').textContent   = 'You gave GymBeat control. We\'re choosing the workout, intensity and soundtrack.';
    } else {
      document.getElementById('genTitle').textContent = 'BUILDING YOUR SESSION';
      document.getElementById('genSub').textContent   = 'Hang tight while GymBeat assembles your workout and finds your soundtrack.';
    }
    // Animate steps sequentially
    startLoadingSteps();
  }
  else if(state === 'result'){
    homeLayout.style.display  = 'none';
    genScreen.style.display   = 'none';
    genScreen.setAttribute('aria-busy','false');
    // Use flex on desktop, block on mobile (CSS handles via media query)
    results.style.display     = '';
    results.classList.add('visible');
    const _ws=document.getElementById('workoutScreen'); if(_ws) _ws.style.display='none';
    main.classList.add('results-mode');
  }
  else if(state === 'workout'){
    homeLayout.style.display  = 'none';
    genScreen.style.display   = 'none';
    results.style.display     = 'none';
    results.classList.remove('visible');
    const _woS = document.getElementById('workoutScreen');
    _woS.style.display = '';
    _woS.classList.add('wo-active');
    main.classList.remove('results-mode');
  }
}

/* Animate the step indicators during generation */
let stepTimer = null;
function startLoadingSteps(){
  const steps = document.querySelectorAll('.gen-step');
  steps.forEach(s=>{ s.dataset.status='pending'; updateStepUI(s); });
  let current = 0;
  clearInterval(stepTimer);
  function advance(){
    if(current < steps.length){
      if(current > 0){
        steps[current-1].dataset.status='done';
        updateStepUI(steps[current-1]);
      }
      steps[current].dataset.status='active';
      updateStepUI(steps[current]);
      current++;
    }
  }
  advance();
  stepTimer = setInterval(()=>{
    if(current <= steps.length) advance();
    else clearInterval(stepTimer);
  }, 900);
}
function updateStepUI(step){
  const icon = step.querySelector('.step-icon');
  const s = step.dataset.status;
  if(s==='done')    { icon.textContent='✓'; icon.style.color='var(--a)'; step.style.opacity='1'; }
  else if(s==='active') { icon.innerHTML='<div class="spin" style="width:14px;height:14px"></div>'; step.style.opacity='1'; }
  else              { icon.textContent='○'; icon.style.color='var(--muted)'; step.style.opacity='.4'; }
}

/* ════════════════════════════════════
   COLLAPSE — legacy alias (kept for
   buildSession which calls it)
════════════════════════════════════ */
function collapseBuilder(){
  setState('result');
}

/* ════════════════════════════════════
   SONG HTML — accessible buttons
════════════════════════════════════ */
/* Active music service — user picks once, all tracks use it */
let activeMusicService = 'spotify'; // 'spotify' | 'ytmusic'

function songUrl(title, artist){
  const sq = encodeURIComponent(title + ' ' + artist);
  return activeMusicService === 'ytmusic'
    ? `https://music.youtube.com/search?q=${sq}`
    : `https://open.spotify.com/search/${sq}`;
}

function songHTML(song, phaseColor){
  const sq = encodeURIComponent(song.title + ' ' + song.artist);
  const sptUrl = `https://open.spotify.com/search/${sq}`;
  const ytUrl  = `https://music.youtube.com/search?q=${sq}`;
  return `
    <button class="track-row" type="button"
      data-spt="${sptUrl}" data-yt="${ytUrl}"
      onclick="openTrack(this)"
      style="--phase-col:${phaseColor}"
      aria-label="Open ${esc(song.title)} by ${esc(song.artist)}">
      <span class="track-play-icon" aria-hidden="true">▶</span>
      <span class="track-info">
        <span class="track-title">${esc(song.title)}</span>
        <span class="track-artist">${esc(song.artist)}</span>
      </span>
    </button>`;
}

function openTrack(btn){
  const url = activeMusicService === 'ytmusic' ? btn.dataset.yt : btn.dataset.spt;
  window.open(url, '_blank', 'noreferrer');
}

function setMusicService(svc){
  activeMusicService = svc;
  document.querySelectorAll('.svc-btn').forEach(b => {
    const active = b.dataset.svc === svc;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

/* ════════════════════════════════════
   ENERGY FLAMES
════════════════════════════════════ */
function flames(n){
  const lvl=Math.min(5,Math.max(1,n||1));
  return '🔥'.repeat(lvl)+'<span style="opacity:.2">🔥</span>'.repeat(5-lvl);
}

/* ════════════════════════════════════
   BUILD SESSION
════════════════════════════════════ */
/* Phase accent colours — warm=amber, main=pink, cool=green */
const PHASE_COLORS = ['var(--amber)', 'var(--pink)', 'var(--green)'];
const PHASE_SUBTITLES = {
  'Warm-Up':   'Raise your heart rate and prepare your joints.',
  'Warm Up':   'Raise your heart rate and prepare your joints.',
  'Main Set':  'The primary work block of your session.',
  'Main Work': 'The primary work block of your session.',
  'Cool-Down': 'Bring your heart rate down and recover.',
  'Cool Down': 'Bring your heart rate down and recover.',
};

function buildSession(data){
  WS.session = data;  // store for Active Workout Mode
  const r = document.getElementById('results');
  collapseBuilder();

  /* ── Hero ── */
  const hero = document.createElement('div');
  hero.className = 'rs-hero';
  /* Count totals for metadata */
  const totalExercises = (data.phases||[]).reduce((s,p)=>s+p.exercises.length,0);
  const totalTracks    = (data.phases||[]).reduce((s,p)=>s+p.music.songs.length,0);

  hero.innerHTML = `
    <div class="rs-hero-inner">
      <div class="rs-hero-eyebrow">SESSION GENERATED</div>
      ${data.sessionTitle ? `<h1 class="rs-hero-title">${esc(data.sessionTitle)}</h1>` : ''}
      ${data.sessionMeta&&data.sessionMeta.length ? `
        <div class="rs-meta-row">
          ${data.sessionMeta.map(t=>`<span class="rs-meta-tag">${esc(t)}</span>`).join('')}
          ${totalExercises?`<span class="rs-meta-tag">${totalExercises} exercises</span>`:''}
          ${totalTracks?`<span class="rs-meta-tag">${totalTracks} tracks</span>`:''}
        </div>` : ''}
      ${data.message ? `<p class="rs-hero-desc">${fmt(data.message)}</p>` : ''}
    </div>`;
  r.appendChild(hero);

  if(!data.phases||data.phases.length===0){scrollBottom();return;}

  /* ── Service selector (once, top of music panel) ── */
  /* Stored for use during build */
  activeMusicService = 'spotify';

  /* ── Two columns ── */
  const cols = document.createElement('div');
  cols.className = 'rs-cols';

  /* ── LEFT: Workout journey ── */
  const wc = document.createElement('div');
  wc.className = 'rs-panel workout-panel';
  let wh = `<div class="rs-panel-heading">🏋️ WORKOUT</div><div class="rs-phases">`;

  data.phases.forEach((ph, i) => {
    const col = PHASE_COLORS[i] || 'var(--a)';
    const sub = PHASE_SUBTITLES[ph.name] || '';
    const exItems = ph.exercises.map((ex, idx) => {
      const dash = ex.indexOf('–');
      const name   = dash > -1 ? ex.slice(0, dash).trim() : ex;
      const detail = dash > -1 ? ex.slice(dash + 1).trim() : '';
      return `<div class="rs-ex">
        <span class="rs-ex-num">${String(idx+1).padStart(2,'0')}</span>
        <div class="rs-ex-body">
          <span class="rs-ex-name">${esc(name)}</span>
          ${detail ? `<span class="rs-ex-detail">${esc(detail)}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    wh += `<div class="rs-phase" style="--phase-col:${col}">
      <div class="rs-phase-header">
        <div class="rs-phase-dot"></div>
        <div class="rs-phase-meta">
          <span class="rs-phase-name">${esc(ph.name)}</span>
          <span class="rs-phase-dur">${esc(ph.duration)}</span>
        </div>
      </div>
      ${sub ? `<p class="rs-phase-sub">${sub}</p>` : ''}
      <div class="rs-exercises">${exItems}</div>
    </div>`;
  });

  wh += `</div>`;
  wc.innerHTML = wh;

  /* ── RIGHT: Soundtrack ── */
  const sc = document.createElement('div');
  sc.className = 'rs-panel music-panel';

  let sh = `<div class="rs-panel-heading">🎧 SOUNDTRACK</div>
    <div class="rs-svc-selector">
      <span class="rs-svc-label">OPEN TRACKS WITH</span>
      <div class="rs-svc-btns">
        <button class="svc-btn active" data-svc="spotify" onclick="setMusicService('spotify')" aria-pressed="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          Spotify
        </button>
        <button class="svc-btn" data-svc="ytmusic" onclick="setMusicService('ytmusic')" aria-pressed="false">
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm-1.2 16.8V7.2l7.2 4.8-7.2 4.8z"/></svg>
          YT Music
        </button>
      </div>
    </div>
    <div class="rs-phases">`;

  data.phases.forEach((ph, i) => {
    const col = PHASE_COLORS[i] || 'var(--a)';
    sh += `<div class="rs-phase" style="--phase-col:${col}">
      <div class="rs-phase-header">
        <div class="rs-phase-dot"></div>
        <div class="rs-phase-meta">
          <span class="rs-phase-name">${esc(ph.name)}</span>
          <span class="rs-phase-dur">${esc(ph.duration)}</span>
        </div>
        <span class="rs-genre-tag">${esc(ph.music.genre)}</span>
        <span class="rs-bpm">${esc(ph.music.bpm)}</span>
        <span class="energy-flames" style="margin-left:auto;font-size:11px">${flames(ph.music.energyLevel)}</span>
      </div>
      <div class="rs-tracks">
        ${ph.music.songs.map(s => songHTML(s, col)).join('')}
      </div>
    </div>`;
  });

  sh += `</div>`;
  sc.innerHTML = sh;

  cols.appendChild(wc);
  cols.appendChild(sc);
  r.appendChild(cols);

  /* ── Action bar ── */
  const bar = document.createElement('div');
  bar.className = 'rs-action-bar';
  bar.innerHTML = `
    <button class="rs-back-btn" onclick="resetBuilder()">← Build another session</button>
    <button class="rs-start-btn" onclick="startWorkout()">
      🔥 START SESSION
    </button>`;
  r.appendChild(bar);

  scrollBottom();
}

/* ════════════════════════════════════
   APPEND MESSAGES
════════════════════════════════════ */
function appendUser(text){
  const r=document.getElementById('results');
  const d=document.createElement('div');
  d.className='user-msg';
  d.innerHTML=`<div class="user-avatar">👤</div><div class="user-bubble">${esc(text)}</div>`;
  r.appendChild(d);
}

function appendAI(text){
  const r=document.getElementById('results');
  const d=document.createElement('div');
  d.className='ai-msg';
  d.innerHTML=`<div class="ai-avatar">🏋️</div><div class="ai-bubble">${fmt(text)}</div>`;
  r.appendChild(d);scrollBottom();
}

const ERROR_COPY = {
  timeout: 'GymBeat took too long to respond. Check your connection and try again.',
  network: "GymBeat couldn't connect. Make sure the server is running.",
  server:  "GymBeat's server returned an error. Try again in a moment.",
  empty:   'GymBeat returned an empty response. Please try again.',
  parse:   'GymBeat returned unexpected data. Please try again.',
  default: "GymBeat couldn't build your session right now.",
};

function showError(type='default'){
  announceToSR('Session generation failed. ' + (ERROR_COPY[type]||ERROR_COPY.default));
  setState('result');
  const r=document.getElementById('results');
  const d=document.createElement('div');
  d.className='error-card';
  d.setAttribute('role','alert');
  const msg = ERROR_COPY[type] || ERROR_COPY.default;
  d.innerHTML=`
    <div>
      <div class="error-heading">COULDN'T BUILD YOUR SESSION</div>
      <span class="error-text">${esc(msg)}</span>
    </div>
    <div class="error-actions">
      <button class="retry-btn" onclick="retryLast()">Try Again</button>
      <button class="secondary-btn" onclick="resetBuilder()" style="font-size:11px">Edit Session</button>
    </div>`;
  r.appendChild(d);scrollBottom();
}

/* ── Session data validation — never render null/undefined in UI ── */
function safeStr(v, fallback=''){
  if(v===null||v===undefined) return fallback;
  const s = String(v).trim();
  return s==='null'||s==='undefined'||s==='[object Object]' ? fallback : s;
}

function validateSession(data){
  if(!data||typeof data!=='object') return {sessionTitle:'',sessionMeta:[],message:'',phases:[]};
  return {
    sessionTitle: safeStr(data.sessionTitle),
    sessionMeta:  Array.isArray(data.sessionMeta) ? data.sessionMeta.map(t=>safeStr(t)).filter(Boolean) : [],
    message:      safeStr(data.message),
    phases: (Array.isArray(data.phases)?data.phases:[]).map(ph=>({
      name:      safeStr(ph.name,'Phase'),
      emoji:     safeStr(ph.emoji,''),
      duration:  safeStr(ph.duration,''),
      exercises: Array.isArray(ph.exercises)
        ? ph.exercises.map(e=>safeStr(e)).filter(Boolean)
        : [],
      music:{
        genre:       safeStr(ph.music?.genre,''),
        bpm:         safeStr(ph.music?.bpm,''),
        energyLevel: (typeof ph.music?.energyLevel==='number'&&ph.music.energyLevel>=1&&ph.music.energyLevel<=5)
                       ? ph.music.energyLevel : 3,
        songs: Array.isArray(ph.music?.songs)
          ? ph.music.songs.map(s=>({
              title:  safeStr(s?.title,'Unknown Track'),
              artist: safeStr(s?.artist,'Unknown Artist'),
            })).filter(s=>s.title!=='Unknown Track'||s.artist!=='Unknown Artist')
          : [],
      }
    })).filter(ph=>ph.exercises.length>0||ph.music.songs.length>0),
  };
}

function retryLast(){
  if(isLoading||!lastPrompt)return;
  document.querySelectorAll('.error-card').forEach(e=>e.remove());
  sendRaw(lastPrompt[0],lastPrompt[1],lastPrompt[2]);
}

function scrollBottom(){
  const m=document.getElementById('main');
  m.scrollTop=m.scrollHeight;
}

/* ════════════════════════════════════
   CORE SEND
════════════════════════════════════ */
async function sendRaw(prompt, displayText, surpriseMode){
  if(isLoading) return;
  lastPrompt = [prompt, displayText, surpriseMode];
  isLoading  = true;

  // Announce to screen readers
  announceToSR('Building your session. Please wait.');

  // 1. IMMEDIATELY switch to generating state — never blank
  setState('generating', surpriseMode);

  // Prep results area with user bubble (hidden until result state)
  const r = document.getElementById('results');
  r.innerHTML = ''; // clear any previous
  appendUser(displayText);

  messages.push({role:'user', content:prompt});
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('lockBtn').disabled = true;

  // 30-second timeout
  const controller = new AbortController();
  const timeoutId  = setTimeout(()=>controller.abort(), 30000);

  try{
    const res = await fetch('/api/chat',{
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      signal: controller.signal,
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1800,
        system:     SYSTEM_PROMPT,
        messages:   messages
      })
    });

    clearTimeout(timeoutId);

    if(!res.ok){
      console.error('GymBeat: API returned', res.status);
      showError('server');
      return;
    }

    const data = await res.json();
    const raw  = data.content?.[0]?.text || '';

    if(!raw){ showError('empty'); return; }

    try{
      const clean  = raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();
      const parsed = JSON.parse(clean);
      const validated = validateSession(parsed);
      if(validated.phases && validated.phases.length > 0){
        buildSession(validated);
      } else {
        setState('result');
        appendAI(validated.message || 'Session generated.');
      }
      messages.push({role:'assistant', content:raw});
    }catch(parseErr){
      console.error('GymBeat: JSON parse failed', parseErr);
      showError('parse');
    }
  }catch(err){
    clearTimeout(timeoutId);
    if(err.name === 'AbortError'){
      console.warn('GymBeat: request timed out');
      showError('timeout');
    } else {
      console.error('GymBeat: fetch error', err);
      showError('network');
    }
  } finally {
    isLoading = false;
    const sb = document.getElementById('sendBtn');
    const lb = document.getElementById('lockBtn');
    if(sb) sb.disabled = false;
    if(lb) lb.disabled = false;
  }
}

/* ── Screen reader announcer ── */
function announceToSR(msg){
  const el = document.getElementById('sr-live');
  if(!el) return;
  el.textContent = '';
  requestAnimationFrame(()=>{ el.textContent = msg; });
}

/* Quick send from chips */
function quickSend(text){ sendRaw(text, text, false); }

/* Open soundtrack link and mark as opened */
function openSoundtrack(btn){
  const url = btn.dataset.href;
  if(url && url !== '#') {
    window.open(url, '_blank', 'noreferrer noopener');
    WS.soundtrackOpened = true;
    // Update label
    btn.textContent = activeMusicService==='ytmusic' ? '▶ Open in YT Music' : '▶ Open in Spotify';
  }
}

/* Input helpers */
function autoResize(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,90)+'px';
}
function handleKey(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}
}
function sendMessage(){
  const i=document.getElementById('userInput');
  const t=i.value.trim();
  if(!t||isLoading)return;
  i.value='';i.style.height='auto';
  sendRaw(t, t, false);
}

/* Init preview on load */
updatePreview();

/* ════════════════════════════════════════════════
   ACTIVE WORKOUT MODE
   States: builder → generating → result → workout
════════════════════════════════════════════════ */

/* ── Workout state ── */
let WS = {
  session:          null,
  allExercises:     [],
  flatIdx:          0,
  currentSetsDone:  0,
  totalSets:        1,
  paused:           false,
  timerSec:         0,
  timerInterval:    null,
  timerRunning:     false,
  timerMode:        false,
  soundtrackOpened: false,  // P1: track if user has ever opened the music link
};

/* Build flat exercise list from phases */
function buildFlatExercises(data){
  const list = [];
  (data.phases||[]).forEach((ph, pi) => {
    ph.exercises.forEach((ex, ei) => {
      const dash  = ex.indexOf('–');
      const name  = dash > -1 ? ex.slice(0, dash).trim() : ex;
      const detail= dash > -1 ? ex.slice(dash+1).trim() : '';
      list.push({
        phaseName:  ph.name,
        phaseIdx:   pi,
        exIdx:      ei,
        name, detail,
        phaseColor: PHASE_COLORS[pi] || 'var(--a)',
        music:      ph.music,
        phaseDur:   ph.duration,
      });
    });
  });
  return list;
}

/* Parse sets/reps from detail string */
function parseExercise(detail){
  if(!detail) return { sets:1, reps:null, secs:null };
  const secMatch = detail.match(/(\d+)\s*sec/i);
  if(secMatch)  return { sets:1, reps:null, secs:parseInt(secMatch[1]) };
  const setRep  = detail.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if(setRep)    return { sets:parseInt(setRep[1]), reps:parseInt(setRep[2]), secs:null };
  const repOnly = detail.match(/^(\d+)\s*(reps?|times?)?$/i);
  if(repOnly)   return { sets:1, reps:parseInt(repOnly[1]), secs:null };
  return { sets:1, reps:null, secs:null };
}

/* ── Enter workout mode ── */
function startWorkout(){
  if(!WS.session) return;
  WS.allExercises    = buildFlatExercises(WS.session);
  WS.flatIdx         = 0;
  WS.currentSetsDone = 0;
  WS.paused          = false;
  clearInterval(WS.timerInterval);
  WS.timerRunning    = false;
  WS.soundtrackOpened = false;

  // Session label
  const label = document.getElementById('wo-session-label');
  if(label && WS.session.sessionMeta) label.textContent = WS.session.sessionMeta.slice(0,2).join(' · ');

  // Build equalizer bars
  const eq = document.getElementById('wo-eq');
  if(eq && !eq.children.length){
    for(let i=0;i<14;i++){
      const b=document.createElement('div');
      b.className='wo-eq-bar';
      b.style.animationDelay=(Math.random()*1).toFixed(2)+'s';
      b.style.animationDuration=(0.55+Math.random()*.8).toFixed(2)+'s';
      eq.appendChild(b);
    }
  }

  // Build mini-map dots
  const mm = document.getElementById('wo-minimap');
  if(mm){
    mm.innerHTML='';
    WS.allExercises.forEach((ex,i)=>{
      const d=document.createElement('div');
      d.className='wo-mm-dot';
      d.style.setProperty('--col', ex.phaseColor);
      d.setAttribute('aria-label', `Exercise ${i+1}: ${ex.name}`);
      mm.appendChild(d);
    });
  }

  setState('workout');
  renderWorkoutScreen();
}

/* ── Render the whole workout screen ── */
function renderWorkoutScreen(){
  const ex       = WS.allExercises[WS.flatIdx];
  const total    = WS.allExercises.length;
  const parsed   = parseExercise(ex.detail);
  const isTimer  = !!parsed.secs;
  WS.totalSets   = parsed.sets || 1;
  WS.timerMode   = isTimer;
  if(isTimer) WS.timerSec = parsed.secs;

  // Progress
  const done = WS.flatIdx;
  const pct  = Math.round((done/total)*100);
  document.getElementById('wo-progress-bar').style.width = pct+'%';
  document.getElementById('wo-progress-text').textContent = `${done} / ${total} EXERCISES`;

  // Phase
  document.getElementById('wo-phase-name').textContent = ex.phaseName.toUpperCase();
  document.getElementById('wo-phase-name').style.color = ex.phaseColor;
  document.getElementById('wo-phase-dot').style.background = ex.phaseColor;
  document.getElementById('wo-phase-dot').style.boxShadow  = `0 0 12px ${ex.phaseColor}`;

  // Exercise
  const exNum = ex.exIdx + 1;
  document.getElementById('wo-ex-num').textContent  = String(exNum).padStart(2,'0');
  document.getElementById('wo-ex-num').style.color  = ex.phaseColor;
  document.getElementById('wo-ex-name').textContent = ex.name;
  document.getElementById('wo-ex-detail').textContent = ex.detail || '';

  // Timer vs sets
  const timerArea = document.getElementById('wo-timer-area');
  const setsArea  = document.getElementById('wo-sets-area');
  if(isTimer){
    timerArea.style.display = 'flex';
    setsArea.style.display  = 'none';
    renderTimer();
    if(!WS.paused) startTimer();
  } else {
    timerArea.style.display = 'none';
    setsArea.style.display  = 'flex';
    renderSets(parsed.sets, parsed.reps);
    WS.currentSetsDone = 0;
    renderSets(parsed.sets, parsed.reps);
  }

  // Disable Previous on first exercise
  const prevBtn = document.querySelector('.wo-ctrl-prev');
  if(prevBtn){
    prevBtn.disabled = (WS.flatIdx === 0);
    prevBtn.style.opacity = (WS.flatIdx === 0) ? '0.35' : '';
  }

  // Up next
  const nextEl = document.getElementById('wo-next');
  const nextEx = WS.allExercises[WS.flatIdx+1];
  if(nextEx){
    nextEl.style.display = 'flex';
    document.getElementById('wo-next-name').textContent   = nextEx.name;
    document.getElementById('wo-next-detail').textContent = nextEx.detail||'';
    document.getElementById('wo-next-phase').textContent  = nextEx.phaseName !== ex.phaseName ? '↑ '+nextEx.phaseName : '';
  } else {
    nextEl.style.display = 'none';
  }

  // Music
  renderWorkoutMusic(ex);

  // Paused overlay
  document.getElementById('wo-paused-overlay').style.display = WS.paused ? 'flex' : 'none';

  // Mini-map: highlight current
  document.querySelectorAll('.wo-mm-dot').forEach((d,i)=>{
    d.classList.toggle('active', i===WS.flatIdx);
    d.classList.toggle('done',   i<WS.flatIdx);
  });
}

/* ── Timer ── */
function renderTimer(){
  const s = WS.timerSec;
  const m = Math.floor(s/60);
  const sec = s%60;
  document.getElementById('wo-timer-display').textContent =
    String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}

function startTimer(){
  clearInterval(WS.timerInterval);
  WS.timerRunning = true;
  WS.timerInterval = setInterval(()=>{
    if(WS.paused) return;
    if(WS.timerSec > 0){
      WS.timerSec--;
      renderTimer();
    } else {
      clearInterval(WS.timerInterval);
      WS.timerRunning = false;
      // Auto-advance if timer hits zero
      advanceExercise();
    }
  }, 1000);
}

function pauseTimer(){ WS.paused = !WS.paused; renderPauseState(); }
function resetTimer(){
  const parsed = parseExercise(WS.allExercises[WS.flatIdx].detail);
  WS.timerSec = parsed.secs || 30;
  clearInterval(WS.timerInterval);
  WS.timerRunning = false;
  renderTimer();
  if(!WS.paused) startTimer();
}

/* ── Sets ── */
function renderSets(total, reps){
  const container = document.getElementById('wo-sets-dots');
  container.innerHTML='';
  for(let i=0;i<total;i++){
    const done = i < WS.currentSetsDone;
    const dot = document.createElement('button');
    dot.className = 'wo-set-dot'+(done?' done':'');
    dot.textContent = done ? '✓' : String(i+1);
    dot.style.setProperty('--phase-col', WS.allExercises[WS.flatIdx].phaseColor);
    dot.setAttribute('aria-label', `Set ${i+1}${done?' completed':''}`);
    dot.onclick = ()=>{ WS.currentSetsDone = i+1; renderSets(total, reps); };
    container.appendChild(dot);
  }
  document.getElementById('wo-sets-label').textContent =
    reps ? `${total} sets × ${reps} reps` : `${total} sets`;
}

function completeSet(){
  const parsed = parseExercise(WS.allExercises[WS.flatIdx].detail);
  if(WS.currentSetsDone < WS.totalSets){
    WS.currentSetsDone++;
    renderSets(parsed.sets||1, parsed.reps);
    if(WS.currentSetsDone >= WS.totalSets){
      // All sets done — highlight advance button
      document.getElementById('wo-next-btn').classList.add('pulse');
    }
  } else {
    advanceExercise();
  }
}

/* ── Navigate ── */
let _advanceLock = false;
function advanceExercise(){
  if(_advanceLock) return;
  _advanceLock = true;
  setTimeout(()=>{ _advanceLock=false; }, 300); // debounce rapid taps
  clearInterval(WS.timerInterval);
  document.getElementById('wo-next-btn').classList.remove('pulse');
  const total = WS.allExercises.length;
  if(WS.flatIdx < total - 1){
    WS.flatIdx = Math.min(WS.flatIdx + 1, total - 1);
    WS.currentSetsDone = 0;
    WS.paused = false;
    renderWorkoutScreen();
    // Announce exercise change to screen readers
    const ex = WS.allExercises[WS.flatIdx];
    announceToSR(`Exercise ${WS.flatIdx+1} of ${total}: ${ex.name}`);
  } else {
    showWorkoutComplete();
  }
}

function previousExercise(){
  clearInterval(WS.timerInterval);
  if(WS.flatIdx > 0){
    WS.flatIdx = Math.max(0, WS.flatIdx - 1);
    WS.currentSetsDone = 0;
    WS.paused = false;
    renderWorkoutScreen();
    const ex = WS.allExercises[WS.flatIdx];
    announceToSR(`Exercise ${WS.flatIdx+1} of ${WS.allExercises.length}: ${ex.name}`);
  }
}

function skipExercise(){
  clearInterval(WS.timerInterval);
  advanceExercise();
}

/* ── Pause ── */
function togglePause(){
  WS.paused = !WS.paused;
  renderPauseState();
}

function renderPauseState(){
  document.getElementById('wo-paused-overlay').style.display = WS.paused ? 'flex' : 'none';
  document.getElementById('wo-pause-btn').textContent = WS.paused ? '▶ RESUME' : '⏸ PAUSE';
}

/* ── End session confirm ── */
function confirmEndSession(){
  const modal = document.getElementById('wo-end-confirm');
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
  // Focus first button in modal for keyboard users
  const firstBtn = modal.querySelector('button');
  if(firstBtn) setTimeout(()=>firstBtn.focus(), 50);
}
function cancelEndSession(){
  document.getElementById('wo-end-confirm').style.display = 'none';
  document.body.classList.remove('modal-open');
  // Return focus to end button
  const endBtn = document.getElementById('wo-end-btn');
  if(endBtn) endBtn.focus();
}
function endSession(){
  clearInterval(WS.timerInterval);
  document.body.classList.remove('modal-open');
  document.getElementById('wo-end-confirm').style.display = 'none';
  document.getElementById('workoutScreen').classList.remove('wo-active');
  setState('result');
}

/* ── Music panel ── */
function renderWorkoutMusic(ex){
  const m = ex.music;
  // Pick current song — cycle through available songs
  const songIdx = ex.exIdx % (m.songs.length||1);
  const song = m.songs[songIdx] || m.songs[0];
  if(!song) return;
  document.getElementById('wo-track-title').textContent  = song.title;
  document.getElementById('wo-track-artist').textContent = song.artist;
  document.getElementById('wo-track-genre').textContent  = m.genre||'';
  document.getElementById('wo-track-bpm').textContent    = m.bpm||'';
  document.getElementById('wo-track-phase').textContent  = ex.phaseName;

  const sq = encodeURIComponent(song.title+' '+song.artist);
  const url = activeMusicService==='ytmusic'
    ? `https://music.youtube.com/search?q=${sq}`
    : `https://open.spotify.com/search/${sq}`;
  const openBtn = document.getElementById('wo-open-track');
  openBtn.dataset.href = url;
  // Label: "START SOUNDTRACK" until user has opened once, then "OPEN IN..."
  if(!WS.soundtrackOpened){
    openBtn.textContent = activeMusicService==='ytmusic' ? '▶ Start Soundtrack on YT Music' : '▶ Start Soundtrack on Spotify';
  } else {
    openBtn.textContent = activeMusicService==='ytmusic' ? '▶ Open in YT Music' : '▶ Open in Spotify';
  }

  // Phase colour on music panel
  document.getElementById('wo-music-panel').style.setProperty('--phase-col', ex.phaseColor);
}

/* ── Completion screen ── */
function showWorkoutComplete(){
  clearInterval(WS.timerInterval);
  WS.timerRunning = false;
  const screen = document.getElementById('wo-complete');
  screen.style.display = 'flex';
  const s = WS.session;
  const title = (s&&s.sessionTitle) ? s.sessionTitle : 'SESSION COMPLETE';
  screen.querySelector('.wo-complete-title').textContent = title;
  screen.querySelector('.wo-complete-stats').textContent =
    `${WS.allExercises.length} exercises · ${(s&&s.sessionMeta)?s.sessionMeta.join(' · '):''}`;
  announceToSR('Workout complete. ' + title);
  // Focus the done button
  const btn = screen.querySelector('.rs-start-btn');
  if(btn) setTimeout(()=>btn.focus(), 100);
}

function doneWorkout(){
  document.getElementById('wo-complete').style.display = 'none';
  setState('builder');
  resetBuilder();
}
function buildAnotherSession(){
  document.getElementById('wo-complete').style.display = 'none';
  setState('builder');
  resetBuilder();
}

/* ════════════════════════════════════════════════
   ONBOARDING SYSTEM
════════════════════════════════════════════════ */

const OB_KEY   = 'gymbeat_onboarding_complete';
let   obIndex  = 0;
const OB_TOTAL = 7; // slides 0-5 + final (6)

/* ── Check on load ── */
function safeGetLS(key, fallback=null){
  try{ return localStorage.getItem(key); }
  catch{ return fallback; }
}
function safeSetLS(key, value){
  try{ localStorage.setItem(key, value); }
  catch{ /* private browsing or quota — ignore */ }
}

function checkOnboarding(){
  if(!safeGetLS(OB_KEY)){
    openOnboarding();
  }
}

/* ── Open / close ── */
function openOnboarding(){
  obIndex = 0;
  document.getElementById('ob-overlay').classList.remove('ob-hidden');
  renderOBSlide(0);
  // Build equalizer bars once
  const eqs = document.querySelectorAll('.ob-eq');
  eqs.forEach(eq => {
    if(!eq.children.length){
      for(let i=0;i<10;i++){
        const b=document.createElement('div');
        b.className='ob-eq-bar';
        b.style.animationDelay=(Math.random()*.9).toFixed(2)+'s';
        b.style.animationDuration=(.5+Math.random()*.7).toFixed(2)+'s';
        eq.appendChild(b);
      }
    }
  });
  document.getElementById('ob-overlay').focus();
}

function closeOnboarding(){
  safeSetLS(OB_KEY,'true');
  const overlay = document.getElementById('ob-overlay');
  overlay.style.opacity='0';
  overlay.style.transition='opacity .3s';
  setTimeout(()=>{
    overlay.classList.add('ob-hidden');
    overlay.style.opacity='';
    overlay.style.transition='';
  }, 300);
}

function skipOnboarding(){
  closeOnboarding();
}

/* ── Navigation ── */
function obNext(){
  if(obIndex < OB_TOTAL - 1){
    const current = document.querySelector('.ob-slide.ob-active');
    if(current) current.classList.add('ob-exit-left');
    setTimeout(()=>{ if(current) current.classList.remove('ob-active','ob-exit-left'); },300);
    obIndex++;
    renderOBSlide(obIndex);
  }
}

function obBack(){
  if(obIndex > 0){
    obIndex--;
    renderOBSlide(obIndex);
  }
}

function obGoTo(idx){
  obIndex = idx;
  renderOBSlide(idx);
}

function renderOBSlide(idx){
  // Hide all slides
  document.querySelectorAll('.ob-slide').forEach((s,i)=>{
    s.classList.remove('ob-active','ob-exit-left');
    if(i === idx){
      requestAnimationFrame(()=>{ s.classList.add('ob-active'); });
    }
  });

  // Progress dots
  document.querySelectorAll('.ob-dot').forEach((d,i)=>{
    d.classList.toggle('ob-dot-active', i === idx);
    d.setAttribute('aria-current', i===idx ? 'step' : 'false');
  });

  // Back button
  const back = document.getElementById('ob-back');
  if(back) back.disabled = (idx === 0);

  // Next vs Start
  const nextBtn  = document.getElementById('ob-next');
  const startBtn = document.getElementById('ob-start');
  if(nextBtn && startBtn){
    const isLast = idx === OB_TOTAL - 1;
    nextBtn.style.display  = isLast ? 'none' : '';
    startBtn.style.display = isLast ? '' : 'none';
  }
}

/* ── Keyboard nav ── */
document.addEventListener('keydown', e => {
  // End-confirm modal: Escape = Keep Training
  if(document.getElementById('wo-end-confirm')?.style.display === 'flex'){
    if(e.key === 'Escape') cancelEndSession();
    return;
  }
  // Onboarding
  if(!document.getElementById('ob-overlay').classList.contains('ob-hidden')){
    if(e.key === 'ArrowRight' || e.key === 'Enter') obNext();
    if(e.key === 'ArrowLeft') obBack();
    if(e.key === 'Escape') skipOnboarding();
    return;
  }
  // Workout pause: Escape resumes
  if(appState === 'workout' && e.key === 'Escape'){
    if(WS.paused) togglePause();
  }
});

/* ── Init on load ── */
window.addEventListener('DOMContentLoaded', ()=>{
  restoreTheme();
  checkOnboarding();
});
