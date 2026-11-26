import BrainHero from './brain-hero';
import PublicationList from './publication-list';
import { experience, projects } from './content';

export default function Portfolio() {
  return <main id="main" className="site-main">
    <BrainHero />
    <section id="research" className="chapter">
      <header className="chapter-heading"><h2>Research</h2></header>
      <div className="chapter-body">
        {projects.slice(0, 4).map(project => (
          <article className="research-entry" key={project.id}>
            <p className="source-line">{project.institution}</p>
            <h3><a href={'/research/' + project.id + '/'}>{project.name}</a></h3>
            <p>{project.summary}</p>
          </article>
        ))}
        <details className="more-research"><summary>More research projects</summary>
          <ul>{projects.slice(4).map(p => <li key={p.id}><a href={'/research/' + p.id + '/'}>{p.name}</a><span>{p.institution}</span></li>)}</ul>
        </details>
      </div>
    </section>
    <section id="publications" className="chapter">
      <header className="chapter-heading"><h2>Publications<br className="desktop-break"/> & posters</h2></header>
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
  </main>;
}
