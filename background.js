/* Final Design v3.3 — original decorative backgrounds, independent of all interface motion.
   No portfolio data is used or represented by these decorative points. */
(() => {
  'use strict';
  window.createPortfolioBackgrounds = ({getState}) => {
    const root=document.documentElement;
    const colors={teal:[24,122,114],gray:[137,170,159],line:[163,187,177]};
    let mode='refined',raf=0,last=0,reportTimer=0,sample=null,measureQueued=false;
    const model=window.PortfolioNetworkModel;
    const scenes=[],byId=new Map(),pointer={x:0,y:0,active:false};
    const limited=(navigator.hardwareConcurrency||8)<=4||Boolean(navigator.connection?.saveData);
    const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
    const smooth=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const seed=i=>((Math.sin(i*78.233+12.9898)*43758.5453)%1+1)%1;
    const normal=i=>Math.sqrt(-2*Math.log(Math.max(.001,seed(i))))*Math.cos(2*Math.PI*seed(i+913));
    const parentPost=data=>window.parent.postMessage(data,'*');
    function canvasFor(id,kind){
      const section=document.getElementById(id);if(!section)return;
      const canvas=id==='home'?document.getElementById('network'):document.createElement('canvas');
      if(id!=='home'){canvas.className='data-background';section.prepend(canvas);}
      canvas.setAttribute('aria-hidden','true');canvas.setAttribute('role','presentation');
      const ctx=canvas.getContext('2d');if(!ctx)return;
      const s={id,kind,section,canvas,ctx,w:0,h:0,dpr:1,visible:false,time:0,lastDraw:0,rect:null,guards:[],nodes:[],running:false,draws:0,edges:0,pointerEnergy:0};
      scenes.push(s);byId.set(id,s);
    }
    canvasFor('home','network');canvasFor('approach','flow');canvasFor('about','grid');canvasFor('contact','waves');
    if(!byId.has('home'))return{sync:()=>{}};
    root.classList.add('background-ready');
    function measure(s){
      const b=s.section.getBoundingClientRect();if(!b.width||!b.height)return;
      s.rect=b;s.w=b.width;s.h=b.height;
      s.dpr=Math.min(devicePixelRatio||1,s.w<560?1:1.25);
      s.canvas.width=Math.round(s.w*s.dpr);s.canvas.height=Math.round(s.h*s.dpr);s.ctx.setTransform(s.dpr,0,0,s.dpr,0,0);
      s.guards=[];
      const selector=s.kind==='network'?'.hero-copy,.hero-foot':s.kind==='grid'?'.about-image,.about-copy':s.kind==='flow'?'.section-heading,.story-layout,.method-strip':'h2,.contact-bottom,.eyebrow';
      s.section.querySelectorAll(selector).forEach(el=>{
        if((s.kind==='waves'&&el.matches('h2'))||(s.kind==='network'&&(s.w<560||mode==='refined')&&el.matches('.hero-copy'))){
          // Protect actual heading lines, leaving the large open area to their right usable.
          const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
          let node;while((node=walk.nextNode())){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())s.guards.push({x:r.left-b.left-10,y:r.top-b.top-8,w:r.width+20,h:r.height+16});}
          el.querySelectorAll('.button').forEach(button=>{const r=button.getBoundingClientRect();s.guards.push({x:r.left-b.left-8,y:r.top-b.top-8,w:r.width+16,h:r.height+16});});
        }else{const r=el.getBoundingClientRect();s.guards.push({x:r.left-b.left-12,y:r.top-b.top-10,w:r.width+24,h:r.height+20});}
      });
      makeNodes(s);makeTextMask(s);draw(s,0,true);updateAttrs(s);
    }
    function makeNodes(s){
      if(s.kind==='network'){
        const mobile=s.w<560,count=mobile?28:s.w<900||limited?52:80;
        if(mode==='refined'){s.nodes=model.create(s.w,s.h,mobile?40:s.w<900?72:limited?80:110);return;}
        const clusters=mobile?[[.09,.15,.05,.12],[.91,.19,.05,.13],[.09,.70,.05,.11],[.91,.71,.05,.10],[.5,.91,.22,.035]]:[[.105,.25,.065,.16],[.15,.68,.07,.11],[.88,.22,.07,.14],[.89,.67,.065,.13],[.5,.90,.20,.035]];
        s.nodes=Array.from({length:count},(_,i)=>{
          const c=clusters[i%clusters.length];return{x:clamp(c[0]+normal(i*7+13)*c[2],.012,.988)*s.w,y:clamp(c[1]+normal(i*11+47)*c[3],.04,.96)*s.h,px:0,py:0,ox:0,oy:0,phase:seed(i+7)*Math.PI*2,speed:.055+seed(i+39)*.065,ax:(mobile?7:13)+seed(i+43)*(mobile?7:19),ay:(mobile?6:12)+seed(i+51)*(mobile?7:16),r:i%17===0?2.8:i%5===0?2:1.35,highlight:i%13===0,alpha:1};
        });
      }else if(s.kind==='grid')s.nodes=Array.from({length:s.w<560?12:24},(_,i)=>({x:seed(i+41)*s.w,y:seed(i+151)*s.h,r:i%7===0?2:1.3}));
      else if(s.kind==='flow')s.nodes=Array.from({length:s.w<560?4:8},(_,i)=>({phase:seed(i+80),speed:9+seed(i+97)*7,lane:i%2}));
      else s.nodes=Array.from({length:s.w<560?24:60},(_,i)=>({col:i%(s.w<560?12:20),row:Math.floor(i/(s.w<560?12:20)),phase:seed(i+99)*2}));
    }
    function makeTextMask(s){
      if(s.kind!=='network'||mode!=='refined')return;
      s.mask=document.createElement('canvas');s.mask.width=Math.ceil(s.w);s.mask.height=Math.ceil(s.h);
      const c=s.mask.getContext('2d');
      // A cached feathered attenuation mask follows text lines, not the whole hero-copy box.
      // The network continues across central whitespace and remains very faint beneath type.
      c.fillStyle='rgba(0,0,0,.92)';c.shadowColor='rgba(0,0,0,.30)';c.shadowBlur=16;
      for(const r of s.guards)c.fillRect(r.x,r.y,r.w,r.h);
    }
    const lineBuckets=Array.from({length:16},()=>[]);
    function drawRefined(s,dt){
      const c=s.ctx,active=finePointer.matches&&s.w>=560&&!getState().reduced&&pointer.active;
      s.pointerEnergy=model.update(s.nodes,s.time,dt,s.w,s.h,active?pointer:null);
      const reach=s.w<560?122:s.w<900?146:164,reach2=reach*reach;
      for(const b of lineBuckets)b.length=0;
      let edges=0;
      for(let i=0;i<s.nodes.length;i++){
        const a=s.nodes[i];if(a.fade<.02)continue;
        for(let j=i+1;j<s.nodes.length;j++){
          const b=s.nodes[j];if(b.fade<.02)continue;
          const dx=a.px-b.px,dy=a.py-b.py,d2=dx*dx+dy*dy;if(d2>=reach2)continue;
          const strength=model.smooth(1-Math.sqrt(d2)/reach)*Math.min(a.fade,b.fade);
          if(strength<.025)continue;
          lineBuckets[Math.min(15,Math.floor(strength*16))].push(a.px,a.py,b.px,b.py);edges++;
        }
      }
      c.lineWidth=.85;
      lineBuckets.forEach((a,i)=>{if(!a.length)return;c.beginPath();for(let j=0;j<a.length;j+=4){c.moveTo(a[j],a[j+1]);c.lineTo(a[j+2],a[j+3]);}c.strokeStyle=rgba(colors.line,.08+(i+.5)/16*.70);c.stroke();});
      for(const n of s.nodes)dot(c,n.px,n.py,n.r,n.highlight?colors.teal:colors.gray,n.fade*(n.highlight?.88:.80));
      if(s.mask){c.globalCompositeOperation='destination-out';c.drawImage(s.mask,0,0,s.w,s.h);c.globalCompositeOperation='source-over';}
      s.edges=edges;
    }
    function protect(s,x,y){
      let a=1;for(const r of s.guards){const dx=Math.max(r.x-x,0,x-r.x-r.w),dy=Math.max(r.y-y,0,y-r.y-r.h);a=Math.min(a,smooth(Math.hypot(dx,dy)/30));}return a;
    }
    function clearGuards(s){for(const r of s.guards)s.ctx.clearRect(r.x,r.y,r.w,r.h);}
    function dot(ctx,x,y,r,color,alpha){if(alpha<.008)return;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=rgba(color,alpha);ctx.fill();}
    function drawNetwork(s,dt){
      if(mode==='refined'){drawRefined(s,dt);return;}
      const c=s.ctx,mobile=s.w<560,radius=mobile?84:132,allowPointer=finePointer.matches&&!mobile&&!getState().reduced;
      const blend=1-Math.exp(-dt/0.26);let energy=0;
      for(const n of s.nodes){
        const x=n.x+Math.sin(s.time*n.speed+n.phase)*n.ax+Math.sin(s.time*n.speed*.47+n.phase*1.7)*n.ax*.25;
        const y=n.y+Math.cos(s.time*n.speed*.81+n.phase)*n.ay;
        let tx=0,ty=0;if(pointer.active&&allowPointer){const dx=x-pointer.x,dy=y-pointer.y,d=Math.hypot(dx,dy);if(d<radius){const force=smooth(1-d/radius)*6;tx=dx/(d||1)*force;ty=dy/(d||1)*force;}}
        n.ox+=(tx-n.ox)*blend;n.oy+=(ty-n.oy)*blend;n.px=x+n.ox;n.py=y+n.oy;n.alpha=protect(s,n.px,n.py);energy+=Math.hypot(n.ox,n.oy);
      }
      s.pointerEnergy=energy;
      // Bounded all-pairs checks (at most 80 nodes); distance weighting is continuous, with no hard nearest-neighbor swaps.
      const reach=mobile?86:s.w<900?108:132,reach2=reach*reach,buckets=Array.from({length:12},()=>[]);let edges=0;
      for(let i=0;i<s.nodes.length;i++){const a=s.nodes[i];if(a.alpha<.015)continue;for(let j=i+1;j<s.nodes.length;j++){const b=s.nodes[j],dx=a.px-b.px,dy=a.py-b.py,d2=dx*dx+dy*dy;if(d2>=reach2||b.alpha<.015)continue;const weight=smooth(1-Math.sqrt(d2)/reach)*Math.min(a.alpha,b.alpha,protect(s,(a.px+b.px)/2,(a.py+b.py)/2));if(weight<.015)continue;const bucket=Math.min(11,Math.floor(weight*12));buckets[bucket].push(a.px,a.py,b.px,b.py);edges++;}}
      c.lineWidth=.65;
      buckets.forEach((a,i)=>{if(!a.length)return;c.beginPath();for(let j=0;j<a.length;j+=4){c.moveTo(a[j],a[j+1]);c.lineTo(a[j+2],a[j+3]);}c.strokeStyle=rgba(colors.line,.035+(i+.5)/12*.37);c.stroke();});
      for(const n of s.nodes)dot(c,n.px,n.py,n.r,n.highlight?colors.teal:colors.gray,n.alpha*(n.highlight?.76:.56));
      s.edges=edges;clearGuards(s);
    }
    function drawGrid(s){
      const c=s.ctx,cell=s.w<560?44:56;c.beginPath();for(let x=12;x<s.w;x+=cell){c.moveTo(x,0);c.lineTo(x,s.h);}for(let y=12;y<s.h;y+=cell){c.moveTo(0,y);c.lineTo(s.w,y);}c.strokeStyle=rgba(colors.line,mode==='refined'?.20:.15);c.lineWidth=.5;c.stroke();
      s.nodes.forEach(n=>dot(c,n.x,n.y,n.r,colors.teal,(mode==='refined'?.34:.22)*protect(s,n.x,n.y)));clearGuards(s);
    }
    function flowY(s,x,lane){return(lane===0?30:s.h-30)+Math.sin(x/s.w*Math.PI*2+(lane?1.2:0))*5;}
    function drawFlow(s){
      const c=s.ctx;c.lineWidth=.65;c.strokeStyle=rgba(colors.line,.20);
      for(let lane=0;lane<2;lane++){c.beginPath();for(let x=0;x<=s.w;x+=12){const y=flowY(s,x,lane);x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
      for(const n of s.nodes){const x=((n.phase*(s.w+60)+s.time*n.speed*(mode==='refined'?1.6:1))%(s.w+60))-30,y=flowY(s,x,n.lane);const edge=smooth(Math.min(x,s.w-x)/40);dot(c,x,y,1.9,colors.teal,(mode==='refined'?.48:.32)*edge);dot(c,x-8,y,1,colors.gray,.16*edge);}
      clearGuards(s);
    }
    function drawWaves(s){
      const cols=s.w<560?12:20;
      for(const n of s.nodes){const u=n.col/(cols-1),x=s.w*(.22+u*.82)+Math.sin(s.time*(mode==='refined'?.20:.07)+n.phase)*(mode==='refined'?12:5);
        const y=s.h*(.22+n.row*.14)+Math.sin(u*Math.PI*2.1+s.time*(mode==='refined'?.24:.09)+n.row*.42)*23;
        dot(s.ctx,x,y,n.col%7===0?1.8:1.2,n.col%7===0?colors.teal:colors.gray,(mode==='refined'?.43:.27)*protect(s,x,y));}
      clearGuards(s);
    }
    function draw(s,dt,force=false){
      if(!s.w)return;
      const start=performance.now(),c=s.ctx;c.clearRect(0,0,s.w,s.h);
      if(s.kind==='network')drawNetwork(s,dt);else if(s.kind==='grid')drawGrid(s);else if(s.kind==='flow')drawFlow(s);else drawWaves(s);
      s.draws++;if(sample&&s.kind==='network'&&sample.lastPoint){const n=s.nodes[0];let dx=Math.abs(n.px-sample.lastPoint.x),dy=Math.abs(n.py-sample.lastPoint.y);if(mode==='refined'){dx=Math.min(dx,Math.abs(s.w+88-dx));dy=Math.min(dy,Math.abs(s.h+88-dy));}sample.travel+=Math.hypot(dx,dy);sample.lastPoint={x:n.px,y:n.py};}if(sample){sample.draws++;sample.cpu.push(performance.now()-start);sample.scenes.add(s.id);}if(force)updateAttrs(s);
    }
    function canRun(s){const state=getState();return !document.hidden&&!state.reduced&&state.view==='home'&&s.visible&&s.w>0&&s.kind!=='grid';}
    function updateAttrs(s){s.canvas.dataset.background=mode;s.canvas.dataset.nodes=String(s.nodes.length);s.canvas.dataset.dpr=String(s.dpr);s.canvas.dataset.running=String(s.running);s.canvas.dataset.kind=s.kind;}
    function tick(t){
      raf=0;const dt=Math.max(0,(t-last)/1000);last=t;let any=false;
      for(const s of scenes){s.running=canRun(s);if(!s.running)continue;any=true;
        const interval=limited?32:0;
        if(t-s.lastDraw<interval)continue;
        const frameElapsed=Math.max(0,t-s.lastDraw),delta=mode==='refined'?frameElapsed/1000:Math.min(.05,frameElapsed/1000);s.lastDraw=t;
        s.time+=delta;
        draw(s,delta);
      }
      if(any)raf=requestAnimationFrame(tick);
    }
    function report(){
      clearTimeout(reportTimer);reportTimer=0;const state=getState();
      parentPost({type:'background-state',mode,reduced:state.reduced,osReduced:state.osReduced,hidden:document.hidden,limited,scenes:scenes.map(s=>({id:s.id,visible:s.visible,running:s.running,nodes:Number(s.canvas.dataset.nodes),dpr:s.dpr,edges:s.edges,draws:s.draws,pointerDisplacement:s.pointerEnergy,phase:s.time}))});
    }
    function sync(){
      const state=getState();let any=false;
      for(const s of scenes){const next=canRun(s);if(next!==s.running){s.lastDraw=performance.now();s.running=next;}if(!next&&s.visible)draw(s,0,true);updateAttrs(s);any||=next;}
      if(!any&&raf){cancelAnimationFrame(raf);raf=0;}if(any&&!raf){last=performance.now();raf=requestAnimationFrame(tick);}report();
    }
    function queueMeasure(){if(measureQueued)return;measureQueued=true;requestAnimationFrame(()=>{measureQueued=false;scenes.forEach(measure);sync();});}
    const resize=new ResizeObserver(queueMeasure);scenes.forEach(s=>resize.observe(s.section));
    const intersection=new IntersectionObserver(entries=>{for(const e of entries){const s=byId.get(e.target.id);s.visible=e.isIntersecting;if(s.visible){s.rect=s.section.getBoundingClientRect();if(!s.w)measure(s);}}sync();},{threshold:0});scenes.forEach(s=>intersection.observe(s.section));
    new MutationObserver(()=>{queueMeasure();sync();}).observe(document.getElementById('home-view'),{attributes:true,attributeFilter:['hidden']});
    document.addEventListener('visibilitychange',()=>{if(sample&&document.hidden)finishSample('Sample interrupted: tab became hidden.');sync();});
    window.addEventListener('resize',queueMeasure,{passive:true});
    document.fonts?.ready.then(queueMeasure);
    const hero=byId.get('home');
    hero.section.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;hero.rect=hero.section.getBoundingClientRect();pointer.active=true;pointer.x=e.clientX-hero.rect.left;pointer.y=e.clientY-hero.rect.top;},{passive:true});
    hero.section.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;pointer.active=true;pointer.x=e.clientX-hero.rect.left;pointer.y=e.clientY-hero.rect.top;},{passive:true});
    hero.section.addEventListener('pointerleave',()=>{pointer.active=false;},{passive:true});
    let scrollPending=false;window.addEventListener('scroll',()=>{if(scrollPending)return;scrollPending=true;requestAnimationFrame(()=>{scrollPending=false;if(hero.visible)hero.rect=hero.section.getBoundingClientRect();});},{passive:true});
    function setMode(value){if(!['science','refined'].includes(value)||value===mode)return;if(sample)finishSample('Sample interrupted: background mode changed.');mode=value;root.dataset.background=mode;scenes.forEach(measure);sync();}
    function finishSample(error){
      if(!sample)return;const s=sample;sample=null;cancelAnimationFrame(s.raf);clearTimeout(s.timeout);
      if(error){parentPost({type:'background-sample',error});return;}
      const sorted=[...s.gaps].sort((a,b)=>a-b),duration=s.previous-s.start,mean=s.gaps.reduce((a,b)=>a+b,0)/s.gaps.length;
      parentPost({type:'background-sample',mode:s.mode,reduced:s.reduced,width:Math.round(hero.w),cadenceHz:1000/mean,p95Ms:sorted[Math.floor((sorted.length-1)*.95)],slowFrames:s.gaps.filter(x=>x>25).length,frames:s.gaps.length,drawHz:s.draws/(duration/1000),draws:s.draws,meanDrawMs:s.cpu.length?s.cpu.reduce((a,b)=>a+b,0)/s.cpu.length:0,maxDrawMs:s.cpu.length?Math.max(...s.cpu):0,scenes:[...s.scenes],networkMovement:s.travel,movementMetric:'sum of sampled displacement with wrap correction',edgesStart:s.edges,edgesEnd:hero.edges,pointerActive:pointer.active,pointerDisplacement:hero.pointerEnergy,centralNodes:hero.nodes.filter(n=>n.px>hero.w*.25&&n.px<hero.w*.75).length,hardware:{userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency||null,memoryGB:navigator.deviceMemory||null,devicePixelRatio:devicePixelRatio||1,touchPoints:navigator.maxTouchPoints||0},longTasks:s.longTasks});report();
    }
    let recording=false;
    function recordBackground(){
      if(recording)return;
      if(document.hidden||getState().reduced||!hero.visible||getState().view!=='home'){
        parentPost({type:'background-recording',status:'error',message:'Return to the hero with motion enabled to record.'});return;
      }
      if(typeof MediaRecorder==='undefined'||!hero.canvas.captureStream){parentPost({type:'background-recording',status:'error',message:'This browser does not support Canvas recording.'});return;}
      const capture=document.createElement('canvas'),scale=Math.min(1,1280/hero.w);
      capture.width=Math.round(hero.w*scale);capture.height=Math.round(hero.h*scale)+48;
      const ctx=capture.getContext('2d'),stream=capture.captureStream(30);
      const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
      let recorder;
      try{recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:2500000}:{});}catch{stream.getTracks().forEach(t=>t.stop());parentPost({type:'background-recording',status:'error',message:'Video recording is unavailable in this browser.'});return;}
      const chunks=[],initialMode=mode;let paintId=0,invalid=false;
      const paint=()=>{if(!recording)return;if(mode!==initialMode||getState().reduced||!hero.visible)invalid=true;ctx.fillStyle='#fff';ctx.fillRect(0,0,capture.width,capture.height);ctx.drawImage(hero.canvas,0,0,hero.canvas.width,hero.canvas.height,0,48,capture.width,capture.height-48);ctx.fillStyle='#172b2a';ctx.font='12px system-ui';ctx.fillText(`${mode==='refined'?'v3.3':'v3.2'} · Actual background recording · real time`,18,22);ctx.fillStyle='#576b67';ctx.font='10px system-ui';ctx.fillText('Background canvas only; interface excluded. Capture frame rate is not rendered-FPS proof.',18,38);paintId=requestAnimationFrame(paint);};
      const hidden=()=>{if(document.hidden){invalid=true;if(recorder.state==='recording')recorder.stop();}};
      document.addEventListener('visibilitychange',hidden);
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=()=>{
        recording=false;cancelAnimationFrame(paintId);document.removeEventListener('visibilitychange',hidden);stream.getTracks().forEach(t=>t.stop());
        if(invalid){parentPost({type:'background-recording',status:'error',message:'Recording cancelled because the view, mode or visibility changed.'});return;}
        const blob=new Blob(chunks,{type:recorder.mimeType});
        parentPost({type:'background-recording',status:'ready',blob,message:'Live recording ready. Use Download recording to save the actual captured frames.'});
      };
      recording=true;paint();recorder.start();parentPost({type:'background-recording',status:'recording',message:'Recording the live background for 10 seconds. Keep this view visible.'});
      setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},10000);
    }
    function startSample(){
      if(sample)return;
      const state=getState();sample={mode,reduced:state.reduced,start:0,previous:0,gaps:[],cpu:[],draws:0,scenes:new Set(),raf:0,timeout:0,longTasks:[],travel:0,lastPoint:{x:hero.nodes[0]?.px||0,y:hero.nodes[0]?.py||0},firstPoint:{x:hero.nodes[0]?.px||0,y:hero.nodes[0]?.py||0},edges:hero.edges};
      const step=t=>{if(!sample)return;if(document.hidden){finishSample('Sample interrupted: tab became hidden.');return;}if(getState().reduced!==sample.reduced){finishSample('Sample interrupted: reduced-motion setting changed.');return;}if(!sample.start)sample.start=t;if(sample.previous)sample.gaps.push(t-sample.previous);sample.previous=t;if(t-sample.start>=5000)finishSample();else sample.raf=requestAnimationFrame(step);};sample.raf=requestAnimationFrame(step);sample.timeout=setTimeout(()=>finishSample('Sampling timed out; keep the tab visible and try again.'),12000);
    }
    try{new PerformanceObserver(list=>{if(sample)sample.longTasks.push(...list.getEntries().map(e=>({duration:e.duration,start:e.startTime})));}).observe({type:'longtask',buffered:false});}catch{}
    window.addEventListener('message',e=>{if(e.source!==window.parent)return;const d=e.data;if(d?.type==='background-mode')setMode(d.mode);if(d?.type==='background-diagnostics')report();if(d?.type==='background-sample'&&!('mode' in d)&&!('error' in d))startSample();if(d?.type==='background-record')recordBackground();});
    // Fallback still paints when observers are waiting for their first notification.
    scenes.forEach(measure);sync();return{sync};
  };
})();
