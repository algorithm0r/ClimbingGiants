/* Generated bundle: kit, the from-a-rate-to-a-trajectory demo, this deck's
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

/* Euler on a tracked shot with quadratic drag, where no formula gives the
   path. The starting state is page 25's: arc 79, an 11-frame fit (lines in
   x and y, a parabola in z with g held), taken at frame 5. The comparison is
   the same Euler program at 0.1 ms, so every number here can be reproduced
   with page 24's code alone. */

const G = 9.81, K = 0.016;              // K per meter, page 25's value
const FINE_H = 0.0001;                  // the comparison run's step, s

/* the six-component rate: position changes by the velocity, velocity by
   gravity and by drag along the velocity */
const shotRate = (t, s) => {
  const vx = s[3], vy = s[4], vz = s[5];
  const sp = Math.hypot(vx, vy, vz);
  return [vx, vy, vz, -K * sp * vx, -K * sp * vy, -G - K * sp * vz];
};

/* least-squares intercept and slope of a straight line */
function line(T, Y) {
  const n = T.length;
  let st = 0, sy = 0, stt = 0, sty = 0;
  for (let i = 0; i < n; i++) { st += T[i]; sy += Y[i]; stt += T[i] * T[i]; sty += T[i] * Y[i]; }
  const b = (n * sty - st * sy) / (n * stt - st * st);
  return [(sy - b * st) / n, b];
}

/* Euler from s0 over span seconds with step h, keeping every state */
function eulerRun(s0, h, span) {
  const n = Math.round(span / h);
  const ss = [s0.slice()];
  let s = s0.slice();
  for (let k = 0; k < n; k++) {
    const r = shotRate(k * h, s);
    s = s.map((v, i) => v + h * r[i]);
    ss.push(s);
  }
  return ss;
}

/* height at time tau after the start, read off a run with step h. The
   straight segment between two Euler states is what the method produced. */
function heightAt(ss, h, tau) {
  const j = Math.max(0, Math.min(Math.floor(tau / h + 1e-9), ss.length - 2));
  const f = (tau - j * h) / h;
  return ss[j][2] + f * (ss[j + 1][2] - ss[j][2]);
}

mountDemo({
  euler: {
    async data() {
      const d = await (await fetch('data/arcs.json')).json();
      const a = d.arcs.find(x => x.id === 79);
      const r = a.rel, nf = a.key.nf;
      const T = [], X = [], Y = [], Z = [];
      for (let i = r; i < r + nf; i++) {
        T.push(a.t[i] - a.t[r]); X.push(a.x[i]); Y.push(a.y[i]); Z.push(a.z[i]);
      }
      /* the fit: first 11 frames, time measured from frame 5 */
      const J = 5, N = 11;
      const tf = T.slice(0, N).map(t => t - T[J]);
      const cx = line(tf, X.slice(0, N)), cy = line(tf, Y.slice(0, N));
      const cz = line(tf, Z.slice(0, N).map((z, i) => z + 0.5 * G * tf[i] * tf[i]));
      const S0 = [cx[0], cy[0], cz[0], cx[1], cy[1], cz[1]];
      const T0 = T[J], SPAN = T[nf - 1] - T0;
      const fine = eulerRun(S0, FINE_H, SPAN);
      const TF = linspace(0, SPAN, 361);
      return {
        S0, T0, SPAN, fine, TF,
        TX: Float64Array.from(TF, t => t + T0),
        FINE: Float64Array.from(TF, t => heightAt(fine, FINE_H, t)),
        FRAMES: T.slice(J).map((t, i) => ({t, y: Z[J + i], ring: true})),
        FINE_END: fine[fine.length - 1][2]
      };
    },
    setting: 'A tracked three-pointer stepped forward from frame 5 to frame 23, the last frame ' +
             'before it nears the hoop, with gravity and quadratic drag (<em>k</em>&nbsp;=&nbsp;0.016 ' +
             'per meter). Time is measured from frame 20 of the record, the release the data set marks.',
    source: {kind: 'mixed', text: 'SportVU optical tracking, 2015&ndash;16 NBA season, 25&nbsp;Hz, arc 79. The starting state is a least-squares fit to the first 11 free-flight frames, and the open circles are the measured frames. The drag constant is a modeling choice from the range on page 25, not a measurement.'},
    caption: 'The ghost is the same program with 0.1&nbsp;ms steps. Each amber dot is one Euler ' +
             'step, and between dots the method follows a straight line at the rate it found at ' +
             'the start of the step. The height bends downward, so each of those lines runs above it.',
    /* halvings of one step per frame, so the control does what the page's
       numbers do */
    controls: [{key: 'k', label: 'halvings of h', min: 0, max: 6, step: 1, value: 0,
                fmt: v => (40 / Math.pow(2, Math.round(v))).toPrecision(3) + ' ms'}],
    panels: [{label: 'height', unit: 'm', height: 250, xAxis: true,
              xLabel: 'time from release', xUnit: 's', xScale: 1, lens: true, lensZoom: 12}],
    readouts: [
      {key: 'h',    label: 'step size'},
      {key: 'n',    label: 'steps'},
      {key: 'end',  label: 'height at frame 23'},
      {key: 'fine', label: '0.1 ms run'},
      {key: 'gap',  label: 'gap'},
      {key: 'per',  label: 'first step high by'}
    ],
    compute(s) {
      const h = 0.04 / Math.pow(2, Math.round(s.k));
      const run = eulerRun(this.S0, h, this.SPAN);
      const yE = Float64Array.from(this.TF, t => heightAt(run, h, t));
      const end = run[run.length - 1][2];
      const gap = end - this.FINE_END;
      const first = run[1][2] - heightAt(this.fine, FINE_H, h);
      /* mark the steps, but only while there are few enough to see */
      const marks = run.length <= 40
        ? run.map((st, i) => ({t: this.T0 + i * h, y: st[2]})) : [];
      return {
        panels: [{x: this.TX, y: yE, ghost: this.FINE,
          range: [this.T0, this.T0 + this.SPAN],
          opts: {label: 'Euler with h = ' + (h * 1000).toPrecision(3) + ' ms, the 0.1 ms run, and the measured frames',
                 marks: this.FRAMES.concat(marks), pred: null, rings: []}}],
        readouts: {
          h: (h * 1000).toPrecision(3) + ' ms',
          n: String(run.length - 1),
          end: end.toFixed(4) + ' m',
          fine: this.FINE_END.toFixed(4) + ' m',
          gap: (gap >= 0 ? '+' : '−') + (Math.abs(gap) * 1000).toFixed(1) + ' mm',
          per: (first * 1000).toFixed(1) + ' mm'
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

/* Lecture 24's own figures, on shot 1144 of data/example/train.json, the
   week's ball. Free flight from the release (the A7 example rule: back
   from the top while the vertical speed is still rising) to the last frame more
   than 1 m from the hoop across the floor; time and frames count from the
   release. The start is last week's fit of the first 11 flight frames (lines in
   x and y, a parabola in z with g held), read at its middle, frame 5, 0.20 s.
   k = 0.016 per meter. shotRate, line, eulerRun, G and FINE_H come from the
   notes page's demo.
   lec24-whole: every frame to the rim with the fit to all of them, from above,
                from the side, and the crossing at the hoop against the tracked one.
   lec24-predict: parabolas fitted to the first 6, 11 and 16 frames, and where
                each comes down through the rim.
   lec24-dragcall: the same three fits with drag stepped in, at the hoop.
   lec24-shot:  the flight frames, the start and its climb.
   lec24-form:  the frames across the floor and in height, with the gravity-only
                line and parabola from the start.
   lec24-step:  one 40 ms step of the height and of the vertical velocity.
   lec24-arcs:  the height with gravity only, then stepped with drag in 40 ms
                and then 0.1 ms steps, over the tracked frames (animated).
   Hosts are found by data-fig. */
(() => {
  const axis = (xr, yr, xt, yt, xl, yl, fx = v => String(v)) => [
    ...xt.map(v => ({x: v, y: yr[0], dy: 13, anchor: 'middle', text: fx(v)})),
    ...yt.map(v => ({x: xr[0], y: v, dx: 4, dy: 4, anchor: 'start', text: String(v)})),
    {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: xl},
    {x: xr[0], y: yr[1], dx: 4, dy: 10, anchor: 'start', text: yl}];

  /* draw(k) redraws the figure at stage k of n; the still state is stage n. It
     plays when its slide is shown, and a Replay button under it runs it again
     (a button, because the deck reads a click anywhere else as "next slide"). */
  const animate = (host, n, draw, ms) => {
    draw(n);
    const slide = host.closest('.deck-slide'), fig = host.closest('figure');
    if (!slide || !fig) return;
    let timer = null;
    const play = () => {
      clearTimeout(timer);
      let k = 0;
      const step = () => { draw(k); if (k++ < n) timer = setTimeout(step, typeof ms === 'function' ? ms(k) : ms); };
      step();
    };
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'anim-replay'; btn.textContent = 'Replay';
    btn.addEventListener('click', play);
    fig.after(btn);
    let was = slide.classList.contains('on');
    if (was) play();
    new MutationObserver(() => {
      const on = slide.classList.contains('on');
      if (on && !was) play();
      if (!on) clearTimeout(timer);
      was = on;
    }).observe(slide, {attributes: true, attributeFilter: ['class']});
  };

  /* the release: back from the top while the vertical speed (a centered
     difference over four frames) is still rising toward it */
  const release = (t, z) => {
    const vz = z.map((_, i) => i >= 2 && i < z.length - 2 ? (z[i + 2] - z[i - 2]) / (t[i + 2] - t[i - 2]) : NaN);
    let i = z.indexOf(Math.max(...z));
    while (i > 3 && (vz[i - 1] > vz[i] || vz[i - 2] > vz[i])) i--;
    return i;
  };

  fetch('data/example/train.json').then(r => r.json()).then(d => {
    const a = d.shots.find(x => x.id === 1144);
    const r = release(a.t, a.z);
    let end = a.t.findIndex((_, i) => Math.hypot(a.x[i] - a.hoop_x, a.y[i] - a.hoop_y) < 1.0);
    const nf = end - r, last = nf - 1;
    const T = [], X = [], Y = [], Z = [];
    for (let i = r; i < end; i++) {
      T.push(a.t[i] - a.t[r]); X.push(a.x[i]); Y.push(a.y[i]); Z.push(a.z[i]);
    }
    const J = 5, N = 11, H = 0.04;
    const tf = T.slice(0, N).map(t => t - T[J]);
    const cx = line(tf, X.slice(0, N)), cy = line(tf, Y.slice(0, N));
    const cz = line(tf, Z.slice(0, N).map((z, i) => z + 0.5 * G * tf[i] * tf[i]));
    const S0 = [cx[0], cy[0], cz[0], cx[1], cy[1], cz[1]];
    const T0 = T[J], SPAN = T[last] - T0, NS = Math.round(SPAN / H);
    const grav = u => [cx[0] + cx[1] * u, cy[0] + cy[1] * u, cz[0] + cz[1] * u - 0.5 * G * u * u];
    const fine = eulerRun(S0, FINE_H, SPAN);
    const run = eulerRun(S0, H, SPAN);
    const per = Math.round(H / FINE_H);
    const fineAt = i => fine[i * per];                 // fine state at step i
    const dist3 = (p, i) => Math.hypot(p[0] - X[i], p[1] - Y[i], p[2] - Z[i]);
    const frames = (i0, i1) => {
      const p = [];
      for (let i = i0; i <= i1; i++) p.push({x: T[i], y: Z[i], r: 3.2, cls: 'frame'});
      return p;
    };
    const gravCurve = (t0, t1, cls) => {
      const x = [], y = [];
      for (let t = t0; t <= t1 + 1e-9; t += (t1 - t0) / 80) { x.push(t); y.push(grav(t - T0)[2]); }
      return {x, y, cls};
    };
    const xrShot = [-0.03, 1.0], yrShot = [2.75, 4.95];
    const axShot = axis(xrShot, yrShot, [0, 0.2, 0.4, 0.6, 0.8], [3.5, 4, 4.5], 'time after release (s) →', '↑ height (m)');
    const fmt = v => v.toFixed(2).replace('-', '−');

    /* ---- the rim crossing, the question the opening slides ask ----
       The whole record, timed from the release. The tracked crossing is the
       straight line between the frames either side of the rim on the way down
       (page 19). A fit of n frames from the release (lines in x and y, a
       parabola in z with g held, centered on their middle time) crosses where
       its parabola comes down through the rim; with drag, the same fitted
       state is stepped in 0.1 ms steps until the height comes down through it. */
    const RIM = 3.048, HX = a.hoop_x, HY = a.hoop_y, CLEAN = 0.109, OUT = 0.348;
    const TR = a.t.map(v => v - a.t[r]);
    const pk = a.z.indexOf(Math.max(...a.z));
    let ic = pk; while (a.z[ic] >= RIM) ic++;
    const pc = (RIM - a.z[ic - 1]) / (a.z[ic] - a.z[ic - 1]);
    const actual = {t: TR[ic - 1] + pc * (TR[ic] - TR[ic - 1]),
                    u: a.x[ic - 1] + pc * (a.x[ic] - a.x[ic - 1]) - HX,
                    v: a.y[ic - 1] + pc * (a.y[ic] - a.y[ic - 1]) - HY};
    const fitN = n => {
      const tt = TR.slice(r, r + n), tm = tt.reduce((p, q) => p + q, 0) / n, uu = tt.map(t => t - tm);
      const fx = line(uu, a.x.slice(r, r + n)), fy = line(uu, a.y.slice(r, r + n));
      const fz = line(uu, a.z.slice(r, r + n).map((z, i) => z + 0.5 * G * uu[i] * uu[i]));
      const at = t => { const u = t - tm; return [fx[0] + fx[1] * u, fy[0] + fy[1] * u, fz[0] + fz[1] * u - 0.5 * G * u * u]; };
      const uc = (fz[1] + Math.sqrt(fz[1] * fz[1] + 2 * G * (fz[0] - RIM))) / G;      // the falling root
      const g = at(tm + uc);
      let s = [fx[0], fy[0], fz[0], fx[1], fy[1], fz[1]], t = tm, dr = null;
      for (;;) {
        const rt = shotRate(t, s), nx = s.map((q, j) => q + FINE_H * rt[j]);
        if (nx[5] < 0 && nx[2] < RIM) {
          const q = (RIM - s[2]) / (nx[2] - s[2]);
          dr = {t: t + q * FINE_H, u: s[0] + q * (nx[0] - s[0]) - HX, v: s[1] + q * (nx[1] - s[1]) - HY};
          break;
        }
        s = nx; t += FINE_H;
      }
      return {n, at, grav: {t: tm + uc, u: g[0] - HX, v: g[1] - HY}, drag: dr};
    };
    const dist0 = p => Math.hypot(p.u, p.v);
    const band = dd => dd < CLEAN ? 'clean' : dd < OUT ? 'rim' : 'out';
    const disk = (rad, n = 90) => Array.from({length: n}, (_, j) =>
      ({x: rad * Math.cos(2 * Math.PI * j / n), y: rad * Math.sin(2 * Math.PI * j / n)}));
    const ring = Array.from({length: 121}, (_, j) => 2 * Math.PI * j / 120);
    const hoopBase = () => ({
      areas: [{pts: disk(OUT), cls: 'tri'}, {pts: disk(CLEAN), cls: 'pos'}],
      curves: [{x: ring.map(q => 0.2286 * Math.cos(q)), y: ring.map(q => 0.2286 * Math.sin(q)), cls: 'rim'}]});
    const all = fitN(ic - r), picks = [6, 11, 16].map(fitN);
    const recFrames = (i0, i1) => {
      const p = [];
      for (let j = i0; j <= i1; j++) p.push({x: TR[j], y: a.z[j], r: 3, cls: 'frame'});
      return p;
    };
    const arcTo = (f, tEnd, cls) => {
      const x = [], y = [];
      for (let k = 0; k <= 80; k++) { const t = tEnd * k / 80; x.push(t); y.push(f.at(t)[2]); }
      return {x, y, cls};
    };
    const xrArc = [-0.03, 1.32], yrArc = [2.75, 4.95];

    /* the reminder: every frame to the rim, the fit to all of them, from above,
       from the side, and at the hoop */
    document.querySelectorAll('[data-fig="lec24-whole"] .fig-body').forEach(host => {
      const [c1, c2, c3] = diagramRow(host, 3);
      const xs = a.x.slice(r, ic + 1), ys = a.y.slice(r, ic + 1);
      const tl = [0, all.grav.t].map(t => all.at(t));
      diagram(c1, {w: 240, h: 210, xRange: [0.9, 7.4], yRange: [6.9, 12.0],
        alt: 'The court from above: the tracked frames run from the shooter to the hoop along the fitted straight line.',
        curves: [{x: tl.map(p => p[0]), y: tl.map(p => p[1])},
                 {x: ring.map(q => HX + 0.2286 * Math.cos(q)), y: ring.map(q => HY + 0.2286 * Math.sin(q)), cls: 'rim'}],
        points: xs.map((q, j) => ({x: q, y: ys[j], r: 1.8, cls: 'frame'})),
        notes: [{x: 0.9, y: 12.0, dx: 4, dy: 10, anchor: 'start', text: 'from above'},
                {x: HX, y: HY, dx: 6, dy: 16, anchor: 'start', text: 'hoop'},
                {x: 7.4, y: 6.9, dy: -5, anchor: 'end', text: 'x, along the court →'}]});
      diagram(c2, {w: 240, h: 210, xRange: xrArc, yRange: yrArc,
        alt: 'Height against time: the tracked frames and the fitted parabola, coming down through the rim height at about 1.17 s.',
        leads: [{from: [xrArc[0], RIM], to: [xrArc[1], RIM], cls: 'level'}],
        curves: [arcTo(all, all.grav.t)],
        points: recFrames(r, ic),
        notes: [...axis(xrArc, yrArc, [0, 0.4, 0.8, 1.2], [3.5, 4.5], 'time after release (s) →', '↑ height (m)'),
                {x: 0.6, y: RIM, dy: -5, anchor: 'middle', text: 'rim, 3.048 m'}]});
      const ag = dist0(all.grav), aa = dist0(actual);
      diagram(c3, {w: 240, h: 210, xRange: [-0.42, 0.42], yRange: [-0.4, 0.33], axes: false,
        alt: 'The hoop from above, with the clean disk and the rim band. The fitted parabola comes down through the rim ' + ag.toFixed(2) + ' m from the center, on the rim. The tracked ball came through ' + aa.toFixed(2) + ' m from the center, clean.',
        ...hoopBase(),
        points: [{x: 0, y: 0, r: 2}, {x: all.grav.u, y: all.grav.v, r: 5, cls: 'miss'}, {x: actual.u, y: actual.v, r: 5, cls: 'dot'}],
        notes: [{x: -0.42, y: 0.33, dx: 4, dy: 10, anchor: 'start', text: 'at the rim, from above'},
                {x: 0, y: -0.4, dy: -4, anchor: 'middle', text: 'inner disk clean, gold band hits the rim'},
                {x: actual.u, y: actual.v, dx: 8, dy: 4, anchor: 'start', text: 'tracked, ' + aa.toFixed(2) + ' m'},
                {x: all.grav.u, y: all.grav.v, dx: -8, dy: 4, anchor: 'end', cls: 'hi', text: 'parabola, ' + ag.toFixed(2) + ' m'}]});
    });

    /* predictions from the first 6, 11 and 16 frames, parabolas only */
    document.querySelectorAll('[data-fig="lec24-predict"] .fig-body').forEach(host => {
      const [c1, c2] = diagramRow(host, 2);
      const cls = ['p6', 'p11', 'p16'], rings = ['h6', 'h11', 'h16'], ink = ['t6', 'hi', 'acc'];
      const arcs = diagram(c1, {w: 260, h: 210, xRange: xrArc, yRange: yrArc,
        alt: 'Height against time with three parabolas, fitted to the first 6, 11 and 16 frames, each carried down to the rim height.',
        leads: [{from: [xrArc[0], RIM], to: [xrArc[1], RIM], cls: 'level'}],
        curves: picks.map((f, k) => arcTo(f, f.grav.t, cls[k])),
        /* each frame in the color of the smallest fit that uses it */
        points: recFrames(r, ic).map((p, j) => ({...p, cls: j < 6 ? 'f6' : j < 11 ? 'f11' : j < 16 ? 'f16' : 'fun'})),
        notes: [...axis(xrArc, yrArc, [0, 0.4, 0.8, 1.2], [3.5, 4.5], 'time after release (s) →', '↑ height (m)'),
                {x: 0.62, y: 3.95, anchor: 'middle', text: 'fitted to the first'},
                {x: 0.62, y: 3.95, dy: 14, anchor: 'middle', cls: 't6', text: 'gray: 6 frames'},
                {x: 0.62, y: 3.95, dy: 28, anchor: 'middle', cls: 'hi', text: 'red: 11 frames'},
                {x: 0.62, y: 3.95, dy: 42, anchor: 'middle', cls: 'acc', text: 'green: 16 frames'},
                {x: 0.62, y: 3.95, dy: 56, anchor: 'middle', text: 'faded: not fitted'},
                {x: 1.02, y: RIM, dy: -5, anchor: 'end', text: 'rim'}]});
      /* the frames go under the curves, so each fit's line reads over its frames */
      const under = arcs.querySelector('path.p6');
      arcs.querySelectorAll('circle').forEach(c => arcs.insertBefore(c, under));
      diagram(c2, {w: 260, h: 210, xRange: [-0.95, 0.6], yRange: [-0.85, 0.4], axes: false,
        alt: 'The hoop from above. The parabolas fitted to the first 6, 11 and 16 frames come down ' + picks.map(f => dist0(f.grav).toFixed(2)).join(', ') + ' m from the center. The tracked ball came through ' + dist0(actual).toFixed(2) + ' m from it.',
        ...hoopBase(),
        points: [{x: 0, y: 0, r: 2}, ...picks.map((f, k) => ({x: f.grav.u, y: f.grav.v, r: 5, cls: rings[k]})), {x: actual.u, y: actual.v, r: 5, cls: 'dot'}],
        notes: [{x: -0.95, y: 0.4, dx: 4, dy: 10, anchor: 'start', text: 'at the rim, from above'},
                ...picks.map((f, k) => ({x: f.grav.u, y: f.grav.v, dx: 8, dy: 4, anchor: 'start', cls: ink[k],
                                    text: f.n + ' frames, ' + dist0(f.grav).toFixed(2) + ' m'})),
                {x: actual.u, y: actual.v, dx: 8, dy: -6, anchor: 'start', text: 'tracked, ' + dist0(actual).toFixed(2) + ' m'}]});
    });

    /* the same three fits, gravity only and stepped with drag */
    document.querySelectorAll('[data-fig="lec24-dragcall"] .fig-body').forEach(host => {
      const rings = ['h6', 'h11', 'h16'], dots = ['d6', 'd11', 'd16'], ink = ['t6', 'hi', 'acc'];
      diagram(host, {w: 440, h: 200, xRange: [-0.95, 2.35], yRange: [-0.85, 0.4], axes: false,
        alt: 'The hoop from above. From the first 6, 11 and 16 frames, gravity only comes down ' + picks.map(f => dist0(f.grav).toFixed(2)).join(', ') + ' m from the center, and the same fits stepped with drag come down ' + picks.map(f => dist0(f.drag).toFixed(2)).join(', ') + ' m from it. The tracked ball came through ' + dist0(actual).toFixed(2) + ' m from the center.',
        ...hoopBase(),
        leads: picks.map(f => ({from: [f.grav.u, f.grav.v], to: [f.drag.u, f.drag.v], cls: 'cast'})),
        points: [{x: 0, y: 0, r: 2}, ...picks.map((f, k) => ({x: f.grav.u, y: f.grav.v, r: 5, cls: rings[k]})),
                 ...picks.map((f, k) => ({x: f.drag.u, y: f.drag.v, r: 5, cls: dots[k]})), {x: actual.u, y: actual.v, r: 5, cls: 'dot'}],
        notes: [{x: -0.95, y: 0.4, dx: 4, dy: 10, anchor: 'start', text: 'at the rim, from above'},
                {x: actual.u, y: actual.v, dx: -9, dy: -4, anchor: 'end', text: 'tracked'},
                ...picks.map((f, k) => ({x: f.grav.u, y: f.grav.v, dx: -8, dy: 4, anchor: 'end', cls: ink[k], text: f.n + ' frames'})),
                {x: 0.62, y: 0.3, anchor: 'start', text: 'from the first'},
                {x: 0.62, y: 0.3, dx: 70, anchor: 'start', text: 'gravity (ring)'},
                {x: 0.62, y: 0.3, dx: 150, anchor: 'start', text: 'drag (dot)'},
                ...picks.flatMap((f, k) => [
                  {x: 0.62, y: 0.16 - 0.14 * k, anchor: 'start', cls: ink[k], text: f.n + ' frames'},
                  {x: 0.62, y: 0.16 - 0.14 * k, dx: 70, anchor: 'start', text: dist0(f.grav).toFixed(2) + ' m'},
                  {x: 0.62, y: 0.16 - 0.14 * k, dx: 150, anchor: 'start', text: dist0(f.drag).toFixed(2) + ' m, ' + band(dist0(f.drag))}]),
                {x: 0.62, y: -0.30, anchor: 'start', text: 'tracked'},
                {x: 0.62, y: -0.30, dx: 150, anchor: 'start', text: dist0(actual).toFixed(2) + ' m, ' + band(dist0(actual))}]});
    });

    /* the 11-frame fit read at its middle: the fitted frames in the 11-frame
       red of slide 3, the later ones faded, the fit's parabola over its frames,
       the start as a small black point with v0 as an arrow along the fit, and
       the middle marked, with fitted frames on both sides of it */
    document.querySelectorAll('[data-fig="lec24-shot"] .fig-body').forEach(host => {
      const u = 0.17, xr = [-0.03, 0.62], yr = [2.75, 4.95];
      const svg = diagram(host, {w: 440, h: 190, xRange: xr, yRange: yr,
        alt: 'Height of the ball at the first frames after release, the 11 fitted frames in red with the fitted parabola over them. At the middle of the fitted frames, 0.20 s after release, with five fitted frames on each side, a black point marks the start r0, ' + S0[2].toFixed(2) + ' m up, and an arrow along the parabola marks v0, climbing at ' + S0[5].toFixed(2) + ' m/s.',
        curves: [gravCurve(T[0], T[N - 1], 'p11')],
        leads: [{from: [T0, 3.15], to: [T0, S0[2] - 0.08], cls: 'cast'},
                {from: [T0, S0[2]], to: [T0 + u, S0[2] + u * S0[5]], cls: 'vec', over: true}],
        points: [...frames(0, 15).map((p, j) => ({...p, cls: j < N ? 'f11' : 'fun'})), {x: T0, y: S0[2], r: 2.8, cls: 'tail'}],
        notes: [...axis(xr, yr, [0, 0.2, 0.4, 0.6], [3.5, 4, 4.5], 'time after release (s) →', '↑ height (m)'),
          {x: T0, y: yr[0], dy: -18, anchor: 'middle', cls: 'hi', text: 'the middle of the 11 fitted frames,'},
          {x: T0, y: yr[0], dy: -5, anchor: 'middle', cls: 'hi', text: 'five on each side'},
          {x: T0, y: S0[2], dx: 6, dy: 14, anchor: 'start', tex: 'r_0'},
          {x: T0 + u, y: S0[2] + u * S0[5], dx: -4, dy: -8, anchor: 'end', tex: 'v_0'},
          {x: 0.6, y: 3.42, anchor: 'end', text: 'r\u2080 = (' + S0.slice(0, 3).map(fmt).join(', ') + ') m'},
          {x: 0.6, y: 3.42, dy: 14, anchor: 'end', text: 'v\u2080 = (' + S0.slice(3).map(fmt).join(', ') + ') m/s'}]});
      /* the frames under the curve, as on slide 3; an arrowhead on the vector */
      const under = svg.querySelector('path.p11');
      svg.querySelectorAll('circle').forEach(c => { if (!c.classList.contains('tail')) svg.insertBefore(c, under); });
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = '<marker id="lec24-v0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2f2a24"/></marker>';
      svg.prepend(defs);
      svg.querySelector('line.vec').setAttribute('marker-end', 'url(#lec24-v0)');
    });

    /* gravity only: a straight line across the floor and a parabola in height,
       from the start, drawn on the frames. r = (x, y) is plotted as its
       distance from the release frame. */
    document.querySelectorAll('[data-fig="lec24-form"] .fig-body').forEach(host => {
      /* from above: x along the court, y across, at equal scale, with the hoop.
         The fitted frames in red, the later ones as the check; the fit's
         straight line projected to the last frame, and its point there. */
      const ge = grav(SPAN), ring = Array.from({length: 61}, (_, j) => 2 * Math.PI * j / 60);
      const past = []; for (let j = r + nf; j <= ic; j++) past.push(j);     // record frames inside 1 m of the hoop, down to the rim
      const gx = grav(TR[ic] - T0);     // the line and parabola run on through the faded frames
      const xs0 = Math.min(...X, HX, gx[0]) - 0.25, xs1 = Math.max(...X) + 0.35;
      const ys0 = Math.min(...Y, HY, gx[1]) - 0.25, ys1 = Math.max(...Y) + 0.55;
      const wTop = 250, hTop = Math.round((ys1 - ys0) / (xs1 - xs0) * (wTop - 20) + 26);
      const [left, right] = diagramRow(host, 2);
      const top = diagram(left, {w: wTop, h: hTop, xRange: [xs0, xs1], yRange: [ys0, ys1],
        alt: 'The court from above, x along the court and y across it. The fitted frames are red, the later frames gray, and the fit projects a straight line toward the hoop. At 0.96 s after release the line is ' + (100 * Math.hypot(ge[0] - X[last], ge[1] - Y[last])).toFixed(0) + ' cm from the tracked ball across the floor.',
        curves: [{x: [grav(T[0] - T0)[0], gx[0]], y: [grav(T[0] - T0)[1], gx[1]], cls: 'p11'},
                 {x: ring.map(q => HX + 0.2286 * Math.cos(q)), y: ring.map(q => HY + 0.2286 * Math.sin(q)), cls: 'rim'}],
        points: [...X.map((x, i) => ({x, y: Y[i], r: 2.6, cls: i < N ? 'f11' : 'fg'})), ...past.map(j => ({x: a.x[j], y: a.y[j], r: 2.6, cls: 'fpast'})), {x: ge[0], y: ge[1], r: 3, cls: 'tail'}],
        notes: [{x: xs0, y: ys1, dx: 4, dy: 10, anchor: 'start', text: '↑ y, across the court (m)'},
                {x: xs1, y: ys0, dy: -5, anchor: 'end', text: 'x, along the court (m) →'},
                {x: HX, y: HY, dx: 12, dy: 4, anchor: 'start', text: 'hoop'},
                {x: xs1, y: ys0 + 0.6, dx: -4, anchor: 'end', text: 'black dot: the line at 0.96 s'}]});
      const under = top.querySelector('path.p11');
      top.querySelectorAll('circle').forEach(c => { if (!c.classList.contains('tail')) top.insertBefore(c, under); });

      /* the height against time: the parabola projected to the last frame */
      const xrSide = [-0.03, 1.27];
      const side = diagram(right, {w: 250, h: hTop, xRange: xrSide, yRange: yrShot,
        alt: 'Height against time: the fitted frames red, the later free-flight frames gray, and the frames inside 1 m of the hoop faded, down to the rim. The fit projects its parabola to 0.96 s after release, where it is ' + (100 * (ge[2] - Z[last])).toFixed(0) + ' cm above the tracked ball.',
        curves: [gravCurve(T[0], TR[ic], 'p11')],
        points: [...frames(0, last).map((q, j) => ({...q, cls: j < N ? 'f11' : 'fg'})), ...past.map(j => ({x: TR[j], y: a.z[j], r: 3.2, cls: 'fpast'})),
                 {x: T[last], y: ge[2], r: 3, cls: 'tail'}],
        notes: [...axis(xrSide, yrShot, [0, 0.4, 0.8, 1.2], [3.5, 4.5], 'time after release (s) →', '↑ height z (m)'),
                {x: 0.62, y: 3.4, anchor: 'middle', text: 'black dot: the parabola at 0.96 s'},
                {x: 0.62, y: 3.4, dy: 14, anchor: 'middle', text: 'faded: inside 1 m of the hoop'}]});
      const under2 = side.querySelector('path.p11');
      side.querySelectorAll('circle').forEach(c => { if (!c.classList.contains('tail')) side.insertBefore(c, under2); });
    });

    /* the drag force against the speed, 1/2 rho C_D A v^2 with rho 1.20,
       C_D 0.35 and A = pi 0.1195^2; the start's speed and half of it */
    document.querySelectorAll('[data-fig="lec24-dragsize"] .fig-body').forEach(host => {
      const c = 0.5 * 1.20 * 0.35 * Math.PI * 0.1195 ** 2, sp = Math.hypot(S0[3], S0[4], S0[5]);
      const xr = [-0.3, 10.5], yr = [-0.05, 1.0], vs = linspace(0, 10, 81);
      const F = v => c * v * v;
      diagram(host, {w: 440, h: 130, xRange: xr, yRange: yr,
        alt: 'The drag force on the ball against its speed, a curve that grows with the speed squared. At the start, 7.52 m/s, it is ' + F(sp).toFixed(2) + ' N. At half that speed it is ' + F(sp / 2).toFixed(2) + ' N, a quarter as much.',
        curves: [{x: vs, y: vs.map(F), cls: 'dl'}],
        leads: [{from: [sp, 0], to: [sp, F(sp)], cls: 'cast'}, {from: [sp / 2, 0], to: [sp / 2, F(sp / 2)], cls: 'cast'}],
        points: [{x: sp, y: F(sp), r: 4, cls: 'dpt'}, {x: sp / 2, y: F(sp / 2), r: 4, cls: 'dpt'}],
        notes: [...axis(xr, yr, [0, 2, 4, 6, 8, 10], [0.5], 'speed (m/s) →', '↑ drag force (N)'),
          {x: sp, y: F(sp), dx: -8, dy: -6, anchor: 'end', cls: 'dt', text: 'the start, ' + sp.toFixed(2) + ' m/s: ' + F(sp).toFixed(2) + ' N'},
          {x: sp / 2, y: F(sp / 2), dx: -8, dy: -8, anchor: 'end', cls: 'dt', text: 'half the speed: ' + F(sp / 2).toFixed(2) + ' N, a quarter'}]});
    });

    /* the acceleration along the flight from the 0.1 ms run: across the floor
       (drag only, against the motion) and in height, against gravity alone */
    const fineT = [], fineS = [];
    for (let i = 0; i < fine.length; i += 40) { fineT.push(T0 + i * FINE_H); fineS.push(fine[i]); }
    document.querySelectorAll('[data-fig="lec24-accel"] .fig-body').forEach(host => {
      const rt = fineS.map(s => shotRate(0, s)), back = rt.map(q => Math.hypot(q[3], q[4])), az = rt.map(q => q[5]);
      const top = fineT[fineS.findIndex(s => s[5] < 0)];
      const xr = [0.12, 1.0], [left, right] = diagramRow(host, 2);
      const yr1 = [-0.12, 1.0];
      diagram(left, {w: 250, h: 170, xRange: xr, yRange: yr1,
        alt: 'Across the floor, gravity alone gives no acceleration. With drag the ball slows by ' + back[0].toFixed(2) + ' m/s squared at the start, ' + Math.min(...back).toFixed(2) + ' near the top and ' + back[back.length - 1].toFixed(2) + ' at 0.96 s.',
        curves: [{x: [0.18, 0.98], y: [0, 0], cls: 'gl'}, {x: fineT, y: back, cls: 'dl'}],
        notes: [...axis(xr, yr1, [0.2, 0.4, 0.6, 0.8], [0.5], 'time after release (s) →', '↑ slowing across the floor (m/s²)'),
          {x: 0.97, y: 0, dy: -6, anchor: 'end', cls: 'gt', text: 'gravity alone, 0'},
          {x: 0.97, y: back[back.length - 1], dy: -10, anchor: 'end', cls: 'dt', text: 'with drag'}]});
      const yr2 = [-10.65, -9.15];
      diagram(right, {w: 250, h: 170, xRange: xr, yRange: yr2,
        alt: 'In height, gravity alone gives a flat minus 9.81 m/s squared. With drag the vertical acceleration is ' + az[0].toFixed(2) + ' at the start, minus 9.81 at the top of the flight, ' + top.toFixed(2) + ' s after release, and ' + az[az.length - 1].toFixed(2) + ' at 0.96 s.',
        curves: [{x: [0.18, 0.98], y: [-G, -G], cls: 'gl'}, {x: fineT, y: az, cls: 'dl'}],
        leads: [{from: [top, yr2[0]], to: [top, -G], cls: 'cast'}],
        notes: [...axis(xr, yr2, [0.2, 0.4, 0.6, 0.8], [], 'time after release (s) →', '↑ vertical acceleration (m/s²)'),
          {x: 0.97, y: -G, dy: 15, anchor: 'end', cls: 'gt', text: 'gravity alone, −9.81'},
          {x: 0.22, y: az[0], dx: 4, dy: 4, anchor: 'start', cls: 'dt', text: 'with drag'},
          {x: 0.12, y: -10, dx: 4, dy: 4, anchor: 'start', text: '−10'}, {x: 0.12, y: -9.5, dx: 4, dy: 4, anchor: 'start', text: '−9.5'},
          {x: top, y: -10.3, dx: 5, anchor: 'start', text: 'the top'}]});
    });

    /* the rates as slopes: the height and the vertical velocity from the
       0.1 ms run, each with its tangent at the start */
    document.querySelectorAll('[data-fig="lec24-rates"] .fig-body').forEach(host => {
      const r0 = shotRate(0, S0), [left, right] = diagramRow(host, 2), xr = [0.12, 1.0], u = 0.12;
      const yr1 = [3.75, 4.85];
      diagram(left, {w: 250, h: 160, xRange: xr, yRange: yr1,
        alt: 'The height of the ball against time, with its tangent at 0.20 s after release. The tangent rises with slope v_z, ' + S0[5].toFixed(2) + ' m/s.',
        curves: [{x: fineT, y: fineS.map(s => s[2])}],
        leads: [{from: [T0 - 0.04, S0[2] - 0.04 * S0[5]], to: [T0 + u, S0[2] + u * S0[5]], cls: 'tan', over: true}],
        points: [{x: T0, y: S0[2], r: 3.5, cls: 'tail'}],
        notes: [...axis(xr, yr1, [0.2, 0.4, 0.6, 0.8], [4, 4.5], 'time after release (s) →', '↑ height z (m)'),
          {x: T0 + u, y: S0[2] + u * S0[5], dx: 6, dy: 12, anchor: 'start', text: 'slope ' + S0[5].toFixed(2) + ' m/s,'},
          {x: T0 + u, y: S0[2] + u * S0[5], dx: 6, dy: 26, anchor: 'start', text: 'the vertical velocity'}]});
      const yr2 = [-4.2, 5.8], u2 = 0.08;
      diagram(right, {w: 250, h: 160, xRange: xr, yRange: yr2, zero: true,
        alt: 'The vertical velocity against time, with its tangent at 0.20 s after release. The tangent falls with slope a_z, ' + r0[5].toFixed(2) + ' m/s squared.',
        curves: [{x: fineT, y: fineS.map(s => s[5])}],
        leads: [{from: [T0 - 0.03, S0[5] - 0.03 * r0[5]], to: [T0 + u2, S0[5] + u2 * r0[5]], cls: 'tan', over: true}],
        points: [{x: T0, y: S0[5], r: 3.5, cls: 'tail'}],
        notes: [...axis(xr, yr2, [0.2, 0.4, 0.6, 0.8], [2], 'time after release (s) →', '↑ vertical velocity (m/s)'), {x: 0.12, y: -2, dx: 4, dy: 4, anchor: 'start', text: '−2'},
          {x: 0.42, y: 3.9, anchor: 'start', text: 'slope ' + r0[5].toFixed(1).replace('-', '−') + ' m/s²,'},
          {x: 0.42, y: 3.9, dy: 14, anchor: 'start', text: 'the vertical acceleration'}]});
    });

    /* why a small step: the height and its tangent at the start, followed
       for 0.3 s (left) and for one 40 ms frame (right, zoomed) */
    document.querySelectorAll('[data-fig="lec24-straight"] .fig-body').forEach(host => {
      const zAt = t => fine[Math.round((t - T0) / FINE_H)][2];
      const tan = t => S0[2] + S0[5] * (t - T0);
      const L = 0.3, gL = tan(T0 + L) - zAt(T0 + L), gH = tan(T0 + H) - zAt(T0 + H);
      const [left, right] = diagramRow(host, 2);
      const xr1 = [0.12, 1.0], yr1 = [3.75, 5.3];
      diagram(left, {w: 250, h: 170, xRange: xr1, yRange: yr1,
        alt: 'The height of the ball against time with its tangent at 0.20 s after release. Followed for 0.3 s, the tangent ends ' + (100 * gL).toFixed(0) + ' cm above the path.',
        curves: [{x: fineT, y: fineS.map(q => q[2])}],
        areas: [{pts: [{x: T0 - 0.01, y: S0[2] - 0.04}, {x: T0 - 0.01, y: tan(T0 + H) + 0.04}, {x: T0 + H + 0.01, y: tan(T0 + H) + 0.04}, {x: T0 + H + 0.01, y: S0[2] - 0.04}], cls: 'zb'}],
        leads: [{from: [T0, S0[2]], to: [T0 + L, tan(T0 + L)], cls: 'tan', over: true},
                {from: [T0 + L, zAt(T0 + L)], to: [T0 + L, tan(T0 + L)], cls: 'chord', over: true}],
        points: [{x: T0, y: S0[2], r: 3.5, cls: 'tail'}],
        notes: [...axis(xr1, yr1, [0.2, 0.4, 0.6, 0.8], [4, 4.5, 5], 'time after release (s) →', '↑ height z (m)'),
          {x: T0 + L, y: (tan(T0 + L) + zAt(T0 + L)) / 2, dx: 6, dy: 4, anchor: 'start', cls: 'hi', text: 'after 0.3 s: ' + (100 * gL).toFixed(0) + ' cm off'}]});
      const xr2 = [T0 - 0.008, T0 + H + 0.016], yr2 = [S0[2] - 0.03, tan(T0 + H) + 0.05];
      const zx = [], zy = [];
      for (let k = 0; k * FINE_H <= H + 0.012; k += 4) { zx.push(T0 + k * FINE_H); zy.push(fine[k][2]); }
      diagram(right, {w: 250, h: 170, xRange: xr2, yRange: yr2,
        alt: 'Zoomed in on one 40 ms frame from the start: the tangent and the path nearly overlap, and after 40 ms the tangent is ' + (1000 * gH).toFixed(0) + ' mm above the path.',
        curves: [{x: zx, y: zy}],
        leads: [{from: [T0, S0[2]], to: [T0 + H, tan(T0 + H)], cls: 'tan', over: true},
                {from: [T0 + H, zAt(T0 + H)], to: [T0 + H, tan(T0 + H)], cls: 'chord', over: true}],
        points: [{x: T0, y: S0[2], r: 3.5, cls: 'tail'}],
        notes: [...axis(xr2, yr2, [0.2, 0.22, 0.24], [4.0, 4.05], 'time after release (s) →', '↑ height z (m), zoomed in'),
          {x: T0 + H, y: zAt(T0 + H), dx: 4, dy: 22, anchor: 'start', cls: 'hi', text: 'after 40 ms:'},
          {x: T0 + H, y: zAt(T0 + H), dx: 4, dy: 36, anchor: 'start', cls: 'hi', text: (1000 * gH).toFixed(0) + ' mm off'}]});
    });

    /* one step holds the vertical velocity and the acceleration fixed for h */
    document.querySelectorAll('[data-fig="lec24-step"] .fig-body').forEach(host => {
      const r0 = shotRate(0, S0), z1 = S0[2] + H * S0[5], v1 = S0[5] + H * r0[5];
      const xr = [0.185, 0.262];
      diagram(host, {w: 440, h: 100, xRange: xr, yRange: [3.88, 4.13],
        alt: 'Over one 40 ms step from the start at 0.20 s the height rises in a straight line from ' + S0[2].toFixed(2) + ' m to ' + z1.toFixed(2) + ' m, a rise of v_z times h.',
        curves: [{x: [T0, T0 + H], y: [S0[2], z1]}],
        leads: [{from: [T0, S0[2]], to: [T0 + H, S0[2]], cls: 'cast'},
                {from: [T0 + H, S0[2]], to: [T0 + H, z1], cls: 'chord'}],
        points: [{x: T0, y: S0[2], r: 4}, {x: T0 + H, y: z1, r: 4}],
        notes: [{x: xr[0], y: 4.13, dx: 4, dy: 10, anchor: 'start', text: '↑ height (m)'},
          {x: T0, y: S0[2], dx: -8, dy: 4, anchor: 'end', text: S0[2].toFixed(2)},
          {x: T0 + H, y: z1, dx: 8, dy: 4, anchor: 'start', text: z1.toFixed(2)},
          {x: T0 + H / 2, y: S0[2], dy: 14, anchor: 'middle', tex: 'h'},
          {x: xr[0], y: 4.13, dx: 4, dy: 24, anchor: 'start', text: 'one 40 ms step, one frame,\nfrom 0.20 s after release'},
          {x: T0 + H, y: (S0[2] + z1) / 2, dx: 8, dy: 4, anchor: 'start', cls: 'hi', tex: 'v_z h'}]});
      diagram(host, {w: 440, h: 100, xRange: xr, yRange: [3.4, 4.2],
        alt: 'Over the same step the vertical velocity falls in a straight line from ' + S0[5].toFixed(2) + ' m/s to ' + v1.toFixed(2) + ' m/s, a change of a_z times h.',
        curves: [{x: [T0, T0 + H], y: [S0[5], v1]}],
        leads: [{from: [T0, S0[5]], to: [T0 + H, S0[5]], cls: 'cast'},
                {from: [T0 + H, S0[5]], to: [T0 + H, v1], cls: 'chord'}],
        points: [{x: T0, y: S0[5], r: 4}, {x: T0 + H, y: v1, r: 4}],
        notes: [{x: xr[0], y: 4.2, dx: 4, dy: 10, anchor: 'start', text: '↑ vertical velocity (m/s)'},
          {x: T0, y: S0[5], dx: -8, dy: 4, anchor: 'end', text: S0[5].toFixed(2)},
          {x: T0 + H, y: v1, dx: 8, dy: 4, anchor: 'start', text: v1.toFixed(2)},
          {x: T0 + H, y: (S0[5] + v1) / 2, dx: 8, dy: 4, anchor: 'start', cls: 'hi', tex: 'a_z h'}]});
    });

    /* the gravity-only parabola and the two stepped arcs with drag, drawn in
       three stages over the tracked frames from the start: the parabola
       (dashed) all at once, then the 40 ms steps one a frame, then the 0.1 ms
       steps as a smooth draw, since their thousands of steps are too many to
       show. Left the flight from the start, middle zoomed in on the end, where
       the gaps are labeled, right where each comes down through the rim.
       data-n on the figure picks the fit, the first n frames (11 by default),
       read at the frame at or just before their middle so the 40 ms steps land
       on frames. */
    document.querySelectorAll('[data-fig="lec24-arcs"] .fig-body').forEach(host => {
      const n = +(host.closest('figure').dataset.n || 11), Jn = Math.floor((n - 1) / 2);
      const tn = T.slice(0, n).map(q => q - T[Jn]);
      const lx = line(tn, X.slice(0, n)), ly = line(tn, Y.slice(0, n));
      const lz = line(tn, Z.slice(0, n).map((z, i) => z + 0.5 * G * tn[i] * tn[i]));
      const Sn = [lx[0], ly[0], lz[0], lx[1], ly[1], lz[1]], T0n = T[Jn], SPANn = T[last] - T0n, NSn = Math.round(SPANn / H);
      const gravN = u => [Sn[0] + Sn[3] * u, Sn[1] + Sn[4] * u, Sn[2] + Sn[5] * u - 0.5 * G * u * u];
      const gc = (t0, t1, cls) => {
        const x = [], y = [];
        for (let q = t0; q <= t1 + 1e-9; q += (t1 - t0) / 80) { x.push(q); y.push(gravN(q - T0n)[2]); }
        return {x, y, cls};
      };
      const fineN = eulerRun(Sn, FINE_H, SPANn), runN = eulerRun(Sn, H, SPANn);
      const fineAtN = i => fineN[i * per];
      const fineTN = [], fineSN = [];
      for (let i = 0; i < fineN.length; i += 40) { fineTN.push(T0n + i * FINE_H); fineSN.push(fineN[i]); }
      /* where each comes down through the rim: gravity as on slides 3 and 4 (the
         fit itself), and each drag run stepped on from the same start until it
         comes down through the rim height, its last straight step cut there */
      const cross = h => {
        for (let s = Sn.slice(), q = T0n; ; q += h) {
          const rt = shotRate(q, s), nx = s.map((p, j) => p + h * rt[j]);
          if (nx[5] < 0 && nx[2] < RIM) { const w = (RIM - s[2]) / (nx[2] - s[2]); return {u: s[0] + w * (nx[0] - s[0]) - HX, v: s[1] + w * (nx[1] - s[1]) - HY}; }
          s = nx;
        }
      };
      const fit = picks.find(p => p.n === n) || fitN(n);
      const cG = fit.grav, cF = cross(FINE_H), cE = cross(H);
      const tx = runN.map((_, i) => T0n + i * H), zs = runN.map(s => s[2]);
      const fz = fineSN.map(s => s[2]), MF = 60;     // the 0.1 ms run is drawn smoothly in MF stages
      const zE = zs[NSn], zF = fineAtN(NSn)[2], zG = gravN(NSn * H)[2], zT = Z[last];
      const cmUp = v => { const d = 100 * (v - zT); return Math.abs(d).toFixed(1) + (d < 0 ? ' cm below' : ' cm above'); };
      const flat = p => 100 * Math.hypot(p[0] - X[last], p[1] - Y[last]);
      const hR = flat(runN[NSn]), hF = flat(fineAtN(NSn)), hG = flat(gravN(NSn * H));
      const zAll = [...Z.slice(Jn, last + 1), ...zs, ...fz.filter((_, i) => fineTN[i] <= T[last] + 1e-9)];
      const xl = [T0n - 0.09, T[last] + 0.03], yl = [Math.min(...zAll) - 0.16, Math.max(...zAll) + 0.10];
      const xz = [0.70, 1.16];
      const zTop = Math.max(...zs.filter((_, i) => tx[i] >= xz[0]), ...Z.slice(Jn, last + 1).filter((_, i) => T[Jn + i] >= xz[0]), gravN(xz[0] - T0n)[2]);
      const yz = [zT - 0.22, zTop + 0.10];
      const frms = frames(Jn, last);
      const clip = (xs, ys, x0) => { const k = xs.findIndex(q => q >= x0); return k < 0 ? [[], []] : [xs.slice(k), ys.slice(k)]; };
      const us = [cG.u, cF.u, cE.u, actual.u, -OUT, OUT], vs = [cG.v, cF.v, cE.v, actual.v, -OUT, OUT];
      const HB = {x: [Math.min(...us) - 0.07, Math.max(...us) + 0.12], y: [Math.min(...vs) - 0.08, Math.max(...vs) + 0.16]};
      const hW = 200, hH = Math.round((HB.y[1] - HB.y[0]) / (HB.x[1] - HB.x[0]) * (hW - 20) + 26);
      /* label heights, spread top to bottom so no two are closer than a line */
      const spread = (ys, gap) => {
        const o = {}; let prev = Infinity;
        Object.entries(ys).sort((p, q) => q[1] - p[1]).forEach(([k, y]) => { prev = Math.min(y, prev - gap); o[k] = prev; });
        return o;
      };
      const zl = spread({E: zE, G: zG, F: zF}, 13 * (yz[1] - yz[0]) / 144);
      const hl = spread({E: cE.v, G: cG.v, F: cF.v}, 13 * (HB.y[1] - HB.y[0]) / (hH - 26));
      const [left, right, hoop] = diagramRow(host, 3);
      left.parentNode.style.gridTemplateColumns = 'repeat(3, 1fr)';     // three across even on a narrow slide
      const draw = k => {
        left.textContent = ''; right.textContent = ''; hoop.textContent = '';
        const kg = k >= 1 ? NSn : 0, kr = Math.max(0, Math.min(k - 1, NSn)), kf = Math.max(0, Math.min(k - 1 - NSn, MF));
        const cl = [], cr = [], pl = [...frms], pr = frms.filter(q => q.x >= xz[0]);
        if (kg > 0) {
          cl.push(gc(T0n, T0n + kg * H, 'gl'));
          if (T0n + kg * H > xz[0]) cr.push(gc(xz[0], T0n + kg * H, 'gl'));
        }
        if (kf > 0) {
          const tE = T0n + SPANn * kf / MF, nF = fineTN.filter(q => q <= tE + 1e-9).length;
          const fx = fineTN.slice(0, nF).concat([tE]), fy = fz.slice(0, nF).concat([fineN[Math.round((tE - T0n) / FINE_H)][2]]);
          cl.push({x: fx, y: fy, cls: 'dl'});
          const [wx, wy] = clip(fx, fy, xz[0]);
          if (wx.length > 1) cr.push({x: wx, y: wy, cls: 'dl'});
        }
        if (kr > 0) {
          const rx = tx.slice(0, kr + 1), ry = zs.slice(0, kr + 1);
          cl.push({x: rx, y: ry, cls: 'rl'});
          pl.push(...rx.map((q, i) => ({x: q, y: ry[i], r: 2.4, cls: 'tail'})));
          const [wx, wy] = clip(rx, ry, xz[0]);
          if (wx.length > 1) cr.push({x: wx, y: wy, cls: 'rl'});
          pr.push(...wx.map((q, i) => ({x: q, y: wy[i], r: 3, cls: 'tail'})));
        }
        diagram(left, {w: 200, h: 170, xRange: xl, yRange: yl,
          alt: 'Height against time over the tracked frames from ' + T0n.toFixed(2) + ' s after release, the start read from the fit of the first ' + n + ' frames: the gravity-only parabola dashed, then the height stepped with drag in 40 ms steps, then in 0.1 ms steps. A box marks the end, zoomed in on the right.',
          curves: cl,
          areas: [{pts: [{x: xz[0], y: yz[0]}, {x: xz[0], y: yz[1]}, {x: T[last] + 0.02, y: yz[1]}, {x: T[last] + 0.02, y: yz[0]}], cls: 'zb'}],
          points: pl,
          notes: [...axis(xl, yl, [0.2, 0.4, 0.6, 0.8].filter(v => v > xl[0] + 0.03), [4.2, 4.4, 4.6], 'time after release (s) →', '↑ height (m)').map(q => q.text === 'time after release (s) →' ? {...q, x: xz[0], dx: -6} : q),
            {x: T0n + 0.20, y: yl[0] + 0.42, anchor: 'start', cls: 'gt', text: 'gravity only'},
            {x: T0n + 0.20, y: yl[0] + 0.31, anchor: 'start', text: '40 ms steps'},
            {x: T0n + 0.20, y: yl[0] + 0.20, anchor: 'start', cls: 'dt', text: '0.1 ms steps'}]});
        const notes = [...axis(xz, yz, [0.7, 0.8, 0.9], [4.0, 4.2, 4.4].filter(v => v > yz[0] && v < yz[1] - 0.05), 'time (s) →', '↑ height (m), zoomed in'),
          {x: T[last], y: zT, dx: -9, dy: 5, anchor: 'end', text: 'the tracked ball'}];
        if (kr === NSn) notes.push({x: T[last], y: zl.E, dx: 8, dy: 4, anchor: 'start', text: cmUp(zE)});
        if (kg === NSn) notes.push({x: T[last], y: zl.G, dx: 8, dy: 4, anchor: 'start', cls: 'gt', text: cmUp(zG)});
        if (kf === MF) notes.push({x: T[last], y: zl.F, dx: 8, dy: 4, anchor: 'start', cls: 'dt', text: cmUp(zF)});
        diagram(right, {w: 200, h: 170, xRange: xz, yRange: yz,
          alt: 'Zoomed in on the end, 0.96 s after release. Gravity only ends ' + cmUp(zG) + ' the tracked ball, the 40 ms steps ' + cmUp(zE) + ', and the 0.1 ms steps ' + cmUp(zF) + '. Across the floor they are ' + hG.toFixed(1) + ', ' + hR.toFixed(1) + ' and ' + hF.toFixed(1) + ' cm from the ball.',
          curves: cr, points: pr, notes});
        const hp = [{x: 0, y: 0, r: 2}, {x: actual.u, y: actual.v, r: 5, cls: 'frame'}], hn = [
          {x: HB.x[0], y: HB.y[1], dx: 4, dy: 10, anchor: 'start', text: 'at the rim, from above'},
          {x: actual.u, y: actual.v, dx: -9, dy: 4, anchor: 'end', text: 'tracked, ' + band(dist0(actual))}];
        if (kg === NSn) { hp.push({x: cG.u, y: cG.v, r: 5, cls: 'gring'}); hn.push({x: cG.u, y: hl.G, dx: 9, dy: 4, anchor: 'start', cls: 'gt', text: 'gravity, ' + band(dist0(cG))}); }
        if (kr === NSn) { hp.push({x: cE.u, y: cE.v, r: 4.5, cls: 'tail'}); hn.push({x: cE.u, y: hl.E, dx: 9, dy: 4, anchor: 'start', text: '40 ms, ' + band(dist0(cE))}); }
        if (kf === MF) { hp.push({x: cF.u, y: cF.v, r: 4.5, cls: 'dpt'}); hn.push({x: cF.u, y: hl.F, dx: 9, dy: -3, anchor: 'start', cls: 'dt', text: '0.1 ms, ' + band(dist0(cF))}); }
        diagram(hoop, {w: hW, h: hH, xRange: HB.x, yRange: HB.y, axes: false,
          alt: 'The hoop from above, with the clean disk and the rim band. Carried on to the rim, gravity only comes down ' + dist0(cG).toFixed(2) + ' m from the center, the 40 ms steps ' + dist0(cE).toFixed(2) + ' m and the 0.1 ms steps ' + dist0(cF).toFixed(2) + ' m. The tracked ball came through ' + dist0(actual).toFixed(2) + ' m from the center.',
          ...hoopBase(), points: hp, notes: hn});
      };
      animate(host, 1 + NSn + MF, draw, k => k === 2 ? 900 : k <= 1 + NSn ? 260 : k === 2 + NSn ? 600 : 35);
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
