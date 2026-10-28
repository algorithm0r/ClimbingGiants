/* Generated bundle: the kit, assign, the four workbench modules and
   page.js, in load order. Do not edit. Source: src/kit.js,
   src/standalone/ and src/page.js */

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

/* Phrase -> data assignment. The twin of assign.py; the two agree bit for bit.

   A phrase becomes a number, and the number chooses one crash test and two
   subsets of shots. Nothing is stored anywhere: the same phrase yields the same
   pack forever, so a lost download is recovered by typing four words back in.

   The Lehmer multiply at the end of the hash is not decoration. Without it two
   phrases differing in one letter land on adjacent tests, and a mistyped phrase
   looks plausible instead of looking wrong. Every intermediate stays under
   2^53, so this is exact in doubles. */

const P = 1000003, M = 2147483647, A = 48271;
const N_TRAIN = 60, N_TEST = 40;

const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function hash32(s, salt) {
  let v = 0;
  const str = (salt || '') + '|' + norm(s);
  for (let i = 0; i < str.length; i++) v = (v * 31 + str.charCodeAt(i)) % P;
  return (v * A) % M;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Fisher-Yates over the whole pool, then the first n. A shuffle rather than a
   slice: the shot files are in order, and a contiguous slice would hand one
   student a single evening's games. */
function take(nPool, nWant, seed) {
  const a = Array.from({length: nPool}, (_, i) => i), rnd = mulberry32(seed);
  for (let i = nPool - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, nWant).sort((p, q) => p - q);
}

/* The tail of each pool is held back for the worked example reports. No phrase
   can reach it, so an example spoils nobody's assignment, and a submission
   carrying the example's numbers is visibly not the student's own. Callers
   still pass the full pool size; the subtraction lives here so the two twins
   cannot drift. */
const RESERVED_TESTS = 3, RESERVED_TRAIN = 24, RESERVED_TEST = 12;

function assign(phrase, nTests, nTrainPool, nTestPool) {
  return {
    phrase: norm(phrase),
    crash: hash32(phrase, 'crash') % (nTests - RESERVED_TESTS),
    train: take(nTrainPool - RESERVED_TRAIN, N_TRAIN, hash32(phrase, 'train')),
    test:  take(nTestPool  - RESERVED_TEST,  N_TEST,  hash32(phrase, 'test')),
  };
}

if (typeof module !== 'undefined') module.exports = {norm, hash32, assign, N_TRAIN, N_TEST};

/*
 * mathexpr.js -- a tiny, safe expression parser for the root-finding demo.
 *
 * No eval(). Text goes to tokens, tokens to a syntax tree, and the tree is walked
 * to evaluate, to differentiate symbolically, and to pretty-print.
 *
 * Grammar (precedence climbing):
 *   expr    := term (('+' | '-') term)*
 *   term    := unary (('*' | '/') unary)*
 *   unary   := ('-' | '+') unary | power
 *   power   := primary ('^' unary)?            right-associative
 *   primary := number | constant | name '(' expr ')' | '(' expr ')' | variable
 */

/* Lifted from demos/root-finding/mathexpr.js, which BUILD_PLAN identified as a
   sound algorithm behind a display we are not reusing. Unwrapped from its IIFE so
   it concatenates with the rest of the kit; otherwise unchanged. */


const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, ln: Math.log, log: Math.log, log10: v => Math.log10(v),
  sqrt: Math.sqrt, abs: Math.abs, cbrt: Math.cbrt,
};
const CONSTS = { pi: Math.PI, e: Math.E };

/* ------------------------------------------------------------------ tokens */
function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      if (src[j] === 'e' || src[j] === 'E') {        // 1e-3 style exponents
        let k = j + 1;
        if (src[k] === '+' || src[k] === '-') k++;
        if (/[0-9]/.test(src[k] || '')) { k++; while (/[0-9]/.test(src[k] || '')) k++; j = k; }
      }
      const text = src.slice(i, j);
      if (isNaN(parseFloat(text))) throw new Error(`bad number "${text}"`);
      out.push({ t: 'num', v: parseFloat(text) });
      i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z_0-9]/.test(src[j])) j++;
      out.push({ t: 'name', v: src.slice(i, j) });
      i = j; continue;
    }
    if ('+-*/^(),'.includes(c)) { out.push({ t: c }); i++; continue; }
    throw new Error(`unexpected character "${c}"`);
  }

  // implicit multiplication: 2x, 2(x+1), 2sin(x), (x+1)(x-1), x(x+1)
  const withMul = [];
  for (let k = 0; k < out.length; k++) {
    withMul.push(out[k]);
    const a = out[k], b = out[k + 1];
    if (!b) break;
    const aEnds = a.t === 'num' || a.t === ')' ||
                  (a.t === 'name' && !(a.v in FUNCS));
    const bStarts = b.t === 'num' || b.t === '(' || b.t === 'name';
    if (aEnds && bStarts) withMul.push({ t: '*', implicit: true });
  }
  return withMul;
}

/* -------------------------------------------------------------------- parse */
function parse(src, varName, varName2) {
  varName = varName || 'x';
  const tk = tokenize(src);
  let p = 0;
  const peek = () => tk[p];
  const eat = t => { if (!tk[p] || tk[p].t !== t) throw new Error(`expected "${t}"`); return tk[p++]; };

  function expr() {
    let n = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = tk[p++].t;
      n = { t: 'op', op, l: n, r: term() };
    }
    return n;
  }
  function term() {
    let n = unary();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = tk[p++].t;
      n = { t: 'op', op, l: n, r: unary() };
    }
    return n;
  }
  function unary() {
    if (peek() && (peek().t === '-' || peek().t === '+')) {
      const op = tk[p++].t;
      const a = unary();
      return op === '-' ? { t: 'neg', a } : a;
    }
    return power();
  }
  function power() {
    const base = primary();
    if (peek() && peek().t === '^') { p++; return { t: 'op', op: '^', l: base, r: unary() }; }
    return base;
  }
  function primary() {
    const tok = peek();
    if (!tok) throw new Error('unexpected end of expression');
    if (tok.t === 'num') { p++; return { t: 'num', v: tok.v }; }
    if (tok.t === '(') { p++; const n = expr(); eat(')'); return n; }
    if (tok.t === 'name') {
      p++;
      const nm = tok.v;
      if (nm in FUNCS) { eat('('); const a = expr(); eat(')'); return { t: 'fn', name: nm, a }; }
      if (nm in CONSTS) return { t: 'num', v: CONSTS[nm] };
      if (nm === varName) return { t: 'var', nm: varName };
      if (varName2 && nm === varName2) return { t: 'var2', nm: varName2 };
      throw new Error(`unknown name "${nm}" (the variable${varName2 ? 's are' : ' is'} ` +
                      `"${varName}"${varName2 ? ' and "' + varName2 + '"' : ''})`);
    }
    throw new Error(`unexpected "${tok.t}"`);
  }

  const ast = expr();
  if (p !== tk.length) throw new Error('trailing characters after a complete expression');
  return ast;
}

/* ----------------------------------------------------------------- evaluate */
function evalAst(n, x, y) {
  switch (n.t) {
    case 'num': return n.v;
    case 'var': return x;
    case 'var2': return y;
    case 'neg': return -evalAst(n.a, x, y);
    case 'fn':  return FUNCS[n.name](evalAst(n.a, x, y));
    case 'op': {
      const a = evalAst(n.l, x, y), b = evalAst(n.r, x, y);
      switch (n.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '^': return Math.pow(a, b);
      }
    }
  }
  throw new Error('bad node');
}

/* --------------------------------------------------------- differentiation */
const num = v => ({ t: 'num', v });
const isNum = (n, v) => n.t === 'num' && n.v === v;
function add(a, b) { if (isNum(a,0)) return b; if (isNum(b,0)) return a; return { t:'op', op:'+', l:a, r:b }; }
function sub(a, b) { if (isNum(b,0)) return a; if (isNum(a,0)) return { t:'neg', a:b }; return { t:'op', op:'-', l:a, r:b }; }
function mul(a, b) {
  if (isNum(a,0) || isNum(b,0)) return num(0);
  if (isNum(a,1)) return b; if (isNum(b,1)) return a;
  if (a.t === 'num' && b.t === 'num') return num(a.v * b.v);
  return { t:'op', op:'*', l:a, r:b };
}
function div(a, b) { if (isNum(a,0)) return num(0); if (isNum(b,1)) return a; return { t:'op', op:'/', l:a, r:b }; }
function pow(a, b) { if (isNum(b,1)) return a; if (isNum(b,0)) return num(1); return { t:'op', op:'^', l:a, r:b }; }
const fn = (name, a) => ({ t:'fn', name, a });

/** symbolic derivative with respect to the variable */
function diff(n) {
  switch (n.t) {
    case 'num': return num(0);
    case 'var': return num(1);
    case 'var2': throw new Error('cannot differentiate: two variables');
    case 'neg': return { t:'neg', a: diff(n.a) };
    case 'op': {
      const { l, r, op } = n, dl = diff(l), dr = diff(r);
      if (op === '+') return add(dl, dr);
      if (op === '-') return sub(dl, dr);
      if (op === '*') return add(mul(dl, r), mul(l, dr));
      if (op === '/') return div(sub(mul(dl, r), mul(l, dr)), pow(r, num(2)));
      if (op === '^') {
        if (r.t === 'num')                                  // power rule
          return mul(mul(num(r.v), pow(l, num(r.v - 1))), dl);
        // general case: d/dx a^b = a^b * (b' ln a + b a'/a)
        return mul(pow(l, r), add(mul(dr, fn('ln', l)), div(mul(r, dl), l)));
      }
      break;
    }
    case 'fn': {
      const u = n.a, du = diff(u);
      const chain = inner => mul(inner, du);
      switch (n.name) {
        case 'sin':  return chain(fn('cos', u));
        case 'cos':  return chain({ t:'neg', a: fn('sin', u) });
        case 'tan':  return chain(div(num(1), pow(fn('cos', u), num(2))));
        case 'exp':  return chain(fn('exp', u));
        case 'ln':
        case 'log':  return chain(div(num(1), u));
        case 'log10':return chain(div(num(1), mul(u, num(Math.LN10))));
        case 'sqrt': return chain(div(num(1), mul(num(2), fn('sqrt', u))));
        case 'sinh': return chain(fn('cosh', u));
        case 'cosh': return chain(fn('sinh', u));
        case 'tanh': return chain(sub(num(1), pow(fn('tanh', u), num(2))));
        case 'atan': return chain(div(num(1), add(num(1), pow(u, num(2)))));
        case 'asin': return chain(div(num(1), fn('sqrt', sub(num(1), pow(u, num(2))))));
        case 'acos': return chain({ t:'neg', a: div(num(1), fn('sqrt', sub(num(1), pow(u, num(2))))) });
        case 'abs':  return chain(div(u, fn('abs', u)));
        default: throw new Error(`cannot differentiate ${n.name}()`);
      }
    }
  }
  throw new Error('cannot differentiate this expression');
}

/* -------------------------------------------------------------- print */
const PREC = { '+':1, '-':1, '*':2, '/':2, '^':4 };
function toText(n, parentPrec) {
  parentPrec = parentPrec || 0;
  let s, prec = 5;
  switch (n.t) {
    case 'num': s = (Math.abs(n.v - Math.PI) < 1e-12) ? 'pi'
               : (Math.abs(n.v - Math.E) < 1e-12) ? 'e'
               : String(+n.v.toPrecision(10)); break;
    case 'var': s = n.nm || 'x'; break;
    case 'var2': s = n.nm || 'y'; break;
    case 'neg': prec = 1; s = '-' + toText(n.a, 2); break;
    case 'fn':  s = n.name + '(' + toText(n.a, 0) + ')'; break;
    case 'op':  prec = PREC[n.op];
                s = toText(n.l, prec) + ' ' + n.op + ' ' + toText(n.r, prec + (n.op==='^'?0:1));
                break;
  }
  return prec < parentPrec ? '(' + s + ')' : s;
}

/** HTML with real superscripts and proper minus/times glyphs -- a parse receipt */
function toHtml(n, parentPrec) {
  parentPrec = parentPrec || 0;
  let s, prec = 5;
  const esc = t => t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  switch (n.t) {
    case 'num': s = esc(toText(n)); break;
    case 'var': s = '<i>' + (n.nm || 'x') + '</i>'; break;
    case 'var2': s = '<i>' + (n.nm || 'y') + '</i>'; break;
    case 'neg': prec = 1; s = '&minus;' + toHtml(n.a, 2); break;
    case 'fn':
      if (n.name === 'sqrt') { s = '<span class="rad">&radic;<span class="rr">' + toHtml(n.a,0) + '</span></span>'; }
      else s = '<span class="fnm">' + n.name + '</span>(' + toHtml(n.a, 0) + ')';
      break;
    case 'op':
      prec = PREC[n.op];
      if (n.op === '^') { s = toHtml(n.l, 5) + '<sup>' + toHtml(n.r, 0) + '</sup>'; }
      else if (n.op === '/') {
        s = '<span class="frac"><span class="nu">' + toHtml(n.l,0) + '</span>' +
            '<span class="de">' + toHtml(n.r,0) + '</span></span>';
        prec = 5;
      } else {
        const sym = n.op === '-' ? ' &minus; ' : n.op === '*' ? ' &middot; ' : ' + ';
        s = toHtml(n.l, prec) + sym + toHtml(n.r, prec + 1);
      }
      break;
  }
  return prec < parentPrec ? '(' + s + ')' : s;
}

/** compile a two-variable right-hand side, f(x, y). No derivative: what a
    stepping method needs is the function, and d/dx is not well defined when the
    expression names y as well. */
function compile2(src, vx, vy) {
  const ast = parse(src, vx || 'x', vy || 'y');
  return { ast, f: (x, y) => evalAst(ast, x, y),
           text: toText(ast), html: toHtml(ast),
           usesY: !!(function has(n) {
             return n.t === 'var2' || (n.a && has(n.a)) ||
                    (n.l && (has(n.l) || has(n.r)));
           })(ast) };
}

/** compile source text into { f, df, ast, dast, text, html, dhtml } */
function compile(src, varName) {
  const ast = parse(src, varName);
  const f = x => evalAst(ast, x);
  let dast = null, df = null, dhtml = null, dtext = null;
  try {
    dast = diff(ast);
    df = x => evalAst(dast, x);
    dhtml = toHtml(dast);
    dtext = toText(dast);
  } catch (e) { /* fall back to a numerical derivative below */ }
  if (!df) {
    df = x => { const h = 1e-6 * Math.max(1, Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); };
    dhtml = '<span class="fnm">numerical</span>';
    dtext = '(numerical)';
  }
  return { ast, dast, f, df, text: toText(ast), html: toHtml(ast), dtext, dhtml,
           symbolic: !!dast };
}

/* ---------------------------------------------------------------------------
   The data source control.

   Every workbench takes its signal from here, and there are two ways to get one:

     Measured    a channel from the curated slice of the crash store, with its
                 real header, its real sample rate and its real noise.
     Generated   an expression evaluated on a grid, with noise added. The truth
                 is then known exactly — and because the parser differentiates
                 symbolically, so is the true derivative, which is what lets a
                 workbench show a numerical method against the right answer
                 rather than against a finer numerical answer.

   The distinction is the one the pages make with the source block, moved into a
   control so a reader can cross it deliberately: take a method that behaves on a
   generated signal and point it at a real record.

   signal = {
     t, y,            Float64Array
     dt, n, label, unit,
     kind,            'measured' | 'generated'
     source,          {kind, text} for the attribution block
     truth, dtruth    functions, generated signals only, noise-free
     meta             the channel record, measured signals only
   }
--------------------------------------------------------------------------- */

// Relative, so the same file works under the prototype and under the
// course site's own directory on the server.
const WB_INDEX_URL = 'data/wb/index.json';
let WB_INDEX = null;

async function wbIndex() {
  if (!WB_INDEX) WB_INDEX = (await (await fetch(WB_INDEX_URL)).json());
  return WB_INDEX;
}

const PRETTY_UNIT = {'m/(s*s)': 'm/s²', 'rad/s': 'rad/s', 'N': 'N', 'Nm': 'N·m',
                     'm': 'm', 'V': 'V', 's': 's', 'deg': '°'};
const prettyUnit = u => PRETTY_UNIT[u] || u || '';

const PRESETS = [
  {label: 'Smooth',      expr: 'sin(2*pi*x)',                    a: 0, b: 1,    n: 400},
  {label: 'Two scales',  expr: 'sin(2*pi*x) + 0.15*sin(24*pi*x)', a: 0, b: 1,   n: 800},
  {label: 'Peaked',      expr: 'exp(-40*(x-0.5)^2)',             a: 0, b: 1,    n: 400},
  {label: 'Runge',       expr: '1/(1+25*x^2)',                   a: -1, b: 1,   n: 400},
  {label: 'Decay',       expr: '5*exp(-0.4*x)',                  a: 0, b: 8,    n: 300},
  {label: 'Projectile',  expr: '2 + 6.2172*x - 4.905*x^2',       a: 0, b: 1.5,  n: 300},
  {label: 'Cubic',       expr: '1 + 2.2*x - 3.4*x^2 + 1.6*x^3',  a: 0, b: 1,    n: 300}
];

const ODE_PRESETS = [
  {label: 'Decay',    rhs: '-2*y',                  a: 0, b: 3,  y0: 1,   n: 400,
   exact: 'exp(-2*x)'},
  {label: 'Cooling',  rhs: '-0.7*(y - 20)',         a: 0, b: 6,  y0: 90,  n: 400,
   exact: '20 + 70*exp(-0.7*x)'},
  {label: 'Stiff',    rhs: '-50*y + 50',            a: 0, b: 1,  y0: 0,   n: 400,
   exact: '1 - exp(-50*x)'},
  {label: 'Logistic', rhs: '0.9*y*(1 - y/10)',      a: 0, b: 12, y0: 0.5, n: 400,
   exact: '10/(1 + 19*exp(-0.9*x))'},
  {label: 'Drag',     rhs: '-9.81 - 0.08*y*abs(y)', a: 0, b: 8,  y0: 40,  n: 400, exact: ''},
  {label: 'Driven',   rhs: 'sin(x) - 0.4*y',        a: 0, b: 20, y0: 0,   n: 600, exact: ''}
];

/* RK4 at sixteen substeps per displayed point. This is the reference a stepping
   method is measured against when no exact solution is given; when one is
   given, the exact solution is the reference and this only checks it. */
function rk4Solve(f, a, b, y0, n) {
  const t = linspace(a, b, n), y = new Float64Array(n);
  const sub = 16, h = (b - a) / (n - 1) / sub;
  y[0] = y0;
  let v = y0;
  for (let i = 1; i < n; i++) {
    let x = t[i - 1];
    for (let k = 0; k < sub; k++) {
      const k1 = f(x, v), k2 = f(x + h / 2, v + h * k1 / 2),
            k3 = f(x + h / 2, v + h * k2 / 2), k4 = f(x + h, v + h * k3);
      v += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
      x += h;
    }
    y[i] = v;
  }
  return {t, y};
}

function dataSource(host, onChange) {
  const box = document.createElement('div');
  box.className = 'wb-source';
  box.innerHTML = `
    <div class="wb-row">
      <span class="wb-lab">Signal</span>
      <span class="cgd-seg" data-s="mode">
        <button type="button" data-o="measured" aria-pressed="true">Measured</button>
        <button type="button" data-o="generated">Generated</button>
        <button type="button" data-o="ode">From an ODE</button>
        <button type="button" data-o="yours">Your data</button>
      </span>
    </div>

    <div class="wb-panel" data-p="yours" hidden>
      <div class="wb-row">
        <span class="wb-lab">Phrase</span>
        <input type="text" data-c="phrase" size="26" spellcheck="false" autocomplete="off"
               placeholder="your four words">
        <select data-c="ychan" size="1"></select>
      </div>
      <div class="wb-meta" data-r="ymeta"></div>
    </div>

    <div class="wb-panel" data-p="measured">
      <div class="wb-row">
        <span class="wb-lab">Filter</span>
        <input type="search" data-c="q" placeholder="head, chest, force, pole…" size="22">
        <select data-c="dim"><option value="">any quantity</option></select>
        <select data-c="chan" size="1"></select>
      </div>
      <div class="wb-meta" data-r="meta"></div>
    </div>

    <div class="wb-panel" data-p="generated" hidden>
      <div class="wb-row">
        <span class="wb-lab">f(x) =</span>
        <input type="text" data-c="expr" value="sin(2*pi*x)" size="34" spellcheck="false">
        <span class="cgd-seg" data-s="preset"></span>
      </div>
      <div class="wb-row">
        <span class="wb-lab">from</span> <input type="number" data-c="a" value="0" step="any" size="5">
        <span class="wb-lab">to</span> <input type="number" data-c="b" value="1" step="any" size="5">
        <span class="wb-lab">samples</span> <input type="number" data-c="n" value="400" min="8" max="20000" size="6">
        <span class="wb-lab">noise</span>
        <span class="cgd-seg" data-s="noise">
          <button type="button" data-o="none" aria-pressed="true">None</button>
          <button type="button" data-o="real">Real</button>
          <button type="button" data-o="gauss">Gaussian</button>
        </span>
        <span class="wb-lab">&sigma;</span>
        <input type="number" data-c="sd" value="0.02" step="any" size="6">
      </div>
      <div class="wb-meta" data-r="expr-meta"></div>
    </div>

    <div class="wb-panel" data-p="ode" hidden>
      <div class="wb-row">
        <span class="wb-lab">dy/dx =</span>
        <input type="text" data-c="rhs" value="-2*y" size="30" spellcheck="false">
        <span class="cgd-seg" data-s="odepreset"></span>
      </div>
      <div class="wb-row">
        <span class="wb-lab">from</span> <input type="number" data-c="oa" value="0" step="any" size="5">
        <span class="wb-lab">to</span> <input type="number" data-c="ob" value="3" step="any" size="5">
        <span class="wb-lab">y at the start</span> <input type="number" data-c="y0" value="1" step="any" size="6">
        <span class="wb-lab">shown at</span> <input type="number" data-c="on" value="400" min="8" max="20000" size="6">
        <span class="wb-lab">points</span>
      </div>
      <div class="wb-row">
        <span class="wb-lab">exact y(x), if you know it</span>
        <input type="text" data-c="exact" value="exp(-2*x)" size="26" spellcheck="false">
      </div>
      <div class="wb-meta" data-r="ode-meta"></div>
    </div>

    <div class="source measured" data-r="attrib"><span class="tag">Measured</span><span></span></div>`;
  host.appendChild(box);

  const $$ = s => box.querySelector(s);
  const C = k => box.querySelector(`[data-c="${k}"]`);
  let mode = 'measured', noise = 'none', signal = null, index = null;

  /* ---- generated ---- */
  const presetBox = $$('[data-s="preset"]');
  PRESETS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.i = i; b.textContent = p.label;
    presetBox.appendChild(b);
  });

  const odeBox = $$('[data-s="odepreset"]');
  ODE_PRESETS.forEach((pr, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.i = i; b.textContent = pr.label;
    odeBox.appendChild(b);
  });
  odeBox.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const pr = ODE_PRESETS[+b.dataset.i];
    C('rhs').value = pr.rhs; C('oa').value = pr.a; C('ob').value = pr.b;
    C('y0').value = pr.y0; C('on').value = pr.n; C('exact').value = pr.exact;
    rebuild();
  });
  ['rhs', 'oa', 'ob', 'y0', 'on', 'exact'].forEach(k => {
    const el = C(k);
    el.addEventListener('change', rebuild);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') rebuild(); });
  });

  /* ---- from an ODE ---- */
  function buildOde() {
    const meta = $$('[data-r="ode-meta"]');
    const a = parseFloat(C('oa').value), b = parseFloat(C('ob').value);
    const y0 = parseFloat(C('y0').value);
    const n = Math.max(8, Math.min(20000, Math.round(+C('on').value)));
    let rhs, exact = null;
    try {
      rhs = compile2(C('rhs').value.trim(), 'x', 'y');
    } catch (e) {
      meta.innerHTML = '<span class="wb-bad">' + e.message + '</span>';
      return null;
    }
    const exSrc = C('exact').value.trim();
    if (exSrc) {
      try {
        exact = compile(exSrc, 'x');
      } catch (e) {
        meta.innerHTML = '<span class="wb-bad">exact solution: ' + e.message + '</span>';
        return null;
      }
    }
    const sol = rk4Solve(rhs.f, a, b, y0, n);
    if (!sol.y.every(isFinite)) {
      meta.innerHTML = '<span class="wb-bad">the solution runs off to infinity on [' +
                       a + ', ' + b + ']</span>';
      return null;
    }
    let y = sol.y, refKind = 'a fine RK4 solution';
    if (exact) {
      const ey = Float64Array.from(sol.t, exact.f);
      if (!ey.every(isFinite)) {
        meta.innerHTML = '<span class="wb-bad">that y(x) is not finite on [' + a + ', ' + b + ']</span>';
        return null;
      }
      /* If the stated solution does not satisfy the equation, say so rather
         than quietly measuring every method against the wrong answer. */
      let worst = 0, scale = 1e-12;
      for (let i = 0; i < n; i++) {
        worst = Math.max(worst, Math.abs(ey[i] - sol.y[i]));
        scale = Math.max(scale, Math.abs(ey[i]));
      }
      if (worst / scale > 1e-3) {
        meta.innerHTML =
          '<span class="wb-bad">that y(x) does not solve this equation \u2014 it departs from a ' +
          'fine RK4 solution by ' + worst.toPrecision(3) + '</span>';
        return null;
      }
      y = ey;
      refKind = 'the exact solution you supplied';
    }
    meta.innerHTML =
      '<span class="wb-ok">dy/dx&nbsp;=&nbsp;' + rhs.text + '</span>' +
      '<span class="wb-sep">\u00b7</span>y(' + a + ')&nbsp;=&nbsp;' + y0 +
      '<span class="wb-sep">\u00b7</span>' +
      (rhs.usesY ? 'y appears on the right, so this is a genuine ODE'
                 : 'y does not appear, so this is a quadrature') +
      '<span class="wb-sep">\u00b7</span>reference: ' + refKind;
    return {
      t: sol.t, y, dt: (b - a) / (n - 1), n, label: 'y', unit: '', kind: 'ode',
      ode: {f: rhs.f, a, b, y0, text: rhs.text, usesY: rhs.usesY,
            exact: exact ? exact.f : null},
      truth: exact ? exact.f : null,
      xLabel: 'x', xUnit: '', xScale: 1,
      source: {kind: 'constructed',
        text: 'The solution of <code>dy/dx = ' + rhs.text + '</code> from y(' + a +
              ')&nbsp;=&nbsp;' + y0 + ', drawn at ' + n + ' points. The curve shown is ' +
              refKind +
              (exact
                ? ', so a stepping method can be measured against the truth rather than against '
                  + 'a finer guess.'
                : '. With no exact solution given, the reference is RK4 at sixteen times the '
                  + 'displayed resolution \u2014 a very good answer, but not the truth.')}
    };
  }

  function buildGenerated() {
    const src = C('expr').value.trim();
    const a = parseFloat(C('a').value), b = parseFloat(C('b').value);
    const n = Math.max(8, Math.min(20000, Math.round(+C('n').value)));
    const sd = parseFloat(C('sd').value) || 0;
    let prog;
    try {
      prog = compile(src, 'x');
    } catch (e) {
      $$('[data-r="expr-meta"]').innerHTML =
        `<span class="wb-bad">${e.message}</span>`;
      return null;
    }
    const t = linspace(a, b, n), y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = prog.f(t[i]);
    if (!y.every(isFinite)) {
      $$('[data-r="expr-meta"]').innerHTML =
        `<span class="wb-bad">f is not finite everywhere on [${a}, ${b}]</span>`;
      return null;
    }
    let eps = null;
    if (noise !== 'none' && sd > 0) {
      eps = noise === 'real' ? realNoise(n, sd)
                             : (() => { const g = gaussFrom(mulberry(1)), o = new Float64Array(n);
                                        for (let i = 0; i < n; i++) o[i] = sd * g(); return o; })();
      for (let i = 0; i < n; i++) y[i] += eps[i];
    }
    $$('[data-r="expr-meta"]').innerHTML =
      `<span class="wb-ok">f&nbsp;=&nbsp;${prog.text}</span>` +
      `<span class="wb-sep">·</span>exact derivative ` +
      `<span class="wb-ok">f&prime;&nbsp;=&nbsp;${prog.dtext}</span>` +
      `<span class="wb-sep">·</span>spacing ${((b - a) / (n - 1)).toPrecision(4)}`;
    const noiseText = noise === 'none' ? 'no noise'
      : noise === 'real'
        ? `real recorded instrument noise scaled to &sigma;&nbsp;=&nbsp;${sd}`
        : `Gaussian noise, &sigma;&nbsp;=&nbsp;${sd}`;
    return {
      t, y, dt: (b - a) / (n - 1), n, label: 'f(x)', unit: '',
      kind: 'generated',
      truth: prog.f, dtruth: prog.df, expr: prog.text, dexpr: prog.dtext,
      xLabel: 'x', xUnit: '', xScale: 1,
      source: {kind: noise === 'real' ? 'mixed' : 'constructed',
        text: `<code>${prog.text}</code> on [${a},&nbsp;${b}] at ${n} samples, with ${noiseText}. ` +
              (noise === 'real'
                ? 'The noise is 625 samples from the pre-impact window of channel 093 of NHTSA ' +
                  'test 10642, where the true value is zero. '
                : '') +
              'The truth is known exactly, and so is the true derivative, because the parser ' +
              'differentiates the expression symbolically.'}
    };
  }

  /* ---- measured ---- */
  function matches(rec, q, dim) {
    if (dim && rec.dimension !== dim) return false;
    if (!q) return true;
    const hay = [rec.desc, rec.location, rec.direction, rec.dimension, rec.code,
                 rec.vehicle, rec.testType, rec.note, 'test ' + rec.test]
                .filter(Boolean).join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
  }

  function refillChannels() {
    const q = C('q').value, dim = C('dim').value;
    const sel = C('chan'), prev = sel.value;
    const hits = index.channels.filter(r => matches(r, q, dim));
    sel.innerHTML = hits.map(r =>
      `<option value="${r.file}">${r.test} · ${r.desc || r.code}` +
      `${r.note ? ' ★' : ''} — ${r.rate} Hz</option>`).join('')
      || '<option value="">no channel matches</option>';
    if (hits.some(r => r.file === prev)) sel.value = prev;
    $$('[data-r="meta"]').innerHTML = hits.length
      ? `${hits.length} of ${index.channels.length} channels`
      : `<span class="wb-bad">no channel matches</span>`;
    return hits.length > 0;
  }

  async function buildMeasured() {
    const file = C('chan').value;
    if (!file) return null;
    const d = await (await fetch('data/wb/' + file)).json();
    const n = d.n, t = new Float64Array(n), y = Float64Array.from(d.y);
    for (let i = 0; i < n; i++) t[i] = d.t0 + i * d.dt;
    $$('[data-r="meta"]').innerHTML =
      `<span class="wb-ok">${d.desc || d.code}</span><span class="wb-sep">·</span>` +
      `${d.dimension} in ${prettyUnit(d.unit)}<span class="wb-sep">·</span>` +
      `${d.location || '—'} ${d.direction || ''}<span class="wb-sep">·</span>` +
      `${d.rate} Hz, ${d.n} samples<span class="wb-sep">·</span>` +
      `status <strong>${d.status}</strong>` +
      (d.cutoff && d.cutoff !== 'NOVALUE' ? `<span class="wb-sep">·</span>prefiltered ${d.cutoff} Hz` : '') +
      (d.note ? `<div class="wb-note">★ ${d.note}</div>` : '');
    return {
      t, y, dt: d.dt, n, label: (d.dimension || 'value').toLowerCase(),
      unit: prettyUnit(d.unit), kind: 'measured', meta: d,
      xLabel: 'time', xUnit: 'ms', xScale: 1000,
      source: {kind: 'measured',
        text: `Channel ${d.chan} (<code>${d.code}</code>), ${d.desc || ''}. ` +
              `${d.vehicle || 'vehicle'}, ${d.testType || ''}, NHTSA test ${d.test}` +
              `${d.lab ? ', ' + d.lab : ''}${d.date ? ', ' + d.date : ''}. ` +
              `Recorded at ${d.rate}&nbsp;Hz` +
              (d.cutoff && d.cutoff !== 'NOVALUE'
                ? ` behind a ${d.cutoff}&nbsp;Hz anti-alias filter` : '') + '.'}
    };
  }

  /* ---- your data ----
     The phrase chooses the test exactly as the data page does (assign.js), so
     what is plotted here is the crash test inside the student's own pack. The
     phrase is remembered for the rest of the site on the way through. */
  let yIndex = null, yTest = null, yPhrase = '';
  const savedPhrase = () => {
    try { return localStorage.getItem('cg-data-phrase') || ''; } catch (e) { return ''; }
  };
  async function loadYours(p) {
    const meta = $$('[data-r="ymeta"]');
    try {
      if (!yIndex) yIndex = await (await fetch('data/tests/index.json')).json();
      const a = assign(p, yIndex.tests.length, 697, 319);
      if (!a.phrase) { yTest = null; return; }
      const t = yIndex.tests[a.crash];
      yTest = await (await fetch('data/tests/' + t.file)).json();
      yTest._no = t.no;
      yPhrase = a.phrase;
      C('phrase').value = a.phrase;
      if (window.cgPhrase) window.cgPhrase.set(a.phrase);
      else { try { localStorage.setItem('cg-data-phrase', a.phrase); } catch (e) {} }
      C('ychan').innerHTML = Object.keys(yTest.channels)
        .map(k => `<option value="${k}">${k}</option>`).join('');
    } catch (e) {
      yTest = null;
      meta.innerHTML = '<span class="wb-bad">could not load your test: ' + e.message + '</span>';
    }
  }
  function buildYours() {
    const meta = $$('[data-r="ymeta"]');
    if (!yTest) {
      meta.innerHTML = 'Type your four words and press Enter, or get them on ' +
                       '<a href="data-pack.html">Your data</a>.';
      return null;
    }
    const k = C('ychan').value, c = yTest.channels[k];
    if (!c) return null;
    const n = c.n, t = new Float64Array(n);
    /* a missing value stays missing: a gap in the record shows as a gap */
    const y = Float64Array.from(c.y, v => (v === null || v === undefined) ? NaN : v);
    for (let i = 0; i < n; i++) t[i] = c.t0 + i * c.dt;
    const rate = Math.round(1 / c.dt);
    meta.innerHTML =
      `<span class="wb-ok">${k}</span><span class="wb-sep">·</span>` +
      `${c.dimension || '?'} in ${prettyUnit(c.unit)}<span class="wb-sep">·</span>` +
      `${rate} Hz, ${n} samples<span class="wb-sep">·</span>status <strong>${c.status}</strong>`;
    return {
      t, y, dt: c.dt, n, label: (c.dimension || 'value').toLowerCase(),
      unit: prettyUnit(c.unit), kind: 'measured',
      meta: Object.assign({}, c, {rate, desc: c.comment, cutoff: c.prefilter_hz, test: yTest._no}),
      xLabel: 'time', xUnit: 'ms', xScale: 1000,
      source: {kind: 'measured',
        text: `Your data: channel <code>${k}</code> of crash test ${yTest._no}, the test ` +
              `your phrase \u201c${yPhrase}\u201d chooses.`}
    };
  }

  async function rebuild() {
    signal = mode === 'measured' ? await buildMeasured()
           : mode === 'ode'       ? buildOde()
           : mode === 'yours'     ? buildYours()
           :                        buildGenerated();
    const at = $$('[data-r="attrib"]');
    if (signal) {
      at.className = 'source ' + signal.source.kind;
      at.querySelector('.tag').textContent =
        {measured: 'Measured', constructed: 'Constructed', mixed: 'Mixed'}[signal.source.kind];
      at.querySelector('span:last-child').innerHTML = signal.source.text;
      at.hidden = false;
    } else {
      at.hidden = true;
    }
    onChange(signal);
  }

  /* ---- wiring ---- */
  $$('[data-s="mode"]').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    mode = b.dataset.o;
    [...e.currentTarget.children].forEach(x => x.setAttribute('aria-pressed', x === b));
    box.querySelectorAll('[data-p]').forEach(p => { p.hidden = p.dataset.p !== mode; });
    if (mode === 'yours' && !yTest && (C('phrase').value.trim() || savedPhrase()))
      loadYours(C('phrase').value.trim() || savedPhrase()).then(rebuild);
    else rebuild();
  });
  $$('[data-s="noise"]').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    noise = b.dataset.o;
    [...e.currentTarget.children].forEach(x => x.setAttribute('aria-pressed', x === b));
    rebuild();
  });
  presetBox.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const p = PRESETS[+b.dataset.i];
    C('expr').value = p.expr; C('a').value = p.a; C('b').value = p.b; C('n').value = p.n;
    rebuild();
  });
  ['expr', 'a', 'b', 'n', 'sd'].forEach(k => {
    const el = C(k);
    el.addEventListener('change', rebuild);
    if (k === 'expr') el.addEventListener('keydown', e => { if (e.key === 'Enter') rebuild(); });
  });
  ['q', 'dim'].forEach(k => C(k).addEventListener('input', () => {
    if (refillChannels()) rebuild(); else onChange(null);
  }));
  C('chan').addEventListener('change', rebuild);
  C('ychan').addEventListener('change', rebuild);
  C('phrase').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadYours(C('phrase').value).then(rebuild);
  });
  C('phrase').addEventListener('change', () => loadYours(C('phrase').value).then(rebuild));

  /* ---- start ---- */
  (async () => {
    index = await wbIndex();
    const dims = [...new Set(index.channels.map(r => r.dimension))].filter(Boolean).sort();
    C('dim').innerHTML = '<option value="">any quantity</option>' +
      dims.map(d => `<option>${d}</option>`).join('');
    refillChannels();
    const starred = index.channels.find(r => r.note);
    if (starred) C('chan').value = starred.file;
    C('phrase').value = savedPhrase();
    /* ?source=yours opens straight on the student's own data */
    if (new URLSearchParams(location.search).get('source') === 'yours')
      $$('[data-s="mode"] [data-o="yours"]').click();
    else rebuild();
  })();

  return {get signal() { return signal; }, refresh: rebuild};
}

/* ---------------------------------------------------------------------------
   The workbench: one signal, several tools.

   The page demos each fix a signal and expose two controls, because a teaching
   figure that offers everything shows nothing. The workbench is the other half
   of that trade: the same kit components with the constraints removed, so a
   method can be pointed at a record it was never chosen for.

   Each tool declares its own controls and a run(signal, state) that returns
   panels and readouts. Adding a tool is adding an entry to TOOLS.
--------------------------------------------------------------------------- */

const TOOLS = {};

function defineTool(key, spec) { TOOLS[key] = {key, ...spec}; }

function mountWorkbench(host, startTool) {
  const root = document.createElement('div');
  root.className = 'wb';
  root.innerHTML = `
    <div class="wb-tools"><span class="wb-lab">Tool</span>
      <span class="cgd-seg" data-s="tool"></span></div>
    <div class="wb-src"></div>
    <div class="wb-body">
      <div class="wb-intro" data-w="intro"></div>
      <div class="wb-controls"><span class="cgd-seg" data-s="opt"></span>
        <span class="wb-sliders"></span></div>
      <div class="wb-plots"></div>
      <div class="cgd-readouts" data-w="outs"></div>
      <div class="wb-caption" data-w="cap"></div>
    </div>`;
  host.appendChild(root);

  const seg = root.querySelector('[data-s="tool"]');
  Object.values(TOOLS).forEach(t => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.o = t.key; b.textContent = t.label;
    seg.appendChild(b);
  });

  let tool = TOOLS[startTool] ? startTool : Object.keys(TOOLS)[0];
  let signal = null, state = {}, panels = [], built = '';

  const plots = root.querySelector('.wb-plots');
  const sliders = root.querySelector('.wb-sliders');
  const optBox = root.querySelector('[data-s="opt"]');
  const outBox = root.querySelector('[data-w="outs"]');

  function buildControls() {
    const t = TOOLS[tool];
    state = {};
    sliders.innerHTML = '';
    optBox.innerHTML = '';
    (t.options || []).forEach(o => {
      state[o.key] = o.value;
      const wrap = document.createElement('span');
      wrap.className = 'cgd-seg';
      wrap.dataset.k = o.key;
      wrap.innerHTML = `<span class="wb-lab">${o.label}</span>` + o.options.map(v =>
        `<button type="button" data-o="${v.value}"` +
        `${v.value === o.value ? ' aria-pressed="true"' : ''}>${v.label}</button>`).join('');
      optBox.appendChild(wrap);
    });
    (t.controls || []).forEach(c => {
      state[c.key] = c.value;
      const l = document.createElement('label');
      l.innerHTML = `${c.label} <input type="range" data-k="${c.key}" min="${c.min}" ` +
        `max="${c.max}" step="${c.step ?? 'any'}" value="${c.value}">` +
        `<span class="cgd-val" data-v="${c.key}"></span>`;
      sliders.appendChild(l);
    });
    root.querySelector('[data-w="intro"]').innerHTML = t.intro || '';
    root.querySelector('[data-w="cap"]').innerHTML = t.caption || '';
    /* a readout with no label is a sentence, not a number: it gets the whole
       width of the row and the prose face */
    outBox.innerHTML = (t.readouts || []).map(r =>
      `<div${r.label ? '' : ' class="wb-noteout"'}>` +
      `<span class="k">${r.label}</span>` +
      `<span class="v" data-r="${r.key}"></span></div>`).join('');
    built = '';
  }

  function render() {
    const t = TOOLS[tool];
    if (!signal) {
      plots.innerHTML = '<div class="wb-empty">No signal — choose a channel, or fix the expression.</div>';
      outBox.hidden = true;
      return;
    }
    let out;
    try {
      out = t.run(signal, state);
    } catch (e) {
      plots.innerHTML = `<div class="wb-empty wb-bad">${t.label} could not run on this signal: ${e.message}</div>`;
      outBox.hidden = true;
      return;
    }
    if (!out) {
      plots.innerHTML = `<div class="wb-empty">${t.label} has nothing to show for this signal.</div>`;
      outBox.hidden = true;
      return;
    }
    outBox.hidden = false;
    const sig = tool + '|' + signal.kind + '|' + (out.panels || []).length + '|' +
                (out.panels || []).map(p => p.hist ? 'h' : 't').join('') + '|' +
                (out.panelKey || '');
    if (built !== sig) {
      plots.innerHTML = '';
      panels = (out.panels || []).map((p, i) => p.hist ? histogram(plots, {
        label: p.label ?? '', unit: p.unit ?? '',
        height: p.height ?? 250,
        xLabel: p.xLabel ?? p.label ?? '', xUnit: p.xUnit ?? p.unit ?? ''
      }) : panel(plots, {
        label: p.label ?? '', unit: p.unit ?? '',
        height: p.height ?? (out.panels.length > 1 ? 165 : 250),
        xAxis: i === out.panels.length - 1,
        xLabel: p.xLabel ?? signal.xLabel, xUnit: p.xUnit ?? signal.xUnit,
        xScale: p.xScale ?? signal.xScale,
        xLog: !!p.xLog, yLog: !!p.yLog, yClamp: p.yClamp || null
      }));
      built = sig;
    }
    (out.panels || []).forEach((p, i) => {
      if (!panels[i]) return;
      if (p.hist) panels[i](p.hist, p.opts || {});
      else panels[i](p.x, p.y, p.ghost || null,
        p.range || [p.x[0], p.x[p.x.length - 1]], p.opts || {});
    });
    for (const c of (t.controls || [])) {
      const el = root.querySelector(`[data-v="${c.key}"]`);
      if (el) el.textContent = (c.fmt ? c.fmt(state[c.key], signal)
                                      : Number(state[c.key]).toFixed(c.dp ?? 2)) +
                               (c.unit ? ' ' + c.unit : '');
    }
    outBox.querySelectorAll('[data-r]').forEach(v => { v.textContent = ''; });
    for (const k in (out.readouts || {})) {
      const el = outBox.querySelector(`[data-r="${k}"]`);
      if (el) el.textContent = out.readouts[k];
    }
    outBox.querySelectorAll('[data-r]').forEach(v => {
      const cell = v.parentElement;
      cell.hidden = !v.textContent && !cell.querySelector('.k').textContent;
    });
  }

  seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    tool = b.dataset.o;
    [...seg.children].forEach(x => x.setAttribute('aria-pressed', x === b));
    buildControls(); render();
  });
  optBox.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const wrap = b.closest('[data-k]'); if (!wrap) return;
    const v = b.dataset.o;
    state[wrap.dataset.k] = isNaN(+v) || v === '' ? v : +v;
    [...wrap.querySelectorAll('button')].forEach(x => x.setAttribute('aria-pressed', x === b));
    render();
  });
  sliders.addEventListener('input', e => {
    if (e.target.dataset.k === undefined) return;
    state[e.target.dataset.k] = parseFloat(e.target.value);
    render();
  });

  [...seg.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.o === tool));
  buildControls();
  dataSource(root.querySelector('.wb-src'), s => { signal = s; render(); });
}

/* ---------------------------------------------------------------------------
   The tools. Each is one technique from the course, unlocked: every method at
   once, free parameters, and whatever signal the source control supplies.

   Where the signal is generated the truth is available, so error is measured
   rather than estimated. Where it is measured it is not, and the tools say so
   instead of quietly substituting a fine-grid answer.
--------------------------------------------------------------------------- */

const hasTruth = s => s.kind === 'generated' && typeof s.truth === 'function';
const withUnit = (v, u) => u ? v + ' ' + u : v;
const fmtN = v => Math.abs(v) >= 1e4 || (v !== 0 && Math.abs(v) < 1e-3)
  ? v.toExponential(3) : v.toPrecision(6);

/* ---------------------------------------------------------- inspect ------ */
defineTool('inspect', {
  label: 'Inspect',
  intro: 'The signal as it stands, with the numbers a header would give you. ' +
         'Every other tool starts from here.',
  caption: 'Marked points are the extremes and, for a measured record, the boundary of the ' +
           'pre-impact window where the true value is zero.',
  options: [{key: 'view', label: 'show', value: 'full', options: [
    {value: 'full', label: 'Whole record'}, {value: 'pre', label: 'Before zero'}]}],
  readouts: [
    {key: 'n', label: 'samples'}, {key: 'rate', label: 'sample rate'},
    {key: 'span', label: 'span'}, {key: 'pk', label: 'peak'},
    {key: 'mean', label: 'mean'}, {key: 'sd', label: 'standard deviation'}
  ],
  run(s, st) {
    const pre = s.t[0] < 0;
    const lo = st.view === 'pre' && pre ? s.t[0] : s.t[0];
    const hi = st.view === 'pre' && pre ? 0 : s.t[s.n - 1];
    let i0 = 0, i1 = s.n - 1;
    while (i0 < s.n - 1 && s.t[i0] < lo) i0++;
    while (i1 > 0 && s.t[i1] > hi) i1--;
    let mn = 0, sq = 0, pk = 0, pki = i0, c = 0;
    for (let i = i0; i <= i1; i++) { mn += s.y[i]; c++; if (Math.abs(s.y[i]) > Math.abs(s.y[pki])) pki = i; }
    mn /= Math.max(1, c);
    for (let i = i0; i <= i1; i++) sq += (s.y[i] - mn) ** 2;
    const sd = Math.sqrt(sq / Math.max(1, c - 1));
    const marks = [{t: s.t[pki], y: s.y[pki], cast: 'y',
                    text: 'peak ' + s.y[pki].toPrecision(5), dx: 8, dy: -9}];
    return {
      panels: [{x: s.t, y: s.y, range: [lo, hi],
        label: s.label, unit: s.unit,
        opts: {marks, bands: pre && st.view === 'full' ? [{x0: s.t[0], x1: 0}] : []}}],
      readouts: {
        n: c.toLocaleString(),
        rate: s.kind === 'measured' ? (1 / s.dt).toFixed(0) + ' Hz'
                                    : 'spacing ' + s.dt.toPrecision(4),
        span: (hi - lo).toPrecision(4) + (s.xUnit === 'ms' ? ' s' : ''),
        pk: withUnit(fmtN(s.y[pki]), s.unit),
        mean: withUnit(fmtN(mn), s.unit),
        sd: withUnit(fmtN(sd), s.unit)
      }
    };
  }
});

/* -------------------------------------------------------- integrate ------ */
defineTool('integrate', {
  label: 'Integrate',
  intro: 'Rectangle against trapezoid, cumulative and definite, with the constant of ' +
         'integration free. On a generated signal the error is measured against the truth.',
  caption: 'Upper panel: the signal. Lower: its cumulative integral under the chosen rule, with ' +
           'the other rule as the ghost. The two separate wherever the signal curves.',
  options: [{key: 'rule', label: 'rule', value: 'trap', options: [
    {value: 'rect', label: 'Rectangles'}, {value: 'trap', label: 'Trapezoids'}]}],
  controls: [{key: 'C', label: 'constant', min: -20, max: 20, step: 'any', value: 0, dp: 2}],
  readouts: [
    {key: 'def', label: 'definite integral'}, {key: 'other', label: 'the other rule'},
    {key: 'gap', label: 'difference'}, {key: 'end', label: 'value at the end'},
    {key: 'unit', label: 'units'}, {key: 'note', label: ''}
  ],
  run(s, st) {
    const n = s.n, dt = s.dt;
    const trap = new Float64Array(n), rect = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      trap[i] = trap[i-1] + (s.y[i] + s.y[i-1]) * 0.5 * dt;
      rect[i] = rect[i-1] + s.y[i-1] * dt;
    }
    const use = st.rule === 'trap' ? trap : rect, alt = st.rule === 'trap' ? rect : trap;
    const shifted = new Float64Array(n);
    for (let i = 0; i < n; i++) shifted[i] = use[i] + st.C;
    const u = s.unit ? s.unit + (s.xUnit === 'ms' ? '·s' : '·x') : '';
    return {
      panels: [
        {x: s.t, y: s.y, label: s.label, unit: s.unit},
        {x: s.t, y: shifted, ghost: alt, label: 'cumulative integral', unit: u}
      ],
      readouts: {
        def: fmtN(use[n-1]), other: fmtN(alt[n-1]),
        gap: fmtN(use[n-1] - alt[n-1]),
        end: fmtN(shifted[n-1]),
        unit: u || '—',
        note: Math.abs(use[n-1] - alt[n-1]) < 1e-12
          ? 'the two rules agree exactly here — check the end values of the signal'
          : ''
      }
    };
  }
});

/* ------------------------------------------------------ differentiate ---- */
defineTool('differentiate', {
  label: 'Differentiate',
  intro: 'Forward, backward and central differences, with a widening stencil. On a generated ' +
         'signal the exact derivative comes from differentiating the expression symbolically, ' +
         'so the error is the error and not a comparison against a finer guess.',
  caption: 'The ghost is the exact derivative where one is available. Widen the stencil and the ' +
           'noise falls while the peaks flatten — the trade from week 4, on whatever signal you ' +
           'have pointed at it.',
  options: [{key: 'rule', label: 'rule', value: 'central', options: [
    {value: 'forward', label: 'Forward'}, {value: 'backward', label: 'Backward'},
    {value: 'central', label: 'Central'}]}],
  controls: [{key: 'w', label: 'smooth first, width', min: 1, max: 101, step: 2, value: 1, dp: 0,
              unit: 'samples'}],
  readouts: [
    {key: 'pk', label: 'peak of the derivative'}, {key: 'true', label: 'true peak'},
    {key: 'rms', label: 'RMS error'}, {key: 'amp', label: 'noise amplification 1/(h√2)'},
    {key: 'w', label: 'stencil'}, {key: 'note', label: ''}
  ],
  run(s, st) {
    const w = Math.max(1, Math.round(st.w) | 1);
    const y = w > 1 ? movingAverage(s.y, w) : s.y;
    const d = differentiate(y, s.dt, st.rule);
    let pk = 0;
    for (let i = 1; i < s.n - 1; i++) pk = Math.max(pk, Math.abs(d[i]));
    let truth = null, rms = null, tpk = null;
    if (hasTruth(s)) {
      truth = new Float64Array(s.n);
      let sq = 0, c = 0;
      for (let i = 0; i < s.n; i++) {
        truth[i] = s.dtruth(s.t[i]);
        tpk = Math.max(tpk ?? 0, Math.abs(truth[i]));
        if (i > 0 && i < s.n - 1) { sq += (d[i] - truth[i]) ** 2; c++; }
      }
      rms = Math.sqrt(sq / c);
    }
    return {
      panels: [
        {x: s.t, y, ghost: w > 1 ? s.y : null, label: w > 1 ? 'signal, smoothed' : s.label,
         unit: s.unit},
        {x: s.t, y: d, ghost: truth, label: 'derivative', unit: s.unit ? s.unit + '/s' : ''}
      ],
      readouts: {
        pk: fmtN(pk), true: tpk === null ? 'not available — measured signal' : fmtN(tpk),
        rms: rms === null ? 'needs a generated signal' : fmtN(rms),
        amp: '×' + (1 / (s.dt * Math.SQRT2)).toPrecision(4),
        w: w + ' sample' + (w > 1 ? 's' : ''),
        note: rms === null ? 'switch the source to Generated to measure the error' : ''
      }
    };
  }
});

/* ------------------------------------------------------------- filter ---- */
defineTool('filter', {
  label: 'Filter',
  intro: 'The SAE J211 CFC filter at any class, applied once or forward-and-backward. ' +
         'The peak and the integral respond very differently, which is the week 4 argument.',
  caption: 'The ghost is the unfiltered signal. Watch the peak and the integral readouts together: ' +
           'the filter class moves one of them a great deal and the other hardly at all.',
  options: [{key: 'pass', label: 'passes', value: 'two', options: [
    {value: 'one', label: 'One pass'}, {value: 'two', label: 'Forward + backward'}]}],
  controls: [{key: 'cfc', label: 'CFC class', min: 20, max: 2000, step: 10, value: 180, dp: 0}],
  readouts: [
    {key: 'pk', label: 'peak, filtered'}, {key: 'pk0', label: 'peak, unfiltered'},
    {key: 'drop', label: 'peak retained'}, {key: 'tpk', label: 'time of peak'},
    {key: 'I', label: 'integral, filtered'}, {key: 'I0', label: 'integral, unfiltered'}
  ],
  run(s, st) {
    const k = Math.max(20, Math.round(st.cfc));
    // J211's filter is defined by a class number in Hz, so a record sampled too
    // slowly cannot represent it at all. Say what the record can take, rather
    // than quietly substituting a class the reader did not ask for.
    const kMax = Math.floor(1 / (2 * 2.0775 * s.dt));
    if (k > kMax)
      throw new Error('CFC ' + k + ' is above what this record can represent. At ' +
        (s.kind === 'measured' ? (1 / s.dt).toFixed(0) + ' Hz'
                               : (1 / s.dt).toFixed(0) + ' samples per unit x') +
        ' the highest class that fits is CFC ' + kMax + '.');
    const y = st.pass === 'one' ? cfcOnce(s.y, k, s.dt) : cfc(s.y, k, s.dt);
    let bi = 0, b0 = 0;
    for (let i = 1; i < s.n; i++) {
      if (Math.abs(y[i]) > Math.abs(y[bi])) bi = i;
      if (Math.abs(s.y[i]) > Math.abs(s.y[b0])) b0 = i;
    }
    const I = integrate(y, s.dt)[s.n-1], I0 = integrate(s.y, s.dt)[s.n-1];
    return {
      panels: [{x: s.t, y, ghost: s.y, label: 'CFC ' + k, unit: s.unit,
        opts: {marks: [{t: s.t[bi], y: y[bi], cast: 'x',
          text: Math.abs(y[bi]).toPrecision(5), dx: 8, dy: -9}]}}],
      readouts: {
        pk: fmtN(Math.abs(y[bi])), pk0: fmtN(Math.abs(s.y[b0])),
        drop: (100 * Math.abs(y[bi]) / Math.abs(s.y[b0])).toFixed(1) + '%',
        tpk: withUnit((s.t[bi] * (s.xScale || 1)).toPrecision(5), s.xUnit),
        I: fmtN(I), I0: fmtN(I0)
      }
    };
  }
});

/* --------------------------------------------------------------- fit ----- */
defineTool('fit', {
  label: 'Fit',
  intro: 'Least squares of any polynomial degree over any part of the signal, with the fit ' +
         'error and the error outside the fitted window reported separately.',
  caption: 'The shaded band is the fitted window; the fit is drawn across the whole range. ' +
           'Raise the degree and watch the fit error fall while the error outside the window ' +
           'does not.',
  controls: [
    {key: 'deg', label: 'degree', min: 0, max: 12, step: 1, value: 2, dp: 0},
    {key: 'frac', label: 'fit the first', min: 5, max: 100, step: 1, value: 40, dp: 0, unit: '%'}
  ],
  readouts: [
    {key: 'np', label: 'parameters'}, {key: 'fit', label: 'RMS inside the window'},
    {key: 'out', label: 'RMS outside it'}, {key: 'ratio', label: 'outside ÷ inside'},
    {key: 'lead', label: 'leading coefficient'}, {key: 'note', label: ''}
  ],
  run(s, st) {
    const deg = Math.round(st.deg);
    const m = Math.max(deg + 2, Math.round(s.n * st.frac / 100));
    const xs = [], ys = [];
    const x0 = s.t[0], sc = s.t[m-1] - s.t[0] || 1;      // scale for conditioning
    for (let i = 0; i < m; i++) { xs.push((s.t[i] - x0) / sc); ys.push(s.y[i]); }
    const nP = deg + 1;
    const A = Array.from({length: nP}, () => new Float64Array(nP + 1));
    for (let r = 0; r < nP; r++) {
      for (let c = 0; c < nP; c++) {
        let q = 0; for (let i = 0; i < m; i++) q += Math.pow(xs[i], r + c); A[r][c] = q;
      }
      let q = 0; for (let i = 0; i < m; i++) q += ys[i] * Math.pow(xs[i], r); A[r][nP] = q;
    }
    for (let k = 0; k < nP; k++) {
      let p = k;
      for (let i = k + 1; i < nP; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
      [A[k], A[p]] = [A[p], A[k]];
      if (Math.abs(A[k][k]) < 1e-300) continue;
      for (let i = 0; i < nP; i++) {
        if (i === k) continue;
        const f = A[i][k] / A[k][k];
        for (let c = k; c <= nP; c++) A[i][c] -= f * A[k][c];
      }
    }
    const co = Array.from({length: nP}, (_, k) => A[k][k] === 0 ? 0 : A[k][nP] / A[k][k]);
    const ev = tv => { const u = (tv - x0) / sc; let q = 0;
      for (let k = nP - 1; k >= 0; k--) q = q * u + co[k]; return q; };
    const yf = Float64Array.from(s.t, ev);
    let si = 0, so = 0, ci = 0, co_ = 0;
    for (let i = 0; i < s.n; i++) {
      const e = (s.y[i] - yf[i]) ** 2;
      if (i < m) { si += e; ci++; } else { so += e; co_++; }
    }
    const rin = Math.sqrt(si / Math.max(1, ci)), rout = co_ ? Math.sqrt(so / co_) : NaN;
    return {
      panelKey: 'fit',
      panels: [{x: s.t, y: yf, ghost: s.y, label: 'degree ' + deg + ' fit', unit: s.unit,
        opts: {bands: [{x0: s.t[0], x1: s.t[m-1]}]}}],
      readouts: {
        np: nP + ' of ' + m + ' fitted points',
        fit: fmtN(rin),
        out: co_ ? fmtN(rout) : 'nothing held out',
        ratio: co_ ? '×' + (rout / rin).toPrecision(3) : '—',
        lead: fmtN(co[nP-1]),
        note: co_ === 0 ? 'reduce the window to leave something to predict'
            : rout > rin * 3 ? 'the fit does much worse outside the window it was given' : ''
      }
    };
  }
});

/* -------------------------------------------------------------- roots ---- */
defineTool('roots', {
  label: 'Find roots',
  intro: 'Where does the signal cross a level? Scan for sign changes, then bisect each bracket. ' +
         'The scan resolution is yours, and so is everything week 2 says about it.',
  caption: 'Green rings are the crossings the scan bracketed and bisection refined. Coarsen the ' +
           'scan until a pair vanishes: they are lost together, because two crossings inside one ' +
           'interval leave the sign unchanged.',
  controls: [
    {key: 'level', label: 'level', min: -1, max: 1, step: 'any', value: 0, dp: 4,
     fmt: (v, s) => { const lo = Math.min(...s.y), hi = Math.max(...s.y);
                      return (lo + (v + 1) / 2 * (hi - lo)).toPrecision(5); }},
    {key: 'pts', label: 'scan points', min: 5, max: 400, step: 1, value: 60, dp: 0}
  ],
  readouts: [
    {key: 'lvl', label: 'level'}, {key: 'found', label: 'crossings found'},
    {key: 'first', label: 'first'}, {key: 'last', label: 'last'},
    {key: 'evals', label: 'evaluations'}, {key: 'note', label: ''}
  ],
  run(s, st) {
    const lo = Math.min(...s.y), hi = Math.max(...s.y);
    const L = lo + (st.level + 1) / 2 * (hi - lo);
    /* the signal is samples, so f between samples is linear interpolation —
       which is an assumption, and the only one available */
    const at = tv => {
      const k = Math.max(0, Math.min(s.n - 2, Math.floor((tv - s.t[0]) / s.dt)));
      const f = (tv - s.t[k]) / s.dt;
      return s.y[k] + f * (s.y[k+1] - s.y[k]) - L;
    };
    const P = Math.max(5, Math.round(st.pts));
    const xs = linspace(s.t[0], s.t[s.n-1], P);
    const roots = [];
    let evals = P;
    for (let i = 1; i < P; i++) {
      if (at(xs[i-1]) * at(xs[i]) > 0) continue;
      let a = xs[i-1], b = xs[i], fa = at(a);
      for (let k = 0; k < 60 && (b - a) > 1e-12; k++) {
        const mm = 0.5 * (a + b), fm = at(mm); evals++;
        if (fa * fm <= 0) b = mm; else { a = mm; fa = fm; }
      }
      roots.push(0.5 * (a + b));
    }
    const X = s.xScale || 1, U = s.xUnit || '';
    return {
      panels: [{x: s.t, y: s.y, label: s.label, unit: s.unit,
        opts: {pred: () => L,
               rings: roots.slice(0, 40).map(r => ({x: r, y: L})),
               marks: xs.length <= 80 ? [...xs].map(x => ({t: x, y: at(x) + L})) : []}}],
      readouts: {
        lvl: fmtN(L) + ' ' + s.unit,
        found: String(roots.length),
        first: roots.length ? (roots[0] * X).toPrecision(5) + ' ' + U : '—',
        last: roots.length ? (roots[roots.length-1] * X).toPrecision(5) + ' ' + U : '—',
        evals: evals.toLocaleString(),
        note: roots.length === 0 ? 'no sign change at this level and this resolution' : ''
      }
    };
  }
});

/* ------------------------------------------------------------ windows ---- */
defineTool('window', {
  label: 'Windowed optimum',
  intro: 'The largest value a weighted average reaches over any window no longer than the limit — ' +
         'the shape of HIC, with the exponent and the limit both free.',
  caption: 'The amber band is the best window found. Change the exponent and the limit and watch ' +
           'it move: the answer is a property of the definition as much as of the record.',
  controls: [
    {key: 'wmax', label: 'window limit', min: 1, max: 80, step: 1, value: 4, dp: 0,
     fmt: (v, s) => {
       const span = s.t[s.n - 1] - s.t[0];
       return v + '% of the record — ' +
              (span * v / 100 * (s.xScale || 1)).toPrecision(3) + ' ' + (s.xUnit || 'in x');
     }},
    {key: 'p', label: 'exponent', min: 1, max: 4, step: 0.1, value: 2.5, dp: 1}
  ],
  readouts: [
    {key: 'score', label: 'best score'}, {key: 'win', label: 'its window'},
    {key: 'len', label: 'length'}, {key: 'mean', label: 'mean over it'},
    {key: 'active', label: 'constraint'}, {key: 'n', label: 'windows searched'}
  ],
  run(s, st) {
    const S = integrate(s.y, s.dt);
    const span = s.t[s.n - 1] - s.t[0];
    const wlim = span * st.wmax / 100;
    const kmax = Math.max(1, Math.floor(wlim / s.dt));
    const X = s.xScale || 1, U = s.xUnit || '';
    let bv = -Infinity, bi = 0, bj = 0, count = 0;
    for (let i = 0; i < s.n - 1; i++) {
      const hi = Math.min(i + kmax, s.n - 1);
      for (let j = i + 1; j <= hi; j++) {
        count++;
        const T = (j - i) * s.dt, mean = (S[j] - S[i]) / T;
        if (mean <= 0) continue;
        const v = Math.pow(mean, st.p) * T;
        if (v > bv) { bv = v; bi = i; bj = j; }
      }
    }
    if (!isFinite(bv)) return null;
    const T = (bj - bi) * s.dt;
    return {
      panels: [{x: s.t, y: s.y, label: s.label, unit: s.unit,
        opts: {bands: [{x0: s.t[bi], x1: s.t[bj], cls: 'bestband'}],
               marks: [{t: (s.t[bi] + s.t[bj]) / 2, y: (S[bj] - S[bi]) / T, square: true,
                        text: bv.toPrecision(5), dx: 0, dy: -12, anchor: 'middle'}]}}],
      readouts: {
        score: bv.toPrecision(6),
        win: (s.t[bi]*X).toPrecision(4) + '–' + (s.t[bj]*X).toPrecision(4) + (U ? ' ' + U : ''),
        len: (T*X).toPrecision(4) + (U ? ' ' + U : ''),
        mean: withUnit(fmtN((S[bj] - S[bi]) / T), s.unit),
        active: Math.abs(T - wlim) < s.dt * 1.5
          ? 'active — the optimum is at the limit' : 'interior',
        n: count.toLocaleString()
      }
    };
  }
});

/* --------------------------------------------------------- resolution ---- */
defineTool('resolution', {
  label: 'Resolution',
  intro: 'Keep every k-th sample and re-read the answer. The starting sample is a choice nobody ' +
         'makes deliberately, and at coarse rates it decides the result.',
  caption: 'The ghost is the record at full rate; the solid trace is what survives. The peak is a ' +
           'lower bound on the true peak, and the best-phase readout is how far that bound can sit ' +
           'below it.',
  controls: [
    {key: 'k', label: 'keep every', min: 1, max: 200, step: 1, value: 1, dp: 0, unit: 'th'},
    {key: 'ph', label: 'starting at', min: 0, max: 199, step: 1, value: 0, dp: 0}
  ],
  readouts: [
    {key: 'rate', label: 'effective rate'}, {key: 'kept', label: 'samples kept'},
    {key: 'pk', label: 'peak read'}, {key: 'full', label: 'peak at full rate'},
    {key: 'worst', label: 'worst starting sample'}, {key: 'spread', label: 'spread over phases'}
  ],
  run(s, st) {
    const k = Math.max(1, Math.round(st.k)), ph = Math.min(k - 1, Math.round(st.ph));
    const xs = [], ys = [];
    for (let i = ph; i < s.n; i += k) { xs.push(s.t[i]); ys.push(s.y[i]); }
    const step = new Float64Array(s.n);
    let j = 0;
    for (let i = 0; i < s.n; i++) {
      while (j + 1 < xs.length && xs[j+1] <= s.t[i]) j++;
      step[i] = ys[Math.min(j, ys.length - 1)];
    }
    let full = 0;
    for (let i = 0; i < s.n; i++) full = Math.max(full, Math.abs(s.y[i]));
    let worst = Infinity, best = 0;
    for (let p = 0; p < k; p++) {
      let m = 0;
      for (let i = p; i < s.n; i += k) m = Math.max(m, Math.abs(s.y[i]));
      worst = Math.min(worst, m); best = Math.max(best, m);
    }
    const pk = ys.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    return {
      panels: [{x: s.t, y: step, ghost: s.y, label: s.label, unit: s.unit,
        opts: {marks: xs.length <= 60 ? xs.map((x, i) => ({t: x, y: ys[i]})) : []}}],
      readouts: {
        rate: s.kind === 'measured' ? (1 / (s.dt * k)).toFixed(0) + ' Hz' : 'spacing ' + (s.dt*k).toPrecision(4),
        kept: xs.length.toLocaleString() + ' of ' + s.n.toLocaleString(),
        pk: fmtN(pk), full: fmtN(full),
        worst: fmtN(worst),
        spread: k === 1 ? 'no choice to make'
          : (100 * (best - worst) / full).toFixed(1) + '% of the true peak'
      }
    };
  }
});

/* -------------------------------------------------------------- step ----- */
/* Only meaningful for a signal that came from an ODE: everything else is a
   record of what happened, with no right-hand side to step. */
defineTool('step', {
  label: 'Step an ODE',
  intro: 'Euler, Heun and RK4 on the equation itself, at a step size you choose. ' +
         'The reference curve is the one the source panel describes: the exact solution ' +
         'if you gave one, otherwise RK4 at sixteen times the displayed resolution.',
  caption: 'The ghost is the reference. Halve the step and watch the error: Euler falls by ' +
           'two, Heun by four, RK4 by sixteen. That ratio is the order, and it is measured ' +
           'here rather than quoted.',
  options: [{key: 'meth', label: 'method', value: 'rk4', options: [
    {value: 'euler', label: 'Euler'}, {value: 'heun', label: 'Heun'}, {value: 'rk4', label: 'RK4'}]}],
  controls: [{key: 'lognsteps', label: 'steps', min: 2, max: 12, step: 1, value: 5, dp: 0,
              fmt: v => Math.pow(2, Math.round(v)) + ' steps'}],
  readouts: [
    {key: 'h', label: 'step size'}, {key: 'evals', label: 'right-hand side evaluations'},
    {key: 'err', label: 'largest error'}, {key: 'ferr', label: 'error at the end'},
    {key: 'ord', label: 'measured order'}, {key: 'note', label: ''}
  ],
  run(s, st) {
    if (s.kind !== 'ode')
      throw new Error('there is no equation to step \u2014 switch the source to "From an ODE"');
    const {f, a, b, y0} = s.ode;
    const COST = {euler: 1, heun: 2, rk4: 4};

    /* one run at a given number of steps, sampled back onto the display grid */
    function solve(N) {
      const h = (b - a) / N;
      const xs = new Float64Array(N + 1), ys = new Float64Array(N + 1);
      let x = a, y = y0;
      xs[0] = a; ys[0] = y0;
      for (let i = 1; i <= N; i++) {
        if (st.meth === 'euler') {
          y += h * f(x, y);
        } else if (st.meth === 'heun') {
          const k1 = f(x, y), k2 = f(x + h, y + h * k1);
          y += h * (k1 + k2) / 2;
        } else {
          const k1 = f(x, y), k2 = f(x + h / 2, y + h * k1 / 2),
                k3 = f(x + h / 2, y + h * k2 / 2), k4 = f(x + h, y + h * k3);
          y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
        }
        x = a + i * h;
        xs[i] = x; ys[i] = y;
      }
      return {xs, ys, h, N};
    }

    /* the reference value at an arbitrary x: exact if we have it, else linear
       interpolation of the fine solution the source built */
    const ref = s.ode.exact ? s.ode.exact : (xv => {
      const u = (xv - s.t[0]) / s.dt;
      const i = Math.max(0, Math.min(s.n - 2, Math.floor(u)));
      const w = u - i;
      return s.y[i] * (1 - w) + s.y[i + 1] * w;
    });

    const N = Math.pow(2, Math.round(st.lognsteps));
    const run = solve(N), half = solve(N * 2);

    /* The order is read off the largest error anywhere on the run, not the
       error at the last point: on a decaying solution every method ends up
       near the same asymptote, so the final error is dominated by rounding and
       the ratio it gives is meaningless. */
    const worstOf = r => {
      let w = 0;
      for (let i = 0; i <= r.N; i++) {
        const e = Math.abs(r.ys[i] - ref(r.xs[i]));
        if (!isFinite(e)) return NaN;
        w = Math.max(w, e);
      }
      return w;
    };
    const worst = worstOf(run), worstHalf = worstOf(half);
    const worstOK = isFinite(worst);
    const eEnd = Math.abs(run.ys[N] - ref(b));

    /* the size of the solution itself, so "large error" is judged against
       something rather than against an absolute number */
    let scale = 0;
    for (let i = 0; i < s.n; i++) scale = Math.max(scale, Math.abs(s.y[i]));
    scale = Math.max(scale, Math.abs(y0), 1e-12);
    const blown = !worstOK || !run.ys.every(isFinite);
    const unstable = !blown && worst > 10 * scale;

    let ord = '\u2014';
    if (blown || unstable) {
      /* the ratio between a step above the stability limit and one below it is
         not a convergence rate, and printing it as one would be a lie */
      ord = 'not an order \u2014 this step is past the stability limit';
    } else if (worstOK && isFinite(worstHalf) && worst > 0 && worstHalf > 0) {
      if (worst > worstHalf * 1.02) ord = Math.log2(worst / worstHalf).toFixed(2);
      else if (worst < 1e-13)
        ord = 'not measurable \u2014 already at machine precision';
      else
        ord = 'not measurable \u2014 halving the step did not reduce the error';
    }

    return {
      panelKey: 'step' + st.meth,
      panels: [{x: run.xs, y: run.ys, label: 'y, ' +
        {euler: 'Euler', heun: 'Heun', rk4: 'RK4'}[st.meth] + ' at ' + N + ' steps',
        unit: '', range: [a, b],
        opts: {curves: [{x: s.t, y: s.y, cls: 'ghost'}],
               marks: run.N <= 64
                 ? Array.from({length: N + 1}, (_, i) => ({t: run.xs[i], y: run.ys[i], dot: true}))
                 : []}}],
      readouts: {
        h: run.h.toPrecision(4),
        evals: (N * COST[st.meth]).toLocaleString(),
        err: blown ? 'the solution blew up' : fmtN(worst),
        ferr: blown ? '\u2014' : fmtN(eEnd),
        ord: blown ? '\u2014' : ord,
        note: blown
          ? 'the solution ran off to infinity: at this step size the method is unstable for ' +
            'this equation \u2014 a property of the pair, not of the method alone'
          : unstable
            ? 'the error is ' + Math.round(worst / scale) + ' times the size of the solution ' +
              'itself \u2014 this step is past the stability limit for this equation, and ' +
              'shrinking it a little will not help a little, it will fix it entirely'
            : (worst < 1e-13
                ? 'at machine precision: what is left is rounding, not truncation'
                : '')
      }
    };
  }
});

/* ------------------------------------------------------------- spread ---- */
defineTool('spread', {
  label: 'Resample',
  intro: 'Perturb the record many times with noise of a size you choose, recompute one ' +
         'reported number each time, and look at the distribution that comes out. This is ' +
         'how an interval is produced when the formula for one is not available.',
  caption: 'The histogram is the resampled quantity; the amber marks are the 2.5th and 97.5th ' +
           'percentiles, so the band between them is a 95% interval. The dotted line is the ' +
           'value from the unperturbed record.',
  options: [
    {key: 'q', label: 'report', value: 'peak', options: [
      {value: 'peak', label: 'Peak'}, {value: 'tpeak', label: 'Time of peak'},
      {value: 'integ', label: 'Integral'}, {value: 'extrap', label: 'Extrapolated'}]},
    {key: 'noise', label: 'noise', value: 'real', options: [
      {value: 'real', label: 'Real'}, {value: 'gauss', label: 'Gaussian'}]}
  ],
  controls: [
    {key: 'sd', label: 'noise added', min: 0, max: 100, step: 1, value: 20, dp: 0,
     fmt: (v, s) => {
       let mx = 0;
       for (let i = 0; i < s.n; i++) mx = Math.max(mx, Math.abs(s.y[i]));
       return (v / 10).toFixed(1) + '% of the peak \u2014 \u03c3 = ' +
              (mx * v / 1000).toPrecision(3);
     }},
    {key: 'reps', label: 'repetitions', min: 50, max: 2000, step: 50, value: 400, dp: 0}
  ],
  readouts: [
    {key: 'base', label: 'from the record as it stands'}, {key: 'mean', label: 'mean of the resamples'},
    {key: 'sd', label: 'spread'}, {key: 'ci', label: '95% interval'},
    {key: 'w', label: 'interval width'}, {key: 'note', label: ''}
  ],
  run(s, st) {
    let mx = 0;
    for (let i = 0; i < s.n; i++) mx = Math.max(mx, Math.abs(s.y[i]));
    const sd = mx * st.sd / 1000;
    const reps = Math.round(st.reps);
    const X = s.xScale || 1, U = s.xUnit || '';

    /* the reported quantity, as a function of one perturbed record */
    const quantity = y => {
      if (st.q === 'peak') {
        let b = 0;
        for (let i = 1; i < s.n; i++) if (Math.abs(y[i]) > Math.abs(y[b])) b = i;
        return Math.abs(y[b]);
      }
      if (st.q === 'tpeak') {
        let b = 0;
        for (let i = 1; i < s.n; i++) if (Math.abs(y[i]) > Math.abs(y[b])) b = i;
        return s.t[b] * X;
      }
      if (st.q === 'integ') return integrate(y, s.dt)[s.n - 1];
      /* extrapolation: fit a line to the first half and read it at the end,
         which is the week 9 point about how fast an interval widens */
      const m = Math.max(3, Math.floor(s.n / 2));
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let i = 0; i < m; i++) { sx += s.t[i]; sy += y[i]; sxx += s.t[i] * s.t[i]; sxy += s.t[i] * y[i]; }
      const d = m * sxx - sx * sx;
      if (Math.abs(d) < 1e-300) return NaN;
      const sl = (m * sxy - sx * sy) / d, ic = (sy - sl * sx) / m;
      return ic + sl * s.t[s.n - 1];
    };

    const base = quantity(s.y);
    const vals = new Float64Array(reps);
    const rand = mulberry(20260907);
    const g = gaussFrom(rand);
    const yy = new Float64Array(s.n);
    for (let r = 0; r < reps; r++) {
      if (sd === 0) { vals[r] = base; continue; }
      if (st.noise === 'real') {
        /* a different stretch of the recorded noise for each repetition */
        const eps = realNoise(s.n, sd, Math.floor(rand() * 1e6));
        for (let i = 0; i < s.n; i++) yy[i] = s.y[i] + eps[i];
      } else {
        for (let i = 0; i < s.n; i++) yy[i] = s.y[i] + sd * g();
      }
      vals[r] = quantity(yy);
    }

    const ok = Array.from(vals).filter(isFinite).sort((p, q) => p - q);
    if (!ok.length) return null;
    const mean = ok.reduce((p, q) => p + q, 0) / ok.length;
    let sq = 0;
    for (const v of ok) sq += (v - mean) ** 2;
    const spread = Math.sqrt(sq / Math.max(1, ok.length - 1));
    const pct = f => ok[Math.min(ok.length - 1, Math.max(0, Math.round(f * (ok.length - 1))))];
    const lo = pct(0.025), hi = pct(0.975);
    const unit = st.q === 'tpeak' ? U : st.q === 'integ' ? '' : s.unit;

    return {
      panelKey: 'spread',
      panels: [{hist: ok, label: 'resampled ' +
        {peak: 'peak', tpeak: 'time of peak', integ: 'integral', extrap: 'extrapolated value'}[st.q],
        unit, xLabel: 'value', xUnit: unit,
        opts: {band: [lo, hi], truth: base, truthLabel: 'clean record',
               bandCls: 'pctband'}}],
      readouts: {
        base: withUnit(fmtN(base), unit),
        mean: withUnit(fmtN(mean), unit),
        sd: withUnit(fmtN(spread), unit),
        ci: fmtN(lo) + ' to ' + withUnit(fmtN(hi), unit),
        w: withUnit(fmtN(hi - lo), unit),
        note: sd === 0 ? 'with no noise added every repetition is the same record'
            : st.q === 'peak' && mean > base
              ? 'the resampled peaks sit above the peak of the clean record: taking a maximum ' +
                'over many samples finds the noise as well as the signal'
            : ''
      }
    };
  }
});

const params = new URLSearchParams(location.search);
mountWorkbench(document.getElementById('wb'), params.get('tool'));


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
