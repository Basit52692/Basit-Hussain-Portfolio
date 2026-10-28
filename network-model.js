/* Original v3.3 particle model. Pure math; no DOM, libraries, or copied reference-site code. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const seed=i=>((Math.sin(i*78.233+12.9898)*43758.5453)%1+1)%1;
  const normal=i=>Math.sqrt(-2*Math.log(Math.max(.001,seed(i))))*Math.cos(TAU*seed(i+913));
  const mod=(n,d)=>((n%d)+d)%d;
  const smooth=n=>{const v=Math.max(0,Math.min(1,n));return v*v*(3-2*v);};
  function create(w,h,count){
    const cols=Math.round(Math.sqrt(count*w/h)),rows=Math.ceil(count/cols),mobile=w<560;
    return Array.from({length:count},(_,i)=>{
      let x=((i%cols)+.08+seed(i+231)*.84)/cols*w;
      let y=(Math.floor(i/cols)+.08+seed(i+377)*.84)/rows*h;
      // A small clustered component complements the broad stratified scatter.
      if(i%9===0){x=w*(i%2?.62:.37)+normal(i+319)*w*.07;y=h*(i%2?.72:.21)+normal(i+867)*h*.09;}
      const angle=seed(i+701)*TAU,speed=(mobile?6:8)+seed(i+401)*(mobile?4:6);
      return{x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,phase:seed(i+113)*TAU,ox:0,oy:0,px:x,py:y,fade:1,r:i%11===0?2.9:i%4===0?2.1:1.5,highlight:i%11===0};
    });
  }
  function position(n,t,w,h){
    const pad=44;
    return{x:mod(n.x+n.vx*t+Math.sin(t*.19+n.phase)*13+pad,w+pad*2)-pad,y:mod(n.y+n.vy*t+Math.cos(t*.16+n.phase)*10+pad,h+pad*2)-pad};
  }
  function update(nodes,t,dt,w,h,pointer){
    const blend=1-Math.exp(-Math.max(0,dt)/.22);let displacement=0;
    for(const n of nodes){
      const p=position(n,t,w,h);let tx=0,ty=0;
      if(pointer?.active){const dx=p.x-pointer.x,dy=p.y-pointer.y,d=Math.hypot(dx,dy);if(d<145){const force=12*smooth(1-d/145);tx=dx/(d||1)*force;ty=dy/(d||1)*force;}}
      n.ox+=(tx-n.ox)*blend;n.oy+=(ty-n.oy)*blend;
      n.px=p.x+n.ox;n.py=p.y+n.oy;
      n.fade=smooth(Math.min(n.px,n.py,w-n.px,h-n.py)/18);
      displacement+=Math.hypot(n.ox,n.oy);
    }
    return displacement;
  }
  const api={create,position,update,smooth};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.PortfolioNetworkModel=api;
})();
