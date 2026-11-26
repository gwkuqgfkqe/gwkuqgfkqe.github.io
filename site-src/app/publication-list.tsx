'use client';

import { useState } from 'react';
import { publications } from './content';
import { CopyButton } from './shared';

type Paper = typeof publications[number];
const groups = ['Published & accepted', 'Preprints', 'In preparation', 'Posters', 'All'];
const years = [...new Set(publications.map(paper => paper.year))].sort((a, b) => b - a);

function bibtex(paper: Paper) {
  const type = paper.group === 'Published & accepted' ? 'inproceedings' : paper.group === 'Preprints' ? 'misc' : 'unpublished';
  const venueKey = type === 'inproceedings' ? 'booktitle' : 'note';
  const publicLink = paper.links.find(link => ['Preprint', 'Paper', 'Chapter', 'Abstract'].includes(link.label));
  const venue = paper.group === 'Published & accepted' ? paper.venue.replace(' · accepted', '') : paper.venue;
  const fields = [
    ['title', paper.title], ['author', paper.authors.join(' and ')],
    ['year', String(paper.year)], [venueKey, venue],
  ];
  if (publicLink) fields.push(['url', publicLink.href]);
  return '@' + type + '{' + paper.id + paper.year + ',\n' +
    fields.map(([key, value]) => '  ' + key + ' = {' + value + '}').join(',\n') + '\n}';
}

function Authors({ names }: { names: string[] }) {
  return <p className="authors">{names.map((name, i) => <span key={name}>
    {i > 0 && ' · '}{name === 'Du, Z.' ? <strong>{name}</strong> : name}
  </span>)}</p>;
}

export default function PublicationList() {
  const [group, setGroup] = useState(groups[0]);
  const [year, setYear] = useState('');
  const filtered = publications.filter(paper =>
    (group === 'All' || paper.group === group) && (!year || String(paper.year) === year));
  return <>
    <div className="pub-controls">
      <div className="pub-tabs" role="group" aria-label="Publication type">
        {groups.map(item => <button type="button" key={item} aria-pressed={item === group}
          onClick={() => setGroup(item)}>{item}</button>)}
      </div>
      <select aria-label="Publication year" value={year} onChange={e => setYear(e.target.value)}>
        <option value="">All years</option>{years.map(y => <option key={y}>{y}</option>)}
      </select>
    </div>
    <span role="status" className="sr-only">{filtered.length} matching entries</span>
    {filtered.length === 0 && <p className="no-papers">No entries for this year and publication type.</p>}
    {filtered.map(paper => <article key={paper.id} className="paper">
      <span className="paper-year">{paper.year}</span>
      <div><h3>{paper.title}</h3><Authors names={paper.authors}/>
        <p className="paper-venue">{paper.venue}</p>
        <div className="paper-links">{paper.links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
          {paper.project && <a href={'/research/' + paper.project + '/'}>Research details</a>}
          <details><summary>BibTeX</summary><div className="citation"><pre>{bibtex(paper)}</pre>
            <CopyButton label="Copy citation" text={bibtex(paper)} /></div></details>
        </div>
      </div>
    </article>)}
  </>;
}
