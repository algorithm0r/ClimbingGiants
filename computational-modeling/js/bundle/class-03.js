/* Generated bundle: kit, the bias-and-noise demo, this deck's
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
      /* map the magnified point to the centre of the box */
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
       over it, and labelled at the left where the axis already is. */
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
   follows, because baseline-shift is not honoured by every browser. */
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

/* a centred moving average of odd width w */
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

/* panel(), integrate(), niceTicks() and friends come from _shell/kit.js. */

let DATA = null;
async function load(src){ if(!DATA) DATA = await (await fetch(src)).json(); return DATA; }

class CgDemo extends HTMLElement{
  async connectedCallback(){
    if(this._done)return;this._done=true;
    if(this.getAttribute('case')==='growth'){ await growthDemo(this); return; }
    const root=document.createElement('div');root.className='cgd';
    root.innerHTML=`<div class="cgd-plots"></div>
      <div class="cgd-controls">
        <label>Window
          <span class="cgd-seg">
            <button type="button" data-win="pre" aria-pressed="true">Before impact</button>
            <button type="button" data-win="all" aria-pressed="false">Whole record</button>
          </span></label>
        <label>Offset added
          <input type="range" min="-2" max="2" step="any" value="0">
          <span class="cgd-val"></span></label>
        <span class="cgd-seg">
          <button type="button" data-set="cancel">Cancel the measured offset</button>
          <button type="button" data-set="zero">Add nothing</button>
        </span>
      </div>
      <div class="cgd-readouts">
        <div><span class="k">measured offset <var>b</var></span><span class="v" data-r="bias"></span></div>
        <div><span class="k">offset in the signal</span><span class="v" data-r="tot"></span></div>
        <div><span class="k">noise sd</span><span class="v" data-r="sd"></span></div>
        <div><span class="k">velocity error, uncorrected</span><span class="v" data-r="raw"></span></div>
        <div><span class="k">velocity error, corrected</span><span class="v" data-r="cor"></span></div>
      </div>
      <div class="cgd-caption"></div>
      <div class="source measured"><span class="tag">Measured</span><span>Channel 093, left rear seat crossmember, longitudinal, with the offset and noise measured in its 50&nbsp;ms pre-impact window. NHTSA test 10642, 2019 BMW&nbsp;X5 into a rigid barrier at 15.65&nbsp;m/s, TRC of Ohio, 7 January 2019.</span></div>`;
    this.appendChild(root);
    $('.cgd-caption',root).textContent=this.getAttribute('caption')||'';

    const d=await load(this.getAttribute('src'));
    const dt=d.dt,n=d.n,a=Float64Array.from(d.a);
    const t=new Float64Array(n);for(let i=0;i<n;i++)t[i]=d.t0+i*dt;
    let b=0,c=0;for(let i=0;i<n;i++)if(t[i]<0){b+=a[i];c++}b/=c;
    let sd=0;for(let i=0;i<n;i++)if(t[i]<0)sd+=(a[i]-b)**2;sd=Math.sqrt(sd/c);

    const plots=$('.cgd-plots',root);
    const pA=panel(plots,{label:'acceleration',unit:'m/s²'});
    const pV=panel(plots,{label:'velocity error',unit:'m/s'});
    const pX=panel(plots,{label:'displacement error',unit:'m',xAxis:true});
    const R=k=>$(`[data-r="${k}"]`,root);
    const slider=$('input[type=range]',root),val=$('.cgd-val',root);
    /* a slide can open it on the whole record with window="all"; the notes
       page opens on the pre-impact window as before */
    let win=this.getAttribute('window')==='all'?'all':'pre';
    root.querySelectorAll('[data-win]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.win===win));

    /* The axes hold still while the offset changes. Each window's range covers
       the record as measured and with the offset cancelled, the two states the
       buttons set, so pressing one moves the curve on fixed axes and the change
       is visible. It widens only when the slider goes past both. */
    const curves=off=>{
      const aa=new Float64Array(n);for(let i=0;i<n;i++)aa[i]=a[i]+off;
      const vv=integrate(aa,dt);return [aa,vv,integrate(vv,dt)];
    };
    const span=(arrs,i0,i1)=>{let lo=Infinity,hi=-Infinity;
      for(const y of arrs)for(let i=i0;i<=i1;i++){if(y[i]<lo)lo=y[i];if(y[i]>hi)hi=y[i];}
      return [lo,hi]};
    const base={};
    {const m=curves(0),k=curves(-b);
     for(const [w,i1] of [['pre',c-1],['all',n-1]])
       base[w]=[0,1,2].map(j=>span([m[j],k[j]],0,i1));}
    const fixed=(j,cur,i1)=>{const [l0,h0]=base[win][j],[l1,h1]=span([cur],0,i1);
      const lo=Math.min(l0,l1),hi=Math.max(h0,h1),pad=(hi-lo)*0.10;return [lo-pad,hi+pad]};

    const render=()=>{
      const off=parseFloat(slider.value), total=b+off;
      const [aa,vv,xx]=curves(off),[ac,vc,xc]=curves(-b);
      const range = win==='pre' ? [t[0],0] : [t[0],t[n-1]];
      const iR = win==='pre' ? c-1 : n-1;
      const predFn = v => total*(v-t[0]);
      pA(t,aa,ac,range,{yRange:fixed(0,aa,iR)});
      /* over the whole record these are the motion itself, not an error */
      pV(t,vv,vc,range,{pred:win==='pre'?predFn:null,label:win==='pre'?'velocity error':'change in velocity',
                        yRange:fixed(1,vv,iR)});
      pX(t,xx,xc,range,{label:win==='pre'?'displacement error':'position relative to coasting',
                        yRange:fixed(2,xx,iR)});
      const iEnd = win==='pre' ? c-1 : n-1;
      val.textContent=(off>=0?'+':'')+off.toFixed(4)+' m/s²';
      R('tot').textContent=(total>=0?'+':'')+total.toFixed(4)+' m/s²';
      R('bias').textContent=b.toFixed(4)+' m/s²';
      R('sd').textContent=sd.toFixed(3)+' m/s²';
      /* over the pre-impact window the true change is zero, so the readout is an
         error; over the whole record it is the change in velocity itself */
      R('raw').previousElementSibling.textContent=(win==='pre'?'velocity error':'change in velocity')+', uncorrected';
      R('cor').previousElementSibling.textContent=(win==='pre'?'velocity error':'change in velocity')+', corrected';
      R('raw').textContent=vv[iEnd].toFixed(4)+' m/s';
      R('cor').textContent=vc[iEnd].toFixed(4)+' m/s';
    };
    root.querySelectorAll('[data-win]').forEach(btn=>btn.addEventListener('click',()=>{
      win=btn.dataset.win;
      root.querySelectorAll('[data-win]').forEach(x=>x.setAttribute('aria-pressed',x===btn));
      render();
    }));
    slider.addEventListener('input',render);
    root.querySelectorAll('[data-set]').forEach(btn=>btn.addEventListener('click',()=>{
      slider.value=String(btn.dataset.set==='cancel' ? -b : 0);
      render();
    }));
    render();

    /* static figure: whole record as absolute speed */
    const fig=$('#fig-whole .fig-body');
    if(fig){
      const p=panel(fig,{label:'speed',unit:'m/s',height:215,xAxis:true});
      const ac=new Float64Array(n);for(let i=0;i<n;i++)ac[i]=a[i]-b;
      const v0=d.closing_speed_mps;
      const v=integrate(ac,dt);const abs=new Float64Array(n);
      for(let i=0;i<n;i++)abs[i]=v0+v[i];
      /* strategic points: impact, zero crossing, overshoot, final plateau */
      const iImp=Math.round((0-t[0])/dt);
      let iZero=iImp;while(iZero<n-1&&abs[iZero]>0)iZero++;
      let iMin=iImp;for(let i=iImp;i<n;i++)if(abs[i]<abs[iMin])iMin=i;
      const mn=v=>v.toFixed(2).replace('-','−');
      const marks=[
        {t:t[iImp],y:abs[iImp],cast:'y',text:mn(abs[iImp])+' m/s at impact',dx:8,dy:-8},
        {t:t[iZero],y:0,cast:'x',text:'zero at '+(t[iZero]*1000).toFixed(0)+' ms',dx:8,dy:-8},
        {t:t[iMin],y:abs[iMin],text:mn(abs[iMin])+' m/s',dx:-7,dy:15,anchor:'end'},
        {t:t[n-1],y:abs[n-1],cast:'y',text:mn(abs[n-1])+' m/s at rest',dx:-8,dy:-9,anchor:'end'}
      ];
      p(t,abs,null,[t[0],t[n-1]],{marks});
    }
  }
}
customElements.define('cg-demo',CgDemo);

/* ---------------------------------------------------------------------------
   Second demo: the two error terms as n grows.

   The page derives bT growing as n and the noise sum growing as sqrt(n). Both
   are then computed directly from the record, cumulatively, so the two growth
   laws are drawn rather than asserted — and the crossing point where the offset
   overtakes the noise is a place on the plot rather than a formula.
--------------------------------------------------------------------------- */
async function growthDemo(host) {
  const root = document.createElement('div');
  root.className = 'cgd';
  root.innerHTML = `<div class="cgd-setting">The two error terms of the decomposition, accumulated
      sample by sample over the real record. The offset term is the running total of b; the noise
      term is the running total of the pre-impact residuals about b.</div>
    <div class="cgd-plots"></div>
    <div class="cgd-controls">
      <label>Offset b <input type="range" data-c="b" min="0" max="3" step="any" value="0.2135">
        <span class="cgd-val" data-v="b"></span></label>
      <span class="cgd-seg">
        <button type="button" data-set="meas" aria-pressed="true">As measured</button>
      </span>
      <label>Axes <span class="cgd-seg" data-s="ax">
        <button type="button" data-o="lin" aria-pressed="true">Linear</button>
        <button type="button" data-o="log">Logarithmic</button>
      </span></label>
    </div>
    <div class="cgd-readouts">
      <div><span class="k">samples n</span><span class="v" data-r="n"></span></div>
      <div><span class="k">offset term bT</span><span class="v" data-r="off"></span></div>
      <div><span class="k">noise term, this record</span><span class="v" data-r="noi"></span></div>
      <div><span class="k">noise term, predicted</span><span class="v" data-r="pn"></span></div>
      <div><span class="k">ratio</span><span class="v" data-r="rat"></span></div>
      <div><span class="k">they cross at</span><span class="v" data-r="x"></span></div>
    </div>
    <div class="cgd-caption">The offset term is a straight line on logarithmic axes, slope 1,
      because it is a number accumulating. The noise term is not a line: it is one realisation of a
      random walk, and it wanders. The dotted red curve is its <em>predicted</em> size,
      &sigma;&radic;(&Delta;t&thinsp;T), which does have slope one half &mdash; and the difference
      between a curve you can draw and a curve you can only bound is the difference between the two
      kinds of statement the page makes.</div>
    <div class="source measured"><span class="tag">Measured</span><span>The noise term is the
      accumulated pre-impact residuals of channel 093 &mdash; real instrument noise, not a model of
      it. NHTSA test 10642, 2019 BMW&nbsp;X5 into a rigid barrier, TRC of Ohio, 7 January 2019.</span></div>`;
  host.appendChild(root);

  const d = await load('data/test10642-crossmember-x.json');
  const dt = d.dt, n = d.n, a = Float64Array.from(d.a);
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) t[i] = d.t0 + i * dt;
  let b0 = 0, c = 0;
  for (let i = 0; i < n; i++) if (t[i] < 0) { b0 += a[i]; c++; }
  b0 /= c;
  /* the real pre-impact residuals, tiled to the length of the record: the noise
     term is accumulated from recorded values, not from a generator */
  const eps = new Float64Array(n);
  for (let i = 0; i < n; i++) eps[i] = a[i % c] - b0;

  /* the predicted noise size uses sigma from the pre-impact residuals:
     sigma*sqrt(dt*T) is a bound on a distribution, not a value the realisation
     has to take */
  let sd = 0;
  for (let i = 0; i < c; i++) sd += eps[i] * eps[i];
  sd = Math.sqrt(sd / (c - 1));

  const box = root.querySelector('.cgd-plots');
  const slider = root.querySelector('[data-c="b"]');
  const R = k => root.querySelector(`[data-r="${k}"]`);
  let axes = 'lin', p = null, built = null;

  const render = () => {
    const b = parseFloat(slider.value);
    root.querySelector('[data-v="b"]').textContent = b.toFixed(4) + ' m/s²';
    const off = new Float64Array(n), noi = new Float64Array(n), ns = new Float64Array(n);
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += eps[i] * dt;
      ns[i] = i + 1;
      off[i] = Math.abs(b) * (i + 1) * dt;
      noi[i] = Math.abs(s);
    }
    if (built !== axes) {
      box.textContent = '';
      /* on log axes the first few samples reach 1e-18 and would give the plot
         eighteen decades of empty space; clamp to the range that carries the
         argument */
      p = panel(box, {label: 'error contributed', unit: 'm/s', height: 250, xAxis: true,
        xLabel: 'samples accumulated', xUnit: '', xScale: 1,
        xLog: axes === 'log', yLog: axes === 'log',
        yClamp: axes === 'log' ? [1e-6, 1] : null});
      built = axes;
    }
    /* first n where the offset term exceeds the noise term and stays above it */
    let cross = null;
    for (let i = n - 1; i > 0; i--) if (off[i] < noi[i]) { cross = i + 1; break; }
    const lo = axes === 'log' ? 1 : 0;
    p(ns, off, noi, [Math.max(lo, 1), n], {
      label: 'error contributed — offset solid, noise dashed',
      pred: k => sd * dt * Math.sqrt(k),
      marks: cross ? [{t: cross, y: off[cross - 1], cast: 'x',
                       text: 'n ≈ ' + cross, dx: 8, dy: -10}] : []
    });
    R('n').textContent = n.toLocaleString();
    R('off').textContent = off[n - 1].toFixed(4) + ' m/s';
    R('noi').textContent = noi[n - 1].toFixed(4) + ' m/s';
    R('pn').textContent = (sd * dt * Math.sqrt(n)).toFixed(4) + ' m/s';
    R('rat').textContent = (off[n - 1] / noi[n - 1]).toFixed(1) + '×';
    R('x').textContent = cross ? 'n ≈ ' + cross.toLocaleString() : 'offset leads throughout';
  };
  slider.addEventListener('input', render);
  root.querySelector('[data-set="meas"]').addEventListener('click', () => {
    slider.value = String(Math.abs(b0)); render();
  });
  root.querySelector('[data-s="ax"]').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    axes = btn.dataset.o;
    [...e.currentTarget.children].forEach(x => x.setAttribute('aria-pressed', x === btn));
    render();
  });
  render();
}


/* ---------------------------------------------------------------------------
   A number against a distribution, and the window both are measured in.

   The cold reader put the "those two statements aren't the same kind of
   statement" passage at seventy seconds over one static paragraph, carrying the
   hardest idea in the video. This is that idea.
--------------------------------------------------------------------------- */
(() => {
  const host = document.querySelector('#fig-draw .fig-body');
  if (!host) return;

  const SD = 0.004754, BT = -0.010675, DRAW = 0.0001;
  const X0 = -0.016, X1 = 0.011;
  const x = [], y = [];
  for (let i = 0; i <= 300; i++) {
    const v = X0 + (X1 - X0) * i / 300;
    x.push(v); y.push(Math.exp(-0.5 * (v / SD) * (v / SD)));
  }
  const band = [];
  for (let i = 0; i <= 120; i++) {
    const v = -SD + 2 * SD * i / 120;
    band.push({x: v, y: Math.exp(-0.5 * (v / SD) * (v / SD))});
  }

  diagram(host, {
    w: 660, h: 250, xRange: [X0, X1], yRange: [0, 1.30],
    title: 'velocity error (m/s) after integrating the 50 ms pre-impact window',
    alt: 'A bell curve centred on zero with one standard deviation shaded, and a single vertical '
       + 'line well to its left marking the offset error, which is one fixed number.',
    areas: [{cls: 'fill', pts: [{x: -SD, y: 0}, ...band, {x: SD, y: 0}]}],
    curves: [{x, y}],
    leads: [{from: [BT, 0], to: [BT, 1.06], cls: 'chord'}],
    points: [{x: DRAW, y: Math.exp(-0.5 * (DRAW / SD) * (DRAW / SD)), r: 4.5, cls: 'miss'}],
    notes: [
      {x: BT, y: 1.20, anchor: 'middle', text: 'bT = \u22120.0107'},
      {x: BT, y: 1.10, anchor: 'middle', cls: 'hi', text: 'one number'},
      {x: 0, y: 1.20, anchor: 'middle', text: 'the noise error'},
      {x: 0, y: 1.10, anchor: 'middle', cls: 'hi', text: 'a distribution of values'},
      {x: SD * 1.15, y: 0.52, text: '\u00b1 0.0048'},
      {x: DRAW + 0.0008, y: 0.90, text: "this record's draw"}
    ]
  });
})();

(async () => {
  const host = document.querySelector('#fig-window .fig-body');
  if (!host) return;
  let d;
  try { d = await (await fetch('data/test10642-crossmember-x.json')).json(); }
  catch (e) { return; }
  const pre = Math.round(-d.t0 / d.dt);            /* 625 samples before t = 0 */
  const a = d.a.slice(0, pre);
  const mean = a.reduce((s, v) => s + v, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, v) => s + (v - mean) * (v - mean), 0) / a.length);

  const t = a.map((_, i) => (d.t0 + i * d.dt) * 1e3);   /* ms */
  const T0 = t[0], T1 = t[t.length - 1];

  diagram(host, {
    w: 660, h: 250, xRange: [T0, T1], yRange: [mean - 4.2 * sd, mean + 4.2 * sd], zero: true,
    title: 'acceleration (m/s\u00b2) over the 625 samples before impact',
    alt: 'A noisy trace with no trend, a horizontal line through its mean, and a shaded band one '
       + 'standard deviation either side of the mean.',
    areas: [{cls: 'fill', pts: [{x: T0, y: mean - sd}, {x: T1, y: mean - sd},
                                {x: T1, y: mean + sd}, {x: T0, y: mean + sd}]}],
    curves: [{x: t, y: a}],
    leads: [{from: [T0, mean], to: [T1, mean], cls: 'chord'}],
    notes: [
      {x: T0 + 1, y: mean + sd * 3.5, cls: 'hi',
       text: 'mean = ' + mean.toFixed(4) + ', the offset'},
      {x: T0 + 1, y: mean - sd * 3.2,
       text: 'the band is \u00b1 ' + sd.toFixed(3) + ', the noise'}
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
    /* a cancelled piece fades and then closes up, so what survives slides
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
    /* ink changes colour (a term added in blue joins the line in black) */
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

/* Class 3's figures and demo.

   The data figures are drawn in the browser from crash tests held back from the
   phrase assignment, so no student's own data is on screen. The main one is
   data/tests/09808.json (2016 Honda Civic, 10 kHz), which no deck or notes page
   has worked through for Assignment 3. The figure that compares tests adds the
   other three held-back tests: 9801 (2016 Buick Cascada), and the notes' and
   example reports' 10642 (2019 BMW X5) and 9793 (2017 Hyundai Elantra).

   Every integral here is the cumulative trapezoid sum with its leading zero,
   moved so that it is zero at contact (t = 0), as the notes do it. The offset is
   the mean before contact and is removed unless a figure says otherwise.

   A host is <div class="c2fig" data-c3="name">. The class 2 styles (.c2fig,
   .c2key, the c2- line classes) are reused as they are. The live demo stops its
   clicks from reaching the deck, which would otherwise advance a slide. */
(() => {
  const SOURCE = {kind: 'measured', text: 'NHTSA test 9808 (2016 Honda Civic), full frontal ' +
    'into a rigid barrier. Held back from the phrase assignment.'};
  /* the lab's speed at contact, m/s. 10642's file carries no speed, and the
     notes use its measured tow speed. */
  const LAB = {9808: 56.17 / 3.6, 9801: 56.21 / 3.6, 10642: 15.65, 9793: 56.15 / 3.6};
  const CAR = {9808: 'Civic', 9801: 'Cascada', 10642: 'X5', 9793: 'Elantra'};
  const FILE = {9808: 'data/tests/09808.json', 9801: 'data/tests/09801.json',
                10642: 'data/example/10642.json', 9793: 'data/example/09793.json'};

  /* ------------------------------------------------------------ the data */
  function cumulative(y, dt) {
    const s = new Float64Array(y.length);
    for (let i = 1; i < y.length; i++) s[i] = s[i - 1] + 0.5 * (y[i] + y[i - 1]) * dt;
    return s;
  }
  const load = no => fetch(FILE[no]).then(r => r.json()).then(j => {
    const c = j.channels.vehicle_x, n = c.n, dt = c.dt, t = new Float64Array(n);
    for (let i = 0; i < n; i++) t[i] = c.t0 + i * dt;
    const raw = Float64Array.from(c.y);
    let b = 0, m = 0, i0 = 0;
    for (let i = 0; i < n; i++) {
      if (t[i] < 0) { b += raw[i]; m++; }
      if (Math.abs(t[i]) < Math.abs(t[i0])) i0 = i;
    }
    b /= m;
    let ss = 0;
    for (let i = 0; i < n; i++) if (t[i] < 0) ss += (raw[i] - b) ** 2;
    const y = raw.map(v => v - b), dv = cumulative(y, dt), z = dv[i0];
    for (let i = 0; i < n; i++) dv[i] -= z;
    let imin = i0;
    for (let i = i0; i < n; i++) if (dv[i] < dv[imin]) imin = i;
    return {no, n, dt, t, raw, y, b, sd: Math.sqrt(ss / m), i0, dv, imin, lab: LAB[no]};
  });
  const ready = Promise.all([9808, 9801, 10642, 9793].map(load))
    .then(L => Object.fromEntries(L.map(T => [T.no, T])));

  /* velocity from a constant, and distance since contact from that velocity */
  function motion(T, C) {
    const v = T.dv.map(d => C + d), x = cumulative(v, T.dt), z = x[T.i0];
    for (let i = 0; i < T.n; i++) x[i] -= z;
    let stop = -1, imax = T.i0;
    for (let i = T.i0; i < T.n; i++) {
      if (stop < 0 && v[i] <= 0) stop = i;
      if (x[i] > x[imax]) imax = i;
    }
    return {v, x, stop, imax};
  }

  /* the samples of a record inside [a, b] */
  function win(t, y, a, b) {
    const tt = [], yy = [];
    for (let i = 0; i < t.length; i++) if (t[i] >= a && t[i] <= b) { tt.push(t[i]); yy.push(y[i]); }
    return {t: Float64Array.from(tt), y: Float64Array.from(yy)};
  }
  const yRange = (ys, pad = 0.12) => {
    let lo = 0, hi = 0;
    for (const y of ys) for (const v of y) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const p = pad * (hi - lo);
    return [lo - p, hi + p];
  };
  const ms = v => MINUS(String(+(v * 1000).toFixed(3)));
  const f2 = v => MINUS(v.toFixed(2));

  /* ------------------------------------------------------- chart(): SVG */
  /* The class 2 chart: draws exactly what it is given, text sized for a
     projector. o = {w, h, alt, x: {lo, hi, log, label, ticks, fmt, grid},
     y: {...}, series: [{x, y, cls, line, dots, r, shape}], hlines: [{y, cls,
     text}], vlines: [{x, cls, text}], labels: [{x, y, text, anchor, dx, dy,
     cls}], padL, padR, padT} */
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
      if (h.text) add('text', {class: 'mk', x: h.left ? L + 6 : W - R - 4, y: Y(h.y) + (h.dy ?? -7),
        'text-anchor': h.left ? 'start' : 'end'}, h.text);
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

  /* ---------------------------------------------------------- the figures */
  const FIGS = {

    /* the channel Alice's question is about, every sample, as recorded */
    request(host, D) {
      const T = D[9808], r = win(T.t, T.raw, -0.05, 0.30), yr = yRange([r.y], 0.06);
      chart(host, {h: 460, y: {lo: yr[0], hi: yr[1], zero: true, label: 'Civic crossmember (m/s²), as recorded'},
        x: {lo: -0.05, hi: 0.30, fmt: ms, label: 'time (ms)'},
        vlines: [{x: 0, text: 'contact', anchor: 'start', dx: 6}],
        series: [{x: r.t, y: r.y, cls: 'c2-cross'}]});
    },

    /* a drawn deceleration pulse with the area from 0 to t1 shaded */
    area(host) {
      const f = t => t > 0 && t < 0.08 ? -(Math.sin(Math.PI * t / 0.08) ** 2) : 0, t1 = 0.05;
      const X = Float64Array.from({length: 401}, (_, i) => -0.01 + 0.13 * i / 400);
      const c = chart(host, {h: 420, padL: 40, y: {lo: -1.2, hi: 0.35, ticks: [], zero: true,
          label: 'acceleration, a(t)'},
        x: {lo: -0.01, hi: 0.12, ticks: [0, t1], fmt: v => v === 0 ? '0' : 't₁', label: 'time, t'},
        labels: [{x: 0.086, y: -0.22, text: 'shaded area = v(t₁) − v(0)', cls: 'c2lab'}]});
      const pts = [[0, 0]];
      for (const t of X) if (t >= 0 && t <= t1) pts.push([t, f(t)]);
      pts.push([t1, 0]);
      c.add('polygon', {points: pts.map(([p, q]) => c.X(p) + ',' + c.Y(q)).join(' '),
        style: 'fill:#5F7038;fill-opacity:.22;stroke:none'});
      let d = '';
      X.forEach((t, i) => { d += (i ? 'L' : 'M') + c.X(t).toFixed(1) + ' ' + c.Y(f(t)).toFixed(1); });
      c.add('path', {d, class: 'c2-cross'});
    },

    /* three trapezoid sums over three stretches of one curve, unlabeled, and the
       same three with the missed and extra area shaded */
    traps(host) { trapPanels(host, false); },
    trapsReveal(host) { trapPanels(host, true); },

    /* rectangles and trapezoids on the same five panels of a drawn curve */
    rules(host) {
      const f = x => 1 + Math.sin(x), a = 0, b = 3, n = 5, h = (b - a) / n;
      const X = Float64Array.from({length: 301}, (_, i) => a + (b - a) * i / 300);
      const xs = Float64Array.from({length: n + 1}, (_, i) => a + i * h);
      for (const kind of ['rect', 'trap']) {
        const c = chart(host, {h: 175, padL: 40, padT: 26, y: {lo: 0, hi: 2.3, ticks: []},
          x: {lo: a - 0.05, hi: b + 0.05, ticks: [], label: kind === 'trap' ? 'time' : ''},
          labels: [{x: a + 0.02, y: 2.15, cls: 'c2lab',
            text: kind === 'rect' ? 'rectangles: each panel as tall as its left-hand sample'
                                  : 'trapezoids: each panel joins its two samples'}]});
        for (let i = 0; i < n; i++) {
          const x0 = xs[i], x1 = xs[i + 1], y0 = f(x0), y1 = kind === 'rect' ? y0 : f(x1);
          const pts = [[x0, 0], [x0, y0], [x1, y1], [x1, 0]].map(([p, q]) => c.X(p) + ',' + c.Y(q)).join(' ');
          c.add('polygon', {points: pts, style: 'fill:#5F7038;fill-opacity:.16;stroke:#5F7038;stroke-width:1.4'});
        }
        let d = '';
        X.forEach((x, i) => { d += (i ? 'L' : 'M') + c.X(x).toFixed(1) + ' ' + c.Y(f(x)).toFixed(1); });
        c.add('path', {d, class: 'c2-cross'});
        for (const x of xs) c.add('circle', {class: 'c2p-cross', cx: c.X(x), cy: c.Y(f(x)), r: 6});
      }
    },

    /* a recorded sample as signal + offset + noise, drawn with a seeded RNG so
       the figure is the same every time */
    parts(host) {
      const N = 400, t = Float64Array.from({length: N}, (_, i) => i / (N - 1));
      const g = gaussFrom(mulberry(7)), B = 0.15;
      const s = t.map(x => x > 0.2 && x < 0.6 ? -(Math.sin(Math.PI * (x - 0.2) / 0.4) ** 2) : 0);
      const e = t.map(() => 0.08 * g());
      const rows = [['signal, s', s, 'c2-head'], ['offset, b', t.map(() => B), 'c2-amber'],
                    ['noise, ε', e, 'c2-grey'], ['recorded, a = s + b + ε', t.map((_, i) => s[i] + B + e[i]), 'c2-cross']];
      rows.forEach(([name, y, cls], k) => {
        const last = k === rows.length - 1;
        chart(host, {h: last ? 150 : 108, padL: 40, padT: 26,
          y: {lo: -1.25, hi: 0.7, ticks: [], zero: true},
          x: {lo: 0, hi: 1, ticks: [], label: last ? 'time' : ''},
          series: [{x: t, y, cls}],
          labels: [{x: 0.01, y: 0.5, text: name, cls: 'c2lab'}]});
      });
    },

    /* the same running total with four different constants added */
    consts(host, D) {
      const T = D[9808], end = T.n - 1, Cs = [0, 5, 10, T.lab];
      const series = Cs.map(C => {
        const r = win(T.t, T.dv.map(d => C + d), -0.01, T.t[end]);
        return {x: r.t, y: r.y, cls: C === T.lab ? 'c2-head' : 'c2-grey'};
      });
      chart(host, {h: 460, padR: 120, y: {lo: -20, hi: 18, ticks: [-20, -10, 0, 10], zero: true,
          label: 'Civic crossmember, running total plus a constant (m/s)'},
        x: {lo: -0.01, hi: T.t[end], fmt: ms, label: 'time (ms)'},
        series,
        labels: Cs.map(C => ({x: T.t[end], y: C + T.dv[end], dx: 8, dy: 5, cls: 'c2lab',
          text: C === T.lab ? '+ ' + C.toFixed(2) + ', the lab' : '+ ' + C}))});
    },

    /* the vote's four constants, each added to the running total. C and D take
       the colours of the A and B read points later, since C is at rest at A
       and D is at rest at the end */
    vote(host, D) {
      const T = D[9808], end = T.n - 1;
      const opts = [{C: 0, k: 'A  zero', cls: 'c2-grey'},
                    {C: T.lab, k: 'B  tow speed', cls: 'c2-head'},
                    {C: -T.dv[T.imin], k: 'C  largest Δv', cls: 'c2-cross'},
                    {C: -T.dv[end], k: 'D  total Δv', cls: 'c2-amber'}];
      const series = opts.map(o => {
        const r = win(T.t, T.dv.map(d => o.C + d), -0.01, T.t[end]);
        return {x: r.t, y: r.y, cls: o.cls};
      });
      chart(host, {h: 460, padR: 130, y: {lo: -20, hi: 20, ticks: [-20, -10, 0, 10, 20], zero: true,
          label: 'Civic crossmember, the running total plus each answer (m/s)'},
        x: {lo: -0.01, hi: T.t[end], fmt: ms, label: 'time (ms)'},
        series,
        /* B, C and D end within 3 m/s of each other, so their labels are spread:
           C above its line, D on it, B below */
        labels: opts.map((o, i) => ({x: T.t[end], y: o.C + T.dv[end], dx: 8,
          dy: [5, 22, -6, 6][i], cls: 'c2lab', text: o.k}))});
    },

    /* acceleration, velocity and distance on one time axis from the start of
       the record, for the question of where the crush starts and ends. The
       velocity and distance carry the vote's B, C and D (zero and the
       offset-left-in curve were cut: zero wrecked the scale, and the offset
       sat on top of B); the distance is integrated from the first sample, so
       it already holds the approach at contact. */
    crushq(host, D) {
      const T = D[9808], n = T.n, a = T.t[0], b = T.t[n - 1];
      const vs = [{v: T.dv.map(d => T.lab + d), cls: 'c2-head'},
                  {v: T.dv.map(d => d - T.dv[T.imin]), cls: 'c2-cross'},
                  {v: T.dv.map(d => d - T.dv[n - 1]), cls: 'c2-amber'}];
      const X = {lo: a, hi: b + 0.004, fmt: ms};
      chart(host, {h: 150, padT: 24, y: {lo: -1000, hi: 600, ticks: [-1000, 0], zero: true,
          label: 'acceleration (m/s²)'}, x: X,
        series: [{x: T.t, y: T.y, cls: 'c2-head'}]});
      chart(host, {h: 150, padT: 24, y: {lo: -5, hi: 20, ticks: [0, 10, 20], zero: true,
          label: 'velocity (m/s)'}, x: X,
        series: vs.map(s => ({x: T.t, y: s.v, cls: s.cls}))});
      chart(host, {h: 190, padT: 24, y: {lo: 0, hi: 2.2, ticks: [0, 1, 2],
          label: 'distance from the start of the record (m)'}, x: {...X, label: 'time (ms)'},
        series: vs.map(s => ({x: T.t, y: cumulative(s.v, T.dt), cls: s.cls}))});
    },

    /* step 7: acceleration, velocity and distance on one time axis, labelled
       with what each check found. Every number is computed here from the
       record, so the labels cannot drift from the data. */
    checks(host, D) {
      const T = D[9808], n = T.n, a = T.t[0], b = T.t[n - 1], end = n - 1;
      const m = motion(T, T.lab), v = m.v, xs = cumulative(v, T.dt).map(q => 1000 * q);
      const s = m.stop, ts = T.t[s], ta = T.t[T.imin], tb = T.t[end];
      const app = xs[T.i0], peak = xs[s], xe = xs[end], crush = peak - app, back = peak - xe;
      const avg = -T.lab / ts, g = 9.81, one = x => Float64Array.of(x);
      const X = {lo: a, hi: b + 0.004, fmt: ms};
      /* the two lines are named once, on the top panel, so the lower panels'
         labels have the space under them */
      const lines = [{x: 0, text: 'contact', anchor: 'start', dx: 6},
                     {x: ts, text: Math.round(ts * 1000) + ' ms', anchor: 'start', dx: 6}];
      const bare = lines.map(l => ({x: l.x}));
      const lab = (x, y, text, o = {}) => ({x, y, text, cls: 'c2lab', ...o});
      chart(host, {h: 150, padT: 24, y: {lo: -1000, hi: 600, ticks: [-1000, 0], zero: true,
          label: 'acceleration (m/s²)'}, x: X, vlines: lines,
        series: [{x: T.t, y: T.y, cls: 'c2-faint'},
                 {x: Float64Array.of(0, ts), y: Float64Array.of(avg, avg), cls: 'c2-cross'}],
        labels: [lab(a + 0.002, -620, 'towed: mean ' + MINUS(T.b.toFixed(3)) + ', the offset'),
                 lab(ts, avg, 'average ' + MINUS(Math.round(avg)) + ' m/s² (' + (-avg / g).toFixed(1) + ' g)',
                     {dx: 8, dy: 5})]});
      chart(host, {h: 160, padT: 24, y: {lo: -5, hi: 20, ticks: [0, 10, 20], zero: true,
          label: 'velocity, from the tow speed (m/s)'}, x: X, vlines: bare,
        series: [{x: T.t, y: v, cls: 'c2-head'},
                 {x: one(ts), y: one(0), line: false, dots: 'c2p-grey', r: 7},
                 {x: one(ta), y: one(v[T.imin]), line: false, dots: 'c2p-cross', r: 7},
                 {x: one(tb), y: one(v[end]), line: false, dots: 'c2p-amber', r: 7}],
        labels: [lab(a + 0.002, T.lab, 'the tow speed, ' + T.lab.toFixed(2) + ' m/s', {dy: -8}),
                 lab(ts, 0, 'stops', {dx: 8, dy: -8}),
                 lab(ta, v[T.imin], 'back at ' + Math.abs(v[T.imin]).toFixed(2) + ' m/s', {dx: 10, dy: -10}),
                 lab(tb, v[end], 'still moving back at ' + Math.abs(v[end]).toFixed(2) + ' m/s',
                     {dy: -10, anchor: 'end'})]});
      chart(host, {h: 190, padT: 24, y: {lo: 0, hi: 1700, ticks: [0, 500, 1000, 1500],
          label: 'distance from the first sample (mm)'}, x: {...X, label: 'time (ms)'}, vlines: bare,
        series: [{x: T.t, y: xs, cls: 'c2-head'},
                 {x: one(0), y: one(app), line: false, dots: 'c2p-grey', r: 7},
                 {x: one(ts), y: one(peak), line: false, dots: 'c2p-cross', r: 7},
                 {x: one(tb), y: one(xe), line: false, dots: 'c2p-amber', r: 7}],
        labels: [lab(0, app, Math.round(app) + ' mm: ' + T.lab.toFixed(2) + ' m/s for 50 ms, a straight line',
                     {dx: 10, dy: 18}),
                 lab(ts, peak, 'peak: ' + Math.round(crush) + ' mm of crush', {dx: 10, dy: -10}),
                 lab(tb, xe, Math.round(xe).toLocaleString('en-US') + ' mm = ' + Math.round(app) + ' + ' +
                     Math.round(crush) + ' ' + MINUS('-') + ' ' + Math.round(back) + ' moved back',
                     {dy: 24, anchor: 'end'})]});
    },

    /* the same 50 ms with the offset subtracted, for the side-by-side on the
       subtraction slide. At this scale the dashed mean barely moves. */
    preOff(host, D) {
      const T = D[9808], r = win(T.t, T.y, -0.05, 0);
      chart(host, {h: 430, y: {lo: -9, hi: 9, ticks: [-8, -4, 0, 4, 8], zero: true,
          label: 'Civic crossmember before contact (m/s²), offset subtracted'},
        x: {lo: -0.05, hi: 0, fmt: ms, label: 'time (ms)'},
        hlines: [{y: 0}],
        series: [{x: r.t, y: r.y, cls: 'c2-faint', dots: 'c2p-head', r: 2.2}],
        labels: [{x: -0.0495, y: 7.4, text: 'dashed: the mean, 0.000 m/s²', cls: 'c2lab'}]});
    },

    /* the 50 ms before contact, where the car is towed and should read zero */
    pre(host, D) {
      const T = D[9808], r = win(T.t, T.raw, -0.05, 0);
      chart(host, {h: 430, y: {lo: -9, hi: 9, ticks: [-8, -4, 0, 4, 8], zero: true,
          label: 'Civic crossmember before contact (m/s²), as recorded'},
        x: {lo: -0.05, hi: 0, fmt: ms, label: 'time (ms)'},
        hlines: [{y: T.b}],
        series: [{x: r.t, y: r.y, cls: 'c2-faint', dots: 'c2p-cross', r: 2.2}],
        labels: [{x: -0.0495, y: 7.4, text: 'dashed: the mean, ' + MINUS(T.b.toFixed(3)) + ' m/s²', cls: 'c2lab'}]});
    },

    /* velocity from the lab's speed, with the stop and the two places to read */
    vel(host, D) {
      const T = D[9808], m = motion(T, T.lab), end = T.n - 1;
      const r = win(T.t, m.v, -0.01, T.t[end]), pt = i => [T.t[i], m.v[i]];
      const [ts, vs] = pt(m.stop), [ta, va] = pt(T.imin), [tb, vb] = pt(end);
      chart(host, {h: 460, y: {lo: -5, hi: 18, ticks: [-5, 0, 5, 10, 15], zero: true,
          label: 'Civic crossmember velocity, from the lab\'s speed (m/s)'},
        x: {lo: -0.01, hi: T.t[end] + 0.008, fmt: ms, label: 'time (ms)'},
        series: [{x: r.t, y: r.y, cls: 'c2-head'},
                 {x: Float64Array.of(ts), y: Float64Array.of(vs), line: false, dots: 'c2p-grey', r: 8},
                 {x: Float64Array.of(ta), y: Float64Array.of(va), line: false, dots: 'c2p-cross', r: 10},
                 {x: Float64Array.of(tb), y: Float64Array.of(vb), line: false, dots: 'c2p-amber', r: 10}],
        labels: [{x: ts, y: vs, dx: 12, dy: -14, text: 'stops at ' + Math.round(ts * 1000) + ' ms', cls: 'c2lab'},
                 {x: ta, y: va, dy: 34, anchor: 'middle', cls: 'c2lab',
                  text: 'A  ' + f2(va) + ' m/s at ' + Math.round(ta * 1000) + ' ms'},
                 {x: tb, y: vb, dy: -18, anchor: 'end', cls: 'c2lab',
                  text: 'B  ' + f2(vb) + ' m/s at ' + Math.round(tb * 1000) + ' ms'}]});
    },

    /* distance since contact from that velocity */
    dist(host, D) {
      /* the question slide before the crush demo: the velocity from the tow
         speed and its cumulative integral from the first sample, not reset to
         zero at contact, offset removed */
      const T = D[9808], n = T.n, a = T.t[0], b = T.t[n - 1];
      const v = T.dv.map(d => T.lab + d);
      /* dashed lines at contact and at the stop, where the velocity first reaches zero */
      const ts = T.t[motion(T, T.lab).stop];
      const X = {lo: a, hi: b + 0.004, fmt: ms},
            contact = [{x: 0, text: 'contact', anchor: 'start', dx: 6},
                       {x: ts, text: 'stops, ' + Math.round(ts * 1000) + ' ms', anchor: 'start', dx: 6}];
      chart(host, {h: 200, padT: 24, y: {lo: -5, hi: 20, ticks: [0, 10, 20], zero: true,
          label: 'Civic crossmember velocity, from the tow speed (m/s)'}, x: X, vlines: contact,
        series: [{x: T.t, y: v, cls: 'c2-head'}]});
      chart(host, {h: 240, padT: 24, y: {lo: 0, hi: 1.6, ticks: [0, 0.5, 1, 1.5],
          label: 'its cumulative integral, from the first sample (m)'}, x: {...X, label: 'time (ms)'},
        vlines: contact,
        series: [{x: T.t, y: cumulative(v, T.dt), cls: 'c2-head'}]});
    },

    /* the change in velocity since contact, against the lab's speed */
    dv(host, D) { dvChart(host, D[9808], false); },
    /* the same, with the two places it could be read */
    dvmarks(host, D) { dvChart(host, D[9808], true); },

    /* the gap read two ways, on all four held-back tests */
    gaps(host, D) {
      const nos = [9808, 9801, 10642, 9793], xs = Float64Array.from(nos, (_, i) => i + 1);
      const big = nos.map(no => -D[no].dv[D[no].imin] - D[no].lab);
      const end = nos.map(no => -D[no].dv[D[no].n - 1] - D[no].lab);
      const labels = [];
      nos.forEach((no, i) => {
        labels.push({x: i + 1, y: big[i], dx: 16, dy: 6, text: f2(big[i]), cls: 'c2lab'});
        labels.push({x: i + 1, y: end[i], dx: 16, dy: 6, text: f2(end[i]), cls: 'c2lab'});
      });
      chart(host, {h: 430, y: {lo: 0, hi: 3, ticks: [0, 1, 2, 3], label: 'change in velocity less the lab\'s speed (m/s)'},
        x: {lo: 0.4, hi: 4.6, ticks: Array.from(xs), fmt: v => CAR[nos[v - 1]] + ' ' + nos[v - 1]},
        series: [{x: xs, y: Float64Array.from(big), line: false, dots: 'c2p-cross', r: 9},
                 {x: xs, y: Float64Array.from(end), line: false, dots: 'c2p-head', r: 9, shape: 'square'}],
        labels});
    },

    /* what an offset and noise each add to an integral, against record length */
    accum(host, D) {
      const T = D[9808], b = Math.abs(T.b), sd = T.sd, dt = T.dt, Ts = [];
      for (let e = -3; e <= 2.0001; e += 0.05) Ts.push(10 ** e);
      const X = Float64Array.from(Ts), cross = sd * sd * dt / (b * b), len = T.t[T.n - 1] - T.t[0];
      chart(host, {h: 430, y: {lo: 1e-4, hi: 10, log: true, label: 'error in the change in velocity (m/s)',
          fmt: v => String(+v.toPrecision(1))},
        x: {lo: 1e-3, hi: 100, log: true, grid: true, label: 'length of the record (s)',
            fmt: v => String(+v.toPrecision(1))},
        vlines: [{x: len, text: 'this record, ' + len.toFixed(2) + ' s', anchor: 'start', dx: 8, dy: 22},
                 {x: 60, text: 'a minute', anchor: 'end', dx: -8, dy: 22}],
        series: [{x: X, y: X.map(t => b * t), cls: 'c2-cross'},
                 {x: X, y: X.map(t => sd * Math.sqrt(dt * t)), cls: 'c2-head'}],
        labels: [{x: 2e-2, y: b * 2e-2, dy: 24, text: 'offset, |b|T', cls: 'c2lab'},
                 {x: 3e-3, y: sd * Math.sqrt(dt * 3e-3), dy: -12, text: 'noise, σ√(ΔtT)', cls: 'c2lab'},
                 {x: cross, y: b * cross, dy: -16, anchor: 'end', dx: -8,
                  text: 'equal at ' + cross.toFixed(2) + ' s', cls: 'c2lab'}]});
    },

    /* outside crash testing: three small constructed figures */
    /* Air Canada 143 (1983): the fuel computer subtracted the measured burn
       from the 22,300 kg it was given, while about 10,100 kg was aboard. The
       loads are from the accident; the steady 5,000 kg/h burn is made up. */
    fuel(host) {
      const burn = 5000, X = Float64Array.from({length: 61}, (_, i) => i / 20);
      const told = 22300, real = 10100, tEmpty = real / burn;
      chart(host, {w: 440, h: 230, padL: 64, y: {lo: 0, hi: 24000, ticks: [0, 10000, 20000],
          label: 'fuel on board (kg)'},
        x: {lo: 0, hi: 3, ticks: [0, 1, 2, 3], label: 'time (h)'},
        series: [{x: X, y: X.map(t => told - burn * t), cls: 'c2-head'},
                 {x: X, y: X.map(t => t <= tEmpty ? real - burn * t : NaN), cls: 'c2-cross'},
                 {x: Float64Array.of(tEmpty), y: Float64Array.of(0), line: false, dots: 'c2p-cross', r: 6}],
        labels: [{x: 1.5, y: told - 1.5 * burn, dy: -14, anchor: 'start', cls: 'c2lab', text: 'the computer'},
                 {x: 0.08, y: real, dy: -10, cls: 'c2lab', text: 'the tanks'},
                 {x: tEmpty, y: 0, dx: 10, dy: -8, cls: 'c2lab', text: 'both engines stop'}]});
    },
    /* a city water tower over one day: a flow meter on its pipe, and a level
       gauge read at midnight (the constant) and every six hours (the check).
       The flows are made up: pumps fill it overnight, the morning and evening
       demand draw it down. The dashed curve is the same flow from a wrong start. */
    tower(host) {
      const net = h => h < 6 ? 120 : h < 9 ? -160 : h < 17 ? -25 : h < 21 ? -90 : 70;
      const X = [], V = [];
      let v = 1500;
      for (let k = 0; k <= 240; k++) {
        const h = k / 10;
        if (k) v += net(h - 0.05) * 0.1;
        X.push(h); V.push(v);
      }
      const T = Float64Array.from(X), Vt = Float64Array.from(V);
      const gx = Float64Array.of(0, 6, 12, 18, 24), gy = gx.map(h => Vt[Math.round(h * 10)]);
      chart(host, {w: 440, h: 230, padL: 64, y: {lo: 600, hi: 2400, ticks: [1000, 1500, 2000],
          label: 'water in the tower (m³)'},
        x: {lo: 0, hi: 24, ticks: [0, 6, 12, 18, 24], label: 'time (h)'},
        series: [{x: T, y: Vt.map(q => q - 500), cls: 'c2-faint'},
                 {x: T, y: Vt, cls: 'c2-head'},
                 {x: gx, y: gy, line: false, dots: 'c2p-amber', r: 6}],
        labels: [{x: 9, y: 2250, cls: 'c2lab', text: 'dots: the level gauge'},
                 {x: 24, y: Vt[240] - 500, dx: -4, dy: 18, anchor: 'end', cls: 'c2lab', text: 'started at 1,000'}]});
    },
    /* a phone that integrated its accelerometer twice through Seattle's SR 99
       tunnel (2.83 km) at a made-up 72 km/h, with the Civic's offset: the error
       grows as bt²/2 from the GPS fix at the entrance until the fix at the exit */
    tunnel(host, D) {
      const b = Math.abs(D[9808].b), len = 2830, vel = 20, tIn = len / vel;
      const X = Float64Array.from({length: 191}, (_, i) => i - 10);
      const err = t => t < 0 || t > tIn ? 0 : 0.5 * b * t * t, eExit = 0.5 * b * tIn * tIn;
      chart(host, {w: 440, h: 230, padL: 64, y: {lo: 0, hi: 500, ticks: [0, 200, 400],
          label: 'position error (m)'},
        x: {lo: -10, hi: 180, ticks: [0, 60, 120, 180], label: 'time (s)'},
        vlines: [{x: 0, text: 'in', anchor: 'start', dx: 4}, {x: tIn, text: 'out', anchor: 'start', dx: 4}],
        series: [{x: X, y: X.map(err), cls: 'c2-cross'},
                 {x: Float64Array.of(tIn), y: Float64Array.of(eExit), line: false, dots: 'c2p-cross', r: 6}],
        labels: [{x: tIn, y: eExit, dx: -10, dy: 4, anchor: 'end', cls: 'c2lab',
                  text: Math.round(eExit) + ' m off'}]});
    },
  };

  /* exp(-x^2) bends down for |x| < 0.71 and up beyond it. The panels are in a
     shuffled order so the answer is not the order of the letters: A crosses the
     bend (a mix), B bends up (too large), C bends down (too small). */
  function trapPanels(host, reveal) {
    const f = x => Math.exp(-x * x), n = 2;
    const panels = [['A', 0.1, 1.5], ['B', 0.8, 2.4], ['C', -0.7, 0.7]];
    const erf = x => {            /* Abramowitz and Stegun 7.1.26 */
      const s = Math.sign(x), t = 1 / (1 + 0.3275911 * Math.abs(x));
      const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
      return s * y;
    };
    const exact = (a, b) => Math.sqrt(Math.PI) / 2 * (erf(b) - erf(a));
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1.2vw';
    host.appendChild(row);
    const X = Float64Array.from({length: 401}, (_, i) => -2.5 + 5 * i / 400);
    for (const [name, a, b] of panels) {
      const cell = document.createElement('div');
      row.appendChild(cell);
      const xs = Array.from({length: n + 1}, (_, i) => a + (b - a) * i / n);
      let T = 0;
      for (let i = 0; i < n; i++) T += (f(xs[i]) + f(xs[i + 1])) / 2 * (xs[i + 1] - xs[i]);
      const err = 100 * (T - exact(a, b)) / exact(a, b);
      const c = chart(cell, {w: 420, h: 230, padL: 12, padR: 12, padT: 40,
        y: {lo: 0, hi: 1.12, ticks: []}, x: {lo: -2.5, hi: 2.5, ticks: []},
        series: [{x: X, y: X.map(f), cls: 'c2-faint'}]});
      for (let i = 0; i < n; i++) {
        const p = [[xs[i], 0], [xs[i], f(xs[i])], [xs[i + 1], f(xs[i + 1])], [xs[i + 1], 0]];
        c.add('polygon', {points: p.map(([u, v]) => c.X(u) + ',' + c.Y(v)).join(' '),
          style: 'fill:#5F7038;fill-opacity:.14;stroke:#5F7038;stroke-width:1.6'});
      }
      if (reveal) {
        /* thin strips between the curve and each chord: green where the sum
           misses area, red where it claims extra */
        for (let j = 0; j <= 240; j++) {
          const x = a + (b - a) * j / 240, i = Math.min(n - 1, Math.floor((x - a) / ((b - a) / n)));
          const chord = f(xs[i]) + (f(xs[i + 1]) - f(xs[i])) * (x - xs[i]) / (xs[i + 1] - xs[i]);
          const hi = Math.max(chord, f(x)), lo = Math.min(chord, f(x));
          c.add('rect', {x: c.X(x) - 1, y: c.Y(hi), width: 2.2, height: Math.max(0, c.Y(lo) - c.Y(hi)),
            style: 'fill:' + (f(x) > chord ? '#5F7038' : '#b0443a')});
        }
      }
      let d = '';
      for (let j = 0; j <= 200; j++) { const x = a + (b - a) * j / 200;
        d += (j ? 'L' : 'M') + c.X(x).toFixed(1) + ' ' + c.Y(f(x)).toFixed(1); }
      c.add('path', {d, class: 'c2-cross'});
      for (const x of xs) c.add('circle', {class: 'c2p-cross', cx: c.X(x), cy: c.Y(f(x)), r: 6});
      c.add('text', {x: 22, y: 34, style: 'font-size:30px; font-weight:700; fill:#3f3b36'}, name);
      if (reveal) c.add('text', {x: 408, y: 34, 'text-anchor': 'end', class: 'c2lab'},
        (Math.abs(err) < 1 ? 'a mix, ' : err < 0 ? 'too small, ' : 'too large, ') +
        (err > 0 ? '+' : MINUS('-')) + Math.abs(err).toFixed(1) + '%');
    }
  }

  function dvChart(host, T, marks) {
    const r = win(T.t, T.dv, -0.01, T.t[T.n - 1]), end = T.n - 1;
    const series = [{x: r.t, y: r.y, cls: 'c2-head'}], labels = [], vlines = [];
    if (!marks) {
      /* where the running total first reaches the lab's speed (77 ms on the Civic),
         the same sample the velocity slide later calls the stop */
      const s = motion(T, T.lab).stop;
      series.push({x: Float64Array.of(T.t[s]), y: Float64Array.of(T.dv[s]), line: false, dots: 'c2p-grey', r: 8});
      vlines.push({x: T.t[s], text: Math.round(T.t[s] * 1000) + ' ms', anchor: 'start', dx: 6});
    }
    if (marks) {
      series.push({x: Float64Array.of(T.t[T.imin]), y: Float64Array.of(T.dv[T.imin]), line: false, dots: 'c2p-cross', r: 10});
      series.push({x: Float64Array.of(T.t[end]), y: Float64Array.of(T.dv[end]), line: false, dots: 'c2p-amber', r: 10});
      labels.push({x: T.t[T.imin], y: T.dv[T.imin], dy: 36, anchor: 'middle', cls: 'c2lab',
        text: 'A  ' + f2(T.dv[T.imin]) + ' m/s at ' + Math.round(T.t[T.imin] * 1000) + ' ms'});
      labels.push({x: T.t[end], y: T.dv[end], dy: 36, anchor: 'end', cls: 'c2lab',
        text: 'B  ' + f2(T.dv[end]) + ' m/s at ' + Math.round(T.t[end] * 1000) + ' ms'});
    } else {
      series.push({x: Float64Array.of(T.t[T.imin]), y: Float64Array.of(T.dv[T.imin]), line: false, dots: 'c2p-cross', r: 8});
      labels.push({x: T.t[T.imin], y: T.dv[T.imin], dy: 34, anchor: 'middle', cls: 'c2lab',
        text: 'largest ' + f2(T.dv[T.imin]) + ' m/s at ' + Math.round(T.t[T.imin] * 1000) + ' ms'});
      series.push({x: Float64Array.of(T.t[end]), y: Float64Array.of(T.dv[end]), line: false, dots: 'c2p-head', r: 7});
      labels.push({x: T.t[end], y: T.dv[end], dy: 34, anchor: 'end', cls: 'c2lab',
        text: 'end ' + f2(T.dv[end]) + ' m/s'});
    }
    /* the lab's line is labelled at the left, clear of the end of the curve */
    chart(host, {h: 460, y: {lo: -23, hi: 2, ticks: [-20, -15, -10, -5, 0], zero: true,
        label: 'Civic crossmember, change in velocity since contact (m/s)'},
      x: {lo: -0.01, hi: T.t[end] + 0.008, fmt: ms, label: 'time (ms)'},
      hlines: [{y: -T.lab, left: true, text: 'the lab\'s speed, ' + MINUS('-' + T.lab.toFixed(2)) + ' m/s'}],
      vlines, series, labels});
  }

  /* -------------------------------------------------------- the live demo */
  const DEMOS = {

    /* the crush as the area under the velocity between a start and an end:
       the velocity from the tow speed, offset removed, and its cumulative
       integral from the first sample. The buttons put a slider on one of the
       four candidate points; area below zero (the car moving back) is shaded
       red, since it subtracts. */
    crush(host, D) {
      const T = D[9808], n = T.n, t = T.t;
      const v = T.dv.map(d => T.lab + d), x = cumulative(v, T.dt), stop = motion(T, T.lab).stop;
      const at = ms => Math.max(0, Math.min(n - 1, Math.round((ms / 1000 - t[0]) / T.dt)));
      const msOf = i => +(t[i] * 1000).toFixed(1);
      const SNAP = {first: ['s', 0], contact: ['s', T.i0], stop: ['e', stop], last: ['e', n - 1]};
      return {
        controls: [{key: 's', label: 'start', min: -50, max: 300, step: 0.1, value: -50, dp: 1, unit: 'ms'},
                   {key: 'e', label: 'end', min: -50, max: 300, step: 0.1, value: msOf(n - 1), dp: 1, unit: 'ms'}],
        buttons: [{key: 'first', label: 'start at the first sample'}, {key: 'contact', label: 'start at contact'},
                  {key: 'stop', label: 'end at the stop'}, {key: 'last', label: 'end at the last sample'}],
        panels: [{label: 'velocity, from the tow speed', unit: 'm/s', height: 270, xAxis: true, yClamp: [-5, 20]},
                 {label: 'distance from the first sample', unit: 'm', height: 270, xAxis: true, yClamp: [0, 1.6]}],
        readouts: [{key: 'area', label: 'area, start to end'}, {key: 'stop', label: 'velocity reaches zero'}],
        source: SOURCE,
        compute(st) {
          if (st.fired && SNAP[st.fired]) {
            const [k, i] = SNAP[st.fired];
            st[k] = msOf(i);
            st.root.querySelector(`input[data-c="${k}"]`).value = st[k];
          }
          const i0 = at(st.s), i1 = at(st.e), lo = Math.min(i0, i1), hi = Math.max(i0, i1);
          const step = Math.max(1, Math.floor((hi - lo) / 400)), pos = [], neg = [];
          for (let i = lo; ; i = Math.min(hi, i + step)) {
            pos.push({x: t[i], y: Math.max(0, v[i])}); neg.push({x: t[i], y: Math.min(0, v[i])});
            if (i === hi) break;
          }
          const close = q => [{x: t[lo], y: 0}, ...q, {x: t[hi], y: 0}];
          const range = [t[0], t[n - 1]];
          return {
            panels: [{x: t, y: v, range, opts: {polys: hi > lo
                       ? [{pts: close(pos), cls: 'poly'}, {pts: close(neg), cls: 'poly-over'}] : []}},
                     {x: t, y: x, range, opts: {bands: [{x0: t[lo], x1: t[hi]}],
                       marks: [{t: t[i0], y: x[i0], cast: 'y', ring: true}, {t: t[i1], y: x[i1], cast: 'y', ring: true}]}}],
            readouts: {
              area: Math.round(1000 * (x[i1] - x[i0])) + ' mm',
              stop: (t[stop] * 1000).toFixed(1) + ' ms'}};
        },
      };
    },
  };

  /* ------------------------------------------------- whiteboard boards */
  Object.assign(CG_BOARDS, {

    /* slide 10: km/h to m/s, as two observations that become factors of 1 */
    units: root => ({
      layout(h) {
        const fig = root.parentElement, f = fig.getBoundingClientRect();
        const st = root.closest('.stage').getBoundingClientRect();
        const cols = [...fig.children].filter(c => c !== root && c.tagName === 'DIV');
        const L = cols[0].getBoundingClientRect(), R = cols[1].getBoundingClientRect();
        const gap = 0.5 * parseFloat(getComputedStyle(root).fontSize), top = L.bottom - f.top + 2 * gap;
        root.style.top = top + 'px';
        root.style.height = Math.max(0, st.bottom - f.top - top) + 'px';
        const hh = k => h.E[k].offsetHeight, rowA = hh('prob') + 2 * gap;
        const shX = R.left - f.left + 2 * gap, shY = Math.max(0, R.bottom - f.top - top + 2.5 * gap);
        this.P = {prob: [0, 0], t1: [0, rowA], c1: [gap, rowA + hh('t1') + gap],
          t2a: [0, rowA], t2b: [0, rowA + hh('t2a') + gap / 2],
          c2: [gap, rowA + hh('t2a') + hh('t2b') + 1.5 * gap],
          s1: [shX, shY], s2: [shX, shY + hh('c1') + 3 * gap], ch: [0, rowA], res: [0, rowA + hh('ch') + gap]};
      },
      reset(h) {
        const P = this.P;
        h.hide('prob', 't1', 'c1', 't2a', 't2b', 'c2', 'ch', 'res', 'ans');
        h.E.q.style.visibility = '';
        h.unring('ring0', 'ring1', 'ring2'); h.unstrike('x1', 'x2', 'x3', 'x4');
        ['prob', 't1', 'c1', 't2a', 't2b', 'c2', 'ch', 'res'].forEach(k => h.put(k, P[k]));
      },
      beats(h) {
        const P = () => this.P;
        return [
          {d: 2200, run: f => h.write('prob', 1500, f)},
          {d: 1700, run: f => h.write('t1', 1100, f)},
          {d: 1700, run: f => h.write('c1', 1100, f)},
          {d: 1300, run: f => h.ring('ring1', f)},
          {d: 1800, run: f => { h.move('c1', P().s1, f); h.erase('t1', f); }},
          {d: 2400, run: f => h.write('t2a', 1800, f)},
          {d: 1600, run: f => h.write('t2b', 1100, f)},
          {d: 1700, run: f => h.write('c2', 1100, f)},
          {d: 1300, run: f => h.ring('ring2', f)},
          {d: 1800, run: f => { h.move('c2', P().s2, f); h.erase('t2a', f); h.erase('t2b', f); }},
          {d: 3000, run: f => { h.write('ch', 2400, f); h.pulse('c1', f); }},
          {d: 1200, run: f => { h.strike('x1', f); h.strike('x2', f); h.pulse('c2', f); }},
          {d: 1200, run: f => { h.strike('x3', f); h.strike('x4', f); }},
          {d: 2400, run: f => h.write('res', 1900, f)},
          {d: 1300, run: f => { h.E.q.style.visibility = 'hidden'; h.write('ans', 700, f); }},
          {d: 1200, run: f => h.ring('ring0', f)}
        ];
      }
    }),

    /* slide 14: T - R, then the Civic's numbers in the same space */
    tminusr: () => ({
      reset(h) {
        h.hide('lhs', 'ans', 'tr', 'rr', 'note', 'd1', 'd2', 'c1', 'c2', 'c3a', 'c3b');
        h.E.q.style.visibility = 'hidden';
        h.E.derive.style.visibility = ''; h.E.derive.style.clipPath = OPEN;
        h.unring('ringd', 'ringc'); h.unstrike('xt', 'xr');
      },
      beats(h) {
        return [
          {d: 1800, run: f => { h.write('lhs', 1100, f); h.E.q.style.visibility = ''; }},
          {d: 2600, run: f => h.write('tr', 2000, f)},
          {d: 2300, run: f => h.write('rr', 1700, f)},
          {d: 1700, run: f => h.write('note', 1200, f)},
          {d: 1300, run: f => { h.strike('xt', f); h.strike('xr', f); }},
          {d: 2700, run: f => h.write('d1', 2100, f)},
          {d: 1600, run: f => h.write('d2', 1100, f)},
          {d: 1300, run: f => h.ring('ringd', f)},
          {d: 2000, run: f => { h.E.q.style.visibility = 'hidden'; h.write('ans', 1400, f); }},
          {d: 1400, run: f => { h.erase('derive', f); if (f) h.E.derive.style.visibility = 'hidden'; }},
          {d: 2000, run: f => h.write('c1', 1400, f)},
          {d: 2100, run: f => h.write('c2', 1600, f)},
          {d: 2500, run: f => h.write('c3a', 1900, f)},
          {d: 1500, run: f => h.write('c3b', 900, f)},
          {d: 1200, run: f => h.ring('ringc', f)}
        ];
      }
    }),

    /* slide 19: the offset's and the noise's sums with the Civic's numbers */
    sums: () => ({
      reset(h) { h.hide('n1', 'o1', 'o2', 'n2', 's1', 's2'); h.unring('ro', 'rs'); },
      beats(h) {
        return [
          {d: 2000, run: f => h.write('n1', 1400, f)},
          {d: 2400, run: f => h.write('o1', 1800, f)},
          {d: 1500, run: f => h.write('o2', 900, f)},
          {d: 1300, run: f => h.ring('ro', f)},
          {d: 2000, run: f => h.write('n2', 1400, f)},
          {d: 2800, run: f => h.write('s1', 2200, f)},
          {d: 1500, run: f => h.write('s2', 900, f)},
          {d: 1300, run: f => h.ring('rs', f)}
        ];
      }
    })
  });

  /* ------------------------------------------------------------ mounting */
  ready.then(D => {
    for (const host of document.querySelectorAll('.c2fig[data-c3]')) {
      const name = host.dataset.c3;
      /* one figure failing must not stop the ones after it */
      try {
        if (FIGS[name]) { FIGS[name](host, D); continue; }
        if (DEMOS[name]) {
          makeDemo(host, DEMOS[name](host, D));
          host.addEventListener('click', e => e.stopPropagation());
          continue;
        }
        host.textContent = 'unknown figure: ' + name;
      } catch (e) { console.error('class 3 figure ' + name + ':', e); }
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
     The other two are colours the course does not use anywhere: ink has to
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
        `<span>1 2 3 colour &nbsp;e erase &nbsp;u undo &nbsp;c clear &nbsp;d off</span>`
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
