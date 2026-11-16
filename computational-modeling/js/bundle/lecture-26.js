/* Generated bundle: kit, the order-of-accuracy-measured demo, this deck's
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

/* The convergence study on the tracked shot, counted in evaluations. Each
   stepper's step is halved from one step a frame, and each point is how far
   the ball's position at frame 23 moved from the previous run's, plotted
   against the evaluations every run so far has used. The precision slider
   moves the line two runs must agree within. The runs stop before RK4's moves
   reach rounding error, which the page's optional section covers. */

const G = 9.81;
const K = 0.016;          /* per meter, the value the notes pages use */
const FRAME = 0.04, FRAMES = 18;

const shot = (t, s) => {
  const [, , , vx, vy, vz] = s;
  const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
  return [vx, vy, vz, -K * sp * vx, -K * sp * vy, -G - K * sp * vz];
};

/* least-squares intercept and slope, as on page 25 */
function line(tf, v) {
  const n = tf.length;
  let st = 0, sv = 0, stt = 0, stv = 0;
  for (let i = 0; i < n; i++) { st += tf[i]; sv += v[i]; stt += tf[i] * tf[i]; stv += tf[i] * v[i]; }
  const slope = (n * stv - st * sv) / (n * stt - st * st);
  return [(sv - slope * st) / n, slope];
}

/* the main trace is RK4; the other two are drawn as extra curves */
const METHODS = [
  {key: 'euler', label: 'Euler', per: 1, levels: 15, cls: 'ghost'},
  {key: 'heun',  label: 'Heun',  per: 2, levels: 8,  cls: 'pred'},
  {key: 'rk4',   label: 'RK4',   per: 4, levels: 5,  cls: 'trace'}
];

/* the position at the last frame after 18m steps, without storing the states */
function lastPosition(step, s0, m) {
  const h = FRAME / m;
  let s = s0.slice();
  for (let k = 0; k < FRAMES * m; k++) s = step(shot, 0.20 + k * h, s, h);
  return s.slice(0, 3);
}

function study(meth, s0) {
  const out = [];
  let prev = null, evals = 0;
  for (let i = 0; i < meth.levels; i++) {
    const m = Math.pow(2, i);
    const p = lastPosition(STEPPERS[meth.key], s0, m);
    evals += meth.per * FRAMES * m;
    if (prev) out.push({halvings: i, steps: FRAMES * m, evals,
      change: Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2])});
    prev = p;
  }
  return out;
}

const fmtLen = v => v >= 1e-3 ? (v * 1e3).toFixed(v >= 1e-2 ? 0 : 1) + ' mm'
                  : (v * 1e6).toFixed(v >= 1e-4 ? 0 : 1) + ' µm';
const fmtN = n => n.toLocaleString('en-US').replace(/,/g, ' ');

mountDemo({
  order: {
    /* arc 79, time from frame 20, the starting state from an 11-frame fit taken
       at frame 5, as on page 25 */
    async data() {
      const d = await (await fetch('data/arcs.json')).json();
      const a = d.arcs.find(x => x.role === 'clean');
      const r = a.rel, j = 5, n = 11;
      const tf = [], X = [], Y = [], Zg = [];
      for (let i = 0; i < n; i++) {
        const tt = a.t[r + i] - a.t[r + j];
        tf.push(tt); X.push(a.x[r + i]); Y.push(a.y[r + i]);
        Zg.push(a.z[r + i] + 0.5 * G * tt * tt);
      }
      const cx = line(tf, X), cy = line(tf, Y), cz = line(tf, Zg);
      const s0 = [cx[0], cy[0], cz[0], cx[1], cy[1], cz[1]];
      const runs = {};
      for (const meth of METHODS) runs[meth.key] = study(meth, s0);
      return {runs};
    },
    setting: 'The tracked shot (arc 79) stepped from frame 5 to frame 23, 0.72&nbsp;s later, ' +
             'with <em>k</em>&nbsp;=&nbsp;0.016 per meter. Each stepper starts at one step a frame and halves the step. ' +
             'Each point is how far the ball&rsquo;s position at frame 23 moved from the run before, ' +
             'against the evaluations of the forces used by every run so far.',
    source: {kind: 'measured', text: 'SportVU optical tracking, 2015&ndash;16 NBA season, 25&nbsp;Hz. The starting state is a least-squares fit to the first 11 free-flight frames of one shot (arc 79), taken at frame 5. The drag constant is a choice from the range on page 25.'},
    caption: 'Euler is the dashed gray line, Heun the dotted red line and RK4 the solid line. ' +
             'A study is done at the first point under the precision line, and the readouts count its evaluations.',
    controls: [{key: 'lt', label: 'precision needed', min: -5, max: -1.5, step: 0.05,
                value: Math.log10(0.003), fmt: v => fmtLen(Math.pow(10, v))}],
    panels: [{label: 'moved on halving', unit: 'm', height: 340, xAxis: true,
              xLabel: 'evaluations in all runs so far', xUnit: '', xScale: 1, xLog: true, yLog: true}],
    readouts: [
      {key: 'euler', label: 'Euler'},
      {key: 'heun',  label: 'Heun'},
      {key: 'rk4',   label: 'RK4'},
      {key: 'best',  label: 'fewest evaluations'}
    ],
    compute(s) {
      const tol = Math.pow(10, s.lt);
      const rd = {};
      let best = null;
      for (const meth of METHODS) {
        const hit = this.runs[meth.key].find(p => p.change < tol);
        if (hit) {
          rd[meth.key] = hit.halvings + (hit.halvings === 1 ? ' halving, ' : ' halvings, ') +
                         fmtN(hit.evals) + ' evaluations';
          if (!best || hit.evals < best.evals) best = {evals: hit.evals, label: meth.label};
        } else {
          const last = this.runs[meth.key].slice(-1)[0];
          rd[meth.key] = 'not within ' + fmtN(last.evals) + ' evaluations';
        }
      }
      rd.best = best ? best.label : '—';
      const curve = meth => ({
        x: Float64Array.from(this.runs[meth.key], p => p.evals),
        y: Float64Array.from(this.runs[meth.key], p => p.change), cls: meth.cls});
      const rk = curve(METHODS[2]);
      return {
        panels: [{x: rk.x, y: rk.y, range: [30, 1e6],
          opts: {
            label: 'moved on halving',
            yRange: [1e-12, 1e-1],
            curves: [curve(METHODS[0]), curve(METHODS[1])],
            scatter: METHODS.map(m => ({...curve(m), cls: 'scatter', r: 2.5})),
            hlines: [{y: tol, text: 'precision needed'}]
          }}],
        readouts: rd
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

/* Lecture 26's own figures, all on the week's ball after release: example shot 1144
   (data/example/train.json). Release at frame 10 (the A7 example rule), free
   flight to frame 34, the last frame at least 1 m from the hoop across the
   floor. The start is last week's fit of the first 11 flight frames, lines in
   x and y and a parabola in z with g held at 9.81, taken at its middle, frame
   15 (0.20 s after release). Drag k = 0.016 per meter. Every run steps the 19
   frames from frame 15 to frame 34. "The path" is RK4 with very short steps.
   The rate function, the line fit and the steppers come from the notes page's
   demo module (shot, line, STEPPERS), so the deck and the page step alike.
   lec26-problem: the fit frames, the state at frame 15, and frame 34 to find.
   lec26-drag: the shot with and without drag, flown together (animated).
   lec26-halve: Euler's step halved from 40 ms until the move is under 3 mm,
   each run fading as the next draws (animated).
   lec26-ends: the end of the flight zoomed in, each run's samples and end,
   the move between ends (animated).
   lec26-left: the moves still to come, closing on the path (animated).
   lec26-evals / lec26-evals3: evaluations in each study, run by run (animated).
   lec26-euler1 / lec26-heun1 / lec26-rk41: one 40 ms step from frame 15
   (the last two animated).
   lec26-halving: all three steppers' moves on halving (animated).
   lec26-cost: evaluations each study needs against the precision asked for
   (animated).
   lec26-answer: the stepped flight, the tracked frames and frame 34.
   Hosts are found by data-fig. An animation plays when its slide comes on and
   has a Replay button, as lecture 23's sweep does. */
(() => {
  const FIGS = ['lec26-problem', 'lec26-drag', 'lec26-halve', 'lec26-ends', 'lec26-left', 'lec26-evals',
                'lec26-evals3', 'lec26-euler1', 'lec26-heun1', 'lec26-rk41', 'lec26-halving', 'lec26-cost',
                'lec26-answer'];
  const hosts = f => document.querySelectorAll('[data-fig="' + f + '"] .fig-body');
  const any = (...fs) => fs.some(f => hosts(f).length);
  const SUP = {'-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
  const pow10 = v => '10' + String(v).split('').map(c => SUP[c]).join('');
  const L10 = Math.log10;
  const TOL = 0.003;
  const fmtN = n => n.toLocaleString('en-US');
  const clamp = v => Math.max(0, Math.min(1, v));
  const ID = 1144, REL = 10, LAST = 34, MID = 5;   /* MID: frame 15 is the 6th flight frame */
  const FR = LAST - REL - MID, T0 = 0.04 * MID, SPAN = 0.04 * FR;

  /* draw(i) for i = 0..n when the slide comes on, then hold on draw(n); off
     the deck, or before the slide is shown, the figure is draw(n) */
  const animate = (host, n, draw, tick) => {
    draw(n);
    const slide = host.closest('.deck-slide'), fig = host.closest('figure');
    if (!slide) return;
    let timer = null;
    const play = () => {
      clearTimeout(timer);
      let i = 0;
      const go = () => { draw(i); if (i++ < n) timer = setTimeout(go, tick); };
      go();
    };
    /* a button, because the deck reads a click anywhere else as "next slide" */
    if (fig) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'sweep-replay'; btn.textContent = 'Replay';
      btn.addEventListener('click', play);
      fig.after(btn);
    }
    let was = slide.classList.contains('on');
    if (was) play();
    new MutationObserver(() => {
      const on = slide.classList.contains('on');
      if (on && !was) play();
      if (!on) clearTimeout(timer);
      was = on;
    }).observe(slide, {attributes: true, attributeFilter: ['class']});
  };
  const redraw = (host, spec) => { host.textContent = ''; diagram(host, spec); };

  if (!any(...FIGS)) return;
  fetch('data/example/train.json').then(r => r.json()).then(d => {
    const a = d.shots.find(q => q.id === ID);
    /* the tracked flight, frames 10 to 34, with time after release */
    const ft = [], fx = [], fy = [], fz = [];
    for (let i = REL; i <= LAST; i++) { ft.push(a.t[i] - a.t[REL]); fx.push(a.x[i]); fy.push(a.y[i]); fz.push(a.z[i]); }
    const tf = [], Zg = [];
    for (let i = 0; i < 11; i++) { const tt = ft[i] - ft[MID]; tf.push(tt); Zg.push(fz[i] + 0.5 * G * tt * tt); }
    const cx = line(tf, fx.slice(0, 11)), cy = line(tf, fy.slice(0, 11)), cz = line(tf, Zg);
    const s0 = [cx[0], cy[0], cz[0], cx[1], cy[1], cz[1]];
    const free = (t, s) => [s[3], s[4], s[5], 0, 0, -G];
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    /* across the floor from the release point, along the starting direction
       of travel; drag acts along the velocity, so the flight stays in this
       vertical plane */
    const hs = Math.hypot(s0[3], s0[4]), ux = s0[3] / hs, uy = s0[4] / hs;
    const across = s => (s[0] - fx[0]) * ux + (s[1] - fy[0]) * uy;
    const tracked = ft.map((t, i) => [fx[i], fy[i], fz[i]]);

    /* every state along a run of n steps of h from frame 15 */
    const states = (method, h, n, f = shot) => {
      const ts = [T0], ss = [s0.slice()];
      let s = s0.slice();
      for (let i = 0; i < n; i++) { s = STEPPERS[method](f, T0 + i * h, s, h); ts.push(T0 + (i + 1) * h); ss.push(s); }
      return {ts, ss, end: s};
    };
    const endOf = (method, n, f = shot) => {
      const h = SPAN / n;
      let s = s0.slice();
      for (let i = 0; i < n; i++) s = STEPPERS[method](f, T0 + i * h, s, h);
      return s;
    };
    /* the halving study: how far the position at frame 34 moves each time the
       step is halved from one a frame, with the evaluations every run so far */
    const LEVELS = {euler: 15, heun: 8, rk4: 5}, PER = {euler: 1, heun: 2, rk4: 4};
    const study = key => {
      const out = [];
      let prev = null, evals = 0;
      for (let i = 0; i < LEVELS[key]; i++) {
        const steps = FR * 2 ** i, p = endOf(key, steps);
        evals += PER[key] * steps;
        if (prev) out.push({halvings: i, steps, evals, change: dist(p, prev)});
        prev = p;
      }
      return out;
    };
    const timeTicks = [0, 0.2, 0.4, 0.6, 0.8];

    /* lec26-problem: the eleven fit frames, the state at frame 15, frame 34 */
    hosts('lec26-problem').forEach(host => {
      const xr = [-0.08, 1.1], yr = [2.75, 4.95];
      diagram(host, {w: 440, h: 210, xRange: xr, yRange: yr,
        alt: 'Tracked height against time after release for the first 11 frames, with the start 0.20 s after release fitted from them: ' + s0[2].toFixed(3) + ' m up and climbing at ' + s0[5].toFixed(2) + ' m/s. A dashed line at ' + (T0 + SPAN).toFixed(2) + ' s marks the moment where the position is to be found.',
        leads: [{from: [T0 + SPAN, yr[0]], to: [T0 + SPAN, yr[1]], cls: 'cast'},
                {from: [T0 - 0.06, s0[2] - 0.06 * s0[5]], to: [T0 + 0.12, s0[2] + 0.12 * s0[5]], cls: 'tangent', over: true}],
        points: [...ft.slice(0, 11).map((t, i) => ({x: t, y: fz[i], r: 2.8, cls: 'miss'})), {x: T0, y: s0[2], r: 4.6, cls: 'dot'}],
        notes: [
          {x: T0, y: s0[2], dx: 10, dy: 10, anchor: 'start', text: 'start, 0.20 s: ' + s0[2].toFixed(3) + ' m up,'},
          {x: T0, y: s0[2], dx: 10, dy: 24, anchor: 'start', text: 'climbing ' + s0[5].toFixed(2) + ' m/s,'},
          {x: T0, y: s0[2], dx: 10, dy: 38, anchor: 'start', text: hs.toFixed(2) + ' m/s across the floor'},
          {x: 0.3, y: 3.0, anchor: 'start', text: 'circles: first 11 tracked frames'},
          {x: T0 + SPAN, y: 4.75, dx: -6, anchor: 'end', cls: 'hi', text: '0.96 s after release:'},
          {x: T0 + SPAN, y: 4.75, dx: -6, dy: 14, anchor: 'end', cls: 'hi', text: 'where, within 3 mm?'},
          ...timeTicks.map(v => ({x: v, y: yr[0], dy: 13, anchor: 'middle', text: v.toFixed(1)})),
          {x: xr[0], y: 3.0, dx: 4, dy: 4, anchor: 'start', text: '3.0'},
          {x: xr[0], y: 4.0, dx: 4, dy: 4, anchor: 'start', text: '4.0'},
          {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: 'time after release (s) →'},
          {x: xr[0], y: yr[1], dx: 4, dy: 10, anchor: 'start', text: '↑ height (m)'}]});
    });

    /* lec26-drag: with and without drag, flown together over the tracked
       frames; above, the side view, below, the distance between them */
    hosts('lec26-drag').forEach(host => {
      const N = 152, h = SPAN / N;
      const dr = states('rk4', h, N), fr = states('rk4', h, N, free);
      const gap = dr.ss.map((s, i) => dist(s, fr.ss[i]) * 1000);
      const xr = [-1.0, 7.6], yr = [2.8, 5.0];
      const draw = j => {
        const i = Math.min(N, j * 2), done = i === N;
        const side = (run, cls) => ({x: run.ss.slice(0, i + 1).map(across), y: run.ss.slice(0, i + 1).map(s => s[2]), cls});
        const at = run => ({x: across(run.ss[i]), y: run.ss[i][2]});
        host.textContent = '';
        diagram(host, {w: 440, h: 150, xRange: xr, yRange: yr,
          alt: 'Side view of the shot with its tracked frames, and the flight from 0.20 s to 0.96 s after release with drag and without. Without drag the ball flies the parabola of the constant-acceleration formulas and ends ' + gap[N].toFixed(0) + ' mm from where drag puts it.',
          curves: [side(fr, 'ghost'), side(dr, 'trace')],
          points: [...tracked.map(q => ({x: across(q), y: q[2], r: 2, cls: 'miss'})),
                   {...at(fr), r: 4, cls: 'miss'}, {...at(dr), r: 4, cls: 'dot'}],
          notes: [
            {x: 2.4, y: 3.45, anchor: 'start', text: 'small circles: tracked frames'},
            {x: 2.4, y: 3.45, dy: 13, anchor: 'start', text: 'dashed: no drag, the parabola'},
            {x: 2.4, y: 3.45, dy: 26, anchor: 'start', text: 'solid: with drag'},
            ...(done ? [{x: across(fr.end), y: fr.end[2], dx: 10, dy: -8, anchor: 'start', text: '0.96 s'}] : []),
            ...[0, 2, 4, 6].map(v => ({x: v, y: yr[0], dy: 13, anchor: 'middle', text: String(v)})),
            {x: xr[0], y: 3.0, dx: 4, dy: 4, anchor: 'start', text: '3.0'},
            {x: xr[0], y: 4.0, dx: 4, dy: 4, anchor: 'start', text: '4.0'},
            {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: 'across the floor from release (m) →'},
            {x: xr[0], y: yr[1], dx: 4, dy: 10, anchor: 'start', text: '↑ height (m)'}]});
        const gx = [0.16, 1.04], gy = [0, 240];
        diagram(host, {w: 440, h: 110, xRange: gx, yRange: gy,
          alt: 'The distance between the two flights against time, growing from 0 to ' + gap[N].toFixed(0) + ' mm at 0.96 s.',
          curves: [{x: dr.ts.slice(0, i + 1), y: gap.slice(0, i + 1), cls: 'alt'}],
          leads: [{from: [gx[0], 3], to: [gx[1], 3], cls: 'level'}],
          points: [{x: dr.ts[i], y: gap[i], r: 3.6, cls: 'dot'}],
          notes: [
            {x: dr.ts[i], y: gap[i], dx: -8, dy: 4, anchor: 'end', cls: 'hi', text: gap[i].toFixed(0) + ' mm apart'},
            {x: 0.24, y: 3, dy: -4, anchor: 'middle', text: '3 mm'},
            ...[0.2, 0.4, 0.6, 0.8].map(v => ({x: v, y: gy[0], dy: 13, anchor: 'middle', text: v.toFixed(1)})),
            {x: T0 + SPAN, y: gy[0], dy: 13, anchor: 'middle', text: '0.96'},
            {x: gx[0], y: 100, dx: 4, dy: 4, anchor: 'start', text: '100'},
            {x: gx[1], y: gy[0], dy: -5, anchor: 'end', text: 'time after release (s) →'},
            {x: gx[0], y: gy[1], dx: 4, dy: 10, anchor: 'start', text: '↑ distance between them (mm)'}]});
      };
      animate(host, N / 2, draw, 45);
    });

    /* lec26-halve: Euler from one step a frame, the step halved until a
       halving moves the answer at 0.96 s less than 3 mm. Each run draws in,
       and the run before it fades to half opacity while it does and stays. */
    hosts('lec26-halve').forEach(host => {
      const path = states('rk4', 0.005, 8 * FR);
      const z = run => run.ss.map(s => s[2]);
      const runs = [], moves = [null];
      for (let k = 0; ; k++) {
        runs.push(states('euler', 0.04 / 2 ** k, FR * 2 ** k));
        if (k) moves.push(dist(runs[k].end, runs[k - 1].end));
        if (k && moves[k] < TOL) break;
      }
      const K = runs.length;
      const stepMs = k => +(40 / 2 ** k).toFixed(3) + ' ms';
      const line = k => stepMs(k) + ' (' + fmtN(FR * 2 ** k) + ' steps)' +
        (k ? ': moved ' + (moves[k] * 1000).toFixed(1) + ' mm' : '') + (k === K - 1 ? ', stop' : '');
      /* the list of runs sits in two columns under the curves */
      const ROW = 0.105, rowAt = q => q < 3 ? {x: 0.17, y: 3.86 - (q + 1) * ROW} : {x: 0.64, y: 3.86 - (q - 3) * ROW};
      const xr = [0.14, 1.13], yr = [3.3, 4.95], tEnd = T0 + SPAN;
      const B = 26, D = 18;   /* ticks a run, of which D draw it in */
      const draw = i => {
        const k = Math.min(K - 1, Math.floor(i / B)), j = i - k * B, f = i >= K * B ? 1 : clamp(j / D);
        const run = runs[k], n = Math.round(f * (run.ts.length - 1)), done = f === 1;
        const curves = [{x: path.ts, y: z(path), cls: 'ghost'}];
        for (let q = 0; q < k; q++)
          curves.push({x: runs[q].ts, y: z(runs[q]), cls: q === k - 1 ? 'alt fading' : 'alt faded'});
        curves.push({x: run.ts.slice(0, n + 1), y: z(run).slice(0, n + 1), cls: 'alt'});
        host.textContent = '';
        const svg = diagram(host, {w: 440, h: 220, xRange: xr, yRange: yr,
          alt: 'Height against time after release for Euler runs from 0.20 s, the step halved from 40 ms each time, with the path behind them. Each run is drawn and then fades to half opacity as the next is drawn. The answer at 0.96 s moves ' + moves.slice(1).map(m => (m * 1000).toFixed(1)).join(', ') + ' mm on the halvings, and the study stops at ' + stepMs(K - 1) + ', ' + fmtN(FR * 2 ** (K - 1)) + ' steps, where the move is under 3 mm.',
          curves,
          points: done ? [{x: tEnd, y: run.end[2], r: 4, cls: 'dot'}] : [],
          notes: [0.2, 0.4, 0.6, 0.8].map(v => ({x: v, y: yr[0], dy: 13, anchor: 'middle', text: v.toFixed(1)})).concat([
            {x: tEnd, y: yr[0], dy: 13, anchor: 'middle', text: '0.96'},
            {x: xr[0], y: 4.0, dx: 4, dy: 4, anchor: 'start', text: '4.0'},
            {x: xr[0], y: 4.5, dx: 4, dy: 4, anchor: 'start', text: '4.5'},
            {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: 'time after release (s) →'},
            {x: xr[0], y: yr[1], dx: 4, dy: 10, anchor: 'start', text: '↑ height (m)'},
            {x: 0.17, y: 3.86, anchor: 'start', text: 'gray: the path. red: Euler'},
            ...runs.slice(0, done ? k + 1 : k).map((r, q) => ({...rowAt(q), anchor: 'start',
              cls: q === k && done ? 'hi' : '', text: line(q)}))])});
        svg.querySelectorAll('.fading').forEach(e => { e.style.opacity = (1 - 0.5 * f).toFixed(2); });
        svg.querySelectorAll('.faded').forEach(e => { e.style.opacity = '0.5'; });
      };
      animate(host, K * B, draw, 45);
    });

    const runs = {};
    if (any('lec26-halving', 'lec26-cost'))
      for (const key of ['euler', 'heun', 'rk4']) runs[key] = study(key);

    /* lec26-ends: the last stretch of the flight, zoomed in, side view at
       equal scale. Each halving's run shows its step samples there and its
       end at 0.96 s; the gold segment joins it to the run before, which is
       the move. Earlier runs stay at half opacity, without their samples. */
    hosts('lec26-ends').forEach(host => {
      const runs = [], moves = [null];
      for (let k = 0; ; k++) {
        runs.push(states('euler', 0.04 / 2 ** k, FR * 2 ** k));
        if (k) moves.push(dist(runs[k].end, runs[k - 1].end));
        if (k && moves[k] < TOL) break;
      }
      const K = runs.length, path = states('rk4', 0.0025, 16 * FR), pe = path.end;
      const ax = across(pe), az = pe[2];
      /* W wide and W * 260 / 440 tall, so a millimeter is the same either way */
      const W = 0.516, HH = W * 260 / 440;
      const xr = [ax - 0.33, ax - 0.33 + W], yr = [az + 0.165 - HH, az + 0.165];
      const inView = s => { const x = across(s); return x >= xr[0] && x <= xr[1] && s[2] >= yr[0] && s[2] <= yr[1]; };
      /* the samples in view, and the line from where it crosses into view */
      const clip = ss => {
        const i0 = ss.findIndex(inView);
        const ins = ss.filter(inView);
        if (i0 <= 0) return {ins, line: ins};
        const a = ss[i0 - 1], b = ss[i0], ta = [];
        if (across(a) < xr[0]) ta.push((xr[0] - across(a)) / (across(b) - across(a)));
        if (a[2] > yr[1]) ta.push((yr[1] - a[2]) / (b[2] - a[2]));
        const t = Math.max(...ta), e = a.map((v, c) => v + t * (b[c] - v));
        return {ins, line: [e, ...ins]};
      };
      const cl = runs.map(r => clip(r.ss));
      const pathIn = clip(path.ss).line;
      const mm = v => (v * 1000).toFixed(1) + ' mm';
      const B = 24, D = 10;   /* ticks a run, of which D bring its samples in */
      const draw = i => {
        const k = Math.min(K - 1, Math.floor(i / B)), j = i - k * B, fin = i >= K * B;
        const f = fin ? 1 : clamp(j / D), done = fin || j >= D + 2;
        const curves = [{x: pathIn.map(across), y: pathIn.map(s => s[2]), cls: 'ghost'}];
        const points = [], leads = [], notes = [];
        for (let q = 0; q <= k; q++) {
          const L = cl[q].line, ps = q === k ? L.slice(0, Math.max(1, Math.round(f * L.length))) : L;
          const cls = q < k ? ' faded' : '';
          curves.push({x: ps.map(across), y: ps.map(s => s[2]), cls: 'alt' + cls});
          if (q === k) ps.filter(inView).forEach(s => points.push({x: across(s), y: s[2], r: 1.7, cls: 'miss'}));
          if (q < k || done) points.push({x: across(runs[q].end), y: runs[q].end[2], r: 3.6, cls: 'dot' + cls});
        }
        if (k && done) {
          const e0 = runs[k - 1].end, e1 = runs[k].end;
          leads.push({from: [across(e0), e0[2]], to: [across(e1), e1[2]], cls: 'shared', over: true});
          notes.push({x: across(e1), y: (e0[2] + e1[2]) / 2, dx: 10, dy: 4, anchor: 'start', cls: 'hi', text: 'moved ' + mm(moves[k])});
        }
        const list = runs.slice(0, done ? k + 1 : k).map((r, q) => ({x: xr[0] + 0.012, y: az + 0.005, dy: 14 * (q + 1),
          anchor: 'start', cls: q === k && done ? 'hi' : '',
          text: fmtN(FR * 2 ** q) + ' steps' + (q ? ', moved ' + mm(moves[q]) : '')}));
        host.textContent = '';
        leads.push({from: [xr[1] - 0.06, yr[0] + 0.012], to: [xr[1] - 0.01, yr[0] + 0.012], cls: 'axis'});
        const svg = diagram(host, {w: 440, h: 260, xRange: xr, yRange: yr, axes: false,
          alt: 'The last half meter of the flight before 0.96 s, zoomed in. Each Euler run shows its steps as small circles and its end at 0.96 s as a dot. Halving the step doubles the steps, so the circles get twice as dense, and the end moves half as far each time: ' + moves.slice(1).map(mm).join(', ') + ', closing in on the path.',
          curves, leads, points,
          notes: [...list,
            {x: xr[0] + 0.012, y: az + 0.005, anchor: 'start', text: 'Euler, steps to 0.96 s:'},
            {x: ax, y: az, dx: 8, dy: 18, anchor: 'start', text: 'the path at 0.96 s'},
            {x: xr[1] - 0.035, y: yr[0] + 0.012, dy: -5, anchor: 'middle', text: '50 mm'},
            ...notes]});
        svg.querySelectorAll('.faded').forEach(e => { e.style.opacity = '0.5'; });
      };
      animate(host, K * B, draw, 45);
    });

    /* lec26-left: distance from the path at frame 34 for the runs of 32 and
       64 steps a frame, then the runs still to come, closing in */
    hosts('lec26-left').forEach(host => {
      const PATH = endOf('rk4', FR * 256);
      const ns = [32, 64, 128, 256, 512, 1024, 2048].map(m => FR * m);
      const ds = ns.map(n => dist(endOf('euler', n), PATH) * 1000);
      const xr = [-0.35, 4.9], yr = [0, 4];
      /* rows: the last move above, the runs on the line, the moves still to
         come below it, the millimeter scale at the bottom */
      const YM = 3.3, YL = 2.4, YC = 1.4, YS = 0.5;
      const draw = i => {
        const k = Math.min(ns.length, 2 + i), done = i > ns.length - 2;
        const to = done ? 0 : ds[k - 1], sum = ds[1] - to;
        redraw(host, {w: 440, h: 190, xRange: xr, yRange: yr, axes: false,
          alt: 'Distance from the path at 0.96 s on a line in millimeters. The run of ' + fmtN(ns[0]) + ' steps is ' + ds[0].toFixed(1) + ' mm away and the run of ' + fmtN(ns[1]) + ' steps ' + ds[1].toFixed(1) + ' mm, so the last move is about ' + (ds[0] - ds[1]).toFixed(1) + ' mm. Each run after that is half as far as the one before, and all the moves still to come add up to the ' + ds[1].toFixed(1) + ' mm left.',
          leads: [{from: [0, YL], to: [4.7, YL], cls: 'lead'}, {from: [0, YS], to: [0, YM], cls: 'level'},
                  {from: [0, YS], to: [4.7, YS], cls: 'lead'},
                  ...[1, 2, 3, 4].map(v => ({from: [v, YS - 0.12], to: [v, YS + 0.12], cls: 'lead'})),
                  {from: [ds[1], YM], to: [ds[0], YM], cls: 'chord'},
                  ...(k > 2 || done ? [{from: [to, YC], to: [ds[1], YC], cls: 'shared'}] : [])],
          points: ds.slice(0, k).map((v, j) => ({x: v, y: YL, r: j < 2 ? 4.6 : 3.4, cls: j === 1 ? 'dot' : 'miss'})),
          notes: [
            {x: 0, y: YM, dy: -6, anchor: 'middle', text: 'the path'},
            {x: ds[0], y: YL, dy: 18, anchor: 'middle', text: fmtN(ns[0]) + ' steps'},
            {x: ds[1], y: YL, dy: 18, anchor: 'middle', text: fmtN(ns[1]) + ' steps'},
            {x: (ds[0] + ds[1]) / 2, y: YM, dy: -6, anchor: 'middle', cls: 'hi', text: 'last move, ' + (ds[0] - ds[1]).toFixed(1) + ' mm'},
            ...(k > 2 || done ? [{x: ds[1], y: YC, dx: 8, dy: 4, anchor: 'start', cls: done ? 'hi' : '',
                          text: done ? 'all the moves still to come: ' + sum.toFixed(1) + ' mm'
                                     : 'moves still to come, ' + (k - 2) + ' so far: ' + sum.toFixed(2) + ' mm'}] : []),
            ...[0, 1, 2, 3, 4].map(v => ({x: v, y: YS, dy: 16, anchor: 'middle', text: v + ' mm'})),
            {x: 4.7, y: YS, dy: -6, anchor: 'end', text: 'distance from the path at 0.96 s →'}]});
      };
      animate(host, ns.length - 1, draw, 750);
    });

    /* lec26-evals, lec26-evals3: the evaluations in each study as bars made
       of one piece a run, added run by run */
    const evalBars = (host, keys) => {
      const nr = {euler: 7, heun: 2, rk4: 2};
      const name = {euler: 'Euler', heun: 'Heun', rk4: 'RK4'}, fillOf = {euler: 'gap', heun: 'tri', rk4: 'pos'};
      const one = keys.length === 1, rowY = one ? [1] : [2.4, 1.4, 0.4];
      const total = key => PER[key] * FR * (2 ** nr[key] - 1);
      const xr = [-400, 2750], yr = [0, one ? 2 : 3.1];
      const draw = i => {
        const areas = [], leads = [], notes = [];
        keys.forEach((key, row) => {
          const y = rowY[row], k = Math.min(i, nr[key]);
          let x = 0;
          for (let j = 0; j < k; j++) {
            const v = PER[key] * FR * 2 ** j;
            areas.push({pts: [{x, y: y - 0.3}, {x: x + v, y: y - 0.3}, {x: x + v, y: y + 0.3}, {x, y: y + 0.3}], cls: fillOf[key]});
            if (j) leads.push({from: [x, y - 0.3], to: [x, y + 0.3], cls: 'cast'});
            if (one && v >= 152) notes.push({x: x + v / 2, y, dy: 4, anchor: 'middle', text: fmtN(v)});
            x += v;
          }
          notes.push({x: 0, y, dx: -6, dy: 4, anchor: 'end', text: name[key]});
          if (k) notes.push({x, y, dx: 6, dy: 4, anchor: 'start', cls: k === nr[key] ? 'hi' : '', text: fmtN(x)});
          if (one && k) notes.push({x: 0, y: y + 0.3, dy: -8, anchor: 'start',
            text: k + (k === 1 ? ' run, ' + FR + ' steps' : ' runs, ' + FR + ' to ' + fmtN(FR * 2 ** (k - 1)) + ' steps')});
        });
        redraw(host, {w: 440, h: one ? 120 : 150, xRange: xr, yRange: yr, axes: false,
          alt: one
            ? 'Euler\'s evaluations as one bar made of seven runs, ' + [0, 1, 2, 3, 4, 5, 6].map(j => fmtN(FR * 2 ** j)).join(', ') + ' steps, adding to ' + fmtN(total('euler')) + '.'
            : 'Evaluations in each study to agree within 3 mm, as bars made of one piece a run: Euler ' + fmtN(total('euler')) + ' from seven runs, Heun ' + fmtN(total('heun')) + ' from two runs at two evaluations a step, RK4 ' + fmtN(total('rk4')) + ' from two runs at four.',
          areas, leads, notes: [...notes, {x: 0, y: yr[0], dy: 10, anchor: 'start', text: 'evaluations →'},
            ...[1000, 2000].map(v => ({x: v, y: yr[0], dy: 10, anchor: 'middle', text: fmtN(v)}))]});
      };
      animate(host, 7, draw, 550);
    };
    hosts('lec26-evals').forEach(host => evalBars(host, ['euler']));
    hosts('lec26-evals3').forEach(host => evalBars(host, ['euler', 'heun', 'rk4']));

    /* one 40 ms step from frame 15: the path, Euler, Heun and RK4's looks */
    const H = 0.04, z0 = s0[2];
    const k1 = shot(T0, s0), eu = s0.map((v, i) => v + H * k1[i]);
    const k2h = shot(T0 + H, eu), heun = s0.map((v, i) => v + H / 2 * (k1[i] + k2h[i]));
    const pt = [0], pz = [z0];
    let fs = s0.slice();
    /* steps of 0.04 ms, a thousand to the frame, keeping every 25th */
    for (let i = 0; i < 1000; i++) {
      fs = STEPPERS.rk4(shot, T0 + i * 4e-5, fs, 4e-5);
      if ((i + 1) % 25 === 0) { pt.push((i + 1) * 4e-5); pz.push(fs[2]); }
    }
    const zEnd = pz[pz.length - 1], vEndPath = fs[5];
    const ms = v => v * 1000;
    const oxr = [-4, 64], oyr = [z0 - 0.014, eu[2] + 0.022];
    const oneAxes = [{x: 40, y: oyr[0], dy: 13, anchor: 'middle', text: '40 ms'},
      {x: 0, y: oyr[0], dy: 13, anchor: 'middle', text: '0'},
      {x: oxr[1], y: oyr[0], dy: -5, anchor: 'end', text: 'time into the step (ms) →'},
      {x: oxr[0], y: oyr[1], dx: 4, dy: 10, anchor: 'start', text: '↑ height (m)'},
      {x: 0, y: z0, dx: 6, dy: 14, anchor: 'start', text: 'start, ' + z0.toFixed(3) + ' m'}];
    /* a slope mark through (t ms, z) at climb rate v, ±w ms */
    const slope = (t, z, v, w, cls = 'tangent') => ({from: [t - w, z - w * v * 0.001], to: [t + w, z + w * v * 0.001], cls, over: true});
    const along = (frac, from, v) => [ms(frac * H), from + frac * H * v];

    hosts('lec26-euler1').forEach(host => {
      diagram(host, {w: 440, h: 210, xRange: oxr, yRange: oyr,
        alt: 'One step of 40 ms from the start. Euler moves the ball at the starting climb of ' + s0[5].toFixed(2) + ' m/s and rises ' + ms(eu[2] - z0).toFixed(0) + ' mm to ' + eu[2].toFixed(3) + ' m. The path rises ' + ms(zEnd - z0).toFixed(0) + ' mm, and its climb has slowed to ' + vEndPath.toFixed(2) + ' m/s by the end of the step.',
        curves: [{x: pt.map(ms), y: pz, cls: 'ghost'}],
        leads: [{from: [0, z0], to: [40, eu[2]], cls: 'chord', over: true}, slope(40, zEnd, vEndPath, 7, 'level')],
        drops: [{x: 40, y: eu[2]}],
        points: [{x: 0, y: z0, r: 4}, {x: 40, y: eu[2], r: 4.4, cls: 'miss'}, {x: 40, y: zEnd, r: 3.6, cls: 'dot'}],
        notes: [...oneAxes,
          {x: 40, y: eu[2], dx: -10, dy: -10, anchor: 'end', cls: 'hi', text: 'Euler, ' + s0[5].toFixed(2) + ' m/s all step: up ' + ms(eu[2] - z0).toFixed(0) + ' mm'},
          {x: 40, y: zEnd, dx: 10, dy: 14, anchor: 'start', text: 'the path: up ' + ms(zEnd - z0).toFixed(0) + ' mm,'},
          {x: 40, y: zEnd, dx: 10, dy: 28, anchor: 'start', text: 'climbing ' + vEndPath.toFixed(2) + ' m/s here'}]});
    });

    hosts('lec26-heun1').forEach(host => {
      const vEnd = eu[5], vAvg = (s0[5] + eu[5]) / 2;
      const off = Math.abs(heun[2] - zEnd) * 1000;
      const draw = i => {
        const fa = clamp(i / 16), fc = clamp((i - 40) / 16), tan = i >= 24, done = i >= 58;
        const [ax, az] = along(fa, z0, s0[5]), [cx2, cz2] = along(fc, z0, vAvg);
        redraw(host, {w: 440, h: 210, xRange: oxr, yRange: oyr,
          alt: 'One step of 40 ms from the start. An Euler step estimates the end, where the climb is about ' + vEnd.toFixed(2) + ' m/s. Heun moves the ball at the average of ' + s0[5].toFixed(2) + ' and ' + vEnd.toFixed(2) + ', ' + vAvg.toFixed(2) + ' m/s, and ends at ' + heun[2].toFixed(3) + ' m, ' + ms(eu[2] - heun[2]).toFixed(1) + ' mm below Euler and within ' + off.toFixed(3) + ' mm of the path.',
          curves: [{x: pt.map(ms), y: pz, cls: 'ghost'}],
          leads: [{from: [0, z0], to: [ax, az], cls: 'chord', over: true},
                  ...(tan ? [slope(40, eu[2], vEnd, 7)] : []),
                  ...(fc > 0 ? [{from: [0, z0], to: [cx2, cz2], cls: 'shared', over: true}] : [])],
          points: [{x: 0, y: z0, r: 4}, ...(fa === 1 ? [{x: 40, y: eu[2], r: 4.4, cls: 'miss'}] : []),
                   ...(done ? [{x: 40, y: heun[2], r: 4.4, cls: 'dot'}] : [])],
          notes: [...oneAxes,
            ...(fa === 1 ? [{x: 40, y: eu[2], dx: -12, dy: -24, anchor: 'end', text: '1. Euler step: estimate the end'}] : []),
            ...(tan ? [{x: 40, y: eu[2], dx: -12, dy: -10, anchor: 'end', text: '2. climb there: ' + vEnd.toFixed(2) + ' m/s'}] : []),
            ...(fc > 0 ? [{x: 22, y: z0 + 0.022 * vAvg, dx: 4, dy: 18, anchor: 'start', text: '3. move at the average, ' + vAvg.toFixed(2) + ' m/s'}] : []),
            ...(done ? [{x: 40, y: heun[2], dx: 9, dy: 12, anchor: 'start', cls: 'hi', text: 'Heun ' + heun[2].toFixed(3) + ' m,'},
                        {x: 40, y: heun[2], dx: 9, dy: 26, anchor: 'start', cls: 'hi', text: 'on the path'}] : [])]});
      };
      animate(host, 60, draw, 55);
    });

    hosts('lec26-rk41').forEach(host => {
      /* each look's climb rate is the trial state's vertical velocity */
      const q1 = shot(T0, s0);
      const t2 = s0.map((v, i) => v + H / 2 * q1[i]), q2 = shot(T0 + H / 2, t2);
      const t3 = s0.map((v, i) => v + H / 2 * q2[i]), q3 = shot(T0 + H / 2, t3);
      const t4 = s0.map((v, i) => v + H * q3[i]);
      const looks = [[0, s0], [20, t2], [20, t3], [40, t4]];
      const vw = (s0[5] + 2 * t2[5] + 2 * t3[5] + t4[5]) / 6;
      const rk = STEPPERS.rk4(shot, T0, s0, H);
      const off = Math.abs(rk[2] - zEnd) * 1000;
      const lbl = [['1. start', 10, -4, 'start'], ['2. middle', -8, -8, 'end'], ['3. middle again', 8, 14, 'start'], ['4. end', -8, -10, 'end']];
      const draw = i => {
        const shown = Math.min(4, i > 0 ? Math.floor(i / 8) + 1 : 0), fr = clamp((i - 36) / 14), done = i >= 52;
        const leads = [], points = [{x: 0, y: z0, r: 4}], notes = [...oneAxes];
        looks.slice(0, shown).forEach(([t, s], j) => {
          if (j) leads.push({from: [0, z0], to: [t, s[2]], cls: 'cast'});
          leads.push(slope(t, s[2], s[5], 4));
          points.push({x: t, y: s[2], r: 3.2, cls: 'miss'});
          notes.push({x: t, y: s[2], dx: lbl[j][1], dy: lbl[j][2], anchor: lbl[j][3], text: lbl[j][0] + ': ' + s[5].toFixed(2) + ' m/s'});
        });
        if (fr > 0) { const [x2, z2] = along(fr, z0, vw); leads.push({from: [0, z0], to: [x2, z2], cls: 'trace', over: true}); }
        if (done) {
          points.push({x: 40, y: rk[2], r: 4.4, cls: 'dot'});
          notes.push({x: 40, y: rk[2], dx: 9, dy: 14, anchor: 'start', cls: 'hi', text: 'RK4 moves at the'},
                     {x: 40, y: rk[2], dx: 9, dy: 28, anchor: 'start', cls: 'hi', text: 'weighted average,'},
                     {x: 40, y: rk[2], dx: 9, dy: 42, anchor: 'start', cls: 'hi', text: vw.toFixed(2) + ' m/s'});
        }
        redraw(host, {w: 440, h: 210, xRange: oxr, yRange: oyr,
          alt: 'One step of 40 ms from the start with RK4\'s four looks: at the start the climb is ' + s0[5].toFixed(2) + ' m/s, at the middle twice ' + t2[5].toFixed(2) + ' and ' + t3[5].toFixed(2) + ', at the end ' + t4[5].toFixed(2) + '. RK4 moves the ball at the weighted average, ' + vw.toFixed(2) + ' m/s, and ends within ' + (off < 1e-6 ? 'a millionth of a millimeter' : off.toExponential(1) + ' mm') + ' of the path.',
          curves: [{x: pt.map(ms), y: pz, cls: 'ghost'}], leads, points, notes});
      };
      animate(host, 54, draw, 90);
    });

    /* lec26-halving: move on halving against the steps in the finer run,
       log-log, all three steppers, a halving at a time */
    hosts('lec26-halving').forEach(host => {
      const ends = {euler: 7, heun: 5, rk4: 4};
      const xr = [L10(26), L10(4200)], yr = [-12.5, 0.3];
      const draw = i => {
        const lineOf = (m, cls) => {
          const p = runs[m].slice(0, Math.min(i, ends[m]));
          return {x: p.map(q => L10(q.steps)), y: p.map(q => L10(q.change)), cls};
        };
        const label = (m, txt, dx, dy, anchor = 'start') => {
          const k = Math.min(i, ends[m]);
          if (!k) return [];
          const p = runs[m][k - 1];
          return [{x: L10(p.steps), y: L10(p.change), dx, dy, anchor, text: txt}];
        };
        const firsts = i >= 1 ? [runs.heun[0], runs.rk4[0]] : [];
        const marks = i >= 6 ? [...firsts, runs.euler[5]] : firsts;
        const lines = [lineOf('euler', 'alt'), lineOf('heun', 'shared'), lineOf('rk4', 'trace')];
        redraw(host, {w: 440, h: 210, xRange: xr, yRange: yr,
          alt: 'How far the position at 0.96 s moves on each halving, against the steps in the finer run, on log scales. Euler\'s move halves each time and first passes under 3 mm at ' + fmtN(runs.euler[5].steps) + ' steps. Heun\'s first move, at ' + runs.heun[0].steps + ' steps, is ' + (runs.heun[0].change * 1000).toFixed(2) + ' mm and falls to a quarter each halving. RK4\'s first move is about a hundred-thousandth of a millimeter and falls to a sixteenth each halving.',
          curves: lines,
          leads: [{from: [xr[0], L10(TOL)], to: [xr[1], L10(TOL)], cls: 'level'}],
          points: [...lines.flatMap(c => c.x.map((x, k) => ({x, y: c.y[k], r: 2.4, cls: 'miss'}))),
                   ...marks.map(p => ({x: L10(p.steps), y: L10(p.change), r: 4.4, cls: 'dot'}))],
          notes: [
            ...[1, 4, 16, 64].map(m => ({x: L10(2 * FR * m), y: yr[0], dy: 13, anchor: 'middle', text: fmtN(2 * FR * m)})),
            ...[-3, -6, -9, -12].map(e => ({x: xr[0], y: e, dx: 4, dy: 4, anchor: 'start', text: e === -3 ? '1 mm' : pow10(e + 3) + ' mm'})),
            {x: xr[1], y: L10(TOL), dy: -5, anchor: 'end', text: '3 mm'},
            ...label('euler', 'Euler, halves', -4, 16, 'end'), ...label('heun', 'Heun, a quarter', 6, 4), ...label('rk4', 'RK4, a sixteenth', 6, 4),
            {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: 'steps in the finer run →'},
            {x: xr[0], y: yr[1], dx: 4, dy: 10, anchor: 'start', text: '↑ moved on halving'}]});
      };
      animate(host, 7, draw, 650);
    });

    /* lec26-cost: evaluations each study needs, against the precision asked
       for, from 10 mm to 0.01 mm; log-log staircases, with the precision
       swept from coarse to fine */
    hosts('lec26-cost').forEach(host => {
      const need = (m, tol) => { const p = runs[m].find(q => q.change < tol); return p ? p.evals : NaN; };
      const xr = [2, 5.15], yr = [L10(50), L10(2e6)];
      const stairs = (m, cls) => {
        const x = [], y = [];
        for (let e = 2; e <= 5.0001; e += 0.005) { x.push(e); y.push(L10(need(m, Math.pow(10, -e)))); }
        return {x, y, cls};
      };
      const curves = [stairs('euler', 'alt'), stairs('heun', 'shared'), stairs('rk4', 'trace')];
      const e3 = -L10(TOL), hx = runs.heun[0].change, eX = -L10(hx);
      const at = (m, e) => L10(need(m, Math.pow(10, -e)));
      const name = {euler: 'Euler', heun: 'Heun', rk4: 'RK4'};
      const n3 = {euler: need('euler', TOL), heun: need('heun', TOL), rk4: need('rk4', TOL)};
      const fixed = [
        {x: 2, y: yr[0], dy: 13, anchor: 'start', text: '10 mm'}, {x: 3, y: yr[0], dy: 13, anchor: 'middle', text: '1 mm'},
        {x: 4, y: yr[0], dy: 13, anchor: 'middle', text: '0.1 mm'}, {x: 5, y: yr[0], dy: 13, anchor: 'middle', text: '0.01 mm'},
        ...[2, 3, 4, 5, 6].map(e => ({x: xr[0], y: e, dx: 4, dy: 4, anchor: 'start', text: pow10(e)})),
        {x: 4.6, y: at('euler', 4.6), dx: -6, dy: -8, anchor: 'end', text: 'Euler'},
        {x: 4.6, y: at('heun', 4.6), dy: -8, anchor: 'middle', text: 'Heun'},
        {x: 3.3, y: L10(n3.rk4), dy: -6, anchor: 'middle', text: 'RK4'},
        {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: 'precision asked for →'},
        {x: xr[0], y: yr[1], dx: 30, dy: 10, anchor: 'start', text: '↑ evaluations in the whole study'}];
      const alt = 'Evaluations each convergence study needs against the precision asked for, from 10 mm down to 0.01 mm, on log scales. At 3 mm Euler needs ' + fmtN(n3.euler) + ', Heun ' + fmtN(n3.heun) + ' and RK4 ' + fmtN(n3.rk4) + '. Below ' + (hx * 1000).toFixed(2) + ' mm Heun needs a second halving, ' + fmtN(runs.heun[1].evals) + ' evaluations, and RK4 is the cheapest. Euler climbs past half a million at 0.01 mm.';
      const N = 60;
      const draw = i => {
        if (i >= N) {
          redraw(host, {w: 440, h: 220, xRange: xr, yRange: yr, alt, curves,
            leads: [{from: [e3, yr[0]], to: [e3, yr[1]], cls: 'level'}, {from: [eX, yr[0]], to: [eX, yr[1]], cls: 'level'}],
            points: [n3.euler, n3.heun, n3.rk4].map(v => ({x: e3, y: L10(v), r: 4.4, cls: 'dot'})),
            notes: [...fixed,
              {x: e3, y: L10(600), dx: 4, anchor: 'start', text: '3 mm'},
              {x: eX, y: L10(600), dx: 4, anchor: 'start', text: (hx * 1000).toFixed(2) + ' mm'},
              {x: e3, y: L10(n3.euler), dx: -6, dy: -6, anchor: 'end', cls: 'hi', text: fmtN(n3.euler)},
              {x: e3, y: L10(n3.rk4), dx: 8, dy: -4, anchor: 'start', cls: 'hi', text: fmtN(n3.rk4)},
              {x: e3, y: L10(n3.heun), dx: 8, dy: 12, anchor: 'start', cls: 'hi', text: fmtN(n3.heun)}]});
          return;
        }
        const e = 2 + 3 * i / (N - 1), tol = Math.pow(10, -e), mm = tol * 1000;
        const v = {euler: need('euler', tol), heun: need('heun', tol), rk4: need('rk4', tol)};
        const best = Object.keys(v).reduce((p, q) => v[q] < v[p] ? q : p);
        const side = e > 4 ? {dx: -4, anchor: 'end'} : {dx: 4, anchor: 'start'};
        redraw(host, {w: 440, h: 220, xRange: xr, yRange: yr, alt, curves,
          leads: [{from: [e, yr[0]], to: [e, yr[1]], cls: 'level'}],
          points: Object.keys(v).map(q => ({x: e, y: L10(v[q]), r: 4, cls: q === best ? 'dot' : 'miss'})),
          notes: [...fixed,
            {x: e, y: L10(1.2e6), ...side, text: 'within ' + (mm >= 1 ? mm.toFixed(1) : mm >= 0.1 ? mm.toFixed(2) : mm.toFixed(3)) + ' mm'},
            {x: e, y: L10(1.2e6), dy: 14, ...side, cls: 'hi', text: 'fewest: ' + name[best] + ', ' + fmtN(v[best])}]});
      };
      animate(host, N, draw, 70);
    });

    /* lec26-answer: the stepped flight over the tracked frames, and frame 34 */
    hosts('lec26-answer').forEach(host => {
      const path = states('rk4', 0.005, 8 * FR);
      const p = endOf('heun', 2 * FR), tk = tracked[tracked.length - 1];
      const xr = [-1.0, 9.4], yr = [2.8, 5.0];
      diagram(host, {w: 440, h: 190, xRange: xr, yRange: yr,
        alt: 'Side view of the shot: the tracked frames from release to 0.96 s and the flight stepped with drag from 0.20 s. At 0.96 s the stepped ball is ' + p[2].toFixed(3) + ' m up and ' + across(p).toFixed(3) + ' m across the floor from release, ' + (dist(p, tk) * 100).toFixed(1) + ' cm from the tracked frame.',
        curves: [{x: path.ss.map(across), y: path.ss.map(s => s[2])}],
        points: [...tracked.map(q => ({x: across(q), y: q[2], r: 2.4, cls: 'miss'})), {x: across(p), y: p[2], r: 4.6, cls: 'dot'}],
        notes: [
          {x: across(s0), y: s0[2], dx: 6, dy: 16, anchor: 'start', text: 'start, 0.20 s'},
          {x: across(p), y: p[2], dx: 10, dy: -30, anchor: 'start', cls: 'hi', text: '0.96 s, stepped:'},
          {x: across(p), y: p[2], dx: 10, dy: -16, anchor: 'start', cls: 'hi', text: across(p).toFixed(3) + ' m across,'},
          {x: across(p), y: p[2], dx: 10, dy: -2, anchor: 'start', cls: 'hi', text: p[2].toFixed(3) + ' m up'},
          {x: across(p), y: p[2], dx: 10, dy: 16, anchor: 'start', text: 'tracked frame ' + (dist(p, tk) * 100).toFixed(1) + ' cm away,'},
          {x: across(p), y: p[2], dx: 10, dy: 30, anchor: 'start', text: (Math.abs((tk[0] - p[0]) * -uy + (tk[1] - p[1]) * ux) * 100).toFixed(1) + ' cm of it out of this view'},
          {x: 2.4, y: 3.2, anchor: 'start', text: 'circles: tracked frames'},
          ...[0, 2, 4, 6].map(v => ({x: v, y: yr[0], dy: 13, anchor: 'middle', text: String(v)})),
          {x: xr[0], y: 3.0, dx: 4, dy: 4, anchor: 'start', text: '3.0'},
          {x: xr[0], y: 4.0, dx: 4, dy: 4, anchor: 'start', text: '4.0'},
          {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: 'across the floor from release (m) →'},
          {x: xr[0], y: yr[1], dx: 4, dy: 10, anchor: 'start', text: '↑ height (m)'}]});
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
