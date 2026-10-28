/* Generated bundle: kit, the discrete-evaluation demo, this deck's
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

/* Decimate a real crash channel and re-read the peak. The full-rate record stays
   on screen as the ghost, so what decimation removed is visible rather than
   described. */

let REC = null;

/* Both cases of this page's demo. mountDemo() defines the <cg-demo> element,
   so it is called once, at the end of the file, with every case in one object. */
const DEMOS = {
  decimate: {
    data: async () => {
      const d = await (await fetch('data/test10642-crossmember-x.json')).json();
      const n = d.n, dt = d.dt, a = Float64Array.from(d.a), t = new Float64Array(n);
      for (let i = 0; i < n; i++) t[i] = d.t0 + i * dt;
      let b = 0, c = 0;
      for (let i = 0; i < n; i++) if (t[i] < 0) { b += a[i]; c++; }
      b /= c;
      for (let i = 0; i < n; i++) a[i] -= b;
      REC = {n, dt, a, t, rate: 1 / dt, peak: Math.max(...a.map(Math.abs))};
      return {};
    },
    setting: 'Left rear seat crossmember, longitudinal, recorded at 12&thinsp;500&nbsp;Hz. ' +
             'Keeping every k-th sample and re-reading the peak.',
    source: {kind: 'measured', text: 'Channel 093, left rear seat crossmember, longitudinal, 12&thinsp;500&nbsp;Hz. NHTSA test 10642, 2019 BMW&nbsp;X5 into a rigid barrier at 15.65&nbsp;m/s, TRC of Ohio, 7 January 2019.'},
    caption: 'The faint dashed curve is the full-rate record; the solid curve is what survives ' +
             'decimation. The starting sample decides which of the k samples in each group is ' +
             'kept, and at coarse rates it decides the answer.',
    controls: [
      {key: 'k',  label: 'keep every', min: 1, max: 125, step: 1, value: 1, dp: 0, unit: 'th sample'},
      {key: 'ph', label: 'starting at sample', min: 0, max: 124, step: 1, value: 0, dp: 0}
    ],
    panels: [{label: 'acceleration', unit: 'm/s²', height: 250, xAxis: true,
              xLabel: 'time', xUnit: 'ms', xScale: 1000}],
    readouts: [
      {key: 'rate',  label: 'effective rate'},
      {key: 'kept',  label: 'samples kept'},
      {key: 'peak',  label: 'peak read'},
      {key: 'true',  label: 'peak at full rate'},
      {key: 'lost',  label: 'understated by'}
    ],
    compute(s) {
      const k = Math.max(1, Math.round(s.k));
      const ph = Math.min(k - 1, Math.round(s.ph));
      const xs = [], ys = [];
      for (let i = ph; i < REC.n; i += k) { xs.push(REC.t[i]); ys.push(REC.a[i]); }
      /* the decimated record redrawn on the full time base, so the two curves
         share an axis and the comparison is like for like */
      const step = new Float64Array(REC.n);
      let j = 0;
      for (let i = 0; i < REC.n; i++) {
        while (j + 1 < xs.length && xs[j + 1] <= REC.t[i]) j++;
        step[i] = ys[Math.min(j, ys.length - 1)];
      }
      const peak = ys.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      const lost = 100 * (1 - peak / REC.peak);
      return {
        panels: [{x: REC.t, y: step, ghost: REC.a, range: [-0.005, 0.09],
                  opts: {marks: xs.length < 60
                    ? xs.map((x, i) => ({t: x, y: ys[i]})).filter(m => m.t >= -0.005 && m.t <= 0.09)
                    : []}}],
        readouts: {
          rate: (REC.rate / k).toFixed(0) + ' Hz',
          kept: xs.length.toLocaleString() + ' of ' + REC.n.toLocaleString(),
          peak: peak.toFixed(1) + ' m/s²',
          true: REC.peak.toFixed(1) + ' m/s²',
          lost: lost < 0.05 ? 'nothing' : lost.toFixed(1) + '%'
        }
      };
    }
  }
};


/* ---------------------------------------------------------------------------
   The three static figures.

   Two of them are schematics drawn with diagram(): they argue about the shape a
   curve can take between samples, and there is nothing on them to measure. The
   third is a real plot, because the resonance response is a formula whose values
   the prose quotes and a reader should be able to read off the axis.
--------------------------------------------------------------------------- */

const bump = (x, mu, sd) => Math.exp(-(((x - mu) / sd) ** 2));

/* a curve as diagram() wants it: parallel x and y arrays over [a, b] */
function curveOf(f, a, b, n = 361) {
  const x = new Float64Array(n), y = new Float64Array(n);
  for (let i = 0; i < n; i++) { x[i] = a + (b - a) * i / (n - 1); y[i] = f(x[i]); }
  return {x, y};
}
const atAll = (f, xs) => ({x: Float64Array.from(xs), y: Float64Array.from(xs, f)});

/* --- figure 1: four samples straddling a peak --------------------------- */
function figPeak(host) {
  const f = x => 0.85 * bump(x, 0.46, 0.22);
  const SX = [0.15, 0.35, 0.68, 0.88];
  const samples = atAll(f, SX);
  /* the largest sample, and the largest value: the gap between them is the
     figure */
  let hi = 0;
  for (let i = 0; i < SX.length; i++) if (samples.y[i] > samples.y[hi]) hi = i;
  const PX = 0.46, PY = f(PX);          /* where the curve actually peaks */

  diagram(host, {
    w: 340, h: 200, xRange: [0, 1], yRange: [0, 1.22],
    alt: 'A single peak sampled at four points, two on each side of the peak and '
       + 'none on it. The largest sample is well below the top of the curve.',
    curves: [{x: samples.x, y: samples.y, cls: 'ghost'}, curveOf(f, 0, 1)],
    /* the gap between the two levels is the figure's whole content, so both are
       carried across to the peak rather than left to be inferred */
    leads: [{from: [0.03, samples.y[hi]], to: [PX, samples.y[hi]], cls: 'level'},
            {from: [0.03, PY], to: [PX, PY], cls: 'level'},
            {from: [0.30, 0.99], to: [SX[hi], samples.y[hi] + 0.03]},
            {from: [0.66, 1.06], to: [PX + 0.02, PY + 0.02]}],
    drops: [{x: SX[hi], y: samples.y[hi]}, {x: PX, y: PY}],
    points: [...SX.map((x, i) => ({x, y: samples.y[i]})),
             {x: PX, y: PY, cls: 'miss', r: 4.5}],
    notes: [
      {x: 0.02, y: 1.18, anchor: 'start',
       text: 'the largest sample,\nwhich is what you report'},
      {x: 0.62, y: 1.18, anchor: 'start', cls: 'hi',
       text: 'the largest value,\nwhich is what happened'}
    ]
  });
}

/* --- figure 2: three curves through one set of samples ------------------ */
function figBetween(host) {
  /* one asymmetric hump, and the five samples taken of it. Every curve below
     is this hump plus something that vanishes at all five sample points, so
     the samples are identical across the three panels by construction. */
  const base = x => 0.75 * bump(x, 0.5, x < 0.5 ? 0.30 : 0.24);
  const SX = [0.1, 0.3, 0.5, 0.7, 0.9];
  const samples = atAll(base, SX);

  const spike = x => base(x) + 0.55 * bump(x, 0.60, 0.035);
  const swing = x => base(x) - 0.40 * bump(x, 0.765, 0.025)
                             + 1.00 * bump(x, 0.830, 0.025);

  const read = Math.max(...samples.y);
  const over = f => {
    let m = -Infinity;
    for (let i = 0; i <= 2000; i++) m = Math.max(m, f(i / 2000));
    return m;
  };
  /* the caption quotes how much higher the hidden peak is; compute it rather
     than type it, so the number and the drawing cannot drift apart */
  const pct = Math.round(100 * (over(spike) / read - 1));
  const cap = host.closest('figure').querySelector('.fig-pct');
  if (cap) cap.textContent = pct + '%';

  const common = {
    w: 300, h: 205, xRange: [0, 1], yRange: [-0.30, 1.42], zero: true,
    points: SX.map((x, i) => ({x, y: samples.y[i], r: 3.2}))
  };
  const ghost = {x: samples.x, y: samples.y, cls: 'ghost'};
  const cells = diagramRow(host, 3);

  /* one annotation scheme for all three: a note in the clear top-left corner,
     with a thin leader to whatever it is talking about. The eye then looks in
     the same place in each panel and the differences are in the curves. */
  const NX = 0.03, NY = 1.30;

  diagram(cells[0], {...common, title: 'the peak lands on a sample',
    alt: 'The curve through the samples has its maximum exactly at the largest sample.',
    curves: [ghost, curveOf(base, 0, 1)],
    leads: [{from: [0.40, 1.12], to: [0.50, 0.80]}],
    notes: [{x: NX, y: NY, anchor: 'start',
             text: 'the largest sample is\nthe largest value'}]});

  diagram(cells[1], {...common, title: 'the peak sits in a gap',
    alt: 'The same samples, with a narrow spike between two of them that rises far '
       + 'above every sample.',
    curves: [ghost, curveOf(spike, 0, 1)],
    leads: [{from: [0.40, 1.12], to: [0.585, over(spike) - 0.04]}],
    notes: [{x: NX, y: NY, anchor: 'start', cls: 'hi',
             text: pct + '% higher than\nany sample, and never\nrecorded'}]});

  diagram(cells[2], {...common, title: 'down, then up, in one gap',
    alt: 'The same samples, with the curve dipping below zero and then rising above '
       + 'every sample, all between two adjacent samples.',
    curves: [ghost, curveOf(swing, 0, 1)],
    leads: [{from: [0.42, 1.10], to: [0.756, -0.12]},
            {from: [0.42, 1.10], to: [0.818, 1.04]}],
    notes: [{x: NX, y: NY, anchor: 'start', cls: 'hi',
             text: 'both of these, and\nboth between the same\ntwo samples'}]});
}

/* --- figure 3: the resonance a 2 Hz sweep walks over -------------------- */
const RES = {fn: 18.35, zeta: 0.02, limit: 15, lo: 5, hi: 40, step: 2};
const ampl = f => {
  const r = f / RES.fn;
  return 1 / Math.sqrt((1 - r * r) ** 2 + (2 * RES.zeta * r) ** 2);
};



/* --- figure 4: a 9 Hz signal sampled at 10 Hz is a 1 Hz signal -------------
   The two curves agree at every sample to machine precision, so this figure is
   an identity rather than a near miss, and it is drawn from the identity. */
function figAlias(host) {
  const FS = 10, FTRUE = 9, FALIAS = 1;
  const fast = t => Math.sin(2 * Math.PI * FTRUE * t);
  const slow = t => -Math.sin(2 * Math.PI * FALIAS * t);
  const SX = [];
  for (let k = 0; k <= FS; k++) SX.push(k / FS);

  diagram(host, {
    w: 620, h: 250, xRange: [-0.02, 1.02], yRange: [-1.30, 1.70], zero: true,
    alt: 'A fast nine hertz sine and a slow one hertz sine drawn together. Eleven '
       + 'samples taken ten times a second fall exactly on both curves.',
    curves: [curveOf(fast, 0, 1, 1201),
             {...curveOf(slow, 0, 1, 601), cls: 'alt'}],
    points: SX.map(x => ({x, y: fast(x), r: 4})),
    leads: [{from: [0.30, 1.52], to: [0.166, 0.92]},
            {from: [0.74, 1.52], to: [0.795, 0.99]}],
    notes: [
      {x: 0.30, y: 1.62, anchor: 'end',
       text: '9 Hz, what happened'},
      {x: 0.74, y: 1.62, anchor: 'start', cls: 'hi',
       text: '1 Hz, what the record shows'},
      {x: 0.5, y: -1.16, anchor: 'middle',
       text: 'eleven samples, ten per second, on both curves at once'}
    ]
  });
}

for (const [id, draw] of [['fig-peak', figPeak], ['fig-between', figBetween],
                          ['fig-alias', figAlias]]) {
  const host = document.querySelector('#' + id + ' .fig-body');
  if (host) draw(host);
}

/* ---------------------------------------------------------------------------
   The resonance sweep, with the step size in the reader's hand.

   The page used to carry a table of five step sizes. The table said what
   refinement does; the slider lets the reader do it, and the verdict flipping
   from pass to fail between the first two steps is the whole section.

   The step runs on a log scale and snaps to whole powers of two, so each notch
   of the slider is one halving: 4, 2, 1, 0.5, 0.25, 0.125 Hz. That is how the
   refinement is actually reasoned about, and a continuous slider made the
   halving itself impossible to hit.
--------------------------------------------------------------------------- */
DEMOS.resonance = {
    setting: 'A machine that can run anywhere from 5 to 40&nbsp;Hz, mounted on a structure with ' +
             'a natural frequency of 18.35&nbsp;Hz and a damping ratio of 0.02. The requirement ' +
             'is that the structure never amplify the forcing by more than 15.',
    source: {kind: 'constructed', text: 'The standard single-degree-of-freedom amplification, at ' +
             '<em>f<sub>n</sub></em> = 18.35&nbsp;Hz and &zeta; = 0.02. The true peak ' +
             '1&thinsp;/&thinsp;(2&zeta;&radic;(1&minus;&zeta;&sup2;)) = 25.005 is known in closed ' +
             'form, which is why the example uses a formula. No recording comes with its own exact answer.'},
    caption: 'The curve is the response. The gold dots are the points the sweep actually ' +
             'evaluates, the shaded band is where the structure exceeds the limit, and the open ' +
             'ring is the true maximum. At a 2&nbsp;Hz step every dot lies outside the band and ' +
             'the sweep reports a pass.',
    controls: [{key: 'lstep', label: 'step', min: Math.log2(0.125), max: Math.log2(4),
                step: 1, value: 1, dp: 3,
                fmt: v => Math.pow(2, v).toFixed(3).replace(/0+$/, '').replace(/\.$/, ''),
                unit: 'Hz'}],
    panels: [{label: 'amplification', unit: '', height: 250, xAxis: true,
              xLabel: 'drive frequency', xUnit: 'Hz', xScale: 1}],
    readouts: [
      {key: 'n',     label: 'evaluations'},
      {key: 'found', label: 'largest found'},
      {key: 'at',    label: 'at'},
      {key: 'true',  label: 'true maximum'},
      {key: 'miss',  label: 'understated by'},
      {key: 'verd',  label: 'verdict against 15'}
    ],
    compute(s) {
      const step = Math.pow(2, s.lstep);
      const n = 4001, x = new Float64Array(n), y = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        x[i] = RES.lo + (RES.hi - RES.lo) * i / (n - 1);
        y[i] = ampl(x[i]);
      }
      let b0 = null, b1 = null;
      for (let i = 0; i < n; i++) if (y[i] > RES.limit) { if (b0 === null) b0 = x[i]; b1 = x[i]; }
      let peakX = x[0];
      for (let i = 0; i < n; i++) if (y[i] > ampl(peakX)) peakX = x[i];

      const grid = [];
      for (let f = RES.lo; f <= RES.hi + 1e-9; f += step) grid.push(f);
      let best = grid[0];
      for (const f of grid) if (ampl(f) > ampl(best)) best = f;
      const found = ampl(best), truth = ampl(peakX);

      return {
        panels: [{x, y, range: [RES.lo, RES.hi], opts: {
          bands: [{x0: b0, x1: b1}],
          hlines: [{y: RES.limit, text: 'limit ' + RES.limit}],
          marks: [
            ...(grid.length <= 300 ? grid.map(f => ({t: f, y: ampl(f)})) : []),
            {t: peakX, y: truth, cast: 'y', ring: true, dx: 10, dy: -6,
             text: truth.toFixed(1) + ' at ' + peakX.toFixed(2) + ' Hz'},
            {t: best, y: found, dx: 9, dy: 14,
             text: 'best of ' + grid.length + ': ' + found.toFixed(1)}
          ]}}],
        readouts: {
          n: String(grid.length),
          found: found.toFixed(2),
          at: best.toFixed(3) + ' Hz',
          true: truth.toFixed(2),
          miss: (100 * (1 - found / truth)).toFixed(1) + '%',
          verd: found > RES.limit ? 'fails, correctly' : 'passes, wrongly'
        }
      };
    }
};

/* ---------------------------------------------------------------------------
   The same sweep, seen from inside it.

   DEMOS.resonance draws the response curve, shades the band above the limit,
   and rings the true maximum. That is the right picture for the notes page,
   where the reader is being shown what a coarse sweep walked over.

   It is the wrong picture for the part of the lecture that asks the student to
   find the worst speed, because it hands them the answer before they look. So
   this case shows only what the evaluations bought: a polyline through the
   points that were computed, the limit, and the largest value found. No curve
   underneath, no band, no ring, and no readout of a truth nobody measured.

   And the deception is the point. Eighteen evaluations joined up look smooth,
   and comfortably under the limit. Nothing on the screen suggests otherwise.
--------------------------------------------------------------------------- */
DEMOS['resonance-sweep'] = {
    setting: 'A machine that can run anywhere from 5 to 40&nbsp;Hz, mounted on a steel frame. ' +
             'The requirement is that the frame never amplify the forcing by more than 15. ' +
             'One evaluation runs the frame at one speed and reports how much it amplified.',
    source: {kind: 'constructed', text: 'The same structure as the demo above, evaluated only at ' +
             'the swept points. The response between them is not drawn, because a sweep does not ' +
             'produce it.'},
    caption: 'The gold dots are the speeds actually evaluated, joined up. The line between two ' +
             'dots was drawn by the plot, not computed by anything.',
    controls: [{key: 'lstep', label: 'step', min: Math.log2(0.125), max: Math.log2(4),
                step: 1, value: 1, dp: 3,
                fmt: v => Math.pow(2, v).toFixed(3).replace(/0+$/, '').replace(/\.$/, ''),
                unit: 'Hz'}],
    /* The y axis is pinned, for two reasons. Left to scale itself it stops at
       the largest evaluated value, which at a 2 Hz step is about 12, and then
       the limit line at 15 falls off the top of the plot and is not drawn at
       all -- so the slide asks the student to check a threshold it does not
       show. And pinning it to the same range the revealing demo uses means the
       two pictures can be compared: the peak grows into space that was already
       on screen, instead of the axis quietly rescaling under it. */
    panels: [{label: 'amplification', unit: '', height: 250, xAxis: true,
              xLabel: 'drive frequency', xUnit: 'Hz', xScale: 1,
              yClamp: [0, 27.5]}],
    readouts: [
      {key: 'n',     label: 'evaluations'},
      {key: 'found', label: 'largest found'},
      {key: 'at',    label: 'at'},
      {key: 'verd',  label: 'verdict against 15'}
    ],
    compute(s) {
      const step = Math.pow(2, s.lstep);
      const grid = [];
      for (let f = RES.lo; f <= RES.hi + 1e-9; f += step) grid.push(f);
      const x = Float64Array.from(grid), y = Float64Array.from(grid, ampl);
      let best = grid[0];
      for (const f of grid) if (ampl(f) > ampl(best)) best = f;
      const found = ampl(best);
      return {
        panels: [{x, y, range: [RES.lo, RES.hi], opts: {
          hlines: [{y: RES.limit, text: 'limit ' + RES.limit}],
          marks: [
            ...(grid.length <= 300 ? grid.map(f => ({t: f, y: ampl(f)})) : []),
            {t: best, y: found, dx: 9, dy: 14,
             text: 'best of ' + grid.length + ': ' + found.toFixed(1)}
          ]}}],
        readouts: {
          n: String(grid.length),
          found: found.toFixed(2),
          at: best.toFixed(3) + ' Hz',
          verd: found > RES.limit ? 'fails' : 'passes'
        }
      };
    }
};

/* ---------------------------------------------------------------------------
   Narrowing the search.

   The 1 Hz sweep's largest value is at 18 Hz. The only place a larger value can
   hide, on the assumption that the response has one peak, is in the two steps
   either side of it, 17 to 18 and 18 to 19. So the second sweep evaluates only
   there, at a much finer step, and costs a small fraction of refining the whole
   range to that step.

   The top panel is the whole operating range with the narrowed region shaded;
   the bottom panel is the narrowed region itself, where the fine points are far
   enough apart to see.
--------------------------------------------------------------------------- */
const ZOOM = {coarse: 1, lo: 17, hi: 19};
DEMOS['resonance-zoom'] = {
    setting: 'The same frame and the same limit of 15. A first sweep at 1&nbsp;Hz found its ' +
             'largest amplification at 18&nbsp;Hz. The second sweep evaluates only between ' +
             'that point&rsquo;s neighbors, 17 and 19&nbsp;Hz.',
    source: {kind: 'constructed', text: 'The same structure as the demos above, evaluated only at ' +
             'the swept points. Narrowing assumes the response has one peak, so that nothing ' +
             'larger is hiding elsewhere in the range.'},
    caption: 'Top: the whole range, the 1&nbsp;Hz sweep, and the shaded region the second sweep ' +
             'covers. Bottom: that region alone, with every point evaluated in it.',
    controls: [{key: 'lfine', label: 'fine step', min: -6, max: -1,
                step: 1, value: -5, dp: 4,
                fmt: v => { const d = Math.pow(2, -v); return '1/' + d; },
                unit: 'Hz'}],
    panels: [{label: 'amplification', unit: '', height: 165, xAxis: true,
              xLabel: 'drive frequency', xUnit: 'Hz', xScale: 1, yClamp: [0, 27.5]},
             {label: 'amplification', unit: '', height: 165, xAxis: true,
              xLabel: 'drive frequency', xUnit: 'Hz', xScale: 1, yClamp: [0, 27.5]}],
    readouts: [
      {key: 'n',     label: 'evaluations'},
      {key: 'found', label: 'largest found'},
      {key: 'at',    label: 'at'},
      {key: 'verd',  label: 'verdict against 15'},
      {key: 'whole', label: 'whole range at this step'}
    ],
    compute(s) {
      const h = Math.pow(2, s.lfine);
      const coarse = [];
      for (let f = RES.lo; f <= RES.hi + 1e-9; f += ZOOM.coarse) coarse.push(f);
      const nf = Math.round((ZOOM.hi - ZOOM.lo) / h) + 1;
      const fine = Array.from({length: nf}, (_, i) => ZOOM.lo + i * h);
      /* 17, 18 and 19 were already evaluated by the coarse sweep */
      const fresh = fine.filter(f => Math.abs(f - Math.round(f)) > 1e-9);
      const all = [...coarse, ...fresh].sort((a, b) => a - b);
      let best = all[0];
      for (const f of all) if (ampl(f) > ampl(best)) best = f;
      const found = ampl(best);
      const x = Float64Array.from(all), y = Float64Array.from(all, ampl);
      const wholeN = Math.round((RES.hi - RES.lo) / h) + 1;
      const hl = [{y: RES.limit, text: 'limit ' + RES.limit}];
      return {
        panels: [
          {x, y, range: [RES.lo, RES.hi], opts: {
            hlines: hl, bands: [{x0: ZOOM.lo, x1: ZOOM.hi}],
            marks: coarse.map(f => ({t: f, y: ampl(f)}))}},
          {x, y, range: [ZOOM.lo, ZOOM.hi], opts: {
            hlines: hl,
            marks: [
              ...fine.map(f => ({t: f, y: ampl(f)})),
              {t: best, y: found, dx: 0, dy: -12, anchor: 'middle',
               text: 'best of ' + all.length + ': ' + found.toFixed(1)}]}}],
        readouts: {
          n: coarse.length + ' + ' + fresh.length + ' = ' + all.length,
          found: found.toFixed(2),
          at: best.toFixed(3) + ' Hz',
          verd: found > RES.limit ? 'fails' : 'passes',
          whole: String(wholeN)
        }
      };
    }
};

mountDemo(DEMOS);


/* ---------------------------------------------------------------------------
   What a film leaves out.

   The video opens on this analogy and talks over static prose for about eighty
   seconds. The frames are drawable and the gaps between them are the claim.
--------------------------------------------------------------------------- */
(() => {
  const host = document.querySelector('#fig-film .fig-body');
  if (!host) return;

  const N = 6;
  const path = t => 0.52 + 0.30 * Math.sin(t * 5.3) * Math.cos(t * 1.7 + 0.4);
  const xs = [], ys = [];
  for (let i = 0; i <= 300; i++) { const t = i / 300; xs.push(t); ys.push(path(t)); }

  const frames = [], dots = [], notes = [];
  for (let k = 0; k < N; k++) {
    const t = (k + 0.5) / N;
    const hw = 0.042;   /* a shutter is open about half the time */
    frames.push({cls: 'fill', pts: [{x: t - hw, y: 0.06}, {x: t + hw, y: 0.06},
                                    {x: t + hw, y: 0.98}, {x: t - hw, y: 0.98}]});
    dots.push({x: t, y: path(t), r: 4});
  }

  diagram(host, {
    w: 660, h: 220, xRange: [0, 1], yRange: [0, 1.12], axes: false,
    alt: 'Six tall frames evenly spaced across the figure, each with a dot in it marking where '
       + 'the subject was at that exposure. A continuous line runs through all six dots, and the '
       + 'parts of the line between the frames are what the film never recorded.',
    areas: frames,
    curves: [{x: xs, y: ys, cls: 'trace'}],
    points: dots,
    notes: [
      {x: 0.5 / N, y: 1.06, anchor: 'middle', text: 'frame 1'},
      {x: 5.5 / N, y: 1.06, anchor: 'middle', text: 'frame 6'},
      {x: 0.5, y: 1.06, anchor: 'middle', cls: 'hi',
       text: 'the line between two frames was never photographed'}
    ]
  });
})();

/* ---------------------------------------------------------------------------
   Every answer the record can give at 250 Hz.

   The offsets table is six rows read aloud over about a minute. All fifty
   offsets, computed from the same channel the demo loads, make the point in one
   look: the spread is the figure, and the convention is just one dot in it.
--------------------------------------------------------------------------- */
(async () => {
  const host = document.querySelector('#fig-offsets .fig-body');
  if (!host) return;
  let a;
  try {
    const d = await (await fetch('data/test10642-crossmember-x.json')).json();
    /* the same baseline the demo above removes: the mean of the pre-trigger
       samples. Without it every dot sits 0.21 above the table on this page. */
    a = Float64Array.from(d.a);
    let b = 0, c = 0;
    for (let i = 0; i < d.n; i++) if (d.t0 + i * d.dt < 0) { b += a[i]; c++; }
    b /= c;
    for (let i = 0; i < d.n; i++) a[i] -= b;
  } catch (e) { return; }
  if (!a || !a.length) return;

  const K = 50;
  const peaks = [];
  for (let s = 0; s < K; s++) {
    let m = 0;
    for (let i = s; i < a.length; i += K) { const v = Math.abs(a[i]); if (v > m) m = v; }
    peaks.push(m);
  }
  const lo = Math.min(...peaks), hi = Math.max(...peaks);

  diagram(host, {
    w: 660, h: 240, xRange: [-2, K + 1], yRange: [0, hi * 1.16],
    title: 'peak reported (m/s\u00b2) against the sample the decimation starts on',
    alt: 'Fifty dots, one per starting offset. Their heights range from about 421 to 1540 meters '
       + 'per second squared. The dot for offset zero, which is the convention every language '
       + 'gives you, sits in the middle of the range.',
    leads: [{from: [-2, hi], to: [K + 1, hi], cls: 'level'},
            {from: [2.2, hi * 0.695], to: [0.4, peaks[0] * 1.04]}],
    points: peaks.map((v, s) => ({x: s, y: v, r: s === 0 ? 5 : 3.2,
                                  cls: s === 0 ? 'miss' : 'dot'})),
    notes: [
      {x: K, y: hi * 1.055, anchor: 'end', text: 'the true peak, ' + hi.toFixed(1)},
      {x: 2.4, y: hi * 0.70, cls: 'hi', text: 'offset 0,\nwhat every language gives you'},
      {x: K * 0.62, y: lo * 0.55, anchor: 'middle',
       text: 'the worst offset reports ' + lo.toFixed(0)}
    ]
  });
})();

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

/* Class 2's figures and demos.

   The data figures are drawn in the browser from the two held-back crash tests
   the example reports use, data/example/10642.json (2019 BMW X5, 12.5 kHz) and
   data/example/09793.json (2017 Hyundai Elantra, 20 kHz). No phrase assigns
   either, so no student's own data is on screen. "About 1 kHz" is every 12th
   sample of the X5 (1042 Hz) and every 20th of the Elantra (1000 Hz).

   Static figures use chart() below, which draws every sample it is given. The
   kit's panel() thins an overlay curve to about 900 points across the whole
   record, which dropped the peaks from a dashed full-rate curve, so the live
   demos (which use panel() through makeDemo) are handed only the samples
   inside their window.

   A host is <div class="c2fig" data-c2="name">. Nothing here uses <cg-demo>,
   which the discrete-evaluation module registers first with its own cases. The
   live demos stop their clicks from reaching the deck, which would otherwise
   advance a slide. */
(() => {
  const SOURCE = {kind: 'measured', text: 'NHTSA tests 10642 (2019 BMW&nbsp;X5) and 9793 ' +
    '(2017 Hyundai Elantra), both full frontal into a rigid barrier. Held back from the phrase ' +
    'assignment.'};
  const K1 = {10642: 12, 9793: 20};          /* the step that gives about 1 kHz */
  const CAR = {10642: 'X5', 9793: 'Elantra'};
  const NAME = {head_x: 'head X', head_y: 'head Y', head_z: 'head Z', chest_x: 'chest',
    chest_d: 'chest deflection', pelvis_x: 'pelvis', vehicle_x: 'crossmember',
    pass_head_x: 'passenger head'};

  /* ------------------------------------------------------------ the data */
  const load = f => fetch(f).then(r => r.json()).then(j => {
    const T = {no: j.testNo, ch: {}};
    for (const [key, c] of Object.entries(j.channels)) {
      const n = c.n, dt = c.dt, t = new Float64Array(n), y = Float64Array.from(c.y);
      for (let i = 0; i < n; i++) t[i] = c.t0 + i * dt;
      /* remove the pre-impact baseline, as the notes page does */
      let b = 0, m = 0;
      for (let i = 0; i < n; i++) if (t[i] < 0) { b += y[i]; m++; }
      if (m) { b /= m; for (let i = 0; i < n; i++) y[i] -= b; }
      let ip = 0;
      for (let i = 1; i < n; i++) if (Math.abs(y[i]) > Math.abs(y[ip])) ip = i;
      T.ch[key] = {key, test: j.testNo, n, dt, t, y, ip, peak: Math.abs(y[ip]),
                   sign: Math.sign(y[ip]) || 1, rate: 1 / dt};
    }
    return T;
  });
  const ready = Promise.all([load('data/example/10642.json'), load('data/example/09793.json')])
    .then(([a, b]) => ({10642: a, 9793: b}));

  /* keep every k-th sample, from sample s */
  function decimate(ch, k, s) {
    const t = [], y = [];
    for (let i = s; i < ch.n; i += k) { t.push(ch.t[i]); y.push(ch.y[i]); }
    return {t: Float64Array.from(t), y: Float64Array.from(y)};
  }
  /* the samples of a record (or a decimated one) inside [a, b] */
  function win(r, a, b) {
    const t = [], y = [];
    for (let i = 0; i < r.t.length; i++) if (r.t[i] >= a && r.t[i] <= b) { t.push(r.t[i]); y.push(r.y[i]); }
    return {t: Float64Array.from(t), y: Float64Array.from(y)};
  }
  const peakOf = y => { let m = 0; for (const v of y) m = Math.max(m, Math.abs(v)); return m; };

  /* the peak each starting sample reads at every k-th */
  const memo = new Map();
  function starts(ch, k) {
    const key = ch.test + ch.key + ':' + k;
    if (!memo.has(key)) {
      const out = [];
      for (let s = 0; s < k; s++) {
        let m = 0;
        for (let i = s; i < ch.n; i += k) m = Math.max(m, Math.abs(ch.y[i]));
        out.push(m);
      }
      memo.set(key, out);
    }
    return memo.get(key);
  }
  const worstKept = (ch, k) => 100 * Math.min(...starts(ch, k)) / ch.peak;

  /* width of the peak at half its height, in samples */
  function halfWidth(ch) {
    const h = ch.peak / 2;
    let l = ch.ip, r = ch.ip;
    while (l > 0 && Math.abs(ch.y[l]) > h) l--;
    while (r < ch.n - 1 && Math.abs(ch.y[r]) > h) r++;
    return {l, r, w: r - l};
  }

  /* the change in velocity: the area under an acceleration record */
  function area(t, y) {
    let s = 0;
    for (let i = 1; i < t.length; i++) s += 0.5 * (y[i] + y[i - 1]) * (t[i] - t[i - 1]);
    return s;
  }

  /* share of a channel's signal faster than a frequency: a radix-2 FFT of the
     zero-padded record, then the power above the cut over the total */
  function spectrum(ch) {
    if (ch.spec) return ch.spec;
    let N = 1; while (N < ch.n) N <<= 1;
    const re = new Float64Array(N), im = new Float64Array(N);
    let mean = 0; for (const v of ch.y) mean += v; mean /= ch.n;
    for (let i = 0; i < ch.n; i++) re[i] = ch.y[i] - mean;
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= N; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a), h = len / 2;
      for (let i = 0; i < N; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < h; k++) {
          const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + h] * cr - im[i + k + h] * ci;
          const vi = re[i + k + h] * ci + im[i + k + h] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + h] = ur - vr; im[i + k + h] = ui - vi;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
    const half = N / 2, above = new Float64Array(half + 2);   /* power from bin j up */
    for (let j = half; j >= 1; j--) above[j] = above[j + 1] + re[j] * re[j] + im[j] * im[j];
    ch.spec = {df: 1 / (N * ch.dt), above, total: above[1]};
    return ch.spec;
  }
  function tooFast(ch, f) {
    const s = spectrum(ch);
    const j = Math.min(s.above.length - 1, Math.max(1, Math.ceil(f / s.df)));
    return 100 * s.above[j] / s.total;
  }

  const hz = r => r >= 10000 ? (r / 1000).toFixed(1).replace(/\.0$/, '') + ' kHz'
                             : Math.round(r).toLocaleString('en-US') + ' Hz';
  const pct = v => (v >= 99.95 ? '100' : v < 1 ? v.toFixed(2) : v.toFixed(1)) + '%';
  const yRange = (rs, pad = 0.12) => {
    let lo = 0, hi = 0;
    for (const r of rs) for (const v of r.y) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const p = pad * (hi - lo);
    return [lo - p, hi + p];
  };

  /* ------------------------------------------------------- chart(): SVG */
  /* A plain chart that draws exactly what it is given. Text is sized for a
     projector. o = {h, alt, x: {lo, hi, log, label, ticks, fmt}, y: {...},
     series: [{x, y, cls, line, dots, r, shape}], hlines: [{y, cls, text}],
     vlines: [{x, cls, text}], bands: [{x0, x1}], labels: [{x, y, text, anchor,
     dx, dy, cls}], padL} */
  function chart(host, o) {
    const W = o.w || 900, H = o.h || 360, L = o.padL ?? 86, R = o.padR ?? 18, T = o.padT ?? 30,
          B = o.x.label ? 56 : 34;
    const svg = svgEl('svg', {viewBox: `0 0 ${W} ${H}`, class: 'cgp c2chart', role: 'img'});
    if (o.alt) svg.setAttribute('aria-label', o.alt);
    host.appendChild(svg);
    const lg = (log, v) => log ? Math.log10(v) : v;
    const X = v => L + (lg(o.x.log, v) - lg(o.x.log, o.x.lo)) /
                       (lg(o.x.log, o.x.hi) - lg(o.x.log, o.x.lo)) * (W - L - R);
    const Y = v => T + (lg(o.y.log, o.y.hi) - lg(o.y.log, v)) /
                       (lg(o.y.log, o.y.hi) - lg(o.y.log, o.y.lo)) * (H - T - B);
    const inX = v => v >= o.x.lo - 1e-12 && v <= o.x.hi + 1e-12;
    const add = (n, a, txt) => { const e = svgEl(n, a); if (txt !== undefined) e.textContent = txt;
      svg.appendChild(e); return e; };
    const num = v => MINUS(Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US')
                         : String(+v.toPrecision(4)));
    const yt = o.y.ticks || (o.y.log ? decadeTicks(o.y.lo, o.y.hi) : niceTicks(o.y.lo, o.y.hi, 4));
    const xt = o.x.ticks || (o.x.log ? decadeTicks(o.x.lo, o.x.hi) : niceTicks(o.x.lo, o.x.hi, 6));
    for (const b of o.bands || []) {
      const x0 = X(Math.max(b.x0, o.x.lo)), x1 = X(Math.min(b.x1, o.x.hi));
      if (x1 > x0) add('rect', {class: b.cls || 'band', x: x0, y: T, width: x1 - x0, height: H - T - B});
    }
    for (const v of yt) {
      add('line', {class: 'grid', x1: L, x2: W - R, y1: Y(v), y2: Y(v)});
      add('text', {class: 'tick', x: L - 10, y: Y(v) + 5, 'text-anchor': 'end'}, (o.y.fmt || num)(v));
    }
    for (const v of xt) {
      if (!inX(v)) continue;
      if (o.x.grid) add('line', {class: 'grid', x1: X(v), x2: X(v), y1: T, y2: H - B});
      add('text', {class: 'tick', x: X(v), y: H - B + 20, 'text-anchor': 'middle'}, (o.x.fmt || num)(v));
    }
    add('line', {class: 'zero', x1: L, x2: W - R, y1: H - B, y2: H - B});
    if (o.y.zero && o.y.lo < 0 && o.y.hi > 0)
      add('line', {class: 'zero', x1: L, x2: W - R, y1: Y(0), y2: Y(0)});
    if (o.y.label) add('text', {class: 'ylab', x: 4, y: 18}, o.y.label);
    if (o.x.label) add('text', {class: 'tick', x: W - R, y: H - 8, 'text-anchor': 'end'}, o.x.label);
    for (const h of o.hlines || []) {
      add('line', {class: h.cls || 'limit', x1: L, x2: W - R, y1: Y(h.y), y2: Y(h.y)});
      if (h.text) add('text', {class: 'mk', x: W - R - 4, y: Y(h.y) - 7, 'text-anchor': 'end'}, h.text);
    }
    for (const v of o.vlines || []) {
      add('line', {class: v.cls || 'cast', x1: X(v.x), x2: X(v.x), y1: T, y2: H - B});
      if (v.text) add('text', {class: 'mk', x: X(v.x) + (v.dx ?? -6), y: T + (v.dy ?? 14),
        'text-anchor': v.anchor || 'end'}, v.text);
    }
    for (const s of o.series || []) {
      if (s.line !== false) {
        let d = '', open = false;
        for (let i = 0; i < s.x.length; i++) {
          if (!inX(s.x[i]) || !isFinite(s.y[i])) { open = false; continue; }
          d += (open ? 'L' : 'M') + X(s.x[i]).toFixed(2) + ' ' + Y(s.y[i]).toFixed(2); open = true;
        }
        if (d) add('path', {class: s.cls, d});
      }
      if (s.dots) for (let i = 0; i < s.x.length; i++) {
        if (!inX(s.x[i]) || !isFinite(s.y[i])) continue;
        const r = s.r || 4;
        if (s.shape === 'square')
          add('rect', {class: s.dots, x: X(s.x[i]) - r, y: Y(s.y[i]) - r, width: 2 * r, height: 2 * r});
        else add('circle', {class: s.dots, cx: X(s.x[i]), cy: Y(s.y[i]), r});
      }
    }
    for (const l of o.labels || [])
      add('text', {class: l.cls || 'mk', x: X(l.x) + (l.dx || 0), y: Y(l.y) + (l.dy || 0),
                   'text-anchor': l.anchor || 'start'}, l.text);
    return {X, Y, svg, add};
  }
  const ms = v => MINUS(String(+(v * 1000).toFixed(3)));

  /* ---------------------------------------------------------- the figures */
  const FIGS = {

    /* what each logger records: the present one and the proposed one */
    request(host, D) {
      /* the crossmember only: the head would answer the vote two slides on */
      for (const [key, a, b] of [['vehicle_x', 0.004, 0.020]]) {
        const ch = D[10642].ch[key], full = win(ch, a, b), slow = win(decimate(ch, 12, 0), a, b);
        const yr = yRange([full]);
        chart(host, {h: 460, y: {lo: yr[0], hi: yr[1], zero: true, label: 'X5 ' + NAME[key] + ' (m/s²)'},
          x: {lo: a, hi: b, fmt: ms, label: 'time (ms)'},
          series: [{x: full.t, y: full.y, cls: 'c2-faint', dots: 'c2p-head', r: key === 'head_x' ? 1.6 : 2.6},
                   {x: slow.t, y: slow.y, cls: 'c2-amber', dots: 'c2p-amber', r: key === 'head_x' ? 3.6 : 6}]});
      }
    },

    /* the line between dots is a guess, and with fewer dots it is a worse one */
    line(host, D) {
      const ch = D[10642].ch.vehicle_x, a = 0.0085, b = 0.0145;
      const full = win(ch, a, b), slow = win(decimate(ch, 12, 0), a, b), yr = yRange([full]);
      chart(host, {h: 290, y: {lo: yr[0], hi: yr[1], zero: true, label: '12.5 kHz: every sample'},
        x: {lo: a, hi: b, fmt: ms},
        series: [{x: full.t, y: full.y, cls: 'c2-head', dots: 'c2p-head', r: 3.4}]});
      chart(host, {h: 310, y: {lo: yr[0], hi: yr[1], zero: true, label: '1042 Hz: every 12th sample'},
        x: {lo: a, hi: b, fmt: ms, label: 'time (ms)'},
        series: [{x: full.t, y: full.y, cls: 'c2-faint'},
                 {x: slow.t, y: slow.y, cls: 'c2-amber', dots: 'c2p-amber', r: 6}]});
    },

    /* the two channels for the first vote, every sample drawn */
    two(host, D) {
      for (const [key, cls] of [['head_x', 'c2-head'], ['vehicle_x', 'c2-cross']]) {
        const r = win(D[10642].ch[key], -0.005, 0.15), yr = yRange([r], 0.08);
        chart(host, {h: 290, y: {lo: yr[0], hi: yr[1], zero: true, label: 'X5 ' + NAME[key] + ' (m/s²)'},
          x: {lo: -0.005, hi: 0.15, fmt: ms, label: key === 'vehicle_x' ? 'time (ms)' : ''},
          series: [{x: r.t, y: r.y, cls}]});
      }
    },

    /* the occupant lags the structure. Three channels from the car inward, each
       marked where it starts (first time it stays above 2 g for 1 ms) and at its
       largest value. */
    lag(host, D) {
      const G2 = 2 * 9.81, whole = v => String(Math.round(v * 1000));
      const rows = [['vehicle_x', 'c2-cross'], ['pelvis_x', 'c2-amber'], ['head_x', 'c2-head']];
      rows.forEach(([key, cls], k) => {
        const ch = D[10642].ch[key], m = Math.round(0.001 / ch.dt);
        let on = 0;
        for (let i = 0; i < ch.n && !on; i++) {
          if (ch.t[i] < 0) continue;
          let held = true;
          for (let j = i; j < Math.min(ch.n, i + m); j++) if (Math.abs(ch.y[j]) <= G2) { held = false; break; }
          if (held) on = ch.t[i];
        }
        const tp = ch.t[ch.ip], r = win(ch, -0.005, 0.12), yr = yRange([r], 0.08), last = k === rows.length - 1;
        /* the markers' labels sit in a strip above the plot, clear of the trace */
        chart(host, {h: last ? 214 : 184, padT: 46,
          y: {lo: yr[0], hi: yr[1], zero: true, label: 'X5 ' + NAME[key] + ' (m/s²)'},
          x: {lo: -0.005, hi: 0.12, fmt: ms, label: last ? 'time (ms)' : ''},
          vlines: [{x: on, text: 'starts ' + whole(on) + ' ms', dy: -6},
                   {x: tp, text: 'largest ' + whole(tp) + ' ms', anchor: 'start', dx: 6, dy: -6}],
          series: [{x: r.t, y: r.y, cls}]});
      });
    },

    /* the samples across each peak. Top: the head's whole pulse and its band,
       with the zoom window marked. Below: the same 2.6 ms around each peak,
       every sample a countable dot. */
    width(host, D) {
      const head = D[10642].ch.head_x, cross = D[10642].ch.vehicle_x, HALF = 0.0013;
      const hh = halfWidth(head), hw = win(head, 0.050, 0.100), tp = head.t[head.ip];
      chart(host, {h: 260, y: {lo: -1.12 * head.peak, hi: 0.12 * head.peak, zero: true,
          label: 'X5 head X (m/s²), its whole pulse'},
        x: {lo: 0.050, hi: 0.100, fmt: ms, label: 'time (ms)'},
        bands: [{x0: head.t[hh.l], x1: head.t[hh.r]}, {x0: tp - HALF, x1: tp + HALF, cls: 'pctband'}],
        hlines: [{y: -head.peak / 2, text: 'half height'}],
        series: [{x: hw.t, y: hw.y, cls: 'c2-head'}],
        labels: [{x: tp + 0.0016, y: -0.08 * head.peak, anchor: 'start', text: '← zoomed below', cls: 'c2lab'}]});
      const row = document.createElement('div');
      row.className = 'c2row';
      host.appendChild(row);
      for (const [ch, dots, name] of [[head, 'c2p-head', 'head X'], [cross, 'c2p-cross', 'crossmember']]) {
        const h = halfWidth(ch), t0 = ch.t[ch.ip], w = win(ch, t0 - HALF, t0 + HALF);
        const yr = ch === head ? [-1.12 * ch.peak, 0.12 * ch.peak] : yRange([w]);
        const cell = document.createElement('div');
        row.appendChild(cell);
        chart(cell, {w: 450, h: 300, padL: 64, y: {lo: yr[0], hi: yr[1], zero: true,
            label: 'X5 ' + name + ', 2.6 ms at its peak'},
          x: {lo: t0 - HALF, hi: t0 + HALF, ticks: [t0 - 0.001, t0, t0 + 0.001],
              fmt: v => MINUS(((v - t0) * 1000).toFixed(0)) + ' ms'},
          bands: [{x0: ch.t[h.l], x1: ch.t[h.r]}],
          hlines: [{y: ch.sign * ch.peak / 2, text: 'half height'}],
          series: [{x: w.t, y: w.y, line: false, dots, r: 5}]});
      }
    },

    /* all sixteen channels: samples across the peak at about 1 kHz against the
       worst share of the peak kept */
    rule(host, D) {
      const pts = {10642: [[], []], 9793: [[], []]}, labels = [];
      for (const no of [10642, 9793]) for (const ch of Object.values(D[no].ch)) {
        const x = halfWidth(ch).w / K1[no], y = worstKept(ch, K1[no]);
        pts[no][0].push(x); pts[no][1].push(y);
        /* two labels sit on top of each other near 30 samples, so they are moved apart */
        const off = {'10642head_z': {dx: -14, dy: -12, anchor: 'end'},
                     '9793chest_x': {dx: 14, dy: 22, anchor: 'start'}}[no + ch.key] ||
                    {dx: x < 2 ? 12 : -12, dy: 5, anchor: x < 2 ? 'start' : 'end'};
        if (y < 95) labels.push({x, y, text: CAR[no] + ' ' + NAME[ch.key], cls: 'c2lab', ...off});
      }
      chart(host, {h: 420, y: {lo: 30, hi: 103, label: 'worst share of the peak kept (%)'},
        x: {lo: 0.1, hi: 100, log: true, grid: true, label: 'samples across the peak at about 1 kHz',
            fmt: v => String(v)},
        hlines: [{y: 95, text: '5% low'}],
        series: [{x: pts[10642][0], y: pts[10642][1], line: false, dots: 'c2p-head', r: 8},
                 {x: pts[9793][0], y: pts[9793][1], line: false, dots: 'c2p-amber', r: 7, shape: 'square'}],
        labels});
    },

    /* the twelve starting samples, for the head and the crossmember */
    starts(host, D) {
      const xs = Float64Array.from({length: 12}, (_, i) => i), series = [], labels = [];
      for (const [key, dots] of [['head_x', 'c2p-head'], ['vehicle_x', 'c2p-cross']]) {
        const ch = D[10642].ch[key], pk = starts(ch, 12).map(v => 100 * v / ch.peak);
        series.push({x: xs, y: Float64Array.from(pk), cls: 'c2-faint', dots, r: 9});
        const lo = pk.indexOf(Math.min(...pk));
        labels.push({x: lo, y: pk[lo], dy: 32, anchor: 'middle', cls: 'c2lab',
          text: 'X5 ' + NAME[key] + ': worst ' + pk[lo].toFixed(1) + '%'});
      }
      chart(host, {h: 400, y: {lo: 40, hi: 106, label: 'share of the full-rate peak read (%)'},
        x: {lo: -0.6, hi: 11.6, ticks: Array.from(xs), fmt: v => String(v), label: 'starting sample, keeping every 12th'},
        hlines: [{y: 100, cls: 'cast', text: 'full-rate peak'}], series, labels});
    },

    /* the crossmember's ringing, every sample drawn */
    ring(host, D) {
      const r = win(D[10642].ch.vehicle_x, 0, 0.04), yr = yRange([r], 0.08);
      chart(host, {h: 400, y: {lo: yr[0], hi: yr[1], zero: true, label: 'X5 crossmember (m/s²)'},
        x: {lo: 0, hi: 0.04, fmt: ms, label: 'time (ms)'},
        series: [{x: r.t, y: r.y, cls: 'c2-cross'}]});
    },

    /* sixteen channels, two measures, about 1 kHz */
    board(host, D) {
      const rows = [];
      for (const no of [10642, 9793]) for (const ch of Object.values(D[no].ch)) {
        const k = K1[no];
        rows.push({name: CAR[no] + ' ' + NAME[ch.key], kept: worstKept(ch, k),
                   fast: tooFast(ch, ch.rate / k / 2)});
      }
      rows.sort((p, q) => p.kept - q.kept);
      const W = 900, rowH = 23, top = 46, H = top + rows.length * rowH + 8;
      const svg = svgEl('svg', {viewBox: `0 0 ${W} ${H}`, class: 'cgp c2chart', role: 'img',
        'aria-label': 'For sixteen crash channels at about 1 kHz, the worst share of the peak ' +
                      'kept and the share of the signal too fast for the rate.'});
      host.appendChild(svg);
      const add = (n, a, txt) => { const e = svgEl(n, a); if (txt !== undefined) e.textContent = txt;
        svg.appendChild(e); return e; };
      const A0 = 250, A1 = 560, B0 = 600, B1 = 880;
      add('text', {class: 'ylab', x: A0, y: 22}, 'worst share of the peak kept');
      add('text', {class: 'ylab', x: B0, y: 22}, 'share of the signal too fast');
      for (const [x0, x1, max, ticks] of [[A0, A1, 100, [0, 50, 100]], [B0, B1, 50, [0, 25, 50]]])
        for (const v of ticks) {
          const x = x0 + (x1 - x0) * v / max;
          add('line', {class: 'grid', x1: x, x2: x, y1: top - 8, y2: H - 6});
          add('text', {class: 'tick', x, y: top - 12, 'text-anchor': 'middle'}, v + '%');
        }
      rows.forEach((r, i) => {
        const y = top + i * rowH, bad = r.kept < 95;
        add('text', {class: 'c2lab', x: A0 - 10, y: y + 16, 'text-anchor': 'end'}, r.name);
        add('rect', {class: bad ? 'c2bar-b' : 'c2bar-a', x: A0, y: y + 4,
                     width: (A1 - A0) * r.kept / 100, height: rowH - 8});
        add('text', {class: 'c2val', x: A0 + (A1 - A0) * r.kept / 100 + 6, y: y + 16}, r.kept.toFixed(1));
        const wB = (B1 - B0) * Math.min(r.fast, 50) / 50;
        add('rect', {class: bad ? 'c2bar-b' : 'c2bar-a', x: B0, y: y + 4, width: Math.max(wB, 0.8), height: rowH - 8});
        add('text', {class: 'c2val', x: B0 + wB + 6, y: y + 16}, r.fast < 1 ? r.fast.toFixed(2) : r.fast.toFixed(1));
      });
    },

    /* what a crash test and a fatigue test record, at two rates */
    cost(host) {
      const rows = [
        ['crash test, 12.5 kHz', 190 * 0.36 * 12500, 'c2bar-a'],
        ['crash test, 1 kHz', 190 * 0.36 * 1000, 'c2bar-a'],
        ['8-hour fatigue test, 10 kHz', 50 * 8 * 3600 * 10000, 'c2bar-b'],
        ['8-hour fatigue test, 1 kHz', 50 * 8 * 3600 * 1000, 'c2bar-b']];
      const W = 900, rowH = 58, top = 40, H = top + rows.length * rowH + 30, L = 300, R = 780;
      const svg = svgEl('svg', {viewBox: `0 0 ${W} ${H}`, class: 'cgp c2chart', role: 'img',
        'aria-label': 'Numbers recorded by a crash test and by a fatigue test at two sample rates, on a log scale.'});
      host.appendChild(svg);
      const add = (n, a, txt) => { const e = svgEl(n, a); if (txt !== undefined) e.textContent = txt;
        svg.appendChild(e); return e; };
      const X = v => L + (Math.log10(v) - 4) / (11 - 4) * (R - L);
      for (const e of [4, 5, 6, 7, 8, 9, 10, 11]) {
        add('line', {class: 'grid', x1: X(10 ** e), x2: X(10 ** e), y1: top - 6, y2: H - 26});
        add('text', {class: 'tick', x: X(10 ** e), y: H - 6, 'text-anchor': 'middle'}, '10' + supNum(e));
      }
      add('text', {class: 'ylab', x: L, y: 22}, 'numbers recorded (log scale), and their size at 4 bytes each');
      const size = v => { const b = 4 * v; return b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(2) + ' MB'; };
      rows.forEach(([name, v, cls], i) => {
        const y = top + i * rowH;
        add('text', {class: 'c2lab', x: L - 12, y: y + 30, 'text-anchor': 'end'}, name);
        add('rect', {class: cls, x: L, y: y + 10, width: X(v) - L, height: rowH - 22});
        add('text', {class: 'c2val', x: X(v) + 8, y: y + 30}, size(v));
      });
    },

    /* the same decision elsewhere: sound, a sweep, and refining it */
    sound(host) {
      const f = 18000, t1 = 0.0004, tt = [], yy = [], al = [];
      for (let i = 0; i <= 800; i++) { const t = t1 * i / 800; tt.push(t);
        yy.push(Math.sin(2 * Math.PI * f * t)); al.push(-Math.sin(2 * Math.PI * (22050 - f) * t)); }
      const s1 = [], s2 = [];
      for (let t = 0; t <= t1 + 1e-12; t += 1 / 44100) s1.push(t);
      for (let t = 0; t <= t1 + 1e-12; t += 1 / 22050) s2.push(t);
      const F = (a, f) => Float64Array.from(a, f), sin = t => Math.sin(2 * Math.PI * f * t);
      chart(host, {w: 440, h: 260, padL: 14, y: {lo: -1.25, hi: 1.25, ticks: [], zero: true,
          label: '18 kHz tone, 0.4 ms'},
        x: {lo: 0, hi: t1, ticks: [], label: ''},
        series: [{x: F(tt), y: F(yy), cls: 'c2-faint'},
                 {x: F(s1), y: F(s1, sin), line: false, dots: 'c2p-head', r: 6},
                 {x: F(tt), y: F(al), cls: 'c2-cross'},
                 {x: F(s2), y: F(s2, sin), line: false, dots: 'c2p-cross', r: 7, shape: 'square'}]});
    },
    sweep(host) {
      const fn = 18.35, z = 0.02, Hf = f => { const r = f / fn;
        return 1 / Math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2); };
      const xs = [], ys = [], gx = [], gy = [];
      for (let i = 0; i <= 1400; i++) { const f = 5 + 35 * i / 1400; xs.push(f); ys.push(Hf(f)); }
      for (let f = 5; f <= 40; f += 2) { gx.push(f); gy.push(Hf(f)); }
      const F = (a, f) => Float64Array.from(a, f);
      chart(host, {w: 440, h: 300, padL: 40, y: {lo: 0, hi: 27, ticks: [0, 15, 25], label: 'amplification'},
        x: {lo: 5, hi: 40, ticks: [10, 20, 30, 40], label: 'drive frequency (Hz)'},
        hlines: [{y: 15, text: 'limit 15'}],
        series: [{x: F(xs), y: F(ys), cls: 'c2-faint'},
                 {x: F(gx), y: F(gy), line: false, dots: 'c2p-amber', r: 6}],
        labels: [{x: 20.5, y: 12.6, text: '2 Hz grid: ' + Math.max(...gy).toFixed(1), cls: 'c2lab'},
                 {x: 19.4, y: 24.6, text: 'true peak 25.0', cls: 'c2lab'}]});
    },
    refine(host) {
      const fn = 18.35, z = 0.02, Hf = f => { const r = f / fn;
        return 1 / Math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2); };
      const steps = [2, 1, 0.5, 0.25, 0.125], n = [], best = [];
      for (const h of steps) { let m = 0, c = 0;
        for (let i = 0; 5 + i * h <= 40 + 1e-9; i++) { m = Math.max(m, Hf(5 + i * h)); c++; }
        n.push(c); best.push(m); }
      const F = (a, f) => Float64Array.from(a, f);
      chart(host, {w: 440, h: 300, padL: 40, padR: 26, y: {lo: 0, hi: 27, ticks: [0, 15, 25], label: 'largest found'},
        x: {lo: 12, hi: 400, log: true, ticks: n, fmt: v => String(v), label: 'evaluations'},
        hlines: [{y: 15, text: 'limit 15'}],
        series: [{x: F(n), y: F(best), cls: 'c2-amber', dots: 'c2p-amber', r: 6}],
        labels: n.map((v, i) => ({x: v, y: best[i], dy: -14, anchor: 'middle', cls: 'c2lab',
                                  text: best[i].toFixed(1)}))});
    },

    /* the Elantra, every channel, and the three example reports' choices */
    report(host, D) {
      const T = D[9793], KS = [], series = [];
      for (let k = 1; k <= 100; k++) KS.push(k);
      const CLS = {vehicle_x: 'c2-cross', head_y: 'c2-amber', chest_x: 'c2-chest'};
      for (const ch of Object.values(T.ch))
        series.push({x: Float64Array.from(KS.map(k => ch.rate / k)),
                     y: Float64Array.from(KS.map(k => worstKept(ch, k))), cls: CLS[ch.key] || 'c2-grey'});
      series.sort((p, q) => (p.cls === 'c2-grey' ? 0 : 1) - (q.cls === 'c2-grey' ? 0 : 1));
      chart(host, {h: 400, padR: 44, y: {lo: 30, hi: 103, label: 'Elantra: worst share of the peak kept (%)'},
        x: {lo: 200, hi: 20000, log: true, grid: true, label: 'sample rate (Hz)',
            ticks: [200, 1000, 5000, 10000, 20000], fmt: v => v >= 1000 ? v / 1000 + ' kHz' : v + ' Hz'},
        hlines: [{y: 95}],
        labels: [{x: 210, y: 95, dy: -8, text: '5% low', cls: 'mk'}],
        vlines: [{x: 5000, text: 'memo', dy: 60}, {x: 10000, text: 'notebook', dy: 90},
                 {x: 20000, text: 'technical report', dy: 120}],
        series});
    },

    /* which samples "about 1 kHz" keeps from a 12.5 kHz record */
    steps(host) {
      const rows = [['12.5 kHz record', 0.00008, 'c2p-grey', 3], ['every 12th: 1042 Hz', 0.00096, 'c2p-amber', 7],
                    ['every 13th: 962 Hz', 0.00104, 'c2p-cross', 7], ['1 kHz exactly', 0.001, 'c2p-head', 7]];
      const W = 900, rowH = 62, top = 18, H = top + rows.length * rowH + 40, L = 250, R = 880, t1 = 0.0045;
      const svg = svgEl('svg', {viewBox: `0 0 ${W} ${H}`, class: 'cgp c2chart', role: 'img',
        'aria-label': 'Sample times over 4.5 ms for a 12.5 kHz record, every 12th sample, every 13th sample, and a true 1 kHz logger.'});
      host.appendChild(svg);
      const add = (n, a, txt) => { const e = svgEl(n, a); if (txt !== undefined) e.textContent = txt;
        svg.appendChild(e); return e; };
      const X = t => L + t / t1 * (R - L);
      for (let m = 0; m <= 4; m++) {
        add('line', {class: 'grid', x1: X(m / 1000), x2: X(m / 1000), y1: top, y2: H - 30});
        add('text', {class: 'tick', x: X(m / 1000), y: H - 8, 'text-anchor': 'middle'}, m + ' ms');
      }
      rows.forEach(([name, dt, cls, r], i) => {
        const y = top + i * rowH + rowH / 2;
        add('text', {class: 'c2lab', x: L - 16, y: y + 5, 'text-anchor': 'end'}, name);
        add('line', {class: 'zero', x1: L, x2: R, y1: y, y2: y});
        for (let j = 0; j * dt <= t1 + 1e-12; j++) add('circle', {class: cls, cx: X(j * dt), cy: y, r});
      });
    },
  };

  /* -------------------------------------------------------- the live demos */
  const DEMOS = {

    /* both channels at the rate on the slider, from the start on the slider */
    rate(host, D) {
      const W = {head_x: [0.040, 0.120], vehicle_x: [0.0, 0.040]}, T = D[10642];
      return {
        setting: 'Dashed: every sample of the X5 record (12.5&nbsp;kHz). Solid, with dots: what a slower ' +
                 'logger would have recorded.',
        controls: [
          {key: 'k', label: 'keep one sample in', min: 1, max: 60, step: 1, value: 1, dp: 0},
          {key: 's', label: 'starting at sample', min: 0, max: 59, step: 1, value: 0, dp: 0}],
        panels: ['head_x', 'vehicle_x'].map(key => ({label: 'X5 ' + NAME[key], unit: 'm/s²',
          height: 150, xAxis: true, yClamp: yRange([win(T.ch[key], ...W[key])])})),
        readouts: [{key: 'rate', label: 'rate'}, {key: 'head_x', label: 'head peak kept'},
                   {key: 'vehicle_x', label: 'crossmember peak kept'}],
        source: SOURCE,
        compute(st) {
          const k = Math.round(st.k), s = Math.min(k - 1, Math.round(st.s));
          const out = {panels: [], readouts: {rate: hz(T.ch.head_x.rate / k)}};
          for (const key of ['head_x', 'vehicle_x']) {
            const ch = T.ch[key], [a, b] = W[key], d = win(decimate(ch, k, s), a, b), g = win(ch, a, b);
            out.panels.push({x: d.t, y: d.y, range: [a, b], opts: {
              curves: [{x: g.t, y: g.y, cls: 'ghost'}],
              marks: d.t.length <= 90 ? Array.from(d.t, (t, i) => ({t, y: d.y[i]})) : [],
              hlines: [{y: ch.sign * ch.peak, cls: 'limit', text: 'full-rate peak'}]}});
            out.readouts[key] = pct(100 * peakOf(decimate(ch, k, s).y) / ch.peak) +
              (k > 1 ? ' (worst start ' + pct(worstKept(ch, k)) + ')' : '');
          }
          return out;
        },
      };
    },

    /* the crossmember's ringing, and the head beside it, at a lower rate */
    alias(host, D) {
      const T = D[10642], W = {vehicle_x: [0, 0.04], head_x: [0.04, 0.12]};
      return {
        setting: 'Dashed: every sample (12.5&nbsp;kHz). Solid, with dots: the slower logger\'s record.',
        controls: [
          {key: 'k', label: 'keep one sample in', min: 1, max: 30, step: 1, value: 12, dp: 0},
          {key: 's', label: 'starting at sample', min: 0, max: 29, step: 1, value: 0, dp: 0}],
        panels: ['vehicle_x', 'head_x'].map(key => ({label: 'X5 ' + NAME[key], unit: 'm/s²',
          height: 150, xAxis: true, yClamp: yRange([win(T.ch[key], ...W[key])])})),
        readouts: [{key: 'rate', label: 'rate'},
                   {key: 'fast', label: 'too fast for this rate (crossmember / head)'},
                   {key: 'dv', label: 'crossmember change in velocity (full: '
                     + area(T.ch.vehicle_x.t, T.ch.vehicle_x.y).toFixed(1) + ' m/s)'}],
        source: SOURCE,
        compute(st) {
          const k = Math.round(st.k), s = Math.min(k - 1, Math.round(st.s)), r = T.ch.vehicle_x.rate / k;
          const panels = ['vehicle_x', 'head_x'].map(key => {
            const ch = T.ch[key], [a, b] = W[key], d = win(decimate(ch, k, s), a, b), g = win(ch, a, b);
            return {x: d.t, y: d.y, range: [a, b], opts: {curves: [{x: g.t, y: g.y, cls: 'ghost'}],
              marks: d.t.length <= 120 ? Array.from(d.t, (t, i) => ({t, y: d.y[i]})) : []}};
          });
          const dd = decimate(T.ch.vehicle_x, k, s);
          return {panels, readouts: {rate: hz(r),
            fast: k === 1 ? 'none' : pct(tooFast(T.ch.vehicle_x, r / 2)) + ' / ' + pct(tooFast(T.ch.head_x, r / 2)),
            dv: area(dd.t, dd.y).toFixed(1) + ' m/s'}};
        },
      };
    },

    /* the lowest rate each channel tolerates, for a tolerance the room picks */
    tolerance(host, D) {
      const SHOW = ['head_x', 'chest_x', 'vehicle_x'];
      const CLS = {head_x: 'c2-head', chest_x: 'c2-chest', vehicle_x: 'c2-cross'};
      const curvesOf = no => Object.values(D[no].ch).map(ch => {
        const ks = []; for (let k = 1; ch.rate / k >= 100; k++) ks.push(k);
        return {x: Float64Array.from(ks.map(k => ch.rate / k).reverse()),
                y: Float64Array.from(ks.map(k => worstKept(ch, k)).reverse()),
                cls: CLS[ch.key] || 'ghost'};
      }).sort((p, q) => (p.cls === 'ghost' ? 0 : 1) - (q.cls === 'ghost' ? 0 : 1));
      const CURVES = {10642: curvesOf(10642), 9793: curvesOf(9793)};
      /* the lowest rate at which this rate and every faster one pass */
      const lowest = (ch, tol) => {
        let best = ch.rate;
        for (let k = 1; ch.rate / k >= 100; k++) { if (worstKept(ch, k) >= 100 - tol) best = ch.rate / k; else break; }
        return best;
      };
      return {
        setting: 'Worst share of each peak kept, over every starting sample, as the rate drops. Colored: ' +
                 'head, chest, crossmember. Gray: the other five channels.',
        segments: [{key: 'no', label: 'test', value: '10642',
                    options: [{value: '10642', label: 'X5 (10642)'}, {value: '9793', label: 'Elantra (9793)'}]}],
        controls: [{key: 'tol', label: 'peak may read low by up to', min: 1, max: 30, step: 1,
                    value: 5, dp: 0, unit: '%'}],
        panels: [{label: 'worst share of peak kept', unit: '%', height: 150, xAxis: true,
                  xLog: true, xLabel: 'sample rate', xUnit: 'Hz', xScale: 1, yClamp: [20, 104]}],
        readouts: [...SHOW.map(key => ({key, label: NAME[key]})), {key: 'all', label: 'all eight channels'}],
        source: SOURCE,
        compute(st) {
          const no = +st.no, T = D[no], tol = Math.round(st.tol), out = {}, marks = [];
          /* each readout is marked where it comes from: the last point on the
             channel's curve still above the tolerance line, dropped to the rate
             axis in the channel's own line style. No text: the head and chest often
             pass at nearly the same rate, and the readouts under the plot carry
             the numbers. */
          const drops = [];
          const mark = ch => {
            const r = lowest(ch, tol), y = worstKept(ch, Math.round(ch.rate / r));
            marks.push({t: r, y, ring: true});
            drops.push({x: Float64Array.of(r, r), y: Float64Array.of(y, 20), cls: CLS[ch.key] || 'ghost'});
            return r;
          };
          for (const key of SHOW) out[key] = hz(mark(T.ch[key]));
          /* the whole set is set by its slowest-to-pass channel; mark it too when it
             is not one of the three already marked */
          const worst = Object.values(T.ch).reduce((a, ch) => lowest(ch, tol) > lowest(a, tol) ? ch : a);
          const allRate = lowest(worst, tol);
          out.all = hz(allRate);
          /* a tie with a marked channel is already marked; a second ring there only
             stacks one label on another */
          if (!SHOW.some(key => lowest(T.ch[key], tol) === allRate))
            mark(worst);
          const top = T.ch.head_x.rate;
          return {panels: [{x: Float64Array.of(100, top), y: Float64Array.of(NaN, NaN), range: [100, top],
                    opts: {curves: [...CURVES[no], ...drops], marks, hlines: [{y: 100 - tol, cls: 'limit'}]}}],
                  readouts: out};
        },
      };
    },
  };

  /* ------------------------------------------------------------ mounting */
  ready.then(D => {
    for (const host of document.querySelectorAll('.c2fig[data-c2]')) {
      const name = host.dataset.c2;
      /* one figure failing must not stop the ones after it */
      try {
        if (FIGS[name]) { FIGS[name](host, D); continue; }
        if (DEMOS[name]) {
          makeDemo(host, DEMOS[name](host, D));
          host.addEventListener('click', e => e.stopPropagation());
          continue;
        }
        host.textContent = 'unknown figure: ' + name;
      } catch (e) { console.error('class 2 figure ' + name + ':', e); }
    }
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
