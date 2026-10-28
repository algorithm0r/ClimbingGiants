/* Generated bundle: kit, the differentiation-amplifies-noise demo, this deck's
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

/* Add noise to a signal whose derivative is known exactly, then difference it.
   Two panels on one time base: the signal, where the noise is invisible, and the
   derivative, where it is the whole picture. */

const DT = 1e-3, N = 1000;
const T = linspace(0, 1 - DT, N);
const CLEAN = new Float64Array(N), TRUTH = new Float64Array(N);
for (let i = 0; i < N; i++) {
  CLEAN[i] = Math.sin(2 * Math.PI * 2 * T[i]);
  TRUTH[i] = 2 * Math.PI * 2 * Math.cos(2 * Math.PI * 2 * T[i]);
}
/* Real recorded noise, normalized to unit standard deviation. Moving the slider
   scales it; the sequence itself never changes, so comparisons across settings
   are like for like. */
const NOISE = realNoiseRaw(N, 1);   /* correlation intact: it is the subject here */

mountDemo({
  amplify: {
    setting: 'A 2&nbsp;Hz sine of amplitude 1, sampled at 1&nbsp;kHz, carrying real recorded '
           + 'instrument noise with its correlation intact. ' +
             'The true derivative peaks at 12.57&nbsp;s⁻¹.',
    source: {kind: 'mixed', text: 'A constructed 2&nbsp;Hz sine, so the true derivative is known exactly, carrying <strong>real instrument noise</strong> taken from the pre-impact window of channel 093. NHTSA test 10642, 2019 BMW&nbsp;X5 into a rigid barrier at 15.65&nbsp;m/s, TRC of Ohio, 7 January 2019.'},
    caption: 'Above: the signal, with the noise-free version as the ghost. Below: the central ' +
             'difference, against the true derivative as the ghost. The noise is the same draw at ' +
             'every setting, and only its amplitude changes. Hover either panel to magnify. The ' +
             'upper one needs it, because at small &sigma; the noise on the signal is thinner ' +
             'than the line drawn for it while the same noise fills the panel below.',
    controls: [{key: 'lsd', label: 'noise σ', min: -5, max: -1.3, step: 'any', value: -2,
                fmt: v => Math.pow(10, v).toExponential(1)}],
    /* The point of this page is a size ratio, and at small sigma the noise on
       the signal is a line's width while the noise on the derivative is the
       whole trace. The magnifier is what lets the reader see the first one at
       all, so both panels carry it. */
    panels: [
      {label: 'signal', unit: '', height: 150, lens: true, lensZoom: 40},
      {label: 'central difference', unit: 's⁻¹', height: 175, xAxis: true,
       xLabel: 'time', xUnit: 's', xScale: 1, lens: true, lensZoom: 8}
    ],
    readouts: [
      {key: 'sd',    label: 'noise σ'},
      {key: 'ypk',   label: 'peak of the signal'},
      {key: 'dpk',   label: 'peak of the derivative'},
      {key: 'dtrue', label: 'true peak'},
      {key: 'pred',  label: 'predicted noise σ/(h√2)'},
      {key: 'meas',  label: 'measured noise in it'}
    ],
    compute(s) {
      const sd = Math.pow(10, s.lsd);
      const y = new Float64Array(N);
      for (let i = 0; i < N; i++) y[i] = CLEAN[i] + sd * NOISE[i];
      const d = differentiate(y, DT, 'central');
      let ypk = 0, dpk = 0, sq = 0;
      for (let i = 1; i < N - 1; i++) {
        ypk = Math.max(ypk, Math.abs(y[i]));
        dpk = Math.max(dpk, Math.abs(d[i]));
        const e = d[i] - TRUTH[i]; sq += e * e;
      }
      return {
        panels: [
          {x: T, y, ghost: CLEAN, range: [0, 1]},
          {x: T, y: d, ghost: TRUTH, range: [0, 1]}
        ],
        readouts: {
          sd: sd.toExponential(1),
          ypk: ypk.toFixed(3),
          dpk: dpk.toFixed(1) + ' s⁻¹',
          dtrue: '12.57 s⁻¹',
          pred: (sd / (DT * Math.SQRT2)).toFixed(1),
          meas: Math.sqrt(sq / (N - 2)).toFixed(1)
        }
      };
    }
  }
});

/* ---------------------------------------------------------------------------
   fig-baseline — the spirit level. The same slop in placing the instrument is
   nothing across a long baseline and everything across a short one. This is
   the 1/h factor with no algebra in it, and the script leans on it for the
   best forty seconds of the video with nothing on screen otherwise.
--------------------------------------------------------------------------- */
function baselinePanel(cell, sep, label) {
  const SLOPE = 0.5, WOBBLE = 0.025, MID = 0.5;
  const xa = MID - sep / 2, xb = MID + sep / 2;
  /* the ramp is straight; the error is entirely in where the ends were read */
  const ya = SLOPE * xa - WOBBLE, yb = SLOPE * xb + WOBBLE;
  const m = (yb - ya) / (xb - xa);
  const chord = x => SLOPE * MID + m * (x - MID);
  const L = 0.05, R = 0.95;
  diagram(cell, {
    xRange: [0, 1], yRange: [-0.25, 0.78], title: label, axes: false,
    alt: 'A straight ramp with two samples read off it. The chord through the two '
       + 'readings is tilted away from the ramp, and the tilt is larger when the two '
       + 'readings are closer together.',
    curves: [
      {x: [0, 1], y: [0, SLOPE], cls: 'ghost'},
      {x: [L, R], y: [chord(L), chord(R)], cls: 'chord'}
    ],
    /* the true positions, so the wobble is visibly a misreading and not a bend */
    points: [{x: xa, y: SLOPE * xa, cls: 'miss', r: 3},
             {x: xb, y: SLOPE * xb, cls: 'miss', r: 3},
             {x: xa, y: ya}, {x: xb, y: yb}],
    leads: [{from: [xa, SLOPE * xa], to: [xa, ya], cls: 'cast'},
            {from: [xb, SLOPE * xb], to: [xb, yb], cls: 'cast'}],
    notes: [
      {x: 0.5, y: -0.17, anchor: 'middle', cls: 'hi',
       text: 'slope reads ' + Math.round((m / SLOPE - 1) * 100) + '% high'},
      {x: 0.03, y: 0.70, anchor: 'start', text: 'baseline ' + sep.toFixed(1)}
    ]
  });
}

(() => {
  const host = document.querySelector('#fig-baseline .fig-body');
  if (!host) return;
  const cells = diagramRow(host, 2);
  baselinePanel(cells[0], 0.7, 'a long baseline');
  baselinePanel(cells[1], 0.1, 'a short baseline');
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

/* Lecture 10's own figures, both on real records.

   The ball, arc 79 in data/arcs.json (SportVU, 25 Hz, h = 0.04 s), over its
   free flight, frames 20 to 46. Each central difference is taken on the one
   before, as np.gradient applied twice would do. Checked against the file:
     speed scatters about gravity's slope with sd 0.45 m/s
     acceleration has mean -8.9 and sd 9.8 m/s^2, values from -24 to +10
     speed with the heights smoothed over 5 samples first: scatter 0.13 m/s;
     the slope of a line fitted through 5 samples: scatter 0.19 m/s

   The crash record, test 10642 channel 093 (h = 8e-5 s), over its 625
   pre-impact samples, where the signal is taken as zero:
     sigma = 2.377 m/s^2; central-difference noise 16,507 m/s^3 measured,
     21,012 predicted for independent noise, 16,517 with the lag-2 correlation
     of 0.382; lag correlations 0.777, 0.382, -0.017, -0.246, -0.271 ...
     mean (the offset) -0.21 m/s^2, which integrates to -1.07 cm/s over the
     50 ms; the noise moves the integral at most 0.4 cm/s off that ramp
   Hosts are found by data-fig so a figure can sit under more than one claim. */
(() => {
  const each = (name, draw) =>
    document.querySelectorAll('[data-fig="' + name + '"] .fig-body').forEach(draw);
  const any = (...names) => names.some(n => document.querySelector('[data-fig="' + n + '"]'));
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  /* a short caption above one cell of a figure row */
  const cap = (cell, text) => { const p = document.createElement('div');
    p.style.cssText = 'text-align:center; color:#5A5550; font-size:1.05em; margin:0 0 .2em';
    p.textContent = text; cell.appendChild(p); };

  /* ---------------- the ball ---------------- */
  if (any('l10-speed', 'l10-chain', 'l10-ways2')) fetch('data/arcs.json').then(r => r.json()).then(d => {
    const a = d.arcs.find(q => q.id === 79), H = 0.04, G = 9.81;
    const t = a.t, z = a.z, k = a.rel, tCross = t[k] + a.target_cross_t;
    let last = k;
    while (last + 1 < t.length && t[last + 1] <= tCross) last++;
    /* height over the flight, speed by central differences of height, and
       acceleration by central differences of speed */
    const th = [], zh = [];
    for (let j = k; j <= last; j++) { th.push(t[j]); zh.push(z[j]); }
    const tv = [], v = [];
    for (let j = k + 1; j < last; j++) { tv.push(t[j]); v.push((z[j + 1] - z[j - 1]) / (2 * H)); }
    const ta = [], acc = [];
    for (let q = 1; q < v.length - 1; q++) { ta.push(tv[q]); acc.push((v[q + 1] - v[q - 1]) / (2 * H)); }
    const range = [t[k] - 0.02, tCross + 0.02];
    const tm = mean(tv), vm = mean(v);
    const gLine = (x0, x1) => ({x: [x0, x1], y: [vm - G * (x0 - tm), vm - G * (x1 - tm)], cls: 'ghost'});
    const opt = {xAxis: true, xLabel: 'time', xUnit: 's', xScale: 1};

    each('l10-speed', host => {
      panel(host, {label: 'vertical speed', unit: 'm/s', height: 280, ...opt, yClamp: [-6, 6]})(
        Float64Array.from(tv), Float64Array.from(v), null, range, {
          dots: true, dotR: 5,
          curves: [gLine(tv[0] - 0.04, tv[tv.length - 1] + 0.04)],
          marks: [{t: tv[0] - 0.04, y: vm - G * (tv[0] - 0.04 - tm),
                   text: 'slope −9.81 m/s²', dx: 12, dy: -14}]
        });
    });

    /* height, speed and acceleration stacked, each against what the physics
       says it should be: a smooth arc, gravity's slope, and -9.81 */
    each('l10-chain', host => {
      const P = (label, unit, h, x) => panel(host, {label, unit, height: h, xAxis: x, xLabel: 'time',
                                                     xUnit: 's', xScale: 1});
      P('height', 'm', 150, false)(Float64Array.from(th), Float64Array.from(zh), null, range,
        {dots: true, dotR: 4});
      P('speed', 'm/s', 150, false)(Float64Array.from(tv), Float64Array.from(v), null, range,
        {dots: true, dotR: 4, curves: [gLine(tv[0], tv[tv.length - 1])]});
      P('acceleration', 'm/s²', 175, true)(Float64Array.from(ta), Float64Array.from(acc), null, range,
        {dots: true, dotR: 4, hlines: [{y: -G, cls: 'limit', text: 'gravity, −9.81'}]});
    });

    /* two ways to steady the difference, each over the raw central differences
       in gray: smooth the heights over 5 samples and then difference, or fit a
       line through 5 samples and take its slope. Both lose samples at the ends
       of the flight, where a window would run past it. The scatter is the
       sample sd about gravity's slope, as for the raw 0.45 */
    each('l10-ways2', host => {
      const R = 2, sm = {};
      for (let j = k + R; j <= last - R; j++) {
        let s = 0; for (let q = -R; q <= R; q++) s += z[j + q]; sm[j] = s / (2 * R + 1);
      }
      const t1 = [], v1 = [], t2 = [], v2 = [];
      for (let j = k + R + 1; j <= last - R - 1; j++) { t1.push(t[j]); v1.push((sm[j + 1] - sm[j - 1]) / (2 * H)); }
      for (let j = k + R; j <= last - R; j++) {
        let s = 0, w = 0; for (let q = -R; q <= R; q++) { s += q * z[j + q]; w += q * q; }
        t2.push(t[j]); v2.push(s / (w * H));
      }
      const scatter = (tt, vv) => { const a = mean(tt), b = mean(vv);
        const r = vv.map((x, i) => x - (b - G * (tt[i] - a)));
        return Math.sqrt(r.reduce((s, x) => s + x * x, 0) / (r.length - 1)); };
      const cells = diagramRow(host, 2);
      [[t1, v1, 'smoothed over 5 samples, then differenced'], [t2, v2, 'slope of a line through 5 samples']]
        .forEach(([tt, vv, text], c) => {
          cap(cells[c], text + ': scatter ' + scatter(tt, vv).toFixed(2) + ' m/s');
          panel(cells[c], {label: 'vertical speed', unit: 'm/s', height: 400, ...opt, yClamp: [-6, 6]})(
            Float64Array.from(tt), Float64Array.from(vv), null, range, {
              dots: true, dotR: 6,
              scatter: [{x: tv, y: v, cls: 'raw', r: 5}],
              curves: [gLine(tv[0] - 0.04, tv[tv.length - 1] + 0.04)]
            });
        });
    });
  });

  /* ---------------- the crash record, before impact ---------------- */
  if (any('l10-pre', 'l10-rho', 'l10-pairs', 'l10-ways')) fetch('data/test10642-crossmember-x.json').then(r => r.json()).then(d => {
    const H = d.dt, pre = [], tp = [];
    for (let i = 0; i < d.n; i++) { const s = d.t0 + i * H; if (s < 0) { pre.push(d.a[i]); tp.push(s); } }
    const n = pre.length, m = mean(pre);

    /* the acceleration and its central difference over the same window */
    each('l10-pre', host => {
      const tj = [], j = [];
      for (let i = 1; i < n - 1; i++) { tj.push(tp[i]); j.push((pre[i + 1] - pre[i - 1]) / (2 * H)); }
      const range = [tp[0], tp[n - 1]];
      panel(host, {label: 'acceleration', unit: 'm/s²', height: 165})(
        Float64Array.from(tp), Float64Array.from(pre), null, range);
      panel(host, {label: 'its central difference, the jerk', unit: 'm/s³', height: 195, xAxis: true,
                   xLabel: 'time', xUnit: 'ms', xScale: 1000})(
        Float64Array.from(tj), Float64Array.from(j), null, range);
    });

    /* the same 50 ms both ways. Integrated (trapezoids from the first sample),
       the offset alone is the dashed ramp and the noise wiggles about it;
       differenced, the noise is all there is and the offset adds nothing */
    each('l10-ways', host => {
      const cells = diagramRow(host, 2), v = [0], tj = [], j = [];
      for (let i = 1; i < n; i++) v.push(v[i - 1] + (pre[i - 1] + pre[i]) / 2 * H);
      for (let i = 1; i < n - 1; i++) { tj.push(tp[i]); j.push((pre[i + 1] - pre[i - 1]) / (2 * H)); }
      const range = [tp[0], tp[n - 1]], cm = v.map(x => x * 100);
      const ms = {xAxis: true, xLabel: 'time', xUnit: 'ms', xScale: 1000};
      cap(cells[0], 'integrated: the offset builds a ramp');
      panel(cells[0], {label: 'speed change', unit: 'cm/s', height: 380, ...ms})(
        Float64Array.from(tp), Float64Array.from(cm), null, range, {
          curves: [{x: [tp[0], tp[n - 1]], y: [0, m * (tp[n - 1] - tp[0]) * 100], cls: 'ghost'}],
          marks: [{t: tp[n - 1], y: m * (tp[n - 1] - tp[0]) * 100, anchor: 'end', dx: -6, dy: 22,
                   text: 'the offset alone, ' + (m * (tp[n - 1] - tp[0]) * 100).toFixed(2).replace('-', '−') + ' cm/s'}]
        });
      cap(cells[1], 'differentiated: noise only, the offset contributes 0');
      panel(cells[1], {label: 'jerk', unit: 'm/s³', height: 380, ...ms})(
        Float64Array.from(tj), Float64Array.from(j), null, range);
    });

    const corr = k => {
        if (!k) return 1;
        const x = pre.slice(0, n - k), y = pre.slice(k), mx = mean(x), my = mean(y);
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < x.length; i++) {
          sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2;
        }
        return sxy / Math.sqrt(sxx * syy);
      };

    /* what a correlation is: every sample plotted against the one k later.
       At lag 1 the cloud leans along the diagonal (0.78), at lag 3 it is
       round (-0.02), and at lag 5 it leans the other way (-0.27). */
    each('l10-pairs', host => {
      const cells = diagramRow(host, 3), R = 8.2;
      [1, 3, 5].forEach((k, c) => {
        const pts = [];
        for (let i = 0; i + k < n; i++) pts.push({x: pre[i] - m, y: pre[i + k] - m, r: 2.6});
        diagram(cells[c], {
          w: 200, h: 200, xRange: [-R, R], yRange: [-R, R], axes: false,
          title: k + ' apart: ρ = ' + corr(k).toFixed(2),
          alt: 'Each pre-impact sample plotted against the sample ' + k + ' later; correlation '
             + corr(k).toFixed(2) + '.',
          leads: [{from: [-R, 0], to: [R, 0]}, {from: [0, -R], to: [0, R]},
                  {from: [-R * 0.9, -R * 0.9], to: [R * 0.9, R * 0.9], cls: 'level'}],
          points: pts,
          notes: [{x: R * 0.95, y: -0.9, anchor: 'end', text: 'sample i'},
                  {x: 0.4, y: R * 0.88, text: 'sample i + ' + k}]
        });
      });
    });

    /* correlation between samples k apart, lags 0 to 8 */
    each('l10-rho', host => {
      const L = 8, r = Array.from({length: L + 1}, (_, k) => corr(k)), bw = 0.32;
      diagram(host, {
        w: 440, h: 210, xRange: [-0.7, L + 0.7], yRange: [-0.45, 1.18], zero: true,
        title: 'correlation between samples k apart, before impact',
        alt: 'Bars of the correlation at lags 0 to 8: 1, 0.78, 0.38, then near zero and slightly negative.',
        areas: r.map((y, k) => ({cls: k === 2 ? 'tri' : 'fill',
          pts: [{x: k - bw, y: 0}, {x: k + bw, y: 0}, {x: k + bw, y}, {x: k - bw, y}]})),
        notes: [
          ...r.map((y, k) => ({x: k, y: -0.42, anchor: 'middle', text: String(k)})),
          {x: 0, y: r[0], dy: -6, anchor: 'middle', text: '1.0'},
          {x: 1, y: r[1], dy: -6, anchor: 'middle', text: r[1].toFixed(2)},
          {x: 2, y: r[2], dy: -6, anchor: 'middle', cls: 'hi', text: r[2].toFixed(2)},
          /* the negative bars: samples 4 to 6 apart tend to sit on opposite sides */
          {x: 5, y: 0.34, anchor: 'middle', text: 'below zero: one high,'},
          {x: 5, y: 0.22, anchor: 'middle', text: 'the other usually low'},
          {x: L + 0.6, y: -0.3, anchor: 'end', text: 'lag k'}]
      });
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
