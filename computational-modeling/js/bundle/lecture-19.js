/* Generated bundle: kit, the conditions-become-roots demo, this deck's
   figures, the slide runtime, the presenter tools, page.js.
   Do not edit. */

const $ = (s, r = document) => r.querySelector(s);
const svgEl = (n, a = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', n);
  for (const k in a) e.setAttribute(k, a[k]); return e; };

/* cumulative trapezoid: s[i] is the integral from the start up to sample i.
   Shared because pages 5-8 and 24 all build one. */
function integrate(y, dt) {
  const s = new Float64Array(y.length);
  for (let i = 1; i < y.length; i++) s[i] = s[i-1] + (y[i] + y[i-1]) * 0.5 * dt;
  return s;
}

function extent(a){let lo=Infinity,hi=-Infinity;for(const v of a){if(!isFinite(v))continue;
  if(v<lo)lo=v;if(v>hi)hi=v} if(!isFinite(lo)||lo===hi){lo=(isFinite(lo)?lo:0)-1;hi=lo+2}return [lo,hi]}
function niceTicks(lo,hi,want=4){const span=hi-lo;if(!(span>0))return[lo];
  const mag=Math.pow(10,Math.floor(Math.log10(span/want)));
  let best=null;
  for(const m of [1,2,2.5,5,10,20]){const step=m*mag;
    const cnt=Math.floor(hi/step+1e-9)-Math.ceil(lo/step-1e-9)+1;
    if(cnt<2||cnt>12)continue;
    const score=Math.abs(cnt-want);
    if(!best||score<best.score)best={step,score};}
  const step=best?best.step:span/want,out=[];
  for(let v=Math.ceil(lo/step-1e-9)*step;v<=hi+step*1e-9;v+=step)
    out.push(Math.abs(v)<step*1e-9?0:v);
  return out}
const fmt = step => {
  const a = Math.abs(step);
  if (a < 1e-3 || a >= 1e5) return v => v === 0 ? '0' : v.toExponential(1);
  let dp = 0;
  while (dp < 8 && Math.abs(parseFloat(a.toFixed(dp)) - a) > a * 1e-9) dp++;
  return v => v.toFixed(dp);
};
const MINUS=s=>String(s).replace('-','−');
const SUP={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
           '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const supNum=n=>String(n).split('').map(c=>SUP[c]||c).join('');

/* panel(): one stacked plot. Time series or any other x quantity.
   opts on each render: pred, label, marks, bands, rings, iterates, hlines. */
/* decade ticks for a log axis, and log-spaced sampling to go with them */
function decadeTicks(lo,hi){const out=[];
  for(let e=Math.ceil(Math.log10(lo)-1e-9);e<=Math.floor(Math.log10(hi)+1e-9);e++)out.push(Math.pow(10,e));
  return out.length>=2?out:[lo,hi]}
function logspace(a,b,n){const x=new Float64Array(n);
  const la=Math.log10(a),lb=Math.log10(b);
  for(let i=0;i<n;i++)x[i]=Math.pow(10,la+(lb-la)*i/(n-1));
  return x}

let CGP_UID = 0;
function panel(parent,{label,unit,height=128,xAxis=false,xLabel='time',xUnit='ms',xScale=1000,
                       yClamp=null,xLog=false,yLog=false,lens=false,lensZoom=6,
                       lensZoomY=null}){
  const W=900,PADL=78,PADR=14,PADT=20,PADB=xAxis?32:12;
  const svg=svgEl('svg',{viewBox:`0 0 ${W} ${height}`,role:'img',class:'cgp'});
  svg.setAttribute('aria-label',`${label} in ${unit} against ${xLabel}`);
  parent.appendChild(svg);
  const gBand=svgEl('g'),gGrid=svgEl('g'),gLines=svgEl('g'),gText=svgEl('g'),gMark=svgEl('g');
  /* the drawn content lives in one identified group so the lens can <use> it
     rather than redraw or recompute anything */
  const uid='cgp'+(++CGP_UID);
  const gPlot=svgEl('g',{id:uid+'-plot'});
  gPlot.append(gBand,gGrid,gLines,gText,gMark);
  svg.appendChild(gPlot);
  const yl=svgEl('text',{x:0,y:12,class:'ylab'});gText.appendChild(yl);
  const ghost=svgEl('path',{class:'ghost'}),trace=svgEl('path',{class:'trace'}),
        pred=svgEl('path',{class:'pred'}),zero=svgEl('line',{class:'zero'});
  gLines.append(zero,ghost,pred,trace);
  const fmtZ=v=>v>=100?String(Math.round(v)):(v>=10?v.toFixed(0):v.toFixed(1));
  /* ---- the magnifier ---- */
  let lensAt=null;                       /* [x,y] in user units, or null */
  /* the last render publishes its data and its coordinate mapping, so the lens
     can ride the curve instead of wherever the pointer happens to be */
  let curT=null,curY=null,curMapX=null,curMapY=null;
  let lensSync=null;                     /* refreshes the lens copy, per render */
  /* the magnification can be set per render, because how much stretch is useful
     depends on the state the demo is in -- a trapezoid error falls as h^2 */
  let zx=lensZoom, zy=lensZoomY===null?lensZoom:lensZoomY;
  if(lens){
    const LW=210,LH=140;
    const defs=svgEl('defs');
    const clip=svgEl('clipPath',{id:uid+'-clip'});
    const clipR=svgEl('rect',{x:0,y:0,width:LW,height:LH,rx:3});
    clip.appendChild(clipR);defs.appendChild(clip);
    const gLens=svgEl('g',{class:'lens'});
    const back=svgEl('rect',{class:'lensback',x:0,y:0,width:LW,height:LH,rx:3});
    const inner=svgEl('g',{'clip-path':`url(#${uid}-clip)`});
    /* a clone, not a <use>: the stylesheet's descendant selectors do not reach
       into a use-element's shadow tree, and every shape would render black */
    const use=svgEl('g');
    inner.appendChild(use);
    lensSync=()=>{
      const c=gPlot.cloneNode(true);
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
      /* magnify the geometry, not the ink: point markers are shrunk by the same
         factor the lens enlarges by, and strokes are held at their drawn width
         by non-scaling-stroke in the stylesheet. Otherwise a 3.5 px dot becomes
         a 28 px blob and covers the gap the lens exists to show. */
      const shrink=Math.max(zx,zy);
      c.querySelectorAll('circle').forEach(e=>{
        const r=parseFloat(e.getAttribute('r'));
        if(isFinite(r))e.setAttribute('r',r/shrink);
      });
      c.querySelectorAll('rect').forEach(e=>{
        const rx=parseFloat(e.getAttribute('rx'));
        if(isFinite(rx))e.setAttribute('rx',rx/shrink);
      });
      /* axis labels and tick text magnify into nonsense, so drop them */
      c.querySelectorAll('text').forEach(e=>e.remove());
      use.replaceChildren(c);
    };
    const frame=svgEl('rect',{class:'lensframe',x:0,y:0,width:LW,height:LH,rx:3});
    const cross=svgEl('circle',{class:'lenscross',r:2.5});
    const tag=svgEl('text',{class:'lenstag'});
    gLens.append(back,inner,frame,tag);
    svg.append(defs,gLens,cross);
    gLens.style.display=cross.style.display='none';

    const place=()=>{
      if(!lensAt){gLens.style.display=cross.style.display='none';return}
      const [px,py]=lensAt;
      /* keep the box on the canvas, and away from the point it magnifies */
      let bx=px+18, by=py-LH-14;
      if(bx+LW>W-2)bx=px-LW-18;
      if(bx<2)bx=2;
      if(by<2)by=py+18;
      if(by+LH>height-2)by=Math.max(2,height-LH-2);
      gLens.setAttribute('transform',`translate(${bx} ${by})`);
      /* map the magnified point to the center of the box */
      use.setAttribute('transform',
        `translate(${LW/2} ${LH/2}) scale(${zx} ${zy}) translate(${-px} ${-py})`);
      cross.setAttribute('cx',px);cross.setAttribute('cy',py);
      tag.setAttribute('x',6);tag.setAttribute('y',LH-6);
      tag.textContent=(zx===zy)?('\u00d7'+fmtZ(zx))
        :('\u00d7'+fmtZ(zx)+' across, \u00d7'+fmtZ(zy)+' up');
      gLens.style.display=cross.style.display='';
    };

    /* vertically the lens follows the plotted series, because at these
       magnifications a free pointer misses the curve almost every time and the
       thing worth magnifying is always on it */
    const onCurve=x=>{
      if(!curT||!curY||!curMapX||!curMapY)return null;
      let best=null,bd=Infinity;
      for(let i=0;i<curT.length;i++){
        const d=Math.abs(curMapX(curT[i])-x);
        if(d<bd&&isFinite(curY[i])){bd=d;best=i}
      }
      if(best===null||bd>40)return null;
      const y=curMapY(curY[best]);
      return isFinite(y)?y:null;
    };
    const at=e=>{
      const r=svg.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width*W, y=(e.clientY-r.top)/r.height*height;
      if(x<PADL||x>W-PADR||y<PADT||y>height-PADB){lensAt=null;place();return}
      const cy=onCurve(x);
      lensAt=[x, cy===null?y:Math.max(PADT,Math.min(height-PADB,cy))];
      place();
    };
    svg.addEventListener('pointermove',at);
    svg.addEventListener('pointerleave',()=>{lensAt=null;place()});
    svg.classList.add('haslens');
    /* keyboard: the lens is a convenience, so it is not the only way to read
       the figure, but it should not be mouse-only either */
    svg.setAttribute('tabindex','0');
    svg.addEventListener('keydown',e=>{
      const step=(W-PADL-PADR)/40;
      if(!lensAt)lensAt=[(PADL+W-PADR)/2,height/2];
      if(e.key==='ArrowLeft')lensAt[0]-=step;
      else if(e.key==='ArrowRight')lensAt[0]+=step;
      else if(e.key==='ArrowUp')lensAt[1]-=step;
      else if(e.key==='ArrowDown')lensAt[1]+=step;
      else if(e.key==='Escape'){lensAt=null;place();return}
      else return;
      e.preventDefault();
      lensAt[0]=Math.max(PADL,Math.min(W-PADR,lensAt[0]));
      lensAt[1]=Math.max(PADT,Math.min(height-PADB,lensAt[1]));
      place();
    });
  }

  /* Coordinate precision in the path strings. One decimal is a 0.05-unit
     quantum, which is a twentieth of a pixel at 1x and invisible -- until the
     lens magnifies it a hundredfold and starts putting trapezoid tops above the
     curve they are supposed to sit under. Three decimals is 0.1 px at the
     highest magnification the lens offers. */
  const P=3;

  return function update(t,ys,yg,tRange,opts={}){
    const hlines=opts.hlines||[];
    const predFn=opts.pred||null, marks=opts.marks||[], bands=opts.bands||[],
          rings=opts.rings||[], iterates=opts.iterates||null, polys=opts.polys||[],
          curves=opts.curves||[];
    /* zero, ghost, pred and trace persist across renders; anything else in
       gLines was added by the last render and has to go, or extra curves and
       scatter points accumulate every time a control moves */
    for(const el of [...gLines.children])
      if(el!==zero&&el!==ghost&&el!==pred&&el!==trace)el.remove();
    const [t0,t1]=tRange;
    const vis=[];for(let i=0;i<t.length;i++)if(t[i]>=t0&&t[i]<=t1)vis.push(i);
    const pick=arr=>vis.map(i=>arr[i]);
    /* opts.yRange fixes the axis for this render only, so a demo can hold its
       axes still while a control moves the curve on them */
    const yFix = opts.yRange || yClamp;
    let [lo,hi] = yFix ? [yFix[0],yFix[1]]
                       : extent(yg?[...pick(ys),...pick(yg)]:pick(ys));
    if(!yFix){
      if(yLog){const pos=[...pick(ys),...(yg?pick(yg):[])].filter(v=>v>0&&isFinite(v));
        lo=Math.pow(10,Math.floor(Math.log10(Math.min(...pos))));
        hi=Math.pow(10,Math.ceil(Math.log10(Math.max(...pos))));}
      else {const pad=(hi-lo)*0.10;lo-=pad;hi+=pad;}
    }
    /* on a log axis everything is positioned by log10 of the value; the tick
       labels still print the value itself */
    const gx=v=>xLog?Math.log10(v):v, gy=v=>yLog?Math.log10(v):v;
    const T0=gx(t0),T1=gx(t1),LO=gy(lo),HI=gy(hi);
    const X=v=>PADL+(gx(v)-T0)/(T1-T0)*(W-PADL-PADR);
    const Y=v=>PADT+(HI-gy(v))/(HI-LO)*(height-PADT-PADB);
    /* hand the lens this render's data and mapping */
    curT=t;curY=ys;curMapX=X;curMapY=Y;
    /* a render setting lensZoom moves both axes: the magnifier is isotropic
       unless a caller deliberately asks for a stretch */
    if(opts.lensZoom!==undefined)zx=zy=opts.lensZoom;
    if(opts.lensZoomY!==undefined)zy=opts.lensZoomY;
    if(lensSync)queueMicrotask(lensSync);   /* after this render has drawn */
    const inY=v=>isFinite(v)&&(yLog?v>0:true)&&v>=lo&&v<=hi;
    const path=arr=>{const step=Math.max(1,Math.floor(vis.length/900));let d='',open=false;
      for(let k=0;k<vis.length;k+=step){const i=vis[k];
        if(!inY(arr[i])){open=false;continue}
        d+=(open?'L':'M')+X(t[i]).toFixed(P)+' '+Y(arr[i]).toFixed(P);open=true}
      return d};
    /* opts.scatter: further point sets [{x, y, cls, r}] drawn under the main
       series, such as the raw values a smoothed series is compared with */
    for(const s of (opts.scatter||[]))
      for(let i=0;i<s.x.length;i++){
        if(s.x[i]<t0||s.x[i]>t1||!inY(s.y[i]))continue;
        gLines.appendChild(svgEl('circle',{class:s.cls||'scatter',cx:X(s.x[i]),cy:Y(s.y[i]),r:s.r||3}));
      }
    /* opts.dots: the samples are a scatter, not a series, so draw the points
       and suppress the line that would imply an order between them */
    if(opts.dots){
      trace.setAttribute('d','');
      for(const i of vis){
        if(!isFinite(ys[i])||!inY(ys[i]))continue;
        gLines.appendChild(svgEl('circle',{class:opts.dotCls||'scatter',
          cx:X(t[i]),cy:Y(ys[i]),r:opts.dotR||3}));
      }
    } else trace.setAttribute('d',path(ys));
    if(yg){ghost.setAttribute('d',path(yg));ghost.style.display=''}else ghost.style.display='none';
    if(predFn){let d='';for(const v of (xLog?logspace(t0,t1,40):[t0,t1]))
        d+=(d?'L':'M')+X(v)+' '+Y(predFn(v));
      pred.setAttribute('d',d);pred.style.display=''}else pred.style.display='none';
    if(yLog){zero.style.display='none';}
    else{zero.style.display='';const y0=Y(0);
      zero.setAttribute('x1',PADL);zero.setAttribute('x2',W-PADR);
      zero.setAttribute('y1',y0);zero.setAttribute('y2',y0);}

    gBand.textContent='';
    /* a horizontal threshold: a design limit, a tolerance, a level the prose
       names. Drawn in the band group so it sits under the trace rather than
       over it, and labeled at the left where the axis already is. */
    for(const hl of hlines){
      if(!inY(hl.y))continue;
      const hy=Y(hl.y);
      gBand.appendChild(svgEl('line',{class:hl.cls||'limit',x1:PADL,x2:W-PADR,y1:hy,y2:hy}));
      if(hl.text){
        const tx=svgEl('text',{x:W-PADR,y:hy-5,'text-anchor':'end',class:'mk'});
        tx.textContent=hl.text;gBand.appendChild(tx);
      }
    }
    for(const b of bands){
      const bx0=X(Math.max(b.x0,t0)),bx1=X(Math.min(b.x1,t1));
      if(bx1<=bx0)continue;
      gBand.appendChild(svgEl('rect',{class:b.cls||'band',x:bx0,y:PADT,
        width:bx1-bx0,height:height-PADT-PADB}));
      for(const bx of [bx0,bx1])
        gBand.appendChild(svgEl('line',{class:'bandedge',x1:bx,x2:bx,y1:PADT,y2:height-PADB}));
    }

    /* extra parametric curves, each with its own x. The trace and ghost share
       one x array, which is right for a time series and cannot express two
       trajectories in a plane; a phase portrait needs this. */
    for(const c of curves){
      let d='',open=false;
      const st=Math.max(1,Math.floor(c.x.length/900));
      for(let i=0;i<c.x.length;i+=st){
        if(c.x[i]<t0||c.x[i]>t1||!inY(c.y[i])){open=false;continue}
        d+=(open?'L':'M')+X(c.x[i]).toFixed(P)+' '+Y(c.y[i]).toFixed(P);open=true;
      }
      if(d)gLines.appendChild(svgEl('path',{class:c.cls||'ghost',d}));
    }

    /* filled shapes in data coordinates: integration panels, and anything else
       whose area is the thing being shown */
    for(const q of polys){
      const d=q.pts.map((p2,i)=>(i?'L':'M')+X(p2.x).toFixed(P)+' '+Y(p2.y).toFixed(P)).join('')+'Z';
      gBand.appendChild(svgEl('path',{class:q.cls||'poly',d}));
    }

    gGrid.textContent='';[...gText.querySelectorAll('.tick')].forEach(e=>e.remove());
    const yt=yLog?decadeTicks(lo,hi):niceTicks(lo,hi,4);
    const maxAbs=Math.max(...yt.map(Math.abs));
    let ex=0;
    if(!yLog&&maxAbs>0){const m=Math.floor(Math.log10(maxAbs)); if(m<-2||m>4) ex=m;}
    const sc=Math.pow(10,ex);
    const uparen = (unit||ex) ? ` (${ex?'×10'+supNum(ex)+(unit?' ':''):''}${unit})` : '';
    yl.textContent=`${opts.label||label}${uparen}`;
    const yf=yLog?(v=>'10'+supNum(Math.round(Math.log10(v))))
                 :fmt((yt.length>1?yt[1]-yt[0]:1)/sc);
    yt.forEach(v=>{const y=Y(v);
      gGrid.appendChild(svgEl('line',{class:'grid',x1:PADL,x2:W-PADR,y1:y,y2:y}));
      const tx=svgEl('text',{x:PADL-8,y:y+4,'text-anchor':'end',class:'tick'});
      tx.textContent=yLog?yf(v):MINUS(yf(v/sc));gText.appendChild(tx)});
    if(xAxis){const xt=xLog?decadeTicks(t0,t1):niceTicks(t0,t1,6),yb=height-PADB+14;
      const xf=xLog?(v=>'10'+supNum(Math.round(Math.log10(v))))
                   :fmt(xt.length>1?(xt[1]-xt[0])*xScale:1);
      xt.forEach(v=>{
        if(xLog)gGrid.appendChild(svgEl('line',{class:'grid',x1:X(v),x2:X(v),y1:PADT,y2:height-PADB}));
        const tx=svgEl('text',{x:X(v),y:yb,'text-anchor':'middle',class:'tick'});
        tx.textContent=xLog?xf(v):MINUS(xf(v*xScale));gText.appendChild(tx)});
      const lab=svgEl('text',{x:W-PADR,y:yb+14,'text-anchor':'end',class:'tick'});
      lab.textContent=xUnit?`${xLabel} (${xUnit})`:xLabel;gText.appendChild(lab)}

    gMark.textContent='';
    for(const r of rings){
      if(r.x<t0||r.x>t1)continue;
      gMark.appendChild(svgEl('circle',{class:'rootmk',cx:X(r.x),cy:Y(r.y||0),r:6}));
      if(r.text){const tx=svgEl('text',{x:X(r.x),y:Y(r.y||0)+20,'text-anchor':'middle',class:'mk'});
        tx.textContent=r.text;gMark.appendChild(tx)}
    }
    if(iterates){
      const vis2=[];
      iterates.forEach((q,k)=>{
        if(q.x<t0||q.x>t1||!inY(q.y))return;
        vis2.push({px:X(q.x),py:Y(q.y),k});
      });
      let d='';
      for(const q of vis2) d+=(d?'L':'M')+q.px.toFixed(P)+' '+q.py.toFixed(P);
      if(d) gMark.appendChild(svgEl('path',{class:'itpath',d}));
      /* keep the last of any run that lands within 10 px, so a converged run
         shows one dot carrying its true step number */
      const keep=[];
      for(const q of vis2){
        const prev=keep[keep.length-1];
        if(prev&&Math.hypot(q.px-prev.px,q.py-prev.py)<10) keep[keep.length-1]=q;
        else keep.push(q);
      }
      for(const q of keep){
        gMark.appendChild(svgEl('circle',{class:'itmk',cx:q.px,cy:q.py,r:7.5}));
        const tx=svgEl('text',{x:q.px,y:q.py+3.4,'text-anchor':'middle',class:'itlab'});
        tx.textContent=String(q.k);gMark.appendChild(tx);
      }
    }
    for(const m of marks){
      const mx=X(m.t),my=Y(m.y);
      if(m.cast==='y'||m.cast==='both')
        gMark.appendChild(svgEl('line',{class:'cast',x1:PADL,y1:my,x2:mx,y2:my}));
      if(m.cast==='x'||m.cast==='both')
        gMark.appendChild(svgEl('line',{class:'cast',x1:mx,y1:my,x2:mx,y2:height-PADB}));
      /* ring: an open circle rather than a filled dot, for a point the method
         did not visit. A filled dot in the same style as the evaluated points
         reads as one of them. */
      gMark.appendChild(m.square?svgEl('rect',{class:'bimk',x:mx-4.5,y:my-4.5,width:9,height:9})
        :svgEl('circle',m.ring?{class:'rootmk',cx:mx,cy:my,r:5.5}
                               :{class:'dot',cx:mx,cy:my,r:3.5}));
      if(m.text){
        const tx=svgEl('text',{x:mx+(m.dx||8),y:my+(m.dy||-8),class:'mk',
          'text-anchor':m.anchor||'start'});
        tx.textContent=m.text;gMark.appendChild(tx);
      }
    }
  };
}

/* histogram(): the kit's second display primitive. Same axis machinery as
   panel(), but bars over bins rather than a trace over samples. */
function histogram(parent, {label, unit, height = 230, xLabel, xUnit, nbins = 48}) {
  const W = 900, PADL = 62, PADR = 14, PADT = 20, PADB = 34;
  const svg = svgEl('svg', {viewBox: `0 0 ${W} ${height}`, role: 'img', class: 'cgp'});
  svg.setAttribute('aria-label', `${label} against ${xLabel}`);
  parent.appendChild(svg);
  const gBand = svgEl('g'), gGrid = svgEl('g'), gBars = svgEl('g'),
        gText = svgEl('g'), gMark = svgEl('g');
  svg.append(gBand, gGrid, gBars, gText, gMark);
  const yl = svgEl('text', {x: 0, y: 12, class: 'ylab'}); gText.appendChild(yl);

  return function update(values, opts = {}) {
    const {truth = null, band = null, range = null, truthLabel = 'truth',
           bandCls = 'claimband'} = opts;
    gBand.textContent = ''; gGrid.textContent = ''; gBars.textContent = '';
    gMark.textContent = '';
    [...gText.querySelectorAll('.tick')].forEach(e => e.remove());
    yl.textContent = `${label}${unit ? ' (' + unit + ')' : ''}`;

    if (!values.length) return;
    const sorted = [...values].sort((a, b) => a - b);
    const pct = q => sorted[Math.min(sorted.length - 1,
                     Math.max(0, Math.round(q * (sorted.length - 1))))];
    let [x0, x1] = range || [pct(0.01), pct(0.99)];
    if (truth !== null) { x0 = Math.min(x0, truth - 0.02); x1 = Math.max(x1, truth + 0.02); }
    if (!(x1 > x0)) { x0 -= 0.05; x1 += 0.05; }
    const pad = (x1 - x0) * 0.04; x0 -= pad; x1 += pad;

    const counts = new Array(nbins).fill(0);
    let outside = 0;
    for (const v of values) {
      const k = Math.floor((v - x0) / (x1 - x0) * nbins);
      if (k < 0 || k >= nbins) { outside++; continue; }
      counts[k]++;
    }
    const cmax = Math.max(1, ...counts);
    const X = v => PADL + (v - x0) / (x1 - x0) * (W - PADL - PADR);
    const Y = c => PADT + (1 - c / cmax) * (height - PADT - PADB);

    if (band) {
      const bx0 = X(Math.max(band[0], x0)), bx1 = X(Math.min(band[1], x1));
      gBand.appendChild(svgEl('rect', {class: bandCls, x: bx0, y: PADT,
        width: Math.max(1.5, bx1 - bx0), height: height - PADT - PADB}));
    }

    const yt = niceTicks(0, cmax, 4), yf = fmt(yt.length > 1 ? yt[1] - yt[0] : 1);
    yt.forEach(v => { const y = Y(v);
      gGrid.appendChild(svgEl('line', {class: 'grid', x1: PADL, x2: W - PADR, y1: y, y2: y}));
      const tx = svgEl('text', {x: PADL - 8, y: y + 4, 'text-anchor': 'end', class: 'tick'});
      tx.textContent = yf(v); gText.appendChild(tx); });

    const bw = (W - PADL - PADR) / nbins;
    counts.forEach((c, k) => {
      if (!c) return;
      gBars.appendChild(svgEl('rect', {class: 'bar', x: PADL + k * bw + 0.5,
        y: Y(c), width: Math.max(1, bw - 1), height: height - PADB - Y(c)}));
    });

    const xt = niceTicks(x0, x1, 6), yb = height - PADB + 15;
    const xf = fmt(xt.length > 1 ? xt[1] - xt[0] : 1);
    xt.forEach(v => { const tx = svgEl('text', {x: X(v), y: yb, 'text-anchor': 'middle', class: 'tick'});
      tx.textContent = MINUS(xf(v)); gText.appendChild(tx); });
    const lab = svgEl('text', {x: W - PADR, y: yb + 14, 'text-anchor': 'end', class: 'tick'});
    lab.textContent = xUnit ? `${xLabel} (${xUnit})` : xLabel; gText.appendChild(lab);

    if (truth !== null && truth >= x0 && truth <= x1) {
      gMark.appendChild(svgEl('line', {class: 'truth', x1: X(truth), x2: X(truth),
        y1: PADT - 6, y2: height - PADB}));
      /* the y-axis label occupies the same row above the plot, so a mark near
         the left edge has to drop inside the frame rather than sit on top of it */
      const clash = X(truth) < PADL + 150;
      const tx = svgEl('text', {x: X(truth), y: clash ? PADT + 13 : PADT - 9,
        'text-anchor': 'middle', class: 'mk'});
      tx.textContent = truthLabel + ' ' + (+truth.toPrecision(5));
      gMark.appendChild(tx);
    }
    if (outside) {
      const tx = svgEl('text', {x: W - PADR, y: PADT + 2, 'text-anchor': 'end', class: 'mk'});
      tx.textContent = outside + ' outside the plotted range'; gMark.appendChild(tx);
    }
  };
}

/* ---------------------------------------------------------------------------
   diagram() — a schematic figure, deliberately not a plot.

   panel() draws measurements. It hangs units on both axes, formats tick labels
   so they state their own positions, and marks points that carry values, and
   every one of those is right for a curve that came out of an instrument.

   Some figures argue about shape instead. "Here are two samples, and here are
   three different curves that pass through both of them" has nothing to read
   off an axis, because nothing here was measured and the vertical scale means
   only 'more' and 'less'. Putting that through panel() would print tick values
   on a picture that has none and invite a reader to measure a drawing.

   So a diagram carries axis lines without tick values, sits at about a third of
   the text column, and tiles: three in a row inside one <figure> is the shape
   these were built for. Styles key off svg.cgs, set here, so a diagram is
   styled wherever it appears.

   diagram(parent, {
     w, h,                        // viewBox, in its own units
     xRange, yRange,              // data coordinates mapped onto it
     title,                       // small heading inside the frame
     curves:  [{x, y, cls}],      // cls: trace (default) | alt | ghost
     points:  [{x, y, cls, r}],   // the samples, drawn as dots
     areas:   [{pts, cls}],       // a filled region: the panel, the sliver it misses
     drops:   [{x, y}],           // dashed line from a point down to the axis
     leads:   [{from: [x,y], to: [x,y], cls}],  // leader from a label to what it names
     notes:   [{x, y, text, dx, dy, anchor, cls}],   // or tex: 'f(x_{i+1})' in place of text
     axes,                        // false to suppress the L-shaped rule
     zero                         // draw a zero line, when the range spans it
   })
--------------------------------------------------------------------------- */
function diagram(parent, spec) {
  const {w = 300, h = 172, xRange, yRange, title = '', axes = true} = spec;
  const PADL = 10, PADR = 10, PADT = title ? 24 : 10, PADB = 16;
  const svg = svgEl('svg', {viewBox: `0 0 ${w} ${h}`, class: 'cgs', role: 'img'});
  if (spec.alt) svg.setAttribute('aria-label', spec.alt);
  parent.appendChild(svg);

  const [x0, x1] = xRange, [y0, y1] = yRange;
  const X = v => PADL + (v - x0) / (x1 - x0) * (w - PADL - PADR);
  const Y = v => h - PADB - (v - y0) / (y1 - y0) * (h - PADT - PADB);

  if (title) {
    const t = svgEl('text', {x: PADL, y: 13, class: 'cgs-title'});
    t.textContent = title;
    svg.appendChild(t);
  }
  if (axes) {
    const ax = svgEl('path', {class: 'axis', d:
      `M${PADL} ${PADT} L${PADL} ${h - PADB} L${w - PADR} ${h - PADB}`});
    svg.appendChild(ax);
  }
  /* a zero line, for the panels whose curves go negative. Without it "below
     zero" is a claim in the caption and nothing on the drawing. */
  if (spec.zero && y0 < 0 && y1 > 0)
    svg.appendChild(svgEl('line', {class: 'zeroline', x1: PADL, x2: w - PADR,
                                   y1: Y(0), y2: Y(0)}));
  for (const a of spec.areas || []) {
    let d = '';
    for (const q of a.pts) d += (d ? 'L' : 'M') + X(q.x).toFixed(2) + ' ' + Y(q.y).toFixed(2);
    svg.appendChild(svgEl('path', {class: a.cls || 'fill', d: d + 'Z'}));
  }
  for (const d of spec.drops || []) {
    const l = svgEl('line', {class: 'cast', x1: X(d.x), y1: Y(d.y),
                             x2: X(d.x), y2: h - PADB});
    svg.appendChild(l);
  }
  /* a lead with over: true is drawn after the curves, so a mark that lies along
     a curve (a tangent) sits on top of it and is not hidden by it */
  const lead = l => svg.appendChild(svgEl('line', {class: l.cls || 'lead',
    x1: X(l.from[0]), y1: Y(l.from[1]), x2: X(l.to[0]), y2: Y(l.to[1])}));
  for (const l of spec.leads || []) if (!l.over) lead(l);
  for (const c of spec.curves || []) {
    let d = '';
    for (let i = 0; i < c.x.length; i++)
      d += (i ? 'L' : 'M') + X(c.x[i]).toFixed(2) + ' ' + Y(c.y[i]).toFixed(2);
    svg.appendChild(svgEl('path', {class: c.cls || 'trace', d}));
  }
  for (const l of spec.leads || []) if (l.over) lead(l);
  for (const p of spec.points || [])
    svg.appendChild(svgEl('circle', {class: p.cls || 'dot', cx: X(p.x),
                                     cy: Y(p.y), r: p.r || 3.6}));
  for (const n of spec.notes || []) {
    if (n.tex !== undefined) {
      /* one <text> per line, so a subscript's shift cannot leak into the next */
      String(n.tex).split('\n').forEach((line, i) => {
        const t = svgEl('text', {x: X(n.x) + (n.dx || 0), y: Y(n.y) + (n.dy || 0) + i * 13.5,
                                 class: 'mk tex ' + (n.cls || '')});
        if (n.anchor) t.setAttribute('text-anchor', n.anchor);
        texInto(t, line);
        svg.appendChild(t);
      });
      continue;
    }
    const t = svgEl('text', {x: X(n.x) + (n.dx || 0), y: Y(n.y) + (n.dy || 0),
                             class: 'mk ' + (n.cls || '')});
    if (n.anchor) t.setAttribute('text-anchor', n.anchor);
    /* a note may be two short lines; the second is a tspan on the same anchor */
    String(n.text).split('\n').forEach((line, i) => {
      const s = svgEl('tspan', {x: X(n.x) + (n.dx || 0)});
      if (i) s.setAttribute('dy', '1.15em');
      s.textContent = line;
      t.appendChild(s);
    });
    svg.appendChild(t);
  }
  return svg;
}

/* texInto: set a short piece of math into an SVG <text> in KaTeX's own fonts,
   so a label on a figure matches the same symbol typeset beside it.

   It is not TeX. It knows exactly what a figure label needs: letters are
   italic (KaTeX_Math), digits, brackets and operators are upright (KaTeX_Main),
   '-' is a true minus, and _x or _{...} is a subscript, set smaller and
   dropped. The drop is done with dy on the subscript and undone on whatever
   follows, because baseline-shift is not honored by every browser. */
function texInto(t, src) {
  const SUB = 0.72, DROP = 0.22;            /* subscript size, and its drop in ems */
  let pending = 0;                          /* rise owed after a subscript, in ems */
  const put = (s, cls, sub) => {
    const ts = svgEl('tspan', {class: cls + (sub ? ' sub' : '')});
    ts.textContent = s;
    if (sub && !pending) { ts.setAttribute('dy', (DROP / SUB).toFixed(3) + 'em'); pending = DROP; }
    else if (!sub && pending) { ts.setAttribute('dy', (-pending).toFixed(3) + 'em'); pending = 0; }
    t.appendChild(ts);
  };
  const run = (s, sub) => {
    for (const m of s.matchAll(/[A-Za-z]+|[^A-Za-z]+/g)) {
      const piece = m[0].replace(/-/g, '\u2212');
      put(piece, /[A-Za-z]/.test(piece) ? 'mi' : 'mn', sub);
    }
  };
  let i = 0;
  while (i < src.length) {
    const u = src.indexOf('_', i);
    if (u < 0) { run(src.slice(i), false); break; }
    if (u > i) run(src.slice(i, u), false);
    let body, next;
    if (src[u + 1] === '{') { const c = src.indexOf('}', u); body = src.slice(u + 2, c); next = c + 1; }
    else { body = src[u + 1]; next = u + 2; }
    run(body, true);
    i = next;
  }
}

/* A row of diagrams inside one <figure>, so small multiples share a caption and
   a frame. Returns the host elements, in order, for diagram() to draw into. */
function diagramRow(figBody, n) {
  const row = document.createElement('div');
  row.className = 'figrow';
  const cells = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'figcell';
    row.appendChild(c);
    cells.push(c);
  }
  figBody.appendChild(row);
  return cells;
}

/* ---------------------------------------------------------------------------
   makeDemo / mountDemo — the declarative path.

   Most demos are: a few controls, one or more stacked panels, a row of
   readouts. Those are written as a spec and mounted with mountDemo(). A page
   whose demo needs something the spec cannot express defines its own CgDemo
   class instead; both kinds coexist because this file only defines functions.

   spec = {
     setting, caption,
     controls: [{key, label, min, max, step, value, unit, dp}],
     segments: [{key, label, value, options: [{value, label}]}],
     buttons:  [{key, label}],           // compute() sees state.fired === key
     panels:   [{label, unit, xLabel, xUnit, xScale, height, xAxis, yClamp}],
     readouts: [{key, label}],
     init:     state => {...},           // once, before the first compute
     compute:  state => ({
                 panels: [{x, y, ghost, opts}],   // one per declared panel
                 readouts: {key: 'text'}
               })
   }
--------------------------------------------------------------------------- */
function makeDemo(host, spec) {
  const root = document.createElement('div');
  root.className = 'cgd';
  const ctl = [], seg = [], btn = [];
  for (const c of spec.controls || [])
    ctl.push(`<label>${c.label}
      <input type="range" data-c="${c.key}" min="${c.min}" max="${c.max}"
             step="${c.step ?? 'any'}" value="${c.value}">
      <span class="cgd-val" data-v="${c.key}"></span></label>`);
  for (const s of spec.segments || [])
    seg.push(`<label>${s.label} <span class="cgd-seg" data-s="${s.key}">` +
      s.options.map(o => `<button type="button" data-o="${o.value}"` +
        `${o.value === s.value ? ' aria-pressed="true"' : ''}>${o.label}</button>`).join('') +
      `</span></label>`);
  if ((spec.buttons || []).length)
    btn.push(`<span class="cgd-seg">` + spec.buttons.map(b =>
      `<button type="button" data-b="${b.key}">${b.label}</button>`).join('') + `</span>`);

  root.innerHTML =
    (spec.setting ? `<div class="cgd-setting">${spec.setting}</div>` : '') +
    `<div class="cgd-plots"></div>` +
    (ctl.length + seg.length + btn.length
      ? `<div class="cgd-controls">${ctl.join('')}${seg.join('')}${btn.join('')}</div>` : '') +
    ((spec.readouts || []).length
      ? `<div class="cgd-readouts">` + spec.readouts.map(r =>
          `<div><span class="k">${r.label}</span><span class="v" data-r="${r.key}"></span></div>`
        ).join('') + `</div>` : '') +
    (spec.caption ? `<div class="cgd-caption">${spec.caption}</div>` : '') +
    sourceBlock(spec.source);
  host.appendChild(root);

  const plotBox = root.querySelector('.cgd-plots');
  /* a panel declaring hist:true is a distribution, not a trace; the two
     primitives take different render arguments, handled below */
  const panels = (spec.panels || []).map(p =>
    p.hist ? histogram(plotBox, p) : panel(plotBox, p));
  const state = {};
  for (const c of spec.controls || []) state[c.key] = +c.value;
  for (const s of spec.segments || []) state[s.key] = s.value;
  state.fired = null;
  state.root = root;
  if (spec.init) spec.init(state);

  const render = () => {
    /* call with the spec as `this`, so a demo that loaded data in data()
       can reach it as this.<name> rather than through a module global */
    const out = spec.compute.call(spec, state) || {};
    (out.panels || []).forEach((pd, i) => {
      if (!panels[i] || !pd) return;
      if (spec.panels[i].hist) { panels[i](pd.values || [], pd.opts || {}); return; }
      panels[i](pd.x, pd.y, pd.ghost || null,
                pd.range || [pd.x[0], pd.x[pd.x.length - 1]], pd.opts || {});
    });
    for (const c of spec.controls || []) {
      const el = root.querySelector(`[data-v="${c.key}"]`);
      if (el) el.textContent = (c.fmt ? c.fmt(state[c.key])
        : state[c.key].toFixed(c.dp ?? 2)) + (c.unit ? ' ' + c.unit : '');
    }
    for (const k in (out.readouts || {})) {
      const el = root.querySelector(`[data-r="${k}"]`);
      if (el) el.textContent = out.readouts[k];
    }
    state.fired = null;
  };

  root.querySelectorAll('input[type=range]').forEach(el =>
    el.addEventListener('input', () => { state[el.dataset.c] = parseFloat(el.value); render(); }));
  root.querySelectorAll('[data-s]').forEach(box =>
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.o;
      state[box.dataset.s] = isNaN(+v) || v === '' ? v : +v;
      [...box.children].forEach(x => x.setAttribute('aria-pressed', x === b));
      render();
    }));
  root.querySelectorAll('[data-b]').forEach(b =>
    b.addEventListener('click', () => { state.fired = b.dataset.b; render(); }));

  render();
  return {state, render, root};
}

/* Mount one spec, or a map of specs keyed by the element's `case` attribute.
   A `set` attribute ("key=value;key=value") overrides the starting value of the
   named controls or segments, so one case can open at a different setting on
   each slide that shows it. */
function mountDemo(specs) {
  class CgDemo extends HTMLElement {
    async connectedCallback() {
      if (this._done) return; this._done = true;
      let spec = typeof specs === 'function' ? specs : specs;
      if (spec && !spec.compute) {                 // a map of cases
        const key = this.getAttribute('case');
        spec = spec[key];
        if (!spec) { this.textContent = 'unknown demo case: ' + key; return; }
      }
      if (spec.data) spec = {...spec, ...(await spec.data())};
      const set = this.getAttribute('set');
      if (set) {
        const o = {};
        for (const kv of set.split(';')) {
          const [k, v] = kv.split('=').map(z => z.trim());
          if (k) o[k] = v;
        }
        spec = {...spec,
          controls: (spec.controls || []).map(c =>
            c.key in o ? {...c, value: +o[c.key]} : c),
          segments: (spec.segments || []).map(g =>
            g.key in o ? {...g, value: o[g.key]} : g)};
      }
      makeDemo(this, spec);
    }
  }
  customElements.define('cg-demo', CgDemo);
}

/* linspace, and a small seeded RNG so demo pages reproduce their own figures */
function linspace(a, b, n) {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = a + (b - a) * i / (n - 1);
  return x;
}
function sample(f, a, b, n) {
  const x = linspace(a, b, n), y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = f(x[i]);
  return {x, y};
}
function mulberry(seed) {           // deterministic uniform generator
  let t = seed >>> 0;
  return () => { t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
function gaussFrom(rand) {          // Box-Muller on a given uniform source
  let spare = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0; while (u === 0) u = rand();
    const r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * rand();
    spare = r * Math.sin(th);
    return r * Math.cos(th);
  };
}

/* ---------------------------------------------------------------------------
   SAE J211 CFC filter. Two-pole Butterworth with the coefficients the standard
   specifies; applied once it is causal and lags, applied forward then backward
   it is phaseless. Weeks 4 and beyond use both, and the difference between them
   is the subject of one of the pages.
--------------------------------------------------------------------------- */
function cfcOnce(x, cfc, T) {
  const wd = 2 * Math.PI * cfc * 2.0775;
  const wa = Math.tan(wd * T / 2);
  const den = 1 + Math.SQRT2 * wa + wa * wa;
  const a0 = wa * wa / den, a1 = 2 * a0, a2 = a0;
  const b1 = -2 * (wa * wa - 1) / den;
  const b2 = (-1 + Math.SQRT2 * wa - wa * wa) / den;
  const y = new Float64Array(x.length);
  y[0] = x[0]; y[1] = x[1];
  for (let i = 2; i < x.length; i++)
    y[i] = a0 * x[i] + a1 * x[i-1] + a2 * x[i-2] + b1 * y[i-1] + b2 * y[i-2];
  return y;
}
const reversed = x => { const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[x.length - 1 - i]; return y; };
function cfc(x, klass, T) { return reversed(cfcOnce(reversed(cfcOnce(x, klass, T)), klass, T)); }

/* central, forward and backward differences on a uniform grid */
function differentiate(y, dt, kind = 'central') {
  const n = y.length, d = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (kind === 'forward')  d[i] = i < n - 1 ? (y[i+1] - y[i]) / dt : (y[i] - y[i-1]) / dt;
    else if (kind === 'backward') d[i] = i > 0 ? (y[i] - y[i-1]) / dt : (y[i+1] - y[i]) / dt;
    else d[i] = (i > 0 && i < n - 1) ? (y[i+1] - y[i-1]) / (2 * dt)
              : (i === 0 ? (y[1] - y[0]) / dt : (y[n-1] - y[n-2]) / dt);
  }
  return d;
}

/* a centered moving average of odd width w */
function movingAverage(y, w) {
  const n = y.length, half = (w - 1) >> 1, out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let k = -half; k <= half; k++) {
      const j = i + k;
      if (j >= 0 && j < n) { s += y[j]; c++; }
    }
    out[i] = s / c;
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Time stepping. One system definition per page, stepped by any of the rules.
   state is a plain array; deriv(t, s) returns the array of rates.
--------------------------------------------------------------------------- */
const STEPPERS = {
  euler: (f, t, s, h) => {
    const k1 = f(t, s);
    return s.map((v, i) => v + h * k1[i]);
  },
  heun: (f, t, s, h) => {                     // explicit trapezoid, order 2
    const k1 = f(t, s);
    const p = s.map((v, i) => v + h * k1[i]);
    const k2 = f(t + h, p);
    return s.map((v, i) => v + h / 2 * (k1[i] + k2[i]));
  },
  rk4: (f, t, s, h) => {
    const k1 = f(t, s);
    const k2 = f(t + h / 2, s.map((v, i) => v + h / 2 * k1[i]));
    const k3 = f(t + h / 2, s.map((v, i) => v + h / 2 * k2[i]));
    const k4 = f(t + h, s.map((v, i) => v + h * k3[i]));
    return s.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  },
  symplectic: (f, t, s, h) => {               // for [x, v] systems only
    const a = f(t, s)[1];
    const v = s[1] + h * a;
    return [s[0] + h * v, v];
  }
};

/* Integrate to time T, returning every state visited. Bails out if the state
   stops being finite or grows past `bound`, and says so, because a run that
   diverged is a different outcome from one that finished. */
function stepTo(f, s0, h, T, method = 'rk4', bound = 1e8) {
  const step = STEPPERS[method];
  const n = Math.max(1, Math.round(T / h));
  const ts = [0], ss = [s0.slice()];
  let s = s0.slice(), t = 0;
  for (let k = 0; k < n; k++) {
    s = step(f, t, s, h);
    t += h;
    if (!s.every(isFinite) || s.some(v => Math.abs(v) > bound))
      return {ts, ss, t, diverged: true};
    ts.push(t); ss.push(s.slice());
  }
  return {ts, ss, t, diverged: false};
}
const column = (ss, i) => Float64Array.from(ss, s => s[i]);


/* ---------------------------------------------------------------------------
   Source attribution. Every demo says where its numbers came from, in one of
   three kinds:

     measured    — a real recording, named, with the channel and test
     constructed — values generated so that the truth is known exactly
     mixed       — a constructed signal carrying real recorded noise

   The distinction matters to a reader deciding how much to believe a figure, and
   it is invisible from the plot. spec.source is rendered into the demo; pages
   use the same markup inline with <div class="source">.
--------------------------------------------------------------------------- */
function sourceBlock(src) {
  if (!src) return '';
  const kind = src.kind || 'measured';
  const tag = {measured: 'Measured', constructed: 'Constructed', mixed: 'Mixed'}[kind] || kind;
  return `<div class="source ${kind}"><span class="tag">${tag}</span><span>${src.text}</span></div>`;
}


/* ---------------------------------------------------------------------------
   REAL instrument noise, embedded so that any demo can use it synchronously.

   These are 625 consecutive samples from the pre-impact window of channel 093
   (left rear seat crossmember, longitudinal) of NHTSA test 10642, with their
   mean removed. During that window the vehicle is on the tow line at constant
   speed, so the true acceleration is zero and every value here is the
   instrument: its electrical noise, its mounting, the vehicle's own vibration.

   It is not Gaussian. Its excess kurtosis is +0.78, so it has heavier tails than
   the normal distribution every formula in weeks 3 and 9 assumes. That is the
   reason to prefer it to a generator.

   realNoise(n, sd) returns n values scaled to the requested standard deviation,
   cycling through the sequence if more than 625 are asked for.
--------------------------------------------------------------------------- */
const REAL_NOISE = [-0.132, -1.336, -0.734, 0.47, 1.072, -0.132, -0.132, 0.47, 0.47, 1.072, 0.47, 1.072, -0.132, 0.47, 0.47, -0.132, 1.072, -0.734, -0.132, 0.47, 0.47, 0.47, -0.734, -0.734, -1.336, -0.132, 0.47, 0.47, -0.132, -0.132, -0.132, 1.072, -0.132, -0.132, 0.47, 1.072, 0.47, 0.47, 0.47, 1.072, -0.132, -0.132, 0.47, 0.47, 0.47, 1.072, 1.072, 1.072, -0.132, -0.734, 0.47, -0.132, -0.132, 0.47, 0.47, 0.47, 1.674, 0.47, 1.072, 1.072, 1.674, 1.674, 1.072, 1.674, 1.674, 0.47, 1.072, 0.47, 0.47, -0.132, -0.132, -1.336, -0.132, -1.336, -1.336, -0.734, -0.132, 1.072, 1.674, 1.674, 1.674, 1.674, -0.132, -0.734, -1.336, -0.734, 2.879, 1.072, -0.132, -0.734, -0.132, -0.132, 1.072, 0.47, 0.47, 1.072, -1.938, -1.336, -0.132, -0.132, 0.47, 0.47, 0.47, 0.47, 0.47, 1.072, 1.072, 1.072, -0.132, 0.47, -1.336, -0.132, -0.132, 0.47, -0.132, -0.132, 0.47, -0.734, -0.734, -0.734, -0.734, -0.132, -0.734, -0.132, 0.47, 0.47, 0.47, 0.47, 1.072, 0.47, 0.47, 1.674, 1.072, 1.674, -1.938, -0.734, 1.072, 1.674, 1.072, 1.072, -0.734, 0.47, 1.072, 1.072, 0.47, -0.132, 1.072, 0.47, -0.132, 0.47, 0.47, 0.47, 1.072, 0.47, 0.47, 1.072, 1.072, 0.47, 0.47, 0.47, 0.47, -1.336, 0.47, -0.132, -1.336, -0.734, -1.938, -0.734, -1.336, -1.336, -0.734, -0.734, -1.336, -1.336, 0.47, -0.132, 1.072, 0.47, 1.072, 1.072, 0.47, 0.47, 0.47, -1.336, -2.541, -1.938, -1.336, -1.938, -1.336, -1.336, -0.734, -1.336, -0.734, -1.336, -0.734, -0.734, -1.336, 0.47, -0.132, -0.132, 1.072, 1.674, 1.674, 1.674, 2.879, 2.879, 2.879, 2.879, 1.674, 1.674, 1.072, -0.132, -0.132, -0.734, 1.072, -0.734, -0.132, -1.938, -3.143, -4.347, -4.949, -4.347, -4.949, -5.551, -3.143, -1.938, 1.072, 1.674, 2.879, 1.674, -0.132, -0.734, -1.336, -0.734, 1.674, 3.481, 2.277, 2.879, 3.481, 4.083, 1.072, 1.072, -0.734, -2.541, -3.745, -4.347, -4.347, -3.143, -2.541, 0.47, 2.277, 2.277, 2.277, 1.674, 1.674, 2.879, 1.674, 0.47, -0.132, -1.938, -1.938, -1.336, -0.734, 1.072, 0.47, 1.072, 0.47, -0.734, -1.938, -3.143, -4.949, -4.347, -3.745, -1.938, -0.132, 2.879, 5.287, 4.685, 4.685, 3.481, 3.481, 0.47, -0.734, -2.541, -2.541, -3.143, -3.745, -4.347, -1.938, 1.072, 1.674, 2.277, 0.47, -1.938, -4.347, -4.347, -4.949, -2.541, 0.47, 5.89, 7.696, 7.696, 5.89, 2.277, -1.938, -2.541, -2.541, 0.47, 0.47, -0.132, 1.674, -0.132, -3.143, -5.551, -1.938, -0.132, -0.734, 1.072, 1.674, -0.734, -1.336, -4.949, -3.745, -2.541, 1.674, 4.685, 4.083, 1.072, -1.938, -1.938, -0.734, 0.47, 1.072, -0.734, -3.143, -1.938, 0.47, 2.277, 1.674, 1.072, 1.072, 1.674, 0.47, -0.734, -1.336, 1.674, 2.277, 3.481, 3.481, 1.674, -1.336, -1.336, -1.336, -1.938, -1.336, -0.734, -1.938, -3.143, -4.949, -3.745, -1.938, 2.277, 5.287, 6.492, 1.072, -3.745, -6.756, -6.756, -3.745, -0.132, 1.674, 2.277, -0.132, -0.132, -0.734, 0.47, -1.336, -2.541, -3.143, -3.143, -2.541, -1.938, -0.734, -0.132, -0.132, -0.734, -2.541, -3.745, -0.734, 1.674, 2.879, 0.47, -3.143, -4.347, -1.336, 2.277, 5.287, 5.287, 4.685, 2.277, 0.47, -0.734, -0.132, 2.277, 2.879, 2.277, 2.879, -0.734, -4.347, -4.949, -3.143, 1.674, 7.094, 7.696, 5.89, 1.072, -3.143, -6.153, -3.143, -0.132, 4.685, 3.481, 1.072, -0.132, -1.336, -1.938, -3.143, -2.541, -4.949, -4.347, -4.347, -3.745, -2.541, -3.143, -1.938, -0.734, 0.47, -0.734, -1.938, -4.347, -2.541, 1.674, 2.879, 4.685, 5.287, 2.879, 1.674, 2.277, 0.47, -0.132, -0.132, -0.132, -0.132, 1.072, -0.132, 1.674, 0.47, 0.47, 1.072, 3.481, 2.277, 1.674, 0.47, -0.734, -0.132, -1.938, -1.938, -1.336, 0.47, 1.072, 1.072, -0.132, 1.072, 2.879, 3.481, 2.879, 3.481, -1.336, -1.938, -1.336, -1.336, -3.745, -4.347, -4.347, -3.143, -1.938, -0.734, 1.674, 2.879, 4.083, 3.481, 1.072, -1.938, -4.347, -2.541, 0.47, 3.481, 4.083, 2.879, 1.072, -0.132, 1.674, 2.277, 5.89, 3.481, -0.734, -3.745, -6.756, -4.949, -1.938, -0.132, 0.47, -1.336, -1.336, 0.47, 2.277, 2.277, 4.685, 4.685, 2.879, 0.47, -1.938, -2.541, -2.541, -0.734, 1.072, 4.685, 4.685, 2.277, 0.47, -1.938, -3.143, -4.949, -6.153, -7.358, -7.358, -6.153, -0.132, 2.879, 4.685, 4.685, 2.277, 0.47, -0.132, -0.734, 0.47, 1.674, 2.277, 1.674, -0.734, -2.541, -3.143, -2.541, -0.734, 0.47, 1.674, 2.277, 2.277, 1.674, -0.132, -0.734, -0.734, -0.734, 1.674, 4.685, 4.083, 4.083, 2.277, 0.47, 0.47, 2.277, 2.879, 3.481, 3.481, 1.674, -1.938, -5.551, -4.949, -4.347, -0.734, 0.47, -0.734, -1.938, -2.541, -1.938, 0.47, 1.072, -0.132, -0.132, -0.132, -0.132, 0.47, 1.674, -0.132, -1.938, -2.541, -2.541, -1.938, -1.336, -1.336, -0.734, 0.47, 0.47, -0.132, -1.336, -0.734, 0.47, 1.072, 1.072, -0.734, -1.336, -0.734, 1.072, 1.674, 1.072, 1.072, -0.734, 1.072, 4.083, 5.287, 2.277, 0.47, -3.143, -4.347, -3.143];
const REAL_NOISE_SD = 2.379064;   /* m/s^2, as recorded */
/* Consecutive samples of this record are NOT independent: the laboratory's
   2000 Hz anti-alias filter, at a 12500 Hz sample rate, leaves a lag-1
   correlation of +0.78. It falls to zero by lag 3.

   realNoise()    strides by 3, so the values behave like independent draws —
                  which is what every fitting and error-propagation formula in
                  this course assumes about its inputs.
   realNoiseRaw() returns consecutive samples, correlation intact, for the pages
                  where the correlation is the subject. */
const NOISE_STRIDE = 3;

/* Both return exactly the requested standard deviation. A short slice of a real
   sequence does not have the sd of the whole sequence — for n = 24 it can be
   several times off — so the slice is rescaled to what the caller asked for.
   The values, their shape and their correlation are the recording's; only the
   overall amplitude is set by the caller. */
function scaleTo(out, sd) {
  let m = 0;
  for (let i = 0; i < out.length; i++) m += out[i];
  m /= out.length;
  let v = 0;
  for (let i = 0; i < out.length; i++) v += (out[i] - m) * (out[i] - m);
  const s = Math.sqrt(v / Math.max(1, out.length - 1));
  const k = s > 0 ? sd / s : 0;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - m) * k;
  return out;
}
function realNoise(n, sd = 1, offset = 0) {
  const out = new Float64Array(n);
  const o = ((offset % REAL_NOISE.length) + REAL_NOISE.length) % REAL_NOISE.length;
  for (let i = 0; i < n; i++)
    out[i] = REAL_NOISE[(o + i * NOISE_STRIDE) % REAL_NOISE.length];
  return scaleTo(out, sd);
}
function realNoiseRaw(n, sd = 1) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = REAL_NOISE[i % REAL_NOISE.length];
  return scaleTo(out, sd);
}

/* Two demos for the two problems on this page.
   predict: fit the first n free-flight frames of a real tracked shot (a parabola
   in height, its curvature fixed by g or fitted, and lines in x and y), evaluate the fitted formula where the rim is, and
   call the shot in, rim or out, beside what the frames say after the fact.
   slope: the runs of the Slope Stability Lab's example class on one slope, with a
   damage threshold d* the reader sets. There is no formula, so the panel shows
   only the runs, and f = moved - d* is known only where a run was made. */

const RIM = 3.048;

function polyfit(xs, ys, deg) {
  const n = deg + 1;
  const A = Array.from({length: n}, (_, i) => {
    const row = new Float64Array(n + 1);
    for (let j = 0; j < n; j++) { let q = 0; for (let k = 0; k < xs.length; k++) q += Math.pow(xs[k], i + j); row[j] = q; }
    let q = 0; for (let k = 0; k < xs.length; k++) q += ys[k] * Math.pow(xs[k], i);
    row[n] = q; return row;
  });
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    [A[k], A[p]] = [A[p], A[k]];
    if (Math.abs(A[k][k]) < 1e-300) return null;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = A[i][k] / A[k][k];
      for (let c = k; c <= n; c++) A[i][c] -= f * A[k][c];
    }
  }
  return Array.from({length: n}, (_, i) => A[i][n] / A[i][i]);
}

/* in, rim or out, from the distance between the ball's center and the hoop's */
const call = (d, a) => d <= a.inR ? 'in' : d >= a.outR ? 'out, clear of the rim' : 'touches the rim, so the tracking cannot decide';

mountDemo({
  predict: {
    async data() {
      const d = await (await fetch('data/arcs.json')).json();
      const a = d.arcs.find(x => x.role === 'clean');
      /* frame 18, the median of the five release rules on the page, which is
         2 frames before the release in the tracking labels (a.rel) */
      const k = 18, nf = a.rel + a.key.nf - k;
      const T = a.t.map(v => v - a.t[k]);
      /* after the fact: the frames either side of the rim on the way down */
      let after = null;
      for (let i = k + 1; i < a.z.length; i++) {
        if (a.z[i - 1] >= RIM && a.z[i] < RIM) {
          const s = (RIM - a.z[i - 1]) / (a.z[i] - a.z[i - 1]);
          const x = a.x[i - 1] + s * (a.x[i] - a.x[i - 1]), y = a.y[i - 1] + s * (a.y[i] - a.y[i - 1]);
          after = {t: T[i - 1] + s * (T[i] - T[i - 1]), d: Math.hypot(x - a.hoop_x, y - a.hoop_y)};
          break;
        }
      }
      return {a, k, nf, T, after, inR: d.in_radius_m, outR: d.out_radius_m};
    },
    setting: 'The height of a real tracked three-pointer. The parabola is fitted to the first ' +
             '<em>n</em> frames after release, as it could be while the ball is still in the air, ' +
             'and evaluated where the frames have not reached yet.',
    source: {kind: 'measured', text: 'SportVU optical tracking, 2015&ndash;16 NBA season, 25&nbsp;Hz. Hoop radii: the ball drops through clean within 0.109&nbsp;m of the hoop&rsquo;s center and clears the rim beyond 0.348&nbsp;m.'},
    caption: 'Filled dots are the frames the fit uses. The dashed line is every tracked frame, ' +
             'including the ones the fit has not seen and the ball bouncing back after it reaches ' +
             'the rim. Rings mark where the fitted formula crosses 3.048&nbsp;m, both times.',
    controls: [{key: 'n', label: 'frames fitted', min: 6, max: 26, step: 1, value: 8, dp: 0, unit: ''}],
    segments: [{key: 'fit', label: 'curvature', value: 'g', options: [
      {value: 'g', label: 'g fixed at 9.81'}, {value: 'free', label: 'fitted'}]}],
    panels: [{label: 'height', unit: 'm', height: 260, xAxis: true,
              xLabel: 'time since release', xUnit: 's', xScale: 1}],
    readouts: [
      {key: 'upto',  label: 'last frame fitted'},
      {key: 'g',     label: 'gravity in the fit'},
      {key: 'tc',    label: 'predicted crossing'},
      {key: 'dist',  label: 'from the hoop center'},
      {key: 'call',  label: 'the formula says'},
      {key: 'after', label: 'the frames say, after the fact'}
    ],
    compute(s) {
      const {a, k, T} = this, n = Math.round(s.n);
      const ft = [], fz = [], fx = [], fy = [];
      for (let i = k; i < k + n; i++) { ft.push(T[i]); fz.push(a.z[i]); fx.push(a.x[i]); fy.push(a.y[i]); }
      let c0, c1, c2 = -4.905;
      if (s.fit === 'free') [c0, c1, c2] = polyfit(ft, fz, 2);
      else [c0, c1] = polyfit(ft, fz.map((v, j) => v - c2 * ft[j] * ft[j]), 1);
      const [x0, x1] = polyfit(ft, fx, 1), [y0, y1] = polyfit(ft, fy, 1);
      const disc = c1 * c1 - 4 * c2 * (c0 - RIM);
      const roots = disc < 0 ? [] : [(-c1 + Math.sqrt(disc)) / (2 * c2), (-c1 - Math.sqrt(disc)) / (2 * c2)].sort((p, q) => p - q);
      const tc = roots.length ? roots[roots.length - 1] : NaN;
      const d = Math.hypot(x0 + x1 * tc - a.hoop_x, y0 + y1 * tc - a.hoop_y);
      const TS = linspace(-0.4, 1.6, 400);
      const tr = T.filter(t => t >= -0.4 && t <= 1.6), zr = a.z.filter((_, i) => T[i] >= -0.4 && T[i] <= 1.6);
      return {
        panels: [{x: TS, y: Float64Array.from(TS, t => c0 + c1 * t + c2 * t * t), range: [-0.4, 1.6],
          opts: {
            label: 'height, the fitted parabola and every tracked frame',
            yRange: [0, 5.4],
            pred: () => RIM,
            bands: [{x0: -0.4, x1: 0}],
            curves: [{x: tr, y: zr, cls: 'ghost'}],
            rings: roots.map(r => ({x: r, y: RIM, text: r.toFixed(3) + ' s'})),
            marks: ft.map((t, i) => ({t, y: fz[i]}))
          }}],
        readouts: {
          upto: ft[ft.length - 1].toFixed(2) + ' s (' + n + ' frames)',
          g: (-2 * c2).toFixed(2) + ' m/s²' + (s.fit === 'free' ? '' : ', fixed'),
          tc: isFinite(tc) ? tc.toFixed(3) + ' s' : 'none',
          dist: isFinite(tc) ? d.toFixed(3) + ' m' : '',
          call: isFinite(tc) ? call(d, this) : '',
          after: this.after.t.toFixed(3) + ' s, ' + this.after.d.toFixed(3) + ' m, touches the rim (missed)'
        }
      };
    }
  },

  slope: {
    async data() {
      const d = await (await fetch('data/slope-example-runs.json')).json();
      return {runs: d.runs};
    },
    setting: 'A rock slope in the Slope Stability Lab&rsquo;s example class, shaken by one ' +
             'recorded earthquake scaled to a peak ground acceleration (PGA). Each dot is one run of ' +
             'the simulation, a minute or two on a GPU. The condition is moved(PGA)&nbsp;=&nbsp;' +
             '<em>d</em>*, and the root problem is <em>f</em>&nbsp;=&nbsp;moved&nbsp;&minus;&nbsp;<em>d</em>*.',
    source: {kind: 'measured', text: 'Slope Stability Lab example class (the test round), 78 runs on five slopes, fetched 2026-11-02. The lab leaves the definition of damage to each student. <em>d</em>* here is a slider because it is a choice.'},
    caption: 'There is no curve, because there is no formula to draw one from. Between two dots ' +
             'nothing is known until another run is made. The sign of <em>f</em> at each run is ' +
             'whether its dot sits above or below the threshold line.',
    controls: [{key: 'd', label: 'damage threshold d*', min: 1, max: 50, step: 'any', value: 5, dp: 1, unit: 'cm'}],
    segments: [
      {key: 'mpa', label: 'bond strength', value: '7.4', options: [
        {value: '1', label: '1.0'}, {value: '2.6', label: '2.6'}, {value: '4.2', label: '4.2'},
        {value: '5.8', label: '5.8'}, {value: '7.4', label: '7.4 MPa'}]},
      {key: 'view', label: 'view', value: 'all', options: [
        {value: 'all', label: 'every run'}, {value: 'close', label: 'around the first sign change'}]}],
    panels: [{label: 'slope moved', unit: 'cm', height: 260, xAxis: true, yLog: true,
              xLabel: 'PGA', xUnit: 'g', xScale: 1}],
    readouts: [
      {key: 'runs',  label: 'runs on this slope'},
      {key: 'cross', label: 'f changes sign between'},
      {key: 'count', label: 'sign changes'}
    ],
    compute(s) {
      const runs = this.runs.filter(r => r.strength_mpa === +s.mpa).sort((p, q) => p.pga_g - q.pga_g);
      const x = runs.map(r => r.pga_g), y = runs.map(r => r.slope_moved_cm);
      /* sign changes between neighboring settings, repeats averaged first */
      const at = new Map();
      for (const r of runs) { if (!at.has(r.pga_g)) at.set(r.pga_g, []); at.get(r.pga_g).push(r.slope_moved_cm); }
      const pts = [...at].map(([g, v]) => [g, v.reduce((p, q) => p + q, 0) / v.length]);
      const flips = [];
      for (let i = 1; i < pts.length; i++)
        if ((pts[i - 1][1] - s.d) * (pts[i][1] - s.d) < 0) flips.push([pts[i - 1], pts[i]]);
      const lo = 0, hi = 4.2;
      let range = [lo, hi];
      if (s.view === 'close' && flips.length) {
        const [p, q] = flips[0], w = Math.max(0.06, (q[0] - p[0]) * 3);
        range = [p[0] - w, q[0] + w];
      }
      const g = v => String(+v.toFixed(5)) + ' g';
      return {
        panels: [{x, y, range, opts: {
          label: 'slope moved, one dot a run', dots: true, dotR: 4, yRange: [0.1, 1000],
          pred: () => s.d,
          marks: flips.length ? [
            {t: flips[0][0][0], y: flips[0][0][1], ring: true},
            {t: flips[0][1][0], y: flips[0][1][1], ring: true}] : []
        }}],
        readouts: {
          runs: String(runs.length),
          cross: flips.length ? g(flips[0][0][0]) + ' (' + flips[0][0][1].toFixed(2) + ' cm) and ' +
                 g(flips[0][1][0]) + ' (' + flips[0][1][1].toFixed(1) + ' cm)' : 'none among these runs',
          count: String(flips.length)
        }
      };
    }
  }
});

/* Whiteboards: math worked out on a slide as if written by hand (the
   handwriting, the wipes, circles, strikes and moves), with presenter controls.
   Shared by every deck bundle; a deck's figures file registers its boards in
   CG_BOARDS by name, and any element with data-board="name" becomes one once
   the bundle has run. */
const CG_BOARDS = {};
/* A whiteboard is a list of beats. Each beat changes the board, with motion,
   or without it when `fast`, and both must end in the same state. Seeking
   resets the board and replays every beat before the target fast, so going
   back is always exact (the Player pattern from the TCSS 490 decks, cut down
   to the controls a presenter needs). A board plays from the start when its
   slide comes up and shows its finished state otherwise. Its HTML root has
   data-board="name"; every piece it moves has data-k. */
const WB_CSS = `
  .wbc{position:absolute; right:2vw; bottom:5.2vh; z-index:30; display:flex; align-items:center; gap:.3rem;
       font:600 .8rem/1 system-ui,sans-serif; color:#5A5550; background:rgba(255,255,255,.92);
       border:1px solid #e6e0d4; border-radius:999px; padding:.25rem .5rem}
  .wbc button{display:grid; place-items:center; width:1.9rem; height:1.9rem; border:0; border-radius:50%;
       background:transparent; color:#3f3b36; cursor:pointer; padding:0}
  .wbc button:hover{background:#f1ede4}
  .wbc button:focus-visible{outline:2px solid #5F7038; outline-offset:1px}
  .wbc button.pp{background:#5F7038; color:#fff}
  .wbc button.pp:hover{background:#4c5a2d}
  .wbc svg{width:.95rem; height:.95rem; fill:currentColor}
  .wbc .pp .ic-pause{display:none}
  .wbc.playing .pp .ic-play{display:none}
  .wbc.playing .pp .ic-pause{display:block}
  .wbc .cnt{min-width:3.6em; text-align:center; font-variant-numeric:tabular-nums}
  .wbc button.spd{width:auto; padding:0 .55rem; border-radius:999px; font:inherit; color:inherit}
  @media print{.wbc{display:none}}`;
const ICON = {
  first: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg class="ic-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg class="ic-pause" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
const WIPE = 'inset(-100% 100% -100% 0)', OPEN = 'inset(-100% -5% -100% 0)', GONE = 'inset(-100% -5% -100% 106%)';
const SPEEDS = [0.5, 0.75, 1, 1.5];

function whiteboard(root, def) {
  const sl = root.closest('.deck-slide'), E = {};
  root.querySelectorAll('[data-k]').forEach(e => { E[e.dataset.k] = e; });
  const rot = root.dataset.strike || '-24deg';
  let at = 0, playing = false, timer = 0, live = [], speed = 1;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the pieces a beat is made of */
  const ink = k => (E[k].classList.contains('it') && E[k].querySelector('.ink')) || E[k];
  const anim = (el, kf, ms, opt) => { const a = el.animate(kf, Object.assign({duration: ms, easing: 'cubic-bezier(.35,.1,.65,.9)'}, opt || {}));
    a.playbackRate = speed; live.push(a); return a; };
  const h = {
    E,
    hide(...ks) { ks.forEach(k => { E[k].style.visibility = 'hidden'; ink(k).style.clipPath = WIPE; }); },
    write(k, ms, fast) { E[k].style.visibility = ''; ink(k).style.clipPath = OPEN;
      if (!fast) anim(ink(k), [{clipPath: WIPE}, {clipPath: OPEN}], ms); },
    erase(k, fast) { const el = ink(k); el.style.clipPath = GONE;
      if (!fast) anim(el, [{clipPath: OPEN, opacity: 1}, {clipPath: GONE, opacity: 0}], 650, {easing: 'ease-in'}); },
    ring(k, fast) { E[k].style.setProperty('--a', '360deg');
      if (!fast) anim(E[k], [{'--a': '0deg'}, {'--a': '360deg'}], 750, {easing: 'ease-in-out'}); },
    unring(...ks) { ks.forEach(k => E[k].style.setProperty('--a', '0deg')); },
    /* a piece can set its own slant with data-rot (a wide group of terms wants
       a shallow stroke, a single letter a steep one); its CSS must match */
    strike(k, fast) { E[k].classList.add('on');
      const r = E[k].dataset.rot || rot;
      if (!fast) anim(E[k], [{transform: `rotate(${r}) scaleX(0)`}, {transform: `rotate(${r}) scaleX(1)`}],
                      420, {pseudoElement: '::after', easing: 'ease-out'}); },
    unstrike(...ks) { ks.forEach(k => E[k].classList.remove('on')); },
    /* a canceled piece fades and then closes up, so what survives slides
       together into the next line. It must be a box (inline-block or a flex
       item); data-fold="y" closes it vertically instead, as for the bottom of
       a fraction that cancels away, bar and all */
    collapse(k, fast) { const el = E[k], y = el.dataset.fold === 'y', r = el.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(el.parentElement).columnGap) || 0;
      const from = y ? {height: r.height + 'px', borderTopWidth: getComputedStyle(el).borderTopWidth}
                     : {width: r.width + 'px', marginRight: '0px'};
      const to = y ? {height: '0px', borderTopWidth: '0px'} : {width: '0px', marginRight: -gap + 'px'};
      Object.assign(el.style, to, {opacity: 0});
      if (!fast) anim(el, [Object.assign({opacity: 1}, from), Object.assign({opacity: 0, offset: .4}, from),
                           Object.assign({opacity: 0}, to)], 1300, {easing: 'ease-in-out'}); },
    uncollapse(...ks) { ks.forEach(k => ['width', 'height', 'marginRight', 'borderTopWidth', 'opacity']
      .forEach(p => { E[k].style[p] = ''; })); },
    /* ink changes color (a term added in blue joins the line in black) */
    tint(k, c, fast) { const was = getComputedStyle(E[k]).color; E[k].style.color = c;
      if (!fast) anim(E[k], [{color: was}, {color: c}], 900, {easing: 'ease-in-out'}); },
    untint(...ks) { ks.forEach(k => { E[k].style.color = ''; }); },
    /* pieces of one flex line change places ({key: order}); every piece in the
       line glides to its new spot, and the named ones pass under the others */
    reorder(o, fast) { const sibs = [...E[Object.keys(o)[0]].parentElement.children];
      const was = sibs.map(e => e.getBoundingClientRect());
      Object.entries(o).forEach(([k, v]) => { E[k].style.order = v; });
      if (fast) return;
      sibs.forEach((e, i) => { const now = e.getBoundingClientRect(), dx = was[i].left - now.left, dy = was[i].top - now.top;
        if (!dx && !dy) return;
        const dip = e.dataset.k in o ? parseFloat(getComputedStyle(e).fontSize) * 1.5 : 0;
        anim(e, [{transform: `translate(${dx}px,${dy}px)`}, {transform: `translate(${dx / 2}px,${dy / 2 + dip}px)`},
                 {transform: 'none'}], 1100, {easing: 'ease-in-out'}); }); },
    unorder(...ks) { ks.forEach(k => { E[k].style.order = ''; }); },
    put(k, p) { E[k].style.left = p[0] + 'px'; E[k].style.top = p[1] + 'px'; },
    move(k, p, fast) { const from = [parseFloat(E[k].style.left), parseFloat(E[k].style.top)];
      h.put(k, p);
      if (!fast) anim(E[k], [{transform: `translate(${from[0] - p[0]}px,${from[1] - p[1]}px)`}, {transform: 'none'}],
                      950, {easing: 'cubic-bezier(.45,0,.25,1)'}); },
    pulse(k, fast) { if (!fast) anim(E[k], [{transform: 'scale(1)'}, {transform: 'scale(1.12)'}, {transform: 'scale(1)'}], 700); }
  };
  const beats = def.beats(h), n = beats.length;

  /* the controls, in the slide's bottom right corner */
  const bar = document.createElement('div');
  bar.className = 'wbc';
  bar.innerHTML = `<button type="button" data-a="first" aria-label="Start over">${ICON.first}</button>` +
    `<button type="button" data-a="prev" aria-label="Back one step">${ICON.prev}</button>` +
    `<button type="button" class="pp" data-a="pp" aria-label="Play or pause">${ICON.play}${ICON.pause}</button>` +
    `<button type="button" data-a="next" aria-label="Forward one step">${ICON.next}</button>` +
    `<span class="cnt"></span><button type="button" class="spd" data-a="spd" aria-label="Speed">1×</button>`;
  sl.appendChild(bar);
  const cnt = bar.querySelector('.cnt'), spd = bar.querySelector('.spd');
  const ui = () => { cnt.textContent = at + ' / ' + n; bar.classList.toggle('playing', playing);
    spd.textContent = speed + '×'; };

  function halt() { clearTimeout(timer); live.forEach(a => a.cancel()); live = []; }
  function seek(k) {
    halt(); if (def.layout) def.layout(h); def.reset(h);
    for (let i = 0; i < k; i++) beats[i].run(true);
    at = k; ui();
  }
  /* play the next beat with its motion; keep going if playing */
  function step() {
    if (at >= n) { playing = false; ui(); return; }
    const b = beats[at];
    /* a beat never starts on top of an unfinished one (a hidden or busy
       page can hold animations back while the timers keep running) */
    live.forEach(a => { if (a.playState !== 'finished') a.finish(); });
    live = [];
    b.run(false); at++; ui();
    timer = setTimeout(() => {
    /* the beat's time is up, so its motion ends even if the page held it back */
    live.forEach(a => { if (a.playState !== 'finished') a.finish(); });
    if (playing) step(); else ui();
  }, b.d / speed);
  }
  function play() { if (at >= n) seek(0); playing = true; ui(); step(); }
  function pause() { playing = false; seek(at); }
  let touched = false;
  bar.addEventListener('click', e => {
    const a = e.target.closest('button'); if (!a) return;
    e.stopPropagation(); touched = true;
    switch (a.dataset.a) {
      case 'first': playing = false; seek(0); play(); break;
      case 'prev': playing = false; seek(Math.max(0, at - 1)); break;
      case 'pp': playing ? pause() : play(); break;
      case 'next': playing = false; if (at < n) { seek(at); step(); } break;
      case 'spd': speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
        live.forEach(x => { x.playbackRate = speed; }); ui(); break;
    }
  });

  let wasOn = false;
  const enter = () => { playing = false; if (still) { seek(n); return; } seek(0); play(); };
  const leave = () => { playing = false; seek(n); };
  new MutationObserver(() => {
    const on = sl.classList.contains('on');
    if (on && !wasOn) enter(); else if (!on && wasOn) leave();
    wasOn = on;
  }).observe(sl, {attributes: true, attributeFilter: ['class']});
  /* after the fit script and the handwriting font have settled */
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => {
    if (touched) return;
    wasOn = sl.classList.contains('on'); wasOn ? enter() : seek(n);
  }, 250));
  addEventListener('resize', () => setTimeout(() => { playing = false; seek(at); }, 300));
}


/* mount after the rest of the bundle (the deck's figures file registers its
   boards below this file) */
setTimeout(() => {
  const roots = document.querySelectorAll('[data-board]');
  if (!roots.length) return;
  const css = document.createElement('style');
  css.textContent = WB_CSS;
  document.head.appendChild(css);
  roots.forEach(root => {
    const make = CG_BOARDS[root.dataset.board];
    if (!make) return;
    try { whiteboard(root, make(root)); } catch (e) { console.error('whiteboard ' + root.dataset.board + ':', e); }
  });
}, 0);

/* Lecture 19's own figures, on a tracked three-pointer (data/arcs.json, the
   'clean' arc, shot 79).
   lec19-question: every tracked frame, height against time and the court from above.
   lec19-scan:    the same two plots, a scan of neighboring frames for the rim crossings.
   lec19-rules:   five scan rules for the release, each signal and the frames picked on it.
   lec19-root-height, -dist, -vz, -sc: each rule's signal, and the f whose
                  sign change between neighboring frames is the rule's pick.
   lec19-vote:    every rule's pick on one line, and the median.
   lec19-hoop:    the hoop from above, in / rim / out, and where this shot came down.
   lec19-interp:  the two frames either side of the rim, joined by a straight line.
   lec19-refit:   the prediction as the frames come in, refitted after each new frame.
   lec19-converge: every prediction's distance from the hoop's center, against the last frame used.
   lec19-root-fit: the fitted height against the rim, and f = z - 3.048 against zero,
                  at the same scale, so f is z moved down.
   lec19-plot:    f evaluated every 0.05 s, and a close-up of each sign change: the
                  line between the two samples and where it crosses zero.
   lec19-both:    the fitted frames and the parabola, both crossings of the rim marked.
   Hosts are found by data-fig. polyfit comes from the notes page's demo. */
(() => {
  const RIM = 3.048;
  /* the player's buttons, drawn as in the class 4 deck */
  const ICON = {
    first: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5.5h2.2v13H6zM18.5 6.6v10.8a1 1 0 0 1-1.55.83L9.6 13.03a1.2 1.2 0 0 1 0-2.06l7.35-5.2a1 1 0 0 1 1.55.83z"/></svg>',
    last: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.8 5.5H18v13h-2.2zM5.5 6.6v10.8a1 1 0 0 0 1.55.83l7.35-5.2a1.2 1.2 0 0 0 0-2.06L7.05 5.77A1 1 0 0 0 5.5 6.6z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M14.5 6.5 9 12l5.5 5.5"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M9.5 6.5 15 12l-5.5 5.5"/></svg>',
    pp: '<span class="i-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.5 5.9v12.2a1 1 0 0 0 1.52.85l9.6-6.1a1 1 0 0 0 0-1.7l-9.6-6.1A1 1 0 0 0 8.5 5.9z"/></svg></span>' +
        '<span class="i-pause"><svg viewBox="0 0 24 24" aria-hidden="true"><rect fill="currentColor" x="6.5" y="5.5" width="4" height="13" rx="1.2"/><rect fill="currentColor" x="13.5" y="5.5" width="4" height="13" rx="1.2"/></svg></span>'
  };
  /* tick labels under the x axis and inside the y axis, and the two axis
     names, as notes, since diagram() draws no ticks of its own */
  const axis = (xr, yr, xt, yt, xl, yl) => [
    ...xt.map(v => ({x: v, y: yr[0], dy: 13, anchor: 'middle', text: String(v)})),
    ...yt.map(v => ({x: xr[0], y: v, dx: 4, dy: 4, anchor: 'start', text: String(v)})),
    {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: xl},
    {x: xr[0], y: yr[1], dx: 4, dy: 10, anchor: 'start', text: yl}];

  fetch('data/arcs.json').then(r => r.json()).then(d => {
    const a = d.arcs.find(x => x.role === 'clean');
    const Z = a.z, F = Z.length, G = 9.81;

    /* five rules for the release, each a scan forward through the frames that
       stops at the first one passing its test, so each could run as the ball
       is tracked. Speeds are the change over four frames, as in the notes, so
       a speed is known two frames after its own. */
    const cdiff = s => s.map((_, i) => i < 2 || i > F - 3 ? NaN : (s[i + 2] - s[i - 2]) / (a.t[i + 2] - a.t[i - 2]));
    const first = (from, test) => { for (let i = from; i < F - 1; i++) if (test(i)) return i; return null; };
    const VZ = cdiff(Z);
    const DH = a.x.map((x, i) => Math.hypot(x - a.hoop_x, a.y[i] - a.hoop_y));
    const SC = cdiff(DH).map(v => -v);
    const rH = first(0, i => Z[i] > 2.75), rR = first(0, i => Z[i] > RIM);
    const rD = first(0, i => DH[i] < 7.24);
    /* the speed rules start once the ball is above 2 m, or moving toward the
       hoop faster than 3 m/s, so the gather in the hands cannot stop them */
    const rV = first(Z.findIndex(v => v > 2), i => VZ[i + 1] < VZ[i]);
    const rS = first(SC.findIndex(v => v > 3), i => SC[i + 1] < SC[i]);

    /* the release is the median of the five picks, and time counts from it */
    const r0 = [rH, rD, rV, rR, rS].sort((u, v) => u - v)[2];
    const T = a.t.map(v => v - a.t[r0]);

    /* a prediction from the first n frames after the release: a parabola in
       height, its curvature fixed at -g/2 or fitted with the rest, and lines
       in x and y. The falling root of height minus 3.048 is the predicted
       crossing, and the lines place the center at that time. */
    const fitAt = (n, free) => {
      const tt = [], zz = [], xx = [], yy = [];
      for (let i = r0; i < r0 + n; i++) { tt.push(T[i]); zz.push(Z[i]); xx.push(a.x[i]); yy.push(a.y[i]); }
      let c;
      if (free) c = polyfit(tt, zz, 2);
      else { const [q0, q1] = polyfit(tt, zz.map((v, j) => v + G / 2 * tt[j] * tt[j]), 1); c = [q0, q1, -G / 2]; }
      const disc = c[1] * c[1] - 4 * c[2] * (c[0] - RIM);
      if (c[2] >= 0 || disc < 0) return {c, tc: null};
      const tc = (-c[1] - Math.sqrt(disc)) / (2 * c[2]);
      const [x0, x1] = polyfit(tt, xx, 1), [y0, y1] = polyfit(tt, yy, 1);
      const u = x0 + x1 * tc - a.hoop_x, v = y0 + y1 * tc - a.hoop_y;
      return {c, tc, u, v, dist: Math.hypot(u, v)};
    };
    /* the root-finding slides work one prediction through: g known, the
       first 8 frames after the release */
    const NF = 8, [c0, c1, c2] = fitAt(NF, false).c;
    const y = t => c0 + c1 * t + c2 * t * t;
    const f = t => y(t) - RIM;
    const disc = c1 * c1 - 4 * c2 * (c0 - RIM);
    const r1 = (-c1 + Math.sqrt(disc)) / (2 * c2), r2 = (-c1 - Math.sqrt(disc)) / (2 * c2);
    const roots = [Math.min(r1, r2), Math.max(r1, r2)];
    const apexT = -c1 / (2 * c2), apex = y(apexT);
    const TT = linspace(-0.35, 1.45, 300);
    const lab = r => (r < 0 ? '−' : '') + Math.abs(r).toFixed(4) + ' s';

    /* every tracked frame, from the dribble to after the hoop: height against
       time, and the court from above at true scale. Each frame is the ball's
       center with a circle of the ball's radius around it. */
    const both = (host, scan) => {
      const [l, r] = diagramRow(host, 2);
      const BALL = d.out_radius_m - 0.2286, W = 300, H = 284, PT = 24, PB = 16, PS = 20;
      const hx = a.hoop_x, hy = a.hoop_y;
      const txr = [-0.95, 1.8], tyr = [0, 5.2];
      const pz = BALL * (H - PT - PB) / (tyr[1] - tyr[0]);
      const ballsZ = T.flatMap((t, i) => [{x: t, y: Z[i], r: pz, cls: 'ball'}, {x: t, y: Z[i], r: 1.3, cls: 'ctr'}]);
      diagram(l, {w: W, h: H, xRange: txr, yRange: tyr, title: 'height against time',
        alt: 'Tracked height of the ball against time, every frame from the dribble before the shot to after it reaches the hoop, with the rim height at 3.048 m.',
        leads: [{from: [txr[0], RIM], to: [txr[1], RIM], cls: 'level'}],
        points: ballsZ,
        notes: [...axis(txr, tyr, [0, 0.5, 1, 1.5], [1, 2, 4], 'time since release (s) →', '↑ height (m)'),
          {x: txr[1], y: RIM, dy: -7, anchor: 'end', text: 'rim, 3.048 m'},
          ...(scan ? [{x: txr[1], y: tyr[1], dy: 10, anchor: 'end', cls: 'scanread', text: ' '},
            {x: -0.12, y: 3.95, anchor: 'end', cls: 'scanlab', text: 'going up'},
            {x: txr[1], y: 4.4, anchor: 'end', cls: 'scanlab', text: 'coming down'}] : [])]});
      /* equal scale on both axes: 7 m across, and as many meters up as the
         same pixels per meter allow. x runs right to left, so the hoop is on
         the right, as in the height plot. */
      const ppm = (W - PS) / 7, ys = (H - PT - PB) / ppm;
      const cxr = [7.9, 0.9], cyr = [8.1 - ys, 8.1];
      const ring = [...linspace(0, 2 * Math.PI, 90)];
      const arc = [...linspace(-1.2, 1.2, 200)].map(q => [hx + 7.24 * Math.cos(q), hy + 7.24 * Math.sin(q)])
        .filter(([x, y]) => x <= cxr[0] && y >= cyr[0] && y <= cyr[1]);
      const ballsXY = a.x.flatMap((x, i) => [{x, y: a.y[i], r: BALL * ppm, cls: 'ball'}, {x, y: a.y[i], r: 1.3, cls: 'ctr'}]);
      diagram(r, {w: W, h: H, xRange: cxr, yRange: cyr, axes: false, title: 'the court from above, to scale',
        alt: 'The same frames seen from above at true scale: the ball travels from beyond the three-point line to the hoop, drawn as a circle of the rim’s radius in front of the backboard.',
        curves: [{x: arc.map(p => p[0]), y: arc.map(p => p[1]), cls: 'court'},
                 {x: ring.map(q => hx + 0.2286 * Math.cos(q)), y: ring.map(q => hy + 0.2286 * Math.sin(q)), cls: 'rim'}],
        leads: [{from: [1.22, hy - 0.915], to: [1.22, Math.min(hy + 0.915, cyr[1])], cls: 'board'},
                {from: [1.75, 6.62], to: [1.63, hy - 0.25], cls: 'lead'},
                {from: [1.15, 5.95], to: [1.21, hy - 0.94], cls: 'lead'},
                {from: [7.6, cyr[1] - 0.6], to: [6.6, cyr[1] - 0.6], cls: 'board'}],
        points: ballsXY,
        notes: [{x: 1.85, y: 6.35, anchor: 'middle', text: 'hoop'},
          {x: 1.0, y: 5.7, anchor: 'end', text: 'backboard'},
          {x: arc[0][0], y: arc[0][1], dx: 6, dy: -2, anchor: 'start', text: 'three-point line'},
          {x: 7.1, y: cyr[1] - 0.6, dy: -5, anchor: 'middle', text: '1 m'}]});
      return [l, r];
    };
    document.querySelectorAll('[data-fig="lec19-question"] .fig-body').forEach(host => both(host, false));

    /* the same two plots, scanning neighboring frames in order. The pair under
       test is lit in both plots; a pair with one frame below the rim height
       and one above is kept. The scan stops at the falling pair and the other
       frames fade, leaving those two to judge on the court. */
    document.querySelectorAll('[data-fig="lec19-scan"] .fig-body').forEach(host => {
      const [l, r] = both(host, true);
      const slide = host.closest('.deck-slide');
      const frames = [l, r].map(p => [...p.querySelectorAll('circle.ball')].map((b, i) =>
        [b, p.querySelectorAll('circle.ctr')[i]]));
      const read = l.querySelector('text.scanread tspan') || l.querySelector('text.scanread');
      const labs = [...l.querySelectorAll('text.scanlab')];
      const cross = [];
      for (let i = 0; i + 1 < Z.length; i++) if ((Z[i] - RIM) * (Z[i + 1] - RIM) < 0) cross.push(i);
      const last = cross[cross.length - 1];
      const mark = (i, cls, on) => frames.forEach(p => [i, i + 1].forEach(j => p[j].forEach(c => c.classList.toggle(cls, on))));
      const say = i => { read.textContent = 'frames ' + i + ' and ' + (i + 1) + ': ' + Z[i].toFixed(3) + ' m, ' + Z[i + 1].toFixed(3) + ' m'; };
      let timer = 0;
      const reset = () => {
        clearTimeout(timer);
        frames.forEach(p => p.forEach(c => c.forEach(e => e.classList.remove('scan', 'found', 'dim'))));
        labs.forEach(t => t.classList.remove('on'));
        read.textContent = ' ';
      };
      const end = () => {
        frames.forEach(p => p.forEach((c, j) => { if (j !== last && j !== last + 1) c.forEach(e => e.classList.add('dim')); }));
        say(last);
      };
      const step = i => {
        if (i > 0) mark(i - 1, 'scan', false);
        mark(i, 'scan', true); say(i);
        if (!cross.includes(i)) { timer = setTimeout(() => step(i + 1), 150); return; }
        mark(i, 'found', true); labs[cross.indexOf(i)].classList.add('on');
        if (i === last) { timer = setTimeout(end, 900); return; }
        timer = setTimeout(() => step(i + 1), 2000);
      };
      const start = () => {
        reset();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
          cross.forEach((i, n) => { mark(i, 'found', true); labs[n].classList.add('on'); });
          end(); return;
        }
        timer = setTimeout(() => step(0), 700);
      };
      if (!slide) { start(); return; }
      let wasOn = false;
      const sync = () => { const on = slide.classList.contains('on'); if (on && !wasOn) start(); if (!on && wasOn) reset(); wasOn = on; };
      new MutationObserver(sync).observe(slide, {attributes: true, attributeFilter: ['class']});
      sync();
    });


    /* one small plot per signal: the signal over frames 10 to 26, its levels,
       and the frame each rule on it picks */
    const FR = [10, 26], ids = Array.from({length: FR[1] - FR[0] + 1}, (_, j) => FR[0] + j);
    const rule = (host, o) => {
      const pts = ids.filter(i => o.s[i] >= o.yr[0] && o.s[i] <= o.yr[1]);
      diagram(host, {w: 300, h: 130, xRange: FR, yRange: o.yr, title: o.title, alt: o.alt,
        curves: [{x: pts, y: pts.map(i => o.s[i]), cls: 'ghost'}],
        leads: [...o.levels.map(v => ({from: [FR[0], v], to: [FR[1], v], cls: 'level'})),
          ...o.picks.map(p => ({from: [p[0], o.yr[0]], to: [p[0], o.s[p[0]]], cls: 'cast'}))],
        points: [...pts.map(i => ({x: i, y: o.s[i], r: 2.4, cls: 'dot'})),
          ...o.picks.map(p => ({x: p[0], y: o.s[p[0]], r: 6, cls: 'miss'}))],
        notes: [...axis(FR, o.yr, [12, 16, 20, 24], o.yt, 'frame →', ''),
          {x: FR[1], y: o.yr[1], dy: 10, anchor: 'end', cls: 'hi', text: o.picks.map(p => p[1] + ', frame ' + p[0]).join('\n')}]});
    };
    document.querySelectorAll('[data-fig="lec19-rules"] .fig-body').forEach(host => {
      const [c1, c2] = diagramRow(host, 2), [c3, c4] = diagramRow(host, 2);
      rule(c1, {s: Z, yr: [1.0, 5.6], yt: [4], levels: [2.75, RIM], picks: [[rH, 'passes 2.75 m'], [rR, 'passes the rim']],
        title: 'height (m)', alt: 'Height over frames 10 to 26, with levels at 2.75 m and the rim; it passes them at frames ' + rH + ' and ' + rR + '.'});
      rule(c2, {s: DH, yr: [3.9, 8.6], yt: [5, 6, 8], levels: [7.24], picks: [[rD, 'inside 7.24 m']],
        title: 'distance from the hoop (m)', alt: 'Horizontal distance from the hoop over frames 10 to 26, with a level at 7.24 m, the three-point line; it passes inside at frame ' + rD + '.'});
      rule(c3, {s: VZ, yr: [0, 7.8], yt: [2, 6], levels: [], picks: [[rV, 'peak above 2 m']],
        title: 'vertical speed (m/s)', alt: 'Vertical speed over frames 10 to 26; above 2 m it grows until frame ' + rV + ' and falls after it.'});
      rule(c4, {s: SC, yr: [-3, 10.5], yt: [6], levels: [3], picks: [[rS, 'peak above 3 m/s']],
        title: 'speed toward the hoop (m/s)', alt: 'Horizontal speed toward the hoop over frames 10 to 26; once above 3 m/s it grows until frame ' + rS + ' and falls after it.'});
    });

    /* each rule as a root: the signal it watches, and the f made from it by
       subtracting a level or taking a difference. f's dots are colored by its
       sign, the pair of frames where the sign changes is joined, and frames
       before a rule's guard (the scan has not started) are gray. */
    const rootFig = (host, o) => {
      const ids = Array.from({length: o.fr[1] - o.fr[0] + 1}, (_, j) => o.fr[0] + j);
      const live = i => o.from === undefined || i >= o.from;
      const xt = o.fr[0] < 8 ? [5, 10, 15, 20, 25] : [12, 16, 20, 24];
      const guard = (yr) => o.from === undefined ? [] : [{from: [o.from - 0.5, yr[0]], to: [o.from - 0.5, yr[1]], cls: 'gate'}];
      const cells = diagramRow(host, o.pre ? 3 : 2);
      if (o.pre) o.pre(cells.shift());
      const [top, bot] = cells, xr = [o.fr[0], o.fr[1] + (o.padR || 0)];
      const sp = ids.filter(i => Number.isFinite(o.s[i]));
      diagram(top, {w: 300, h: 200, xRange: xr, yRange: o.yr, title: o.title, alt: o.alt,
        curves: [{x: sp, y: sp.map(i => o.s[i]), cls: 'ghost'}],
        leads: [...guard(o.yr), ...o.fs.map(q => ({from: [q.pick, o.yr[0]], to: [q.pick, o.s[q.pick]], cls: 'cast'})),
          ...(o.levels || []).map(v => ({from: [xr[0], v[0]], to: [xr[1], v[0]], cls: 'level'}))],
        points: [...sp.map(i => ({x: i, y: o.s[i], r: 2.6, cls: live(i) ? 'dot' : 'pre'})),
          ...(o.peak ? o.fs.map(q => ({x: q.pick, y: o.s[q.pick], r: 6, cls: 'miss'})) : [])],
        notes: [...axis(xr, o.yr, xt, o.yt, 'frame →', ''),
          ...(o.levels || []).map(v => ({x: xr[1], y: v[0], dy: v[2] || -5, anchor: 'end', text: v[1]})),
          ...(o.from === undefined ? [] : [{x: o.from - 0.5, y: o.yr[1], dx: -4, dy: 10, anchor: 'end', text: o.guardText}])]});
      const curves = [], points = [], leads = [...guard(o.fyr)], notes = [...axis(xr, o.fyr, xt, o.fyt, 'frame →', '')];
      for (const q of o.fs) {
        const fp = ids.filter(i => Number.isFinite(q.f[i]));
        curves.push({x: fp, y: fp.map(i => q.f[i]), cls: 'ghost'});
        points.push(...fp.map(i => ({x: i, y: q.f[i], r: 2.8, cls: !live(i) ? 'pre' : q.f[i] > 0 ? 'fpos' : 'fneg'})));
        leads.push({from: [q.pick - 1, q.f[q.pick - 1]], to: [q.pick, q.f[q.pick]], cls: 'chord', over: true},
          {from: [q.pick, o.fyr[0]], to: [q.pick, Math.min(0, q.f[q.pick])], cls: 'cast'});
        notes.push({x: q.lx, y: q.ly, anchor: q.la || 'start', tex: q.tex});
      }
      diagram(bot, {w: 300, h: 200, xRange: xr, yRange: o.fyr, zero: true, title: o.ftitle, alt: o.falt,
        curves, points, leads, notes: [...notes, ...o.fs.map((q, k) => ({x: q.pick, y: o.fyr[0], dy: -5 - 13 * k, dx: -4, anchor: 'end', cls: 'hi', text: 'frame ' + q.pick}))]});
    };
    const DV = VZ.map((v, i) => VZ[i + 1] - v), DS = SC.map((v, i) => SC[i + 1] - v);
    document.querySelectorAll('[data-fig="lec19-root-height"] .fig-body').forEach(host => rootFig(host, {
      s: Z, fr: [10, 26], padR: 5, yr: [1.4, 4.7], yt: [2, 4], levels: [[2.75, '2.75 m', 13], [RIM, 'rim, 3.048 m']],
      title: 'height zᵢ (m)', alt: 'Height over frames 10 to 26 with levels at 2.75 m and 3.048 m; it passes them at frames ' + rH + ' and ' + rR + '.',
      ftitle: 'f for each level (m)', fyr: [-1.5, 1.9], fyt: [1],
      falt: 'The height less 2.75 m and the height less 3.048 m over the same frames, against zero; the first changes sign between frames ' + (rH - 1) + ' and ' + rH + ', the second between ' + (rR - 1) + ' and ' + rR + '.',
      fs: [{f: Z.map(v => v - 2.75), pick: rH, tex: 'z_i - 2.75', lx: 26.3, ly: 1.543, la: 'start'},
           {f: Z.map(v => v - RIM), pick: rR, tex: 'z_i - 3.048', lx: 26.3, ly: 1.03, la: 'start'}]}));
    /* where d_i comes from: frame rD from above, at true scale, as a right
       triangle from the ball's center to the hoop's center. x runs right to
       left, as on the court plot, so the hoop is on the right. */
    const legs = cell => {
      const i = rD, hx = a.hoop_x, hy = a.hoop_y, x = a.x[i], y = a.y[i], k = '_{' + i + '}';
      const ppm = 26, yr = [2.0, 2.0 + 160 / ppm], xr = [hx + 210 / ppm, hx + 210 / ppm - 280 / ppm];
      const f3 = v => v.toFixed(3).replace('-', '−');
      diagram(cell, {w: 300, h: 200, xRange: xr, yRange: yr, axes: false, title: 'frame ' + i + ' from above, to scale (m)',
        alt: 'Frame ' + i + ' seen from above: the ball’s center at (' + f3(x) + ', ' + f3(y) + ') and the hoop’s center at (' + f3(hx) + ', ' + f3(hy) +
          '), joined by a straight line of length ' + f3(DH[i]) + ' m, the long side of a right triangle whose other sides are ' + f3(x - hx) + ' m and ' + f3(y - hy) + ' m.',
        leads: [{from: [x, y], to: [hx, y], cls: 'leg'}, {from: [hx, y], to: [hx, hy], cls: 'leg'},
                {from: [x, y], to: [hx, hy], cls: 'chord'}],
        points: [{x, y, r: (d.out_radius_m - 0.2286) * ppm, cls: 'ball'}, {x, y, r: 1.6, cls: 'ctr'},
                 {x: hx, y: hy, r: 0.2286 * ppm, cls: 'rim'}, {x: hx, y: hy, r: 1.6, cls: 'ctr'}],
        notes: [{x: hx, y: hy, dx: -10, dy: 4, anchor: 'end', tex: '(x_h, y_h) = (' + f3(hx) + ', ' + f3(hy) + ')'},
          {x, y, dx: -12, dy: 16, anchor: 'start', tex: '(x' + k + ', y' + k + ') = (' + f3(x) + ', ' + f3(y) + ')'},
          {x: (x + hx) / 2, y: (y + hy) / 2, dx: -8, dy: -4, anchor: 'end', cls: 'hi', tex: 'd' + k + ' = ' + f3(DH[i])},
          {x: (x + hx) / 2 - 0.6, y, dy: -6, anchor: 'middle', tex: 'x' + k + ' - x_h = ' + f3(x - hx)},
          {x: hx, y: (y + hy) / 2, dx: 8, dy: -4, anchor: 'start', tex: 'y' + k + ' - y_h\n= ' + f3(y - hy)}]});
    };
    document.querySelectorAll('[data-fig="lec19-root-dist"] .fig-body').forEach(host => rootFig(host, {
      pre: legs,
      s: DH, fr: [10, 26], yr: [4.6, 8.1], yt: [5, 6, 7], levels: [[7.24, 'three-point line, 7.24 m', 13]],
      title: 'distance from the hoop dᵢ (m)', alt: 'Horizontal distance from the hoop over frames 10 to 26 with a level at 7.24 m; it passes inside at frame ' + rD + '.',
      ftitle: 'f = 7.24 − d (m)', fyr: [-0.8, 2.5], fyt: [1, 2],
      falt: '7.24 m less the distance over the same frames, against zero; negative outside the line, it changes sign between frames ' + (rD - 1) + ' and ' + rD + '.',
      fs: [{f: DH.map(v => 7.24 - v), pick: rD, tex: 'f_i = 7.24 - d_i', lx: 12, ly: 1.3}]}));
    document.querySelectorAll('[data-fig="lec19-root-vz"] .fig-body').forEach(host => rootFig(host, {
      s: VZ, fr: [2, 26], yr: [-1.2, 7.2], yt: [2, 4, 6], peak: true, from: Z.findIndex(v => v > 2),
      guardText: 'scan starts, zᵢ > 2 m',
      title: 'vertical speed vᵢ (m/s)', alt: 'Vertical speed over frames 2 to 26; from frame ' + Z.findIndex(v => v > 2) + ', where the height first passes 2 m, it grows to a peak at frame ' + rV + '.',
      ftitle: 'f = the change in v (m/s)', fyr: [-1.9, 2.5], fyt: [-1, 1, 2],
      falt: 'The change in vertical speed from each frame to the next, against zero; gray before frame ' + Z.findIndex(v => v > 2) + ', and after it positive until it changes sign between frames ' + (rV - 1) + ' and ' + rV + '.',
      fs: [{f: DV, pick: rV, tex: 'f_i = v_{i+1} - v_i', lx: 26, ly: 2.15, la: 'end'}]}));
    document.querySelectorAll('[data-fig="lec19-root-sc"] .fig-body').forEach(host => rootFig(host, {
      s: SC, fr: [2, 26], yr: [-3.2, 8.4], yt: [0, 6], peak: true, from: SC.findIndex(v => v > 3),
      levels: [[3, '3 m/s', 13]], guardText: 'scan starts, sᵢ > 3 m/s',
      title: 'speed toward the hoop sᵢ (m/s)', alt: 'Speed toward the hoop over frames 2 to 26; it first passes 3 m/s at frame ' + SC.findIndex(v => v > 3) + ' and peaks at frame ' + rS + '.',
      ftitle: 'f = the change in s (m/s)', fyr: [-1.7, 2.0], fyt: [-1, 1],
      falt: 'The change in speed toward the hoop from each frame to the next, against zero; gray before frame ' + SC.findIndex(v => v > 3) + ', and after it positive until it changes sign between frames ' + (rS - 1) + ' and ' + rS + '.',
      fs: [{f: DS, pick: rS, tex: 'f_i = s_{i+1} - s_i', lx: 26, ly: 1.65, la: 'end'}]}));

    /* every pick on one line of frames, and their median */
    document.querySelectorAll('[data-fig="lec19-vote"] .fig-body').forEach(host => {
      const picks = [[rH, 'height passes 2.75 m'], [rD, 'inside the three-point line'],
        [rV, 'vertical speed peaks'], [rR, 'height passes the rim'],
        [rS, 'speed toward the hoop peaks']];
      const med = picks.map(p => p[0]).sort((u, v) => u - v)[2];
      const rows = picks;
      const xr = [3, 24], yr = [-0.6, 6.2], n = rows.length;
      diagram(host, {w: 600, h: 185, xRange: xr, yRange: yr, axes: false,
        alt: 'The frame each of five release rules picks, from ' + Math.min(...picks.map(p => p[0])) + ' to ' + Math.max(...picks.map(p => p[0])) + ', with their median at frame ' + med + '.',
        leads: [...rows.map((p, j) => ({from: [14, n - j], to: [23, n - j], cls: 'level'})),
          {from: [med, 0.3], to: [med, n + 0.6], cls: 'cast'}],
        points: rows.map((p, j) => ({x: p[0], y: n - j, r: 5, cls: 'dot'})),
        notes: [...rows.map((p, j) => ({x: 13.6, y: n - j, dy: 4, anchor: 'end', text: p[1]})),
          ...[14, 16, 18, 20, 22].map(v => ({x: v, y: 0, dy: 4, anchor: 'middle', text: String(v)})),
          {x: 23, y: 0, dy: 4, anchor: 'start', text: 'frame'},
          {x: med, y: n + 0.6, dy: -4, anchor: 'middle', cls: 'hi', text: 'median, frame ' + med}]});
    });


    /* the fitted height against the rim, and f against zero, as on the scan
       slides. Both panels span 4.6 m, so f is the left curve moved down by
       3.048 m and each crossing of the rim sits at the same t as a root. */
    document.querySelectorAll('[data-fig="lec19-root-fit"] .fig-body').forEach(host => {
      const [l, r] = diagramRow(host, 2), xr = [-0.35, 1.45], zr = [0.3, 4.9], fr = [zr[0] - RIM, zr[1] - RIM];
      const fit = [];
      for (let i = r0; i < r0 + NF; i++) fit.push({x: T[i], y: Z[i], r: 2.8, cls: 'dot'});
      diagram(l, {w: 300, h: 200, xRange: xr, yRange: zr, title: 'fitted height z(t) (m)',
        alt: 'The parabola fitted to frames ' + r0 + ' to ' + (r0 + NF - 1) + ', with those frames, against the rim height of 3.048 m. It crosses the rim at ' + lab(roots[0]) + ' and ' + lab(roots[1]) + '.',
        curves: [{x: TT, y: [...TT].map(y)}],
        leads: [{from: [xr[0], RIM], to: [xr[1], RIM], cls: 'level'},
          ...roots.map(q => ({from: [q, zr[0]], to: [q, RIM], cls: 'cast'}))],
        points: [...fit, ...roots.map(q => ({x: q, y: RIM, r: 5, cls: 'miss'}))],
        notes: [...axis(xr, zr, [0, 0.5, 1], [1, 2, 4], 'time since release (s) →', ''),
          {x: 0.57, y: RIM, dy: 14, anchor: 'middle', text: 'rim, 3.048 m'}]});
      diagram(r, {w: 300, h: 200, xRange: xr, yRange: fr, zero: true, title: 'f(t) = z(t) − 3.048 (m)',
        alt: 'The same parabola moved down by 3.048 m, against zero. It is zero at ' + lab(roots[0]) + ' and ' + lab(roots[1]) + ', the times the height crosses the rim.',
        curves: [{x: TT, y: [...TT].map(f)}],
        leads: roots.map(q => ({from: [q, fr[0]], to: [q, 0], cls: 'cast'})),
        points: roots.map(q => ({x: q, y: 0, r: 5, cls: 'miss'})),
        notes: [...axis(xr, fr, [0, 0.5, 1], [-1, 1], 'time since release (s) →', ''),
          {x: roots[0], y: 0, dx: 8, dy: 16, anchor: 'start', cls: 'hi', text: lab(roots[0])},
          {x: roots[1], y: 0, dx: -8, dy: 16, anchor: 'end', cls: 'hi', text: lab(roots[1])}]});
    });

    /* f evaluated every 0.05 s, filled where f < 0 and open where f > 0, then a
       close-up of each pair of neighboring samples that changes sign: the line
       between them crosses zero at the estimate */
    document.querySelectorAll('[data-fig="lec19-plot"] .fig-body').forEach(host => {
      const grid = [];
      for (let i = 0; i <= 36; i++) grid.push(Math.round((-0.35 + 0.05 * i) * 100) / 100);
      const pairs = roots.map(r => { const a = Math.round(Math.floor(r / 0.05) * 5) / 100; return [a, Math.round((a + 0.05) * 100) / 100]; });
      const est = ([a, b]) => a - f(a) * (b - a) / (f(b) - f(a));
      const sgn = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(3);
      const t2 = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
      const [main, ...zooms] = diagramRow(host, 3);
      let xr = [-0.35, 1.45], yr = [-3.1, 2.1];
      diagram(main, {w: 300, h: 290, xRange: xr, yRange: yr, zero: true,
        alt: 'The parabola f against time, evaluated at 37 times 0.05 s apart, filled below zero and open above it. The sign changes between ' + t2(pairs[0][0]) + ' and ' + t2(pairs[0][1]) + ' s and between ' + t2(pairs[1][0]) + ' and ' + t2(pairs[1][1]) + ' s.',
        curves: [{x: TT, y: [...TT].map(f)}],
        points: grid.map(t => ({x: t, y: f(t), r: 2.8, cls: f(t) < 0 ? 'dot' : 'miss'})),
        notes: [...axis(xr, yr, [0, 0.5, 1], [1], 'time since release (s) →', '↑ f (m)'),
          ...pairs.map(([a, b], k) => ({x: (a + b) / 2, y: 0, dx: k ? -6 : 6, dy: 16, anchor: k ? 'end' : 'start', cls: 'hi', text: 'sign changes'}))]});
      pairs.forEach(([a, b], k) => {
        const fa = f(a), fb = f(b), e = est([a, b]);
        const lo = Math.min(fa, fb), hi = Math.max(fa, fb), pad = 0.3 * (hi - lo);
        xr = [a - 0.012, b + 0.012]; yr = [lo - pad, hi + pad];
        const TZ = linspace(xr[0], xr[1], 80);
        diagram(zooms[k], {w: 300, h: 290, xRange: xr, yRange: yr, zero: true,
          title: k ? 'the falling root' : 'the rising root',
          alt: 'Close-up of f from ' + t2(a) + ' to ' + t2(b) + ' s: the two samples ' + sgn(fa) + ' and ' + sgn(fb) + ' m, joined by a straight line that crosses zero at ' + lab(e) + ', next to the root at ' + lab(roots[k]) + '.',
          curves: [{x: TZ, y: [...TZ].map(f), cls: 'ghost'}],
          leads: [{from: [a, fa], to: [b, fb], cls: 'chord', over: true},
            {from: [e, 0], to: [e, yr[0]], cls: 'cast'}],
          points: [{x: a, y: fa, r: 5, cls: fa < 0 ? 'dot' : 'miss'}, {x: b, y: fb, r: 5, cls: fb < 0 ? 'dot' : 'miss'},
            {x: e, y: 0, r: 3.5, cls: 'dot'}],
          notes: [{x: a, y: yr[0], dy: 13, anchor: 'middle', text: t2(a)},
            {x: b, y: yr[0], dy: 13, anchor: 'middle', text: t2(b)},
            {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: 's →'},
            {x: a, y: fa, dx: 8, dy: fa < 0 ? 14 : -8, anchor: 'start', text: 'f = ' + sgn(fa)},
            {x: b, y: fb, dx: -8, dy: fb < 0 ? 14 : -8, anchor: 'end', text: 'f = ' + sgn(fb)},
            {x: k ? a + 0.005 : b - 0.005, y: yr[0], dy: -24, anchor: k ? 'start' : 'end', cls: 'hi', text: 'estimate ' + lab(e)},
            {x: k ? a + 0.005 : b - 0.005, y: yr[0], dy: -10, anchor: k ? 'start' : 'end', text: 'root ' + lab(roots[k])}]});
      });
    });

    /* where this shot's center was when it came down through 3.048 m, from the
       two frames either side of the rim */
    let after = null;
    for (let i = r0 + 1; i < Z.length; i++) {
      if (Z[i - 1] >= RIM && Z[i] < RIM) {
        const p = (RIM - Z[i - 1]) / (Z[i] - Z[i - 1]);
        after = {i, p, t: T[i - 1] + p * (T[i] - T[i - 1]),
                 u: a.x[i - 1] + p * (a.x[i] - a.x[i - 1]) - a.hoop_x,
                 v: a.y[i - 1] + p * (a.y[i] - a.y[i - 1]) - a.hoop_y};
        break;
      }
    }

    /* the hoop from above: the clean-make disk, the rim band, and that point,
       interpolated on the straight line between the two frames' centers */
    const disk = (r, n = 90) => Array.from({length: n}, (_, j) =>
      ({x: r * Math.cos(2 * Math.PI * j / n), y: r * Math.sin(2 * Math.PI * j / n)}));
    document.querySelectorAll('[data-fig="lec19-hoop"] .fig-body').forEach(host => {
      const xr = [-1.1, 1.1], yr = [-0.5, 0.5];
      const ring = [...linspace(0, 2 * Math.PI, 120)];
      const dist = Math.hypot(after.u, after.v);
      const fr = [after.i - 1, after.i].map(j => ({j, u: a.x[j] - a.hoop_x, v: a.y[j] - a.hoop_y}));
      diagram(host, {w: 440, h: 217, xRange: xr, yRange: yr, axes: false,
        alt: 'The hoop seen from above: a disk of radius 0.109 m where the ball drops through clean, a band out to 0.348 m where it touches the rim, and the centers of the frames just above and just below the rim joined by a straight line, with this shot’s center at 0.339 m on that line, inside the band.',
        areas: [{pts: disk(d.out_radius_m), cls: 'tri'}, {pts: disk(d.in_radius_m), cls: 'pos'}],
        curves: [{x: ring.map(q => 0.2286 * Math.cos(q)), y: ring.map(q => 0.2286 * Math.sin(q))}],
        leads: [{from: [0, 0], to: [after.u, after.v], cls: 'cast'},
                {from: [fr[0].u, fr[0].v], to: [fr[1].u, fr[1].v], cls: 'chord'},
                {from: [0.45, 0.33], to: [0.05, 0.04], cls: 'lead'},
                {from: [0.45, 0.13], to: [0.29, 0.06], cls: 'lead'},
                {from: [0.45, -0.07], to: [0.38, -0.12], cls: 'lead'},
                {from: [-0.45, 0.33], to: [-0.16, 0.16], cls: 'lead'}],
        points: [{x: 0, y: 0, r: 2.2}, ...fr.map(f => ({x: f.u, y: f.v, r: 4, cls: 'dot'})),
                 {x: after.u, y: after.v, r: 5, cls: 'miss'}],
        notes: [
          {x: fr[0].u, y: fr[0].v, dx: 8, dy: 8, anchor: 'start', text: 'frame ' + fr[0].j + ', ' + Z[fr[0].j].toFixed(4) + ' m up'},
          {x: fr[1].u, y: fr[1].v, dx: -8, dy: -4, anchor: 'end', text: 'frame ' + fr[1].j + ', ' + Z[fr[1].j].toFixed(4) + ' m up'},
          {x: 0.47, y: 0.33, dy: 4, anchor: 'start', text: 'in clean, within 0.109 m'},
          {x: 0.47, y: 0.13, dy: 4, anchor: 'start', text: 'touches the rim'},
          {x: 0.47, y: -0.07, dy: 4, anchor: 'start', text: 'out, beyond 0.348 m'},
          {x: -0.47, y: 0.33, dy: 4, anchor: 'end', text: 'the rim, radius 0.229 m'},
          {x: after.u, y: after.v, dx: -9, dy: 16, anchor: 'end', cls: 'hi', text: 'at 3.048 m, ' + dist.toFixed(3) + ' m from the center'}]});
    });

    /* the frames either side of the rim on the way down, joined by a straight line */
    document.querySelectorAll('[data-fig="lec19-interp"] .fig-body').forEach(host => {
      const xr = [after.t - 0.125, after.t + 0.135], yr = [2.55, 3.6], i = after.i;
      const pts = [];
      T.forEach((t, j) => {
        if (t >= xr[0] && t <= xr[1]) pts.push({x: t, y: Z[j], r: 4, cls: j === i - 1 || j === i ? 'dot' : 'miss'});
      });
      diagram(host, {w: 440, h: 200, xRange: xr, yRange: yr,
        alt: 'Tracked heights around the rim on the way down. A straight line joins the frame at 1.04 s, 3.141 m, to the frame at 1.08 s, 2.899 m, and crosses 3.048 m at 1.055 s.',
        leads: [{from: [xr[0], RIM], to: [xr[1], RIM], cls: 'level'},
                {from: [T[i - 1], Z[i - 1]], to: [T[i], Z[i]], cls: 'chord'},
                {from: [after.t, yr[0]], to: [after.t, RIM], cls: 'cast'}],
        points: [...pts, {x: after.t, y: RIM, r: 6, cls: 'miss'}],
        notes: [...axis(xr, yr, [1.1, 1.2], [2.8, 3.2, 3.4], 'time since release (s) →', '↑ height (m)'),
          {x: xr[1], y: RIM, dy: -5, anchor: 'end', text: 'rim, 3.048 m'},
          {x: T[i - 1], y: Z[i - 1], dx: 9, dy: -2, anchor: 'start', text: T[i - 1].toFixed(2) + ' s, ' + Z[i - 1].toFixed(4) + ' m'},
          {x: T[i], y: Z[i], dx: 9, dy: 4, anchor: 'start', text: T[i].toFixed(2) + ' s, ' + Z[i].toFixed(4) + ' m'},
          {x: after.t, y: yr[0], dx: -5, dy: -8, anchor: 'end', cls: 'hi', text: after.t.toFixed(3) + ' s'}]});
    });

    /* the parabola from the first 10 frames, evaluated past them */

    /* the prediction as the frames come in. After each new frame both fits
       are redone, drawn on past the frames used, and the center they predict
       at the rim is shown from above. Earlier predictions stay as a trail. */
    const verdict = r => r < d.in_radius_m ? 'in clean' : r < d.out_radius_m ? 'touches the rim' : 'out';
    const preds = [];
    for (let n = 3; n <= after.i - r0; n++) preds.push({n, g: fitAt(n, false), fr: fitAt(n, true)});
    document.querySelectorAll('[data-fig="lec19-refit"] .fig-body').forEach(host => {
      const slide = host.closest('.deck-slide');
      const W = 300, H = 284, txr = [-0.25, 1.4], tyr = [2.2, 5.0];
      const ppm = (W - 20) / 1.6, half = (H - 40) / ppm / 2, hx = [-0.8, 0.8], hy = [-half, half];
      const ring = [...linspace(0, 2 * Math.PI, 120)];
      const inView = s => s.tc !== null && s.u > hx[0] && s.u < hx[1] && s.v > hy[0] && s.v < hy[1];
      /* a parabola drawn only where it is inside the plot, in pieces */
      const segs = (c, cls) => {
        const out = []; let cur = null;
        for (const t of linspace(0, txr[1], 160)) {
          const v = c[0] + c[1] * t + c[2] * t * t;
          if (v >= tyr[0] && v <= tyr[1]) { if (!cur) out.push(cur = {x: [], y: [], cls}); cur.x.push(t); cur.y.push(v); }
          else cur = null;
        }
        return out;
      };
      const say = (s, name) => s.tc === null ? name + ': no crossing' : name + ': ' + s.dist.toFixed(3) + ' m, ' + verdict(s.dist);
      const draw = j => {
        host.innerHTML = '';
        const [l, r] = diagramRow(host, 2), {n, g: cg, fr: cf} = preds[j], last = r0 + n - 1;
        const pts = [];
        T.forEach((t, i) => {
          if (t < txr[0] || t > txr[1] || Z[i] < tyr[0] || Z[i] > tyr[1]) return;
          const used = i >= r0 && i <= last;
          pts.push({x: t, y: Z[i], r: used ? 3 : 2.4, cls: used ? 'dot' : 'fut'});
        });
        const cross = [[cf, 'pf'], [cg, 'pg']].filter(([s]) => s.tc !== null && s.tc >= txr[0] && s.tc <= txr[1]);
        diagram(l, {w: W, h: H, xRange: txr, yRange: tyr, title: 'height against time',
          alt: 'Heights from the release, frames ' + r0 + ' to ' + last + ' used, with the parabola fitted with g known and the one with all three coefficients fitted, each drawn on to where it falls through the rim height.',
          curves: [...segs(cf.c, 'fitf'), ...segs(cg.c, 'fitg')],
          leads: [{from: [txr[0], RIM], to: [txr[1], RIM], cls: 'level'}, {from: [T[last], tyr[0]], to: [T[last], Z[last]], cls: 'cast'}],
          points: [...pts, ...cross.map(([s, cls]) => ({x: s.tc, y: RIM, r: 5, cls}))],
          notes: [...axis(txr, tyr, [0, 0.5, 1], [3, 4], 'time since release (s) →', '↑ height (m)'),
            {x: 0.62, y: RIM, dy: 14, anchor: 'middle', text: 'rim, 3.048 m'},
            {x: txr[1], y: tyr[1], dy: 10, anchor: 'end', text: 'frames ' + r0 + ' to ' + last}]});
        diagram(r, {w: W, h: H, xRange: hx, yRange: hy, axes: false, title: 'predicted center at the rim, from above',
          alt: 'The hoop from above with the clean disk and the rim band, and the center each fit predicts when the ball falls to the rim: ' + say(cg, 'g known') + '; ' + say(cf, 'all three fitted') + '.',
          areas: [{pts: disk(d.out_radius_m), cls: 'tri'}, {pts: disk(d.in_radius_m), cls: 'pos'}],
          curves: [{x: ring.map(q => 0.2286 * Math.cos(q)), y: ring.map(q => 0.2286 * Math.sin(q))}],
          points: [{x: 0, y: 0, r: 2.2},
            ...preds.slice(0, j).flatMap(q => [[q.fr, 'trailf'], [q.g, 'trailg']].filter(([s]) => inView(s)).map(([s, cls]) => ({x: s.u, y: s.v, r: 2.6, cls}))),
            ...[[cf, 'pf'], [cg, 'pg']].filter(([s]) => inView(s)).map(([s, cls]) => ({x: s.u, y: s.v, r: 5, cls}))],
          notes: [{x: hx[1], y: hy[0], dy: -20, anchor: 'end', cls: 'tg', text: say(cg, 'g known')},
                  {x: hx[1], y: hy[0], dy: -6, anchor: 'end', cls: 'tf', text: say(cf, 'all three fitted')}]});
      };
      /* a player under the figure: to the first prediction, one frame back,
         play or pause, one frame on, to the last, and a slider over them all */
      const N = preds.length;
      const bar = document.createElement('div');
      bar.className = 'rctl';
      bar.innerHTML = [['first', 'Beginning'], ['prev', 'One frame back'], ['pp', 'Play'], ['next', 'One frame on'], ['last', 'End']]
        .map(([k, t]) => '<button type="button" data-a="' + k + '" title="' + t + '" aria-label="' + t + '">' + ICON[k] + '</button>').join('') +
        '<input type="range" min="0" max="' + (N - 1) + '" step="1" aria-label="Last frame used">';
      host.after(bar);
      const pp = bar.querySelector('[data-a="pp"]'), range = bar.querySelector('input');
      let at = N - 1, timer = 0;
      const show = j => { at = j; draw(j); range.value = j; };
      const label = t => { pp.title = t; pp.setAttribute('aria-label', t); };
      const pause = () => { clearTimeout(timer); timer = 0; pp.classList.remove('playing'); label('Play'); };
      const play = (wait = 450) => {
        if (at >= N - 1) show(0);
        pp.classList.add('playing'); label('Pause');
        const tick = () => { show(at + 1); if (at < N - 1) timer = setTimeout(tick, 450); else pause(); };
        timer = setTimeout(tick, wait);
      };
      bar.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const k = b.dataset.a;
        if (k === 'pp') { if (timer) pause(); else play(); return; }
        pause();
        show(k === 'first' ? 0 : k === 'last' ? N - 1 : Math.max(0, Math.min(N - 1, at + (k === 'next' ? 1 : -1))));
      });
      range.addEventListener('input', () => { pause(); show(+range.value); });
      const start = () => {
        pause();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(N - 1); return; }
        show(0); play(900);
      };
      show(N - 1);
      if (!slide) return;
      let wasOn = false;
      const sync = () => { const on = slide.classList.contains('on'); if (on && !wasOn) start(); if (!on && wasOn) pause(); wasOn = on; };
      new MutationObserver(sync).observe(slide, {attributes: true, attributeFilter: ['class']});
      sync();
    });

    /* every prediction's distance from the hoop's center against the last
       frame it used, both fits, over the clean disk and the rim band */
    document.querySelectorAll('[data-fig="lec19-converge"] .fig-body').forEach(host => {
      const xr = [r0 + 1, after.i + 1], yr = [0, 0.92], post = Math.hypot(after.u, after.v);
      const band = (lo, hi) => [{x: xr[0], y: lo}, {x: xr[1], y: lo}, {x: xr[1], y: hi}, {x: xr[0], y: hi}];
      const ser = key => preds.filter(q => q[key].tc !== null && q[key].dist <= 0.8).map(q => ({x: r0 + q.n - 1, y: q[key].dist}));
      const sg = ser('g'), sf = ser('fr');
      diagram(host, {w: 600, h: 240, xRange: xr, yRange: yr,
        alt: 'Predicted distance of the center from the hoop’s center against the last frame used, for the fit with g known and the fit with all three coefficients, over the clean disk and the rim band, with the after-the-fact answer of ' + post.toFixed(3) + ' m.',
        areas: [{pts: band(0, d.in_radius_m), cls: 'pos'}, {pts: band(d.in_radius_m, d.out_radius_m), cls: 'tri'}],
        curves: [{x: sf.map(p => p.x), y: sf.map(p => p.y), cls: 'fitf'}, {x: sg.map(p => p.x), y: sg.map(p => p.y), cls: 'fitg'}],
        leads: [{from: [xr[0], post], to: [xr[1], post], cls: 'cast'}],
        points: [...sf.map(p => ({...p, r: 3, cls: 'pf'})), ...sg.map(p => ({...p, r: 3, cls: 'pg'}))],
        notes: [...axis(xr, yr, [20, 25, 30, 35, 40, 45], [0.4, 0.8], 'last frame used →', '↑ predicted distance from the hoop’s center (m)'),
          {x: xr[0], y: d.in_radius_m / 2, dx: 4, dy: 4, anchor: 'start', text: 'in clean'},
          {x: xr[0], y: 0.23, dx: 4, dy: 4, anchor: 'start', text: 'touches the rim'},
          {x: xr[0], y: 0.62, dx: 4, anchor: 'start', text: 'out'},
          {x: xr[1], y: post, dy: 14, anchor: 'end', text: 'after the fact, ' + post.toFixed(3) + ' m'},
          {x: xr[1], y: yr[1], dy: 10, anchor: 'end', cls: 'tg', text: 'g known'},
          {x: xr[1], y: yr[1], dy: 24, anchor: 'end', cls: 'tf', text: 'all three fitted'}]});
    });

    /* both crossings on the tracked heights: rising in the hand, falling after release */
    document.querySelectorAll('[data-fig="lec19-both"] .fig-body').forEach(host => {
      const xr = [-0.55, 1.6], yr = [0, 5.2];
      const pts = [];
      T.forEach((t, i) => {
        if (t < xr[0] || t > xr[1]) return;
        if (i >= r0 && i < r0 + NF) pts.push({x: t, y: Z[i], r: 2.8, cls: 'dot'});
      });
      const TF = linspace(-0.1, 1.25, 200);
      diagram(host, {w: 440, h: 220, xRange: xr, yRange: yr,
        alt: 'The first 8 tracked heights after release and the parabola fitted to them, g known. The ball rises through the rim height at the release and falls through it about a second later; both crossings are circled.',
        curves: [{x: TF, y: [...TF].map(y)}],
        leads: [{from: [xr[0], RIM], to: [xr[1], RIM], cls: 'level'}, {from: [0, 0], to: [0, 4.7], cls: 'cast'},
          {from: [-0.3, 3.95], to: [roots[0], RIM + 0.15], cls: 'cast'}, {from: [1.3, 3.95], to: [roots[1], RIM + 0.15], cls: 'cast'}],
        points: [...pts, ...roots.map(r => ({x: r, y: RIM, r: 6, cls: 'miss'}))],
        notes: [...axis(xr, yr, [0, 0.5, 1, 1.5], [2, 3, 4], 'time since release (s) →', '↑ height (m)'),
          {x: 1.6, y: RIM, dx: -2, dy: -5, anchor: 'end', text: 'rim, 3.048 m'},
          {x: 0, y: 0.25, dx: 4, anchor: 'start', text: 'release'},
          {x: -0.52, y: 4.5, anchor: 'start', cls: 'hi', text: 'rising, at the release'},
          {x: -0.52, y: 4.5, dy: 13, anchor: 'start', cls: 'hi', text: lab(roots[0])},
          {x: 1.6, y: 4.5, anchor: 'end', cls: 'hi', text: 'falling, toward the hoop'},
          {x: 1.6, y: 4.5, dy: 13, anchor: 'end', cls: 'hi', text: lab(roots[1])}]});
    });
  });

})();

/* Slide runtime. Every slide is in the DOM from the start, so the figure code
   in the bundle draws into its hosts once, at load, exactly as on a notes page.
   Slides are shown by class, never by insertion.

   There is no reveal. A slide shows everything it has the moment it appears,
   and anything that would have been a second reveal is a second slide. */

const slides = [...document.querySelectorAll('.deck-slide')];
if (slides.length) {
  const bar = document.querySelector('.deck-bar > i');
  const num = document.querySelector('.deck-num');
  const notes = document.querySelector('.deck-notes');
  let at = 0;

  function paint() {
    slides.forEach((s, i) => s.classList.toggle('on', i === at));
    if (num) num.textContent = at + 1;
    if (bar) bar.style.width = ((at + 1) / slides.length * 100).toFixed(2) + '%';
    if (notes) notes.innerHTML = slides[at].dataset.notes || '';
    /* the hash is the slide, so a lecture resumes where it stopped */
    if (('#' + (at + 1)) !== location.hash) history.replaceState(null, '', '#' + (at + 1));
  }

  function go(d) {
    const next = at + d;
    if (next < 0 || next > slides.length - 1) return;
    at = next;
    paint();
  }

  function jump(i) { at = Math.max(0, Math.min(slides.length - 1, i)); paint(); }

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
        e.preventDefault(); go(1); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); go(-1); break;
      case 'Home': e.preventDefault(); jump(0); break;
      case 'End':  e.preventDefault(); jump(slides.length - 1); break;
      /* n shows what to say; the notes are the script for this slide */
      case 'n': case 'N': document.body.classList.toggle('notes-on'); break;
      /* b blanks the screen, the way a projector remote does */
      case 'b': case 'B': document.body.classList.toggle('blank'); break;
    }
  });

  /* a click advances, so a remote that sends one works, but not when the click
     was meant for a demo control or a box the class is typing into */
  addEventListener('click', e => {
    if (e.target.closest('cg-demo, a, button, input, label, textarea, [contenteditable], .deck-notes')) return;
    go(1);
  });

  const start = parseInt((location.hash || '').slice(1), 10);
  jump(Number.isFinite(start) && start > 0 ? start - 1 : 0);
}

/* Presenter tools: a pointer you can see on a recording, and an ink layer to
   write on a slide.

   This file adds nothing to deck.js and changes nothing in it. It reads the
   current slide from the DOM (.deck-slide.on) and watches for that class to
   move, so the slide runtime stays the sixty lines it is and either file can
   be removed without touching the other.

   Everything here is off until a key turns it on, so a student who never
   presses p or d sees exactly the deck that shipped before.

   Wrapped in an IIFE, not left at module top level: the bundle concatenates
   this with deck.js, which already declares `slides` and `at`. */
(() => {
  const slides = [...document.querySelectorAll('.deck-slide')];
  if (!slides.length) return;

  /* Ink is kept per slide and in slide coordinates, so going back shows what
     was drawn there and a window resize does not smear it. A stroke is a list
     of points in fractions of the viewport, plus how to paint it. */
  const strokes = slides.map(() => []);
  const at = () => Math.max(0, slides.findIndex(s => s.classList.contains('on')));

  /* Three inks, chosen against what is actually on a slide. The first is the
     site's own "what is said about it" gold, which is what an annotation is.
     The other two are colors the course does not use anywhere: ink has to
     read over a figure, and the term green is exactly the green every plot
     trace is drawn in, so a circle round a curve in it vanishes. */
  const INKS = ['#B07A08', '#1F5FA8', '#C2381F'];

  let drawing = false;   // ink mode: clicks draw instead of advancing
  let erasing = false;
  let pointer = false;   // the visible dot
  let ink = 0;
  let live = null;       // the stroke being drawn right now

  // ---------------------------------------------------------------- surfaces
  const cv = document.createElement('canvas');
  cv.className = 'deck-ink';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');

  const dot = document.createElement('div');
  dot.className = 'deck-dot';
  document.body.appendChild(dot);

  const hud = document.createElement('div');
  hud.className = 'deck-hud';
  document.body.appendChild(hud);

  /* A canvas has to be sized in device pixels or a stroke is soft on exactly
     the screens this is for. Scale the context instead of the element so the
     drawing code can keep working in CSS pixels. */
  function size() {
    const r = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * r);
    cv.height = Math.round(innerHeight * r);
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(r, 0, 0, r, 0, 0);
    paint();
  }

  /* Line weight follows the window, not a fixed pixel count: the same deck is
     recorded at 1080p and shown on a laptop, and a 4px line is confident on
     one and thin on the other. */
  const weight = () => Math.max(2.5, innerHeight / 260);

  function stroke(s) {
    const p = s.pts;
    if (!p.length) return;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = s.w * innerHeight;
    if (s.erase) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth *= 4;            // an eraser wants to be wider than a pen
    } else {
      ctx.strokeStyle = s.ink;
    }
    ctx.beginPath();
    if (p.length === 1) {
      /* a tap is a dot, and a zero-length path draws nothing */
      ctx.arc(p[0].x * innerWidth, p[0].y * innerHeight, ctx.lineWidth / 2, 0, 7);
      ctx.fillStyle = s.erase ? 'rgba(0,0,0,1)' : s.ink;
      ctx.fill();
    } else {
      /* through the midpoints, so handwriting is a curve and not a chain of
         straight segments with visible corners at every sample */
      ctx.moveTo(p[0].x * innerWidth, p[0].y * innerHeight);
      for (let i = 1; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1];
        ctx.quadraticCurveTo(a.x * innerWidth, a.y * innerHeight,
                             (a.x + b.x) / 2 * innerWidth, (a.y + b.y) / 2 * innerHeight);
      }
      const l = p[p.length - 1];
      ctx.lineTo(l.x * innerWidth, l.y * innerHeight);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paint() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    strokes[at()].forEach(stroke);
  }

  function status() {
    document.body.classList.toggle('inking', drawing);
    document.body.classList.toggle('pointing', pointer);
    cv.style.pointerEvents = drawing ? 'auto' : 'none';
    dot.style.background = drawing ? INKS[ink] : '';
    if (!drawing && !pointer) { hud.textContent = ''; return; }
    hud.innerHTML = drawing
      ? `<i style="background:${INKS[ink]}"></i>${erasing ? 'erase' : 'draw'}` +
        `<span>1 2 3 color &nbsp;e erase &nbsp;u undo &nbsp;c clear &nbsp;d off</span>`
      : `<i></i>pointer<span>p off</span>`;
  }

  // ------------------------------------------------------------------ drawing
  const posn = e => ({ x: e.clientX / innerWidth, y: e.clientY / innerHeight });

  cv.addEventListener('pointerdown', e => {
    if (!drawing) return;
    e.preventDefault();
    /* capture keeps a stroke going if the pen leaves the canvas, but it is a
       convenience: a browser that refuses the id must not cost the stroke */
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    live = { pts: [posn(e)], ink: INKS[ink], erase: erasing, w: weight() / innerHeight };
    strokes[at()].push(live);
    paint();
  });

  cv.addEventListener('pointermove', e => {
    if (pointer || drawing) place(e);
    if (!live) return;
    const p = posn(e), last = live.pts[live.pts.length - 1];
    /* drop samples that have barely moved: they add nothing to the shape and
       a hundred of them per letter makes the redraw on slide change visible */
    if (Math.hypot(p.x - last.x, p.y - last.y) * innerWidth < 1.2) return;
    live.pts.push(p);
    paint();
  });

  const done = () => { live = null; };
  cv.addEventListener('pointerup', done);
  cv.addEventListener('pointercancel', done);

  /* deck.js advances on click. In ink mode a click is a pen stroke, so it is
     stopped in the capture phase, which runs before any bubble listener no
     matter which file registered first. Arrow keys are untouched and stay the
     way to move, which is the point. */
  addEventListener('click', e => { if (drawing) { e.stopPropagation(); } }, true);

  // ------------------------------------------------------------------ pointer
  function place(e) {
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }
  addEventListener('pointermove', e => { if (pointer || drawing) place(e); });

  // --------------------------------------------------------------------- keys
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key;

    if (k === 'p' || k === 'P') { pointer = !pointer; status(); return; }
    if (k === 'd' || k === 'D') {
      drawing = !drawing;
      if (!drawing) erasing = false;
      status();
      return;
    }
    if (!drawing) return;          // the rest only mean something while inking

    if (k === 'Escape') { drawing = erasing = false; status(); e.preventDefault(); }
    else if (k === 'e' || k === 'E') { erasing = !erasing; status(); }
    else if (k === 'u' || k === 'U') { strokes[at()].pop(); paint(); }
    else if (k === 'c' || k === 'C') { strokes[at()].length = 0; paint(); }
    else if (k >= '1' && k <= String(INKS.length)) {
      ink = +k - 1; erasing = false; status();
    } else return;
    e.preventDefault();
  });

  /* The slide index lives in deck.js. Rather than reach into it, watch the
     class it toggles: whichever slide is .on is the one whose ink to show. */
  new MutationObserver(paint).observe(document.body, {
    subtree: true, attributeFilter: ['class'],
  });

  addEventListener('resize', size);
  size();
  status();
})();

/* ---- code: highlighting + per-line notes ---- */
const RULES={
  python:{kw:/\b(def|return|import|from|as|for|in|if|else|elif|while|with|not|and|or|is|try|except|finally|raise|break|continue|pass|lambda|None|True|False)\b/g,
          cmt:/#.*$/gm, str:/(['"])(?:\\.|(?!\1).)*\1/g},
  matlab:{kw:/\b(function|end|for|while|if|else|elseif|switch|case|otherwise|try|catch|break|continue|return|true|false|nargin|abs)\b/g,
          cmt:/%.*$/gm, str:/'(?:[^']|'')*'/g},
  js:{kw:/\b(function|const|let|var|return|for|of|in|if|else|new|=>)\b/g,
      cmt:/\/\/.*$/gm, str:/(['"`])(?:\\.|(?!\1).)*\1/g}
};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function highlight(raw,lang){
  const r=RULES[lang]||RULES.python;
  const marks=[];
  const grab=(re,cls)=>{let m;re.lastIndex=0;while((m=re.exec(raw))){marks.push([m.index,m.index+m[0].length,cls])}};
  grab(r.cmt,'cmt');grab(r.str,'str');
  grab(/\b\d+(\.\d+)?(e-?\d+)?\b/g,'num');grab(r.kw,'kw');
  marks.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);
  let out='',pos=0;
  for(const [s,e,cls] of marks){ if(s<pos)continue;
    out+=esc(raw.slice(pos,s))+`<span class="${cls}">${esc(raw.slice(s,e))}</span>`;pos=e}
  return out+esc(raw.slice(pos));
}
/* A note may carry a link, written [text](page.html). The hover preview is CSS
   and can only show text, so it shows the link's words. Clicking, tapping, Enter
   or Space pins the note open as a real element, where the link works. That is
   also the only way to read a note on a phone or from the keyboard. */
const LINK=/\[([^\]]+)\]\(([^)\s]+)\)/g;
const notePlain=n=>n.replace(LINK,'$1');
const noteHTML=n=>esc(n).replace(LINK,(m,t,h)=>`<a href="${h.replace(/"/g,'&quot;')}">${t}</a>`);
const attr=s=>esc(s).replace(/"/g,'&quot;');
document.querySelectorAll('.codetabs pre').forEach(pre=>{
  const lang=pre.dataset.lang;
  const notes={};
  /* split only where a line number follows, so a note may contain a ';' */
  (pre.dataset.notes||'').split(/;(?=\d+\|)/).filter(Boolean).forEach(s=>{
    const i=s.indexOf('|'); notes[+s.slice(0,i)]=s.slice(i+1);
  });
  const src=pre.textContent.replace(/\n$/,'');
  pre.innerHTML=src.split('\n').map((line,i)=>{
    const note=notes[i+1];
    return `<span class="ln"${note?` data-note="${attr(notePlain(note))}" data-note-src="${attr(note)
      }" tabindex="0" role="button" aria-expanded="false"`:''}>${highlight(line,lang)||'&nbsp;'}</span>`;
  }).join('');
});
function unpin(){
  document.querySelectorAll('.codetabs .ln.pinned').forEach(ln=>{
    ln.classList.remove('pinned');ln.setAttribute('aria-expanded','false');
    ln.querySelector('.ln-note')?.remove();
  });
}
function togglePin(ln){
  if(ln.classList.contains('pinned')){unpin();return}
  unpin();
  const box=document.createElement('span');
  box.className='ln-note';
  box.innerHTML=noteHTML(ln.dataset.noteSrc);
  ln.appendChild(box);ln.classList.add('pinned');ln.setAttribute('aria-expanded','true');
}
document.addEventListener('click',e=>{
  const ln=e.target.closest&&e.target.closest('.codetabs .ln[data-note]');
  if(!ln){unpin();return}
  if(e.target.closest('.ln-note'))return;
  /* a drag to select code is not a request for its note */
  if(String(getSelection()).length)return;
  togglePin(ln);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){unpin();return}
  const ln=e.target.closest&&e.target.closest('.codetabs .ln[data-note]');
  if(ln&&e.target===ln&&(e.key==='Enter'||e.key===' ')){e.preventDefault();togglePin(ln)}
});
document.addEventListener('focusout',e=>{
  const ln=e.target.closest&&e.target.closest('.codetabs .ln.pinned');
  if(ln&&!ln.contains(e.relatedTarget))unpin();
});
const LANG_KEY='cg-code-lang';
function applyLang(lang){
  document.querySelectorAll('.codetabs').forEach(box=>{
    /* a box that lacks the chosen language falls back to Python, and one that
       has no Python either (a MATLAB-only guide) to whatever it does have */
    const langs=[...box.querySelectorAll('pre')].map(p=>p.dataset.lang);
    const use=langs.includes(lang)?lang:(langs.includes('python')?'python':langs[0]);
    box.querySelectorAll('pre,.out').forEach(p=>{p.hidden=p.dataset.lang!==use});
    box.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.lang===use));
  });
}
document.querySelectorAll('.codetabs .tabs button').forEach(b=>b.addEventListener('click',()=>{
  localStorage.setItem(LANG_KEY,b.dataset.lang);applyLang(b.dataset.lang)}));
applyLang(localStorage.getItem(LANG_KEY)||'python');

/* ---- glossary: shared store + hover/focus definitions + generated list ----
   data/glossary.json is the single source of truth for every page on the site. */
(async function(){
  let TERMS={}, TITLES={};
  try{
    /* no-store because a cached glossary that predates a term makes that term
       silently vanish from the page. On the built site this becomes a hashed
       filename instead; see BUILD_PLAN. */
    const r=await fetch('data/glossary.json',{cache:'no-store'});
    if(!r.ok) throw new Error(r.status);
    TERMS=(await r.json()).terms;
  }catch(e){ console.error('glossary unavailable:',e); return; }
  /* page titles for "Taught on" (pipeline/python_inventory.py --write); without
     them the definitions still show, just with no pointer to where they are taught */
  try{ const r=await fetch('data/page-titles.json',{cache:'no-store'}); if(r.ok) TITLES=await r.json(); }catch(e){}
  const here=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'');
  const taughtElsewhere=e=>e.taught&&e.taught!==here&&TITLES[e.taught];

  /* the slide decks have no <main>; measure the page body there instead */
  const used=new Set(), main=(document.querySelector('main')||document.body).getBoundingClientRect();
  document.querySelectorAll('dfn[data-g]').forEach(el=>{
    const e=TERMS[el.dataset.g];
    if(!e){
      /* fail loudly rather than quietly dropping the highlight: an unresolved
         term is an authoring error, not something a reader should absorb */
      console.error('glossary: no entry for',el.dataset.g,'- page is out of step with the store');
      el.removeAttribute('data-g');
      return;
    }
    el.setAttribute('data-def',taughtElsewhere(e)?e.def+' Taught on: '+TITLES[e.taught]+'.':e.def);
    el.setAttribute('tabindex','0');
    used.add(el.dataset.g);
    if(el.getBoundingClientRect().left-main.left > main.width-440) el.classList.add('right');
  });
  const dl=document.querySelector('dl.glossary');
  if(!dl)return;
  [...used].map(k=>TERMS[k]).sort((a,b)=>a.term.localeCompare(b.term)).forEach(e=>{
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=e.term;dd.textContent=e.def;
    if(taughtElsewhere(e)){
      const a=document.createElement('a');a.href=e.taught+'.html';a.textContent=TITLES[e.taught];
      dd.append(' Taught on ',a,'.');
    }
    dl.append(dt,dd);
  });
  const all=document.createElement('p');
  all.className='glossary-all';all.innerHTML='<a href="terms.html">Every term in the course</a>';
  dl.after(all);
})();


/* Printing a closed <details> omits its content in most browsers, so every
   answer is opened before the print and restored afterwards. A reader who has
   opened some already keeps them open. */
(() => {
  let wasOpen = null;
  addEventListener('beforeprint', () => {
    const all = [...document.querySelectorAll('.check .ans')];
    wasOpen = all.map(d => d.open);
    all.forEach(d => { d.open = true; });
  });
  addEventListener('afterprint', () => {
    if (!wasOpen) return;
    [...document.querySelectorAll('.check .ans')].forEach((d, i) => { d.open = wasOpen[i]; });
    wasOpen = null;
  });
})();
/* ---- the data phrase, remembered ----
   A student's four words choose their data (assign.js), and nothing about them
   is stored on the server. This keeps them in the browser so any page can find
   them: the header shows them, the data page restores them, and a demo that can
   load "your data" reads them from here. localStorage belongs to the whole
   climbinggiants.com origin, so the phrase follows the student to every course
   site in the same browser, and to no other device. The phrase itself stays the
   way back from anywhere else. */
const PHRASE_KEY = 'cg-data-phrase';
window.cgPhrase = {
  get() { try { return localStorage.getItem(PHRASE_KEY) || ''; } catch (e) { return ''; } },
  set(p) { try { localStorage.setItem(PHRASE_KEY, p); } catch (e) {} cgPhraseChip(); },
  clear() { try { localStorage.removeItem(PHRASE_KEY); } catch (e) {} cgPhraseChip(); }
};
function cgPhraseChip() {
  const box = document.getElementById('cg-phrase');
  if (!box) return;
  const p = window.cgPhrase.get();
  box.textContent = '';
  const a = document.createElement('a');
  a.href = 'data-pack.html';
  /* The label only: the header has no room for the phrase beside it (see the
     .cg-phrase rules in layout.njk), so the phrase goes in the title. */
  a.textContent = 'Your data';
  a.title = p ? 'Your data phrase: ' + p + ' (remembered on this browser)' : 'Get your data phrase';
  box.appendChild(a);
  if (p) {
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = '\u00d7';
    x.title = 'Forget this phrase on this browser (your data is not affected)';
    x.setAttribute('aria-label', 'Forget the remembered data phrase');
    x.onclick = () => window.cgPhrase.clear();
    box.appendChild(x);
  }
}
cgPhraseChip();

/* A link marked data-phrase-handoff carries the remembered phrase to a site on
   another origin (the slope lab), which cannot read this localStorage. It goes
   in the fragment, which the browser never sends to a server; the receiving
   page reads it, keeps it, and clears it from the address bar. Set at click
   time so a phrase entered after the page loaded still travels. */
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[data-phrase-handoff]');
  if (!a) return;
  const p = window.cgPhrase.get();
  const base = a.href.split('#')[0];
  a.href = p ? base + '#phrase=' + encodeURIComponent(p) : base;
});
