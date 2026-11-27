'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Pause, Play } from 'lucide-react';

const directions = [
  { id: 'both', label: 'Two-way' },
  { id: 'decode', label: 'Brain to machine' },
  { id: 'feedback', label: 'Machine to brain' },
] as const;
type Direction = typeof directions[number]['id'];

const routes = [
  { direction: 'decode', d: 'M 35 19.3 C 48 14.7 52 28.7 64 23.3', x: 35, y: 19.3 },
  { direction: 'decode', d: 'M 34 40.7 C 48 35.3 54 52 64 46', x: 34, y: 40.7 },
  { direction: 'feedback', d: 'M 66 32 C 53 38 47 24.7 36 28.7', x: 66, y: 32 },
  { direction: 'feedback', d: 'M 59 53.3 C 51 48.7 47 55.3 40 49.3', x: 59, y: 53.3 },
] as const;

export default function BrainInterface() {
  const [direction, setDirection] = useState<Direction>('both');
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const signals = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    try { setPaused(localStorage.getItem('zd-motion') === 'off'); } catch { /* Storage is optional. */ }
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const svg = signals.current;
    if (!svg) return;
    let onScreen = true;
    const sync = () => {
      if (paused || reduced || !onScreen || document.hidden) svg.pauseAnimations();
      else svg.unpauseAnimations();
    };
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); });
    observer.observe(svg);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [paused, reduced]);

  function pointAt(event: PointerEvent<HTMLDivElement>) {
    const frame = stage.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    frame.style.setProperty('--px', (x * 100) + '%');
    frame.style.setProperty('--py', (y * 100) + '%');
    if (event.pointerType === 'mouse' && !paused && !reduced) {
      frame.style.setProperty('--tilt-x', ((.5 - y) * 7) + 'deg');
      frame.style.setProperty('--tilt-y', ((x - .5) * 10) + 'deg');
    }
    frame.dataset.pointing = 'true';
  }

  function toggleMotion() {
    const next = !paused;
    setPaused(next);
    try { localStorage.setItem('zd-motion', next ? 'off' : 'on'); } catch { /* The control also works without storage. */ }
  }

  function clearPoint() {
    const frame = stage.current;
    if (!frame) return;
    frame.style.removeProperty('--tilt-x');
    frame.style.removeProperty('--tilt-y');
    delete frame.dataset.pointing;
  }

  return <>
    <div className="interface-stage" ref={stage} data-direction={direction} data-still={paused || reduced}
      onPointerMove={pointAt} onPointerLeave={clearPoint} onPointerCancel={clearPoint}>
      <div className="interface-art">
        <picture>
          <source media="(max-width: 700px)" srcSet="/brain-mobile.webp" />
          <img src="/brain.webp" width="1536" height="1024" loading="lazy" draggable={false}
            alt="Top view of a brain, with anatomical folds on the left and metallic circuitry on the right." />
        </picture>
        <svg ref={signals} className="interface-signals" viewBox="0 0 100 66.6667" aria-hidden="true">
          {routes.map((route, i) => <g key={route.d} className={'signal ' + route.direction}
            opacity={direction === 'both' || direction === route.direction ? 1 : .12}>
            <path d={route.d} fill="none" stroke="currentColor" strokeWidth=".24" opacity=".7" />
            <circle cx={route.x} cy={route.y} r=".47" fill="currentColor" />
            <g><animateMotion dur="4.8s" begin={(-i * 1.1) + 's'} repeatCount="indefinite" path={route.d} rotate="auto" />
              <path d="M .9 0 L -.45 .45 L -.45 -.45 Z" fill="currentColor" />
              <path d="M -.55 0 H -1.65" stroke="currentColor" strokeWidth=".25" strokeLinecap="round" />
            </g>
          </g>)}
        </svg>
        <div className="interface-light" aria-hidden="true" />
        <div className="hemispheres" role="group" aria-label="Select a signal source">
          <button type="button" aria-label="Select biological brain" aria-pressed={direction === 'decode'}
            onClick={() => setDirection('decode')} />
          <button type="button" aria-label="Select mechanical brain" aria-pressed={direction === 'feedback'}
            onClick={() => setDirection('feedback')} />
        </div>
      </div>
    </div>
    <div className="signal-controls">
      <div className="direction-options" role="group" aria-label="Signal direction">
        {directions.map(item => <button type="button" key={item.id} aria-pressed={direction === item.id}
          onClick={() => setDirection(item.id)}>{item.label}</button>)}
      </div>
      {!reduced && <button type="button" className="play-control" aria-label={paused ? 'Play signals' : 'Pause signals'}
        title={paused ? 'Play signals' : 'Pause signals'} onClick={toggleMotion}>
        {paused ? <Play size={16} /> : <Pause size={16} />}
      </button>}
    </div>
    <figcaption className="signal-caption" aria-live="polite">
      {direction === 'both' ? 'Select either half to trace a signal.' : direction === 'decode' ?
        'Decoding translates neural activity into a command.' : 'Feedback carries information from a device back to the nervous system.'}
    </figcaption>
  </>;
}
