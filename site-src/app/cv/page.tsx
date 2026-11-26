import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { profile } from '../content';

export const metadata: Metadata = {
  title: 'Curriculum vitae | Zonghan Du',
  description: 'Zonghan Du’s academic curriculum vitae.',
  alternates: { canonical: '/cv/' },
};

export default function CVPage() {
  return <main id="main" className="reading-page cv-page">
    <p className="affiliation">Zonghan Du</p><h1>Curriculum vitae</h1>
    <p className="cv-date">Updated {profile.updated} · 3 pages</p>
    <div className="cv-actions"><a className="primary-link" href="/Zonghan_Du_CV.pdf" download><Download size={16}/> Download PDF</a>
      <a href="/Zonghan_Du_CV.pdf">Open PDF</a></div>
    <object className="cv-viewer" type="application/pdf" data="/Zonghan_Du_CV.pdf" aria-label="Curriculum vitae in PDF format">
      <a href="/Zonghan_Du_CV.pdf">Read the CV as a PDF</a>
    </object>
  </main>;
}
