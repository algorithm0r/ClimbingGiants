/* Generated bundle: kit, the state-as-a-vector demo, this deck's
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

/* A projectile with quadratic drag, integrated as a four-component state, and
   the same problem integrated as two independent one-dimensional problems. The
   second is what happens when the coupling through |v| is ignored. */

const G = 9.81;
/* k = rho C_D A / (2m) per meter: C_D 0.35, 600 g, r 0.1195 m, air 1.20 kg/m^3,
   the value the page's aside derives */
const KD = 0.016;
/* Release state measured, not chosen: the least-squares fit to the free-flight
   frames of one tracked three-pointer (shot 79, SportVU 2015-16, 25 Hz) gives a
   release 3.4520 m up, moving 6.1708 m/s horizontally and 4.7428 m/s vertically
   -- 7.78 m/s at 37.6 degrees. The arc passes the free-flight screen, and its
   fitted gravity is 9.831 m/s^2. */
const Z0 = 3.4520, VH0 = 6.1708, VZ0 = 4.7428;
const S0 = [0, Z0, VH0, VZ0];

/* the state as one object: |v| couples the two directions */
const coupled = (t, s) => {
  const [, , vx, vy] = s;
  const sp = Math.hypot(vx, vy);
  return [vx, vy, -KD * sp * vx, -G - KD * sp * vy];
};
/* the mistake: each direction using only its own speed */
const separated = (t, s) => {
  const [, , vx, vy] = s;
  return [vx, vy, -KD * Math.abs(vx) * vx, -G - KD * Math.abs(vy) * vy];
};

mountDemo({
  state: {
    setting: 'A real three-pointer, carried forward with quadratic drag from its measured release ' +
             'state: 3.452&nbsp;m up, 7.78&nbsp;m/s at 37.6°. The drag on each axis depends on the ' +
             'total speed, so the two axes are coupled.',
    source: {kind: 'mixed', text: 'The release state is measured: a least-squares fit to the free-flight frames of one tracked three-pointer, SportVU optical tracking, 2015&ndash;16 NBA season, 25&nbsp;Hz. The drag constant, 0.016 per meter, comes from a wind-tunnel drag coefficient and the ball&rsquo;s size and mass, as in the aside above. Both the coupled and the decoupled version are integrated, so the difference between them is computed rather than argued.'},
    caption: 'The trajectory in the plane: height against horizontal distance, not against time. ' +
             'The ghost is the same flight integrated as two separate one-dimensional problems, ' +
             'each using only its own velocity component, with the coupling through |v| dropped.',
    controls: [{key: 'lh', label: 'step size', min: -4, max: -1.3, step: 'any', value: -3,
                fmt: v => Math.pow(10, v).toPrecision(2) + ' s'}],
    panels: [{label: 'height', unit: 'm', height: 260, xAxis: true,
              xLabel: 'horizontal distance', xUnit: 'm', xScale: 1, lens: true, lensZoom: 18}],
    readouts: [
      {key: 'h',    label: 'step size'},
      {key: 'n',    label: 'steps'},
      {key: 'rng',  label: 'range, coupled'},
      {key: 'rng2', label: 'range, decoupled'},
      {key: 'diff', label: 'difference'},
      {key: 'apex', label: 'apex height'}
    ],
    compute(s) {
      const h = Math.pow(10, s.lh);
      const T = 1.30;
      const a = stepTo(coupled, S0, h, T, 'rk4');
      const b = stepTo(separated, S0, h, T, 'rk4');
      /* the plane view: y against x, which panel() draws by being handed x as
         its first array. A trajectory is not a time series and does not need to
         be one. */
      const xa = column(a.ss, 0), ya = column(a.ss, 1);
      const xb = column(b.ss, 0), yb = column(b.ss, 1);
      /* range: where each crosses the release height on the way down */
      const rangeOf = (X, Y) => {
        for (let i = 1; i < Y.length; i++)
          if (Y[i - 1] > Z0 && Y[i] <= Z0) {
            const f = (Z0 - Y[i - 1]) / (Y[i] - Y[i - 1]);
            return X[i - 1] + f * (X[i] - X[i - 1]);
          }
        return NaN;
      };
      const ra = rangeOf(xa, ya), rb = rangeOf(xb, yb);
      let apex = 0;
      for (const v of ya) apex = Math.max(apex, v);
      /* both curves on the coupled x grid so they share an axis */
      const yg = new Float64Array(xa.length);
      let j = 0;
      for (let i = 0; i < xa.length; i++) {
        while (j + 1 < xb.length && xb[j + 1] < xa[i]) j++;
        yg[i] = j + 1 < xb.length
          ? yb[j] + (xa[i] - xb[j]) / (xb[j + 1] - xb[j]) * (yb[j + 1] - yb[j])
          : yb[yb.length - 1];
      }
      return {
        panels: [{x: xa, y: ya, ghost: yg, range: [0, Math.max(...xa)],
          opts: {label: 'height, coupled state, with decoupled as the ghost',
                 rings: [{x: ra, y: Z0, text: 'range ' + ra.toFixed(3) + ' m'}]}}],
        readouts: {
          h: h.toPrecision(2) + ' s',
          n: String(a.ts.length - 1),
          rng: ra.toFixed(4) + ' m',
          rng2: rb.toFixed(4) + ' m',
          diff: (100 * Math.abs(rb - ra) / ra).toFixed(2) + '%',
          apex: apex.toFixed(4) + ' m'
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

/* Lecture 25's own figures, on the two worked problems: a belted occupant and
   a line of cars.
   lec25-loop:       the loop for any system: state, rate function, step line;
                     ball, occupant, 20 cars and the slope lab's 1,906 grains
                     (animated).
   lec25-grain:      the lab slope's state, six numbers a grain (animated).
   The slope lab (DEM, read-only facts from DEM-GPU/sim/classroom/
   base_scenario.json): 1,906 moving grains on 185 fixed floor grains,
   0.1 ms steps, 240,000 of them. The run clip is data/img/dem-run-15.mp4.
   The occupant: NHTSA test 10642 (2019 BMW X5 into a barrier), the rear
   crossmember's x acceleration, data/test10642-crossmember-x.json, 4501 samples
   at 12 500 Hz from -50 ms. A 75 kg occupant on a 296 kN/m belt with
   2.8 kN s/m of damping, stepped by Euler at the record's own interval.
   lec25-pulse:      the record in g; the car stops 62 ms after impact.
   lec25-belt:       the model's belt and occupant moving with the travel, beside
                     the travel curve, peaking at 105.0 mm at 70.5 ms (animated).
   lec25-ivp:        the first 30 ms of the record with solve_ivp's default steps.
   lec25-free:       the belt's spring and damper with no forcing, from 100 mm
                     (animated): one swing 105 ms, 14 mm left after it.
   lec25-afree:      IDM open-road acceleration against speed.
   lec25-wantv:      the wanted gap g0 + v T against speed.
   lec25-wantdv:     the wanted gap at 8 m/s against the closing speed.
   The line of cars: data/i80-leader-1673.json, a car recorded on NGSIM I-80
   (lane 4, 4:08 pm), and 20 cars behind it following IDM with the "normal"
   NGSIM class of Chris's Traffic Sim calibration (v_d 30.2 m/s, T 1.39 s,
   g0 1.95 m, a_max 1.27, b 1.7 m/s^2, delta 4, length 4.4 m), the wanted gap's
   dynamic part held at or above 0 as in the sim, Euler h = 0.1 s.
   lec25-leader:     the recorded car's speed, 0.45 m/s lowest at 31 s.
   lec25-chainstate: the chain's state and what each car's rate reads (animated).
   lec25-gapacc:     IDM acceleration against the gap at 8 m/s, level and closing
                     at 3 m/s: zero at 13.1 and 21.3 m.
   lec25-platoon:    the road and the 21 trajectories, the slowdown running back
                     at 14.4 km/h (animated).
   lec25-measured:   every car in lane 4 of I-80 from 470 to 600 s
                     (data/i80-lane4.json), with lines at the measured 18.6 km/h
                     and the model's 14.4 km/h through the recorded car's stop.
                     18.6 km/h: median of 249 detector pairs 100-300 m apart in
                     lanes 2-5, by cross-correlating speed series (IQR 16.7-21.3).
   An animated figure plays when its slide is shown, ends on its last frame,
   and a Replay button under it runs it again. Hosts are found by data-fig. */
(() => {
  const hosts = f => document.querySelectorAll('[data-fig="' + f + '"] .fig-body');
  const any = (...fs) => fs.some(f => hosts(f).length);
  const axis = (xr, yr, xt, yt, xl, yl, fx = v => String(v)) => [
    ...xt.map(v => ({x: v, y: yr[0], dy: 13, anchor: 'middle', text: fx(v)})),
    ...yt.map(v => ({x: xr[0], y: v, dx: 4, dy: 4, anchor: 'start', text: String(v)})),
    {x: xr[1], y: yr[0], dy: -5, anchor: 'end', text: xl},
    {x: xr[0], y: yr[1], dx: 4, dy: 10, anchor: 'start', text: yl}];
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, at, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in at) e.setAttribute(k, at[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  /* text with subscripts after an underscore, e.g. 'x_20' */
  const label = (parent, x, y, s, at = {}) => {
    const t = el('text', {x, y, ...at}, parent);
    s.split(/(_[a-z0-9]+)/).forEach(p => {
      if (!p) return;
      if (p[0] === '_') { const q = el('tspan', {'baseline-shift': 'sub', 'font-size': '72%'}, t); q.textContent = p.slice(1); }
      else t.appendChild(document.createTextNode(p));
    });
    return t;
  };

  /* draw(i) for i = 0 .. n-1, wait(i) ms apart. The still state is draw(n - 1). */
  const animate = (host, n, wait, draw) => {
    draw(n - 1);
    const slide = host.closest('.deck-slide');
    let timer = null;
    const play = () => {
      clearTimeout(timer);
      let i = 0;
      const tick = () => { draw(i); i++; if (i < n) timer = setTimeout(tick, wait(i)); };
      tick();
    };
    /* a button, because the deck reads a click anywhere else as "next slide" */
    const fig = host.closest('figure');
    if (fig && slide) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'replay'; b.textContent = 'Replay';
      b.addEventListener('click', play);
      fig.after(b);
    }
    if (slide) {
      let was = slide.classList.contains('on');
      if (was) play();
      new MutationObserver(() => {
        const on = slide.classList.contains('on');
        if (on && !was) play();
        if (!on) clearTimeout(timer);
        was = on;
      }).observe(slide, {attributes: true, attributeFilter: ['class']});
    }
  };

  /* lec25-loop: the loop for any system. The state and the rate function change
     with the system and the step line does not. Steps 0-3 light one system
     each; the still state shows all four. */
  hosts('lec25-loop').forEach(host => {
    const svg = el('svg', {viewBox: '0 0 460 244', class: 'loop', role: 'img',
      'aria-label': 'Three boxes in a loop: the state, the rate function, and the step line s = s + h times the rate. The state is 6 numbers for the ball, 2 for the occupant, 40 for 20 cars and 11,436 for the slope lab; the rate is gravity and drag, the belt and the crash record, each driver and the car ahead, or contacts, friction and bonds. The step line is the same for all four.'}, host);
    const defs = el('defs', {}, svg);
    const mk = el('marker', {id: 'loop-h', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto'}, defs);
    el('path', {d: 'M0 0L10 5L0 10z', fill: '#6b655a'}, mk);
    const box = (x, y, w, h, title) => {
      el('rect', {x, y, width: w, height: h, rx: 6, class: 'bx'}, svg);
      if (title) el('text', {x: x + w / 2, y: y + 19, 'text-anchor': 'middle', class: 'hd'}, svg).textContent = title;
    };
    box(8, 8, 196, 140, 'state');
    box(256, 8, 196, 140, 'rate function');
    box(118, 184, 224, 48, '');
    el('text', {x: 230, y: 214, 'text-anchor': 'middle', class: 'step'}, svg).textContent = 's = s + h × rate(t, s)';
    el('line', {x1: 206, y1: 78, x2: 252, y2: 78, class: 'arr', 'marker-end': 'url(#loop-h)'}, svg);
    el('path', {d: 'M354 150V206H346', class: 'arr', fill: 'none', 'marker-end': 'url(#loop-h)'}, svg);
    el('path', {d: 'M116 208H106V152', class: 'arr', fill: 'none', 'marker-end': 'url(#loop-h)'}, svg);
    const rows = [['ball: 6 numbers', 'gravity and drag'], ['occupant: 2 numbers', 'belt and crash record'],
                  ['20 cars: 40 numbers', 'each driver and the car ahead'], ['slope lab: 11,436 numbers', 'contacts, friction and bonds']];
    const txt = rows.map((r, i) => [el('text', {x: 106, y: 52 + 25 * i, 'text-anchor': 'middle'}, svg),
                                    el('text', {x: 354, y: 52 + 25 * i, 'text-anchor': 'middle'}, svg)]);
    txt.forEach((p, i) => { p[0].textContent = rows[i][0]; p[1].textContent = rows[i][1]; });
    animate(host, 5, () => 1500, n => txt.forEach((p, i) => p.forEach(t => t.classList.toggle('dim', n < 4 && i !== n))));
  });

  /* lec25-grain: a patch of 28 grains from the lab slope's starting packing
     (classroom/base_scenario.json of the DEM, positions relative to the grain
     at (0.56, 17.0) m, radii in m). The marked grain moves and turns, so its six
     numbers are the position, the velocity, the rotation and the rotation rate. */
  hosts('lec25-grain').forEach(host => {
    const G = [[-1.71, -4.97, 1.045], [3.87, -4.08, 1.001], [-4.68, -2.48, 1.066], [-2.45, -2.85, 1.202], [1.96, -4.78, 0.831],
      [4.0, -2.02, 1.06], [-3.44, -0.95, 0.922], [0.14, -4.46, 0.879], [2.24, -3.04, 0.932], [-2.11, 0.7, 1.202],
      [-0.02, -2.31, 1.283], [2.03, -0.92, 1.203], [-4.88, 0.05, 0.827], [-0.53, 2.29, 1.057], [0.0, 0.0, 1.026],
      [3.35, 0.95, 1.095], [4.95, 0.0, 0.769], [-4.19, 2.03, 1.271], [-0.87, 4.14, 0.825], [1.35, 1.49, 0.987],
      [3.71, 3.26, 1.253], [5.98, -1.24, 0.852], [-2.31, 3.15, 0.922], [1.13, 3.81, 1.196], [-3.92, 4.38, 1.096],
      [-1.68, 5.7, 0.945], [0.4, 6.08, 1.173], [5.12, 1.69, 0.826]];
    const S = 15.5, CX = 124, CY = 100, X = x => CX + S * x, Y = y => CY - S * y;
    const svg = el('svg', {viewBox: '0 0 460 200', class: 'grain', role: 'img',
      'aria-label': 'A patch of 28 round grains from the lab slope, packed together. One grain is marked. A dot at its center is labeled x, y, an arrow from it is labeled v_x, v_y, and a line from its center to its edge turns as it rotates, labeled rotation and rotation rate. Beside it: 6 numbers a grain, times 1,906 grains, makes 11,436 numbers in the state.'}, host);
    const defs = el('defs', {}, svg);
    const mk = el('marker', {id: 'gr-h', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto'}, defs);
    el('path', {d: 'M0 0L10 5L0 10z', fill: '#8A6508'}, mk);
    G.forEach((g, i) => { if (i !== 14) el('circle', {cx: X(g[0]), cy: Y(g[1]), r: S * g[2], class: 'gr'}, svg); });
    const me = el('g', {}, svg);
    el('circle', {cx: 0, cy: 0, r: S * 1.026, class: 'gh'}, me);
    const mark = el('line', {x1: 0, y1: 0, x2: S * 1.026, y2: 0, class: 'mark'}, me);
    el('circle', {cx: 0, cy: 0, r: 2.6, class: 'ctr'}, me);
    el('line', {x1: 0, y1: 0, x2: 44, y2: -16, class: 'vel', 'marker-end': 'url(#gr-h)'}, me);
    el('path', {d: 'M' + (S * 1.3) + ' 0A' + (S * 1.3) + ' ' + (S * 1.3) + ' 0 0 0 ' + (S * 1.3 * Math.cos(1.2)).toFixed(1) + ' ' + (-S * 1.3 * Math.sin(1.2)).toFixed(1), class: 'spin', fill: 'none', 'marker-end': 'url(#gr-h)'}, me);
    label(me, -4, 6, 'x, y', {'text-anchor': 'end', class: 'gl'});
    label(me, 50, -14, 'v_x, v_y', {class: 'gl'});
    label(me, 4, -28, 'θ, ω', {class: 'gl'});
    [['each grain: position, velocity,', 0], ['rotation and rotation rate', 1], ['6 numbers × 1,906 grains', 3], ['= 11,436 numbers in the state', 4]]
      .forEach(([t, k]) => { el('text', {x: 268, y: 62 + 22 * k, class: k > 2 ? 'big' : ''}, svg).textContent = t; });
    const NF = 60;
    animate(host, NF, () => 50, f => {
      const u = f / (NF - 1), dx = 9 * u, dy = -3 * u, th = -2.2 * u;
      me.setAttribute('transform', 'translate(' + (X(0) + dx).toFixed(1) + ' ' + (Y(0) + dy).toFixed(1) + ')');
      mark.setAttribute('x2', (S * 1.026 * Math.cos(th)).toFixed(1)); mark.setAttribute('y2', (S * 1.026 * Math.sin(th)).toFixed(1));
    });
  });


  /* lec25-chainstate: the chain's state, a position and a speed for each car;
     each car's rate reads the car ahead. The arrows appear from the front back. */
  hosts('lec25-chainstate').forEach(host => {
    const svg = el('svg', {viewBox: '0 0 460 150', class: 'chainst', role: 'img',
      'aria-label': 'A line of cars on a road, the recorded car in front at the right, then car 1, car 2, car 3 and so on back to car 20 at the left. Under each car its two numbers, its position x and speed v. An arrow from each car to the one behind it reads: gap and closing speed.'}, host);
    const defs = el('defs', {}, svg);
    const mk = el('marker', {id: 'cs-h', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto'}, defs);
    el('path', {d: 'M0 0L10 5L0 10z', fill: '#8A6508'}, mk);
    el('line', {x1: 4, x2: 456, y1: 92, y2: 92, class: 'road'}, svg);
    const cars = [{x: 392, name: 'recorded', sub: 'from I-80'}, {x: 300, name: 'car 1', sub: 'x_1, v_1'},
                  {x: 208, name: 'car 2', sub: 'x_2, v_2'}, {x: 116, name: 'car 3', sub: 'x_3, v_3'},
                  {x: 14, name: 'car 20', sub: 'x_20, v_20'}];
    cars.forEach((c, i) => {
      el('rect', {x: c.x, y: 72, width: 54, height: 20, rx: 5, class: i ? 'car' : 'rec'}, svg);
      el('text', {x: c.x + 27, y: 112, 'text-anchor': 'middle'}, svg).textContent = c.name;
      label(svg, c.x + 27, 128, c.sub, {'text-anchor': 'middle', class: 'vars'});
    });
    el('text', {x: 92, y: 86, 'text-anchor': 'middle', class: 'dots'}, svg).textContent = '…';
    const arrows = [0, 1, 2].map(i => {
      const a = cars[i].x + 4, b = cars[i + 1].x + 50;
      const g = el('g', {class: 'ar'}, svg);
      el('path', {d: 'M' + a + ' 68Q' + (a + b) / 2 + ' 30 ' + b + ' 68', class: 'reads', fill: 'none', 'marker-end': 'url(#cs-h)'}, g);
      if (!i) el('text', {x: 230, y: 20, 'text-anchor': 'middle', class: 'rd'}, g).textContent = 'each car reads the gap to the car ahead and how fast it is closing';
      return g;
    });
    animate(host, 4, () => 700, n => arrows.forEach((g, i) => g.classList.toggle('on', i < n)));
  });

  /* lec25-gapacc: the IDM acceleration against the gap at 8 m/s, with the car
     ahead at the same speed and closing at 3 m/s. Zero at 13.1 and 21.3 m. */
  hosts('lec25-gapacc').forEach(host => {
    const P = {v0: 30.2, T: 1.39, s0: 1.95, a: 1.27, b: 1.7}, v = 8;
    const acc = (g, dv) => P.a * (1 - (v / P.v0) ** 4 - ((P.s0 + Math.max(0, v * P.T + v * dv / (2 * Math.sqrt(P.a * P.b)))) / g) ** 2);
    const xr = [0, 60], yr = [-4, 2];
    const curve = dv => { const x = [], y = [];
      for (let g = 2; g <= 60; g += 0.1) { const a = acc(g, dv); if (a >= yr[0]) { x.push(g); y.push(a); } }
      return {x, y}; };
    const zero = dv => { let lo = 2, hi = 60; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (acc(m, dv) < 0) lo = m; else hi = m; } return lo; };
    const z0 = zero(0), z2 = zero(3);
    diagram(host, {w: 440, h: 168, xRange: xr, yRange: yr, zero: true,
      alt: 'The model\'s acceleration against the gap to the car ahead, at 8 m/s. With the car ahead at the same speed it is zero at a gap of 13.1 m, braking below that and speeding up above it, toward 1.26 m/s squared far behind. Closing at 3 m/s, the zero moves out to 21.3 m.',
      curves: [{...curve(0)}, {...curve(3), cls: 'alt'}],
      points: [{x: z0, y: 0}, {x: z2, y: 0, cls: 'redot'}],
      notes: [...axis(xr, yr, [0, 20, 40, 60], [-4, -2, 2], 'gap to the car ahead (m) →', '↑ acceleration (m/s²)'),
        {x: z0, y: 0, dx: -4, dy: -8, anchor: 'end', cls: 'acc', text: 'same speed: ' + z0.toFixed(1) + ' m'},
        {x: z2, y: 0, dx: 5, dy: 15, anchor: 'start', cls: 'hi', text: 'closing at 3 m/s: ' + z2.toFixed(1) + ' m'},
        {x: 60, y: acc(60, 0), dx: -2, dy: -8, anchor: 'end', text: 'far behind: up to ' + acc(1e6, 0).toFixed(2) + ' m/s²'}]});
  });

  /* lec25-free: the belt's spring and damper with no forcing, the occupant
     pulled 100 mm forward and let go: u = A e^(-zeta wn t)(cos wd t + (zeta wn / wd) sin wd t),
     wn = sqrt(k/m) = 62.8 rad/s, zeta = c / (2 sqrt(k m)) = 0.30 (animated). */
  hosts('lec25-free').forEach(host => {
    const M = 75, K = 296e3, C = 2.8e3, wn = Math.sqrt(K / M), z = C / (2 * Math.sqrt(K * M)), wd = wn * Math.sqrt(1 - z * z);
    const u = t => 100 * Math.exp(-z * wn * t) * (Math.cos(wd * t) + z * wn / wd * Math.sin(wd * t));
    const T = [], U = [];
    for (let t = 0; t <= 0.3 + 1e-9; t += 0.001) { T.push(t * 1e3); U.push(u(t)); }
    const Td = 2 * Math.PI / wd, xr = [0, 300], yr = [-60, 140], NF = 61;
    animate(host, NF, () => 40, f => {
      const m = Math.round(f / (NF - 1) * (T.length - 1)) + 1, end = f === NF - 1;
      host.textContent = '';
      diagram(host, {w: 440, h: 180, xRange: xr, yRange: yr, zero: true,
        alt: 'The occupant\'s travel with no forcing, pulled 100 mm forward and let go. It swings back past zero to about 38 mm the other way, returns to about 14 mm, and has nearly stopped by 300 ms. One full swing takes ' + (Td * 1e3).toFixed(0) + ' ms.',
        leads: end ? [{from: [0, 116], to: [Td * 1e3, 116], cls: 'level'}] : [],
        curves: [{x: T.slice(0, m), y: U.slice(0, m)}],
        points: [{x: T[m - 1], y: U[m - 1]}],
        notes: [...axis(xr, yr, [0, 100, 200], [-50, 50, 100], 'time (ms) →', '↑ travel u (mm)'),
          ...(end ? [{x: Td * 1e3 + 6, y: 116, dy: 4, anchor: 'start', cls: 'hi', text: 'one swing, ' + (Td * 1e3).toFixed(0) + ' ms'},
                     {x: Td * 1e3, y: u(Td), dx: 6, dy: -6, anchor: 'start', cls: 'hi', text: u(Td).toFixed(0) + ' mm left after one swing'}] : [])]});
    });
  });

  /* lec25-afree: IDM acceleration on an open road, a_max (1 - (v / v_d)^4). */
  hosts('lec25-afree').forEach(host => {
    const A = 1.27, VD = 30.2, xr = [0, 34], yr = [-0.2, 1.6], V = [], Y = [];
    for (let v = 0; v <= 32; v += 0.1) { V.push(v); Y.push(A * (1 - (v / VD) ** 4)); }
    diagram(host, {w: 440, h: 180, xRange: xr, yRange: yr, zero: true,
      alt: 'Acceleration on an open road against the driver\'s speed. It is 1.27 m/s squared from a standstill, still 1.26 at 8 m/s and 1.03 at 20 m/s, then falls quickly to zero at the desired speed, 30.2 m/s.',
      curves: [{x: V, y: Y}],
      points: [{x: 0, y: A}, {x: 8, y: A * (1 - (8 / VD) ** 4)}, {x: VD, y: 0}],
      notes: [...axis(xr, yr, [0, 10, 20, 30], [0.5, 1, 1.5], 'your speed v (m/s) →', '↑ acceleration (m/s²)'),
        {x: 0, y: A, dx: 8, dy: 16, anchor: 'start', cls: 'acc', text: '1.27 m/s² from a stop'},
        {x: VD, y: 0, dx: -8, dy: -22, anchor: 'end', cls: 'hi', text: 'zero at the desired speed, 30.2 m/s'}]});
  });

  /* lec25-wantv: the wanted gap at a steady speed, g0 + v T. */
  hosts('lec25-wantv').forEach(host => {
    const G0 = 1.95, TH = 1.39, xr = [0, 32], yr = [0, 50];
    diagram(host, {w: 440, h: 180, xRange: xr, yRange: yr,
      alt: 'The wanted gap against speed, with the car ahead at the same speed: 1.95 m at a standstill, rising in a straight line, 13.1 m at 8 m/s and 43.7 m at 30 m/s.',
      curves: [{x: [0, 30], y: [G0, G0 + 30 * TH]}],
      points: [{x: 0, y: G0}, {x: 8, y: G0 + 8 * TH}, {x: 30, y: G0 + 30 * TH}],
      notes: [...axis(xr, yr, [0, 10, 20, 30], [10, 20, 30, 40], 'your speed v (m/s) →', '↑ wanted gap (m)'),
        {x: 0, y: G0, dx: 8, dy: -8, anchor: 'start', cls: 'acc', text: 'g₀ = 1.95 m when stopped'},
        {x: 8, y: G0 + 8 * TH, dx: 8, dy: 4, anchor: 'start', cls: 'hi', text: (Math.round((G0 + 8 * TH) * 10) / 10).toFixed(1) + ' m at 8 m/s'},
        {x: 30, y: G0 + 30 * TH, dx: -8, dy: 4, anchor: 'end', cls: 'hi', text: (Math.round((G0 + 30 * TH) * 10 + 1e-9) / 10).toFixed(1) + ' m at 30 m/s'}]});
  });

  /* lec25-wantdv: the wanted gap at 8 m/s against the closing speed,
     g0 + max(0, v T + v dv / (2 sqrt(a_max b))). */
  hosts('lec25-wantdv').forEach(host => {
    const G0 = 1.95, TH = 1.39, A = 1.27, B = 1.7, v = 8, xr = [-6, 5], yr = [0, 30];
    const want = dv => G0 + Math.max(0, v * TH + v * dv / (2 * Math.sqrt(A * B)));
    const X = [], Y = [];
    for (let dv = -6; dv <= 5 + 1e-9; dv += 0.05) { X.push(dv); Y.push(want(dv)); }
    diagram(host, {w: 440, h: 180, xRange: xr, yRange: yr,
      alt: 'The wanted gap at 8 m/s against how fast you are closing on the car ahead. At 0 it is 13.1 m. Closing at 3 m/s it is 21.2 m. When the car ahead is pulling away the wanted gap shrinks, to 4.9 m at 3 m/s apart, and stays at the 1.95 m standstill gap beyond about 4.1 m/s apart.',
      leads: [{from: [0, 0], to: [0, 29], cls: 'cast'}],
      curves: [{x: X, y: Y}],
      points: [{x: 0, y: want(0)}, {x: 3, y: want(3)}],
      notes: [...axis(xr, yr, [-4, -2, 0, 2, 4], [10, 20], 'closing speed Δv (m/s) →', '↑ wanted gap at 8 m/s (m)', v => (v < 0 ? '−' : '') + Math.abs(v)),
        {x: 0, y: want(0), dx: -6, dy: -6, anchor: 'end', cls: 'acc', text: 'same speed: ' + want(0).toFixed(1) + ' m'},
        {x: 3, y: want(3), dx: -6, dy: -6, anchor: 'end', cls: 'hi', text: 'closing at 3 m/s: ' + want(3).toFixed(1) + ' m'},
        {x: -6, y: 2, dx: 4, dy: -6, anchor: 'start', text: '← pulling away'}, {x: 5, y: 2, dx: -4, dy: -14, anchor: 'end', text: 'closing →'}]});
  });

  /* lec25-ivp: the first 30 ms of the record, with solve_ivp's own steps at its
     default settings marked. Step times from scipy 1.x, RK45, rtol 1e-3, atol
     1e-6, the occupant's rate with np.interp, recomputed 2026-11-12. */
  hosts('lec25-ivp').forEach(host => {
    const STEPS = [0.219, 0.497, 0.767, 1.082, 1.449, 1.92, 2.576, 3.08, 3.584, 4.117, 4.93, 5.834, 6.667, 7.928,
      9.149, 9.855, 10.422, 10.985, 11.518, 12.166, 12.848, 13.614, 14.381, 15.072, 15.804, 16.469, 17.151,
      17.909, 18.825, 19.861, 20.472, 21.084, 21.642, 22.251, 22.908, 23.53, 24.174, 24.949, 25.766, 26.815,
      27.953, 28.979, 29.948];
    fetch('data/test10642-crossmember-x.json').then(r => r.json()).then(d => {
      const ms = [], g = [];
      for (let i = 0; i < d.a.length; i++) {
        const t = (d.t0 + i * d.dt) * 1e3;
        if (t < 0) continue; if (t > 30) break;
        ms.push(t); g.push(d.a[i] / 9.81);
      }
      const xr = [0, 30], yr = [-170, 40];
      diagram(host, {w: 440, h: 190, xRange: xr, yRange: yr, zero: true,
        alt: 'The first 30 ms of the car\'s recorded acceleration in g, one sample every 0.08 ms, spiking as low as 157 g at 10.8 ms. Dashed lines mark the times solve_ivp steps to with its default settings, about 0.7 ms apart, so each step spans about 9 samples, and the 157 g spike falls between the steps at 10.4 and 11.0 ms.',
        leads: STEPS.map(t => ({from: [t, yr[0]], to: [t, yr[1] - 14], cls: 'cast'})),
        curves: [{x: ms, y: g, cls: 'thin'}],
        notes: [...axis(xr, yr, [0, 10, 20, 30], [-150, -100, -50], 'time from impact (ms) →', '↑ car\'s acceleration (g)'),
          {x: 30, y: 26, anchor: 'end', cls: 'hi', text: 'dashed: solve_ivp\'s own steps, about 9 samples apart'},
          {x: 30, y: -128, anchor: 'end', text: 'peak travel: 103.8 mm by default, 104.8 mm with max_step = 80 \u00b5s'}]});
    });
  });

  if (any('lec25-leader', 'lec25-platoon', 'lec25-measured')) fetch('data/i80-leader-1673.json').then(r => r.json()).then(L => {
    /* the recorded leader, vehicle 1673 in lane 4, 70.1 s from 484.7 s into the
       record; 20 IDM followers ("normal" NGSIM class, rounded), Euler h = 0.1 s,
       started at the equilibrium spacing for the leader's first speed */
    const dt = L.dt, X = L.y, V = L.v, nT = X.length, tEnd = (nT - 1) * dt;
    const at = (arr, t) => { const f = t / dt, i = Math.max(0, Math.min(nT - 2, Math.floor(f))); return arr[i] + (f - i) * (arr[i + 1] - arr[i]); };
    const P = {v0: 30.2, T: 1.39, s0: 1.95, a: 1.27, b: 1.7, len: 4.4}, N = 20, H = 0.1;
    const se = (P.s0 + V[0] * P.T) / Math.sqrt(1 - (V[0] / P.v0) ** 4);
    let x = Array.from({length: N}, (_, i) => X[0] - (i + 1) * (se + P.len)), v = Array(N).fill(V[0]);
    const xs = [x.slice()], vs = [v.slice()], steps = Math.round(tEnd / H);
    for (let k = 0; k < steps; k++) {
      const t = k * H, xa = [at(X, t), ...x.slice(0, -1)], va = [at(V, t), ...v.slice(0, -1)];
      const acc = v.map((vi, i) => {
        const gap = xa[i] - x[i] - P.len, want = P.s0 + Math.max(0, vi * P.T + vi * (vi - va[i]) / (2 * Math.sqrt(P.a * P.b)));
        return P.a * (1 - (vi / P.v0) ** 4 - (want / gap) ** 2); });
      x = x.map((xi, i) => xi + H * v[i]); v = v.map((vi, i) => vi + H * acc[i]);
      xs.push(x.slice()); vs.push(v.slice());
    }
    const tt = xs.map((_, k) => k * H);
    /* each vehicle's lowest speed: where and when; the leader's from its record */
    const il = V.indexOf(Math.min(...V));
    const dips = [{t: il * dt, x: X[il], v: V[il]}];
    for (let j = 0; j < N; j++) { let k = 0; vs.forEach((r, q) => { if (r[j] < vs[k][j]) k = q; }); dips.push({t: tt[k], x: xs[k][j], v: vs[k][j]}); }
    const n = dips.length, mt = dips.reduce((p, q) => p + q.t, 0) / n, mx = dips.reduce((p, q) => p + q.x, 0) / n;
    const slope = dips.reduce((p, q) => p + (q.t - mt) * (q.x - mx), 0) / dips.reduce((p, q) => p + (q.t - mt) ** 2, 0);
    const kmh = slope * 3.6, ix = mx - slope * mt;

    hosts('lec25-leader').forEach(host => {
      const xr = [0, 72], yr = [0, 13], tl = X.map((_, i) => i * dt);
      diagram(host, {w: 440, h: 190, xRange: xr, yRange: yr,
        alt: 'The recorded car\'s speed over the 70 s it was in view on I-80. It starts near 11 m/s, slows to 0.45 m/s at 31 s, and speeds back up to about 10 m/s.',
        curves: [{x: tl, y: V}],
        points: [{x: il * dt, y: V[il]}],
        notes: [...axis(xr, yr, [0, 20, 40, 60], [5, 10], 'time (s) →', '↑ speed (m/s)'),
          {x: il * dt, y: V[il], dx: -8, dy: 4, anchor: 'end', cls: 'hi', text: V[il].toFixed(2) + ' m/s at ' + (il * dt).toFixed(0) + ' s'},
          {x: 72, y: 12, anchor: 'end', text: 'NGSIM I-80, lane 4, 4:08 pm'}]});
    });

    hosts('lec25-platoon').forEach(host => {
      const strip = document.createElement('div'), plot = document.createElement('div');
      host.append(strip, plot);
      const xr = [0, 72], yr = [-470, 520], every = 5, nf = Math.floor(steps / every) + 1;
      animate(host, nf, () => 50, f => {
        const k = Math.min(steps, f * every), t = tt[k], end = f === nf - 1, xl = at(X, t), vl = at(V, t);
        strip.textContent = ''; plot.textContent = '';
        diagram(strip, {w: 440, h: 30, xRange: yr, yRange: [0, 1], axes: false,
          alt: 'The road, with the recorded car and the 20 model cars as dots at their positions; slow cars are red.',
          leads: [{from: [yr[0], 0.2], to: [yr[1], 0.2], cls: 'lead'}],
          points: [...xs[k].map((p, j) => ({x: p, y: 0.2, r: 3.2, cls: vs[k][j] < 2 ? 'redot' : 'dot'})),
                   {x: xl, y: 0.2, r: 3.8, cls: vl < 2 ? 'redot recd' : 'recd'}],
          notes: [{x: yr[0], y: 0.95, dx: 2, anchor: 'start', text: t.toFixed(0) + ' s, red: slower than 2 m/s'},
                  {x: yr[1], y: 0.95, anchor: 'end', text: 'driving direction →'}]});
        const tlk = Math.min(nT - 1, Math.round(t / dt)), tlx = X.slice(0, tlk + 1).map((_, i) => i * dt);
        const seen = dips.filter(q => q.t <= t);
        diagram(plot, {w: 440, h: 160, xRange: xr, yRange: yr,
          alt: 'Position along the road against time for the recorded car and the 20 model cars behind it. Every line rises, since every car moves forward. Each car\'s slowest moment comes later and farther back than the one ahead, along a line that runs back at 14.4 km/h.',
          leads: end ? [{from: [dips[0].t, ix + slope * dips[0].t], to: [dips[n - 1].t + 4, ix + slope * (dips[n - 1].t + 4)], cls: 'tangent', over: true}] : [],
          curves: [{x: tlx, y: X.slice(0, tlk + 1), cls: 'rectr'},
                   ...Array.from({length: N}, (_, j) => ({x: tt.slice(0, k + 1), y: xs.slice(0, k + 1).map(r => r[j]), cls: 'cartr'}))],
          points: seen.map(q => ({x: q.t, y: q.x, r: 2.6})),
          notes: [...axis(xr, yr, [0, 20, 40, 60], [-400, -200, 200, 400], 'time (s) →', '↑ position along the road (m)'),
            ...(end ? [{x: dips[n - 1].t + 4, y: ix + slope * (dips[n - 1].t + 4), dx: 0, dy: 16, anchor: 'end', cls: 'hi',
                        text: 'slowest moments: back at ' + Math.abs(kmh).toFixed(1) + ' km/h'}] : [])]});
      });
    });

    if (any('lec25-measured')) fetch('data/i80-lane4.json').then(r => r.json()).then(M => {
      hosts('lec25-measured').forEach(host => {
        const xr = [470, 600], yr = [0, 570], c = M.wave_kmh_measured / 3.6, cm = kmh / 3.6, ym = 140;
        const t0 = 484.7 + dips[0].t, x0 = dips[0].x;
        diagram(host, {w: 440, h: 200, xRange: xr, yRange: yr,
          alt: 'Position against time for every car tracked in lane 4 of I-80 from 470 to 600 s. Bands where the lines flatten, cars slowing or stopped, run down and to the right: the slowdowns travel back along the road. A line through the recorded car\'s stop at the measured 18.6 km/h follows the bands; the model\'s 14.4 km/h line is shallower.',
          leads: [{from: [t0, x0], to: [t0 + x0 / -c, 0], cls: 'tangent', over: true},
                  {from: [t0, x0], to: [t0 + x0 / -cm, 0], cls: 'modl', over: true}],
          curves: M.trajectories.map(r => ({x: r.y.map((_, i) => r.t0 + i * 0.5), y: r.y, cls: 'cartr'})),
          points: [{x: t0, y: x0}],
          notes: [...axis(xr, yr, [480, 520, 560], [100, 200, 300, 400], 'time into the recording (s) →', '↑ position along the road (m)'),
            {x: t0 + (x0 - ym) / -c, y: ym, dx: -6, dy: 4, anchor: 'end', cls: 'hi', text: 'measured, ' + Math.abs(M.wave_kmh_measured).toFixed(1) + ' km/h'},
            {x: t0 + (x0 - ym) / -cm, y: ym, dx: 6, dy: 4, anchor: 'start', cls: 'acc', text: 'model, ' + Math.abs(kmh).toFixed(1) + ' km/h'}]});
      });
    });
  });

  /* lec25-pulse: the record itself, in g, so the slide shows what the rate looks up */
  if (any('lec25-pulse')) fetch('data/test10642-crossmember-x.json').then(r => r.json()).then(d => {
    const ms = [], g = [];
    let v = 0, stop = 0;
    for (let i = 0; i < d.a.length; i++) {
      const t = (d.t0 + i * d.dt) * 1e3;
      /* the car's speed from impact, by adding up the record; it reaches zero at the stop */
      if (t >= 0) { v += d.a[i] * d.dt; if (!stop && 15.65 + v <= 0) stop = t; }
      if (t > 200) break;
      ms.push(t); g.push(d.a[i] / 9.81);
    }
    hosts('lec25-pulse').forEach(host => {
      const xr = [-10, 200], yr = [-165, 75];
      diagram(host, {w: 440, h: 200, xRange: xr, yRange: yr, zero: true,
        alt: 'The car\'s recorded acceleration in g against time from impact. It is near zero before impact, then a dense band of sharp spikes, mostly between about 60 g and 20 g of deceleration with one spike to 157 g at 11 ms, until the car stops at about 62 ms, and smaller swings after that.',
        leads: [{from: [stop, yr[0]], to: [stop, yr[1] - 12], cls: 'level'}],
        curves: [{x: ms, y: g, cls: 'thin'}],
        notes: [...axis(xr, yr, [0, 50, 100, 150], [-150, -100, -50, 50], 'time from impact (ms) →', '↑ car\'s acceleration (g)'),
          {x: stop, y: 52, dx: 5, anchor: 'start', cls: 'hi', text: 'car stopped, ' + Math.round(stop) + ' ms'},
          {x: 200, y: -128, anchor: 'end', text: 'NHTSA test 10642, 2019 BMW X5, 15.65 m/s into a barrier'}]});
    });
  });

  if (any('lec25-belt')) fetch('data/test10642-crossmember-x.json').then(r => r.json()).then(d => {
    const A = d.a, dt = d.dt, M = 75, K = 296e3, C = 2.8e3;
    /* the same Euler step as the page, one step per sample, so the rate only
       ever asks for the car's acceleration at a recorded time */
    const ms = [], u = [];
    let s = [0, 0], pk = 0;
    for (let i = 0; i < A.length; i++) {
      ms.push((d.t0 + i * dt) * 1e3); u.push(s[0] * 1e3);
      if (u[i] > u[pk]) pk = i;
      const rate = [s[1], (-C * s[1] - K * s[0]) / M - A[i]];
      s = [s[0] + dt * rate[0], s[1] + dt * rate[1]];
    }
    const i0 = ms.findIndex(t => t >= -10), upTo = ms.findIndex(t => t > 200);
    const every = Math.round(2e-3 / dt);
    hosts('lec25-belt').forEach(host => {
      const row = document.createElement('div'); row.className = 'beltrow';
      const pic = document.createElement('div'), plot = document.createElement('div');
      row.append(pic, plot); host.appendChild(row);
      /* the belt and occupant, drawn in the car; 0.55 px per mm of travel */
      const svg = el('svg', {viewBox: '0 0 300 200', class: 'msd', role: 'img',
        'aria-label': 'The model: a belt anchored to the car, a spring and a damper, holding a block for the occupant. The block moves forward as the travel grows, to 105 mm, then swings back.'}, pic);
      el('rect', {class: 'car', x: 6, y: 30, width: 288, height: 150, rx: 10}, svg);
      el('text', {x: 16, y: 47}, svg).textContent = 'car';
      el('rect', {class: 'wall', x: 22, y: 62, width: 14, height: 90}, svg);
      el('line', {class: 'restmark', x1: 180, x2: 180, y1: 60, y2: 160}, svg);
      const spr = el('path', {class: 'spr'}, svg);
      el('path', {class: 'dmp', d: 'M36 128H90M160 118H90V138H160'}, svg);
      const rod = el('path', {class: 'dmp'}, svg);
      const mass = el('rect', {class: 'mass', y: 70, width: 70, height: 76, rx: 4}, svg);
      const mt = el('text', {y: 112, 'text-anchor': 'middle'}, svg); mt.textContent = 'occupant';
      const clock = el('text', {x: 150, y: 18, 'text-anchor': 'middle', class: 'clock'}, svg);
      const PX = 0.55;
      const pose = um => {
        const L = 180 + PX * um;
        mass.setAttribute('x', L); mt.setAttribute('x', L + 35);
        /* the spring: straight leads, eight zigzags between them */
        const a = 36, y = 92, lead = 14, z = (L - a - 2 * lead) / 8;
        let p = 'M' + a + ' ' + y + 'H' + (a + lead);
        for (let k = 0; k < 8; k++) p += 'l' + (z / 2).toFixed(2) + ' ' + (k % 2 ? 10 : -10) + 'l' + (z / 2).toFixed(2) + ' ' + (k % 2 ? -10 : 10);
        spr.setAttribute('d', p + 'H' + L);
        const pis = 125 + PX * um;
        rod.setAttribute('d', 'M' + pis + ' 120V136M' + pis + ' 128H' + L);
      };
      animate(host, Math.ceil((upTo - 1 - i0) / every) + 1, () => 40, f => {
        const i = Math.min(upTo - 1, i0 + f * every), end = i === upTo - 1;
        pose(u[i]);
        clock.textContent = ms[i].toFixed(0) + ' ms after impact, travel ' + u[i].toFixed(0) + ' mm';
        plot.textContent = '';
        const xr = [-10, 200], yr = [-60, 125];
        const k = end ? pk : i;
        diagram(plot, {w: 300, h: 200, xRange: xr, yRange: yr, zero: true,
          alt: 'The model occupant\'s travel relative to the car against time from impact. It rises from about 10 ms to a peak of 105 mm at 70.5 ms, swings back to about 40 mm the other way near 130 ms, and settles by 200 ms.',
          curves: [{x: ms.slice(i0, i + 1), y: u.slice(i0, i + 1)}],
          points: [{x: ms[k], y: u[k], r: 3.6}],
          notes: [...axis(xr, yr, [0, 50, 100, 150], [-50, 50, 100], 'time from impact (ms) →', '↑ travel (mm)'),
            ...(i >= pk ? [{x: ms[pk], y: u[pk], dx: 7, dy: 2, anchor: 'start', cls: 'hi',
              text: u[pk].toFixed(0) + ' mm at ' + ms[pk].toFixed(1) + ' ms'}] : [])]});
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
