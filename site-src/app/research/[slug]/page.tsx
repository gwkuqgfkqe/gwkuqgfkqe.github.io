import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { legacyProjects, projectBySlug, projects, publications } from '../../content';
import AlignmentDemo from '../../simulation';

type Props = { params: Promise<{slug: string}> };

export function generateStaticParams() {
  return [...projects.map(p => p.id), ...Object.keys(legacyProjects)].map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = projectBySlug((await params).slug);
  if (!p) return {};
  const url = '/research/' + p.id + '/';
  return {
    title: p.name + ' | Zonghan Du', description: p.summary, alternates: { canonical: url },
    openGraph: { title: p.name, description: p.summary, url, images: ['/og.png'] },
  };
}

export default async function ProjectPage({ params }: Props) {
  const project = projectBySlug((await params).slug);
  if (!project) notFound();
  return <main id="main" className="reading-page">
    <a href="/#research" className="back-link">All research</a>
    <p className="affiliation">{project.institution}</p><h1>{project.name}</h1>
    <p className="detail-lead">{project.summary}</p>
    {project.paragraphs.map(([title, text]) => <section className="prose-section" key={title}><h2>{title}</h2><p>{text}</p></section>)}
    {project.id === 'neural-drift' && <AlignmentDemo />}
    <section className="prose-section resources"><h2>Related work</h2>
      {project.resources.map(id => {
        const item = publications.find(paper => paper.id === id);
        if (!item) return null;
        return <article key={id}><p className="source-line">{item.venue} · {item.year}</p><h3>{item.title}</h3>
          <div className="paper-links">{item.links.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}</div></article>;
      })}
    </section>
  </main>;
}
