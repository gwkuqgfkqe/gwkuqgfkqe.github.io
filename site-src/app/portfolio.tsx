import ProfileIntro from './profile-intro';
import BrainFigure from './brain-figure';
import PublicationList from './publication-list';
import { experience, projects, publications } from './content';

const figures: Record<string, { alt: string; note: string }> = {
  'gesture-decoding': { alt: 'Overall macro-F1: CoDCR 78.78%, NoMAD 70.59%.', note: 'I trained a contrastive decoder across sessions and tested it on three gesture tasks in one BrainGate participant.' },
  'neural-drift': { alt: 'Schematic of two session representations separated by 13 months.', note: 'We used flow matching to align intracortical recordings from two sessions in which a participant attempted the same 31 finger gestures.' },
  seeg: { alt: 'Analysis window from one second before the response to the time of the decision.', note: 'Across 30 participants, intracranial activity in the second before a response predicted the upcoming approach–avoidance choice.' },
  'ss-dmp': { alt: 'Target and predicted movement along two dimensions in an M2 benchmark sequence.', note: 'I used neural activity to infer a small set of movement controls and reconstruct trajectories with a dynamical model.' },
};

export default function Portfolio() {
  return <main id="main" className="site-main">
    <ProfileIntro />
    <nav className="page-contents" aria-label="On this page">
      <a href="#research">Research</a><a href="#publications">Publications</a>
      <a href="#experience">Experience</a><a href="#brain">Interactive brain</a>
    </nav>
    <section id="research" className="chapter">
      <header className="chapter-heading"><h2>Research</h2></header>
      <div className="chapter-body">
        {projects.slice(0, 4).map(project => {
          const figure = figures[project.id];
          const work = publications.find(p => p.id === project.resources[0])!;
          const url = '/research/' + project.id + '/';
          return <article className="research-entry" key={project.id}>
            <a className="research-image" href={url} aria-label={project.name}>
              <img src={'/research-figures/' + project.id + '.webp'} alt={figure.alt} width="320" height="200"/>
            </a>
            <div className="research-info">
              <h3><a href={url}>{project.name}</a></h3>
              <p className="research-institution">{project.institution.replace(' · ', ', ')}</p>
              <p className="research-venue"><em>{work.group === 'Posters' ? 'Society for Neuroscience' : work.venue}</em>, {work.year}{work.group === 'Posters' && ' (poster)'}</p>
              <p className="research-links"><a href={url}>Project</a>
                {work.links.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}</p>
              <p className="research-summary">{figure.note}</p>
            </div>
          </article>;
        })}
        <details className="more-research"><summary>More research projects</summary>
          <ul>{projects.slice(4).map(p => <li key={p.id}><a href={'/research/' + p.id + '/'}>{p.name}</a><span>{p.institution}</span></li>)}</ul>
        </details>
      </div>
    </section>
    <section id="publications" className="chapter">
      <header className="chapter-heading"><h2>Publications &amp; posters</h2></header>
      <div className="chapter-body"><PublicationList /></div>
    </section>
    <section id="experience" className="chapter">
      <header className="chapter-heading"><h2>Experience</h2></header>
      <div className="chapter-body appointments">
        {experience.map(([dates, institution, role, advisors]) => <article key={institution}>
          <div><h3>{institution}</h3><p>{role} · {advisors}</p></div><span>{dates}</span>
        </article>)}
      </div>
    </section>
    <section className="chapter" id="education">
      <header className="chapter-heading"><h2>Education</h2></header>
      <div className="chapter-body appointments">
        <article><div><h3>Brown University</h3><p>M.S. in Biomedical Engineering</p><p>Cross-registered in Computational Neuroscience at Harvard University.</p></div><span>2025 – 2027 (expected)</span></article>
        <article><div><h3>Sun Yat-sen University</h3><p>B.Eng. in Computer Science and Technology</p></div><span>2020 – 2024</span></article>
      </div>
    </section>
    <section className="chapter awards" id="recognition">
      <header className="chapter-heading"><h2>Honors & service</h2></header>
      <div className="chapter-body">
        <ul><li>Brown University Pathway to Ph.D. Summer Research Stipend · 2026</li>
          <li>IEEE SMC Student and Young Professional Travel Grant · 2026</li>
          <li>Excellent Bachelor’s Degree Project, Sun Yat-sen University · 2024</li>
          <li>Invited reviewer for ICASSP (2026) and ICME (2025, 2026).</li></ul>
        <p>Outside research, I’m a National Class I swimmer in China. I placed first in the 200 m freestyle at the 2020 National Swimming Specialized Admission Exam.</p>
      </div>
    </section>
    <section id="brain" className="chapter brain-section">
      <header className="chapter-heading"><h2>Interactive brain</h2></header>
      <BrainFigure />
    </section>
  </main>;
}
