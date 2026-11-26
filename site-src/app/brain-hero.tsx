'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowUpRight,Download,ArrowLeftRight} from 'lucide-react';
import {profile,intro,brainConcepts} from './content';
import {Switch} from '@/components/ui/switch';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';

type Direction = typeof brainConcepts[number]['id'];
type Point = {x:number;y:number};
const pathways: {points:[Point,Point,Point,Point];direction:Direction}[] = [
  {points:[{x:.35,y:.29},{x:.48,y:.22},{x:.52,y:.43},{x:.64,y:.35}],direction:'brain-to-ai'},
  {points:[{x:.34,y:.61},{x:.48,y:.53},{x:.54,y:.78},{x:.64,y:.69}],direction:'brain-to-ai'},
  {points:[{x:.66,y:.48},{x:.53,y:.57},{x:.47,y:.37},{x:.36,y:.43}],direction:'ai-to-brain'},
  {points:[{x:.59,y:.8},{x:.51,y:.73},{x:.47,y:.83},{x:.4,y:.74}],direction:'ai-to-brain'},
];
const nodes:Point[] = [
  {x:.35,y:.29},{x:.36,y:.43},{x:.34,y:.61},{x:.4,y:.74},{x:.46,y:.17},
  {x:.42,y:.53},{x:.31,y:.49},{x:.43,y:.86},{x:.43,y:.35},
  {x:.64,y:.35},{x:.64,y:.69},{x:.66,y:.48},{x:.59,y:.8},{x:.56,y:.18},
  {x:.6,y:.55},{x:.69,y:.58},{x:.57,y:.87},{x:.58,y:.4},
];
function curve(points:[Point,Point,Point,Point],t:number):Point{
  const u=1-t;return{x:u*u*u*points[0].x+3*u*u*t*points[1].x+3*u*t*t*points[2].x+t*t*t*points[3].x,y:u*u*u*points[0].y+3*u*u*t*points[1].y+3*u*t*t*points[2].y+t*t*t*points[3].y};
}

export default function BrainHero(){
  const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const [motion,setMotion]=useState(false),[reduced,setReduced]=useState(false),[simplified,setSimplified]=useState(false),[loaded,setLoaded]=useState(true);
  const [direction,setDirection]=useState<Direction>('both');
  useEffect(()=>{const img=stage.current?.querySelector('img');if(img?.complete&&!img.naturalWidth)setLoaded(false)},[]);
  useEffect(()=>{
    const system=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:700px)');
    const apply=()=>{setReduced(system.matches);setSimplified(mobile.matches);let preference:string|null=null;try{preference=localStorage.getItem('zd-motion')}catch{}setMotion(!system.matches&&!mobile.matches&&preference!=='off')};
    apply();system.addEventListener('change',apply);mobile.addEventListener('change',apply);
    return()=>{system.removeEventListener('change',apply);mobile.removeEventListener('change',apply)};
  },[]);
  useEffect(()=>{
    const art=stage.current,cv=canvas.current;if(!art||!cv)return;
    const ctx=cv.getContext('2d');if(!ctx)return;
    let frame=0,visible=true,last=0,w=0,h=0,scale=1,ox=0,oy=0;
    const pointer={x:-10,y:-10};
    const moving=motion&&!reduced&&!simplified&&loaded;
    const screen=(p:Point)=>({x:ox+p.x*1536*scale,y:oy+p.y*1024*scale});
    const paint=(t:number)=>{
      ctx.clearRect(0,0,w,h);if(!loaded)return;
      pathways.forEach((path,i)=>{
        const selected=direction==='both'||direction===path.direction;
        const color=path.direction==='brain-to-ai'?'100,228,247':'194,173,255';
        const pts=path.points.map(screen);
        ctx.strokeStyle=`rgba(${color},${selected?.32:.075})`;ctx.lineWidth=selected?1.1:.7;
        ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);ctx.bezierCurveTo(pts[1].x,pts[1].y,pts[2].x,pts[2].y,pts[3].x,pts[3].y);ctx.stroke();
        // Each path starts in its source hemisphere. Opposing paths carry opposing colors.
        const progress=moving?(t/5800+i*.24)%1:.56;
        const tip=screen(curve(path.points,progress));
        const tail=screen(curve(path.points,Math.max(0,progress-.035)));
        const angle=Math.atan2(tip.y-tail.y,tip.x-tail.x);
        ctx.save();ctx.globalAlpha=selected?1:.2;ctx.strokeStyle=`rgb(${color})`;ctx.fillStyle=`rgb(${color})`;
        if(moving){ctx.shadowColor=`rgb(${color})`;ctx.shadowBlur=8;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(tip.x,tip.y);ctx.stroke()}
        ctx.translate(tip.x,tip.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-2,-2);ctx.lineTo(-2,2);ctx.closePath();ctx.fill();ctx.restore();
      });
      nodes.forEach((p,i)=>{
        const n=screen(p),distance=Math.hypot(n.x-pointer.x,n.y-pointer.y);
        const near=moving?Math.max(0,1-distance/80):0;
        const color=p.x<.5?'100,228,247':'194,173,255';
        if(near>0){const halo=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,18);halo.addColorStop(0,`rgba(${color},${near*.36})`);halo.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=halo;ctx.fillRect(n.x-18,n.y-18,36,36)}
        ctx.fillStyle=`rgba(${color},${.28+near*.65})`;ctx.beginPath();ctx.arc(n.x,n.y,1.3+near*1.8,0,Math.PI*2);ctx.fill();
        if(near>.2){nodes.slice(i+1).forEach(other=>{const b=screen(other);if((p.x<.5)===(other.x<.5)&&Math.hypot(b.x-n.x,b.y-n.y)<85){ctx.strokeStyle=`rgba(${color},${near*.3})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(b.x,b.y);ctx.stroke()}})}
      });
    };
    const tick=(t:number)=>{frame=0;if(!moving||!visible||document.hidden)return;frame=requestAnimationFrame(tick);if(t-last<33)return;last=t;paint(t)};
    const resetTilt=()=>{art.style.setProperty('--mx','0');art.style.setProperty('--my','0')};
    const sync=()=>{cancelAnimationFrame(frame);frame=0;if(!visible||document.hidden){resetTilt();return}paint(0);if(moving)frame=requestAnimationFrame(tick);else resetTilt()};
    const resize=()=>{w=art.clientWidth;h=art.clientHeight;const d=Math.min(devicePixelRatio,1.5);cv.width=Math.round(w*d);cv.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);scale=Math.max(w/1536,h/1024);ox=(w-1536*scale)/2;oy=(h-1024*scale)/2;sync()};
    const move=(e:PointerEvent)=>{if(!moving||e.pointerType==='touch')return;const r=art.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;art.style.setProperty('--mx',String(Math.max(-.5,Math.min(.5,pointer.x/r.width-.5))));art.style.setProperty('--my',String(Math.max(-.5,Math.min(.5,pointer.y/r.height-.5))))};
    const leave=()=>{pointer.x=pointer.y=-10;resetTilt()};
    const ro=new ResizeObserver(resize);ro.observe(art);resize();
    const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()});io.observe(art);
    document.addEventListener('visibilitychange',sync);art.addEventListener('pointermove',move);art.addEventListener('pointerleave',leave);
    return()=>{cancelAnimationFrame(frame);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',sync);art.removeEventListener('pointermove',move);art.removeEventListener('pointerleave',leave);resetTilt()};
  },[motion,reduced,simplified,loaded,direction]);

  return <section className="hero hero-fusion" id="top">
    <div className="hero-copy">
      <p className="eyebrow">NEURAL ENGINEERING & COMPUTATIONAL NEUROSCIENCE</p>
      <h1>{profile.name}<span>{intro.hero[0]}<br/>{intro.hero[1]}</span></h1>
      <p className="hero-intro">{intro.summary}</p>
      <p className="hero-role">{intro.roles[0]}<br/>{intro.roles[1]}</p>
      <div className="button-row"><a className="button primary" href="#research">View research <ArrowUpRight size={18}/></a><a className="button secondary" href="/Zonghan_Du_CV.pdf" download>Download CV <Download size={17}/></a></div>
      <div className="hero-secondary"><a href="#publications">Publications <ArrowUpRight size={13}/></a><a href="#contact">Contact <ArrowUpRight size={13}/></a></div>
    </div>
    <figure className="brain-figure" aria-labelledby="brain-caption">
      <div className="brain-stage" ref={stage} data-art-loaded={loaded} aria-hidden="true">
        {loaded&&<picture><source media="(max-width:700px)" srcSet="/brain-mobile.webp"/><img src="/brain.webp" alt="" width="1536" height="1024" fetchPriority="high" onError={()=>setLoaded(false)}/></picture>}
        <canvas ref={canvas}/>
      </div>
      <div className="brain-legend" aria-hidden="true"><span>Biological intelligence</span><ArrowLeftRight size={16}/><span>Artificial intelligence</span></div>
      <Tabs value={direction} onValueChange={v=>{if(brainConcepts.some(c=>c.id===v))setDirection(v as Direction)}} className="brain-concepts">
        <TabsList variant="line" aria-label="Explore connections between brains and AI">{brainConcepts.map(c=><TabsTrigger value={c.id} key={c.id}>{c.label}</TabsTrigger>)}</TabsList>
        {brainConcepts.map(c=><TabsContent value={c.id} key={c.id}><p>{c.description}</p></TabsContent>)}
      </Tabs>
      <figcaption id="brain-caption">Conceptual artwork · research interests, not experimental results</figcaption>
    </figure>
    <div className="hero-bottom"><a href="#about"><ArrowDown size={15}/> Explore</a><label className="motion-control"><Switch checked={motion} disabled={reduced||simplified} onCheckedChange={v=>{setMotion(v);try{localStorage.setItem('zd-motion',v?'on':'off')}catch{}}} aria-label="Background motion"/><span>{reduced?'Motion off · system preference':simplified?'Static on mobile':motion?'Motion on':'Motion off'}</span></label></div>
  </section>;
}
