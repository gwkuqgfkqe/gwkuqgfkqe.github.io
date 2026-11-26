'use client';

import { useState } from 'react';
import { profile } from './content';

const views = [
  { id: 'oblique', name: 'Oblique', description: 'left anterior oblique' },
  { id: 'lateral', name: 'Lateral', description: 'left lateral' },
  { id: 'superior', name: 'Superior', description: 'superior' },
];

function CorticalSurface() {
  const [selected, setSelected] = useState(0);
  const view = views[selected];

  return (
    <figure className="cortex-figure">
      <div className="cortex-plate">
        <img key={view.id} src={`/cortex-${view.id}.webp`} width="960" height="760"
          fetchPriority="high" alt={`Average human cerebral cortex in ${view.description} view`} />
      </div>
      <figcaption>
        <span className="figure-title">Cortical surface</span>
        <div className="view-options" role="group" aria-label="Cortical surface viewpoint">
          {views.map((item, i) => (
            <button key={item.id} type="button" aria-pressed={selected === i}
              onClick={() => setSelected(i)}>{item.name}</button>
          ))}
        </div>
        <small><a href="https://nilearn.github.io/stable/modules/generated/nilearn.datasets.load_fsaverage.html">fsaverage5 template</a> · Illustrative color</small>
      </figcaption>
    </figure>
  );
}

export default function BrainHero() {
  return (
    <section id="about" className="intro-section">
      <div className="bio">
        <p className="affiliation">Biomedical Engineering · Brown University</p>
        <h1>Zonghan Du</h1>
        <p className="bio-lead">I study how brain–computer interfaces can recognize intended movements as neural recordings change over time.</p>
        <p>I’m a master’s student at Brown. At <a href="https://www.braingate.org/team/zonghan-du/">BrainGate</a>, I work with John Simeral on decoding hand gestures across sessions. At Massachusetts General Hospital, I work with Todd Herrington on how neural activity relates to approach–avoidance decisions.</p>
        <div className="profile-links">
          <a href="/cv/">Curriculum vitae</a>
          <a href={profile.scholar}>Google Scholar</a>
          <a href={profile.github}>GitHub</a>
          <a href={'mailto:' + profile.email}>Email</a>
        </div>
      </div>
      <CorticalSurface />
    </section>
  );
}
