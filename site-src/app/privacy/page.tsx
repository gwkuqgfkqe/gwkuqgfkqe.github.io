import type { Metadata } from 'next';
import { profile } from '../content';

export const metadata: Metadata = {
  alternates: { canonical: '/privacy/' },
  title: 'Privacy | Zonghan Du',
  description: 'Privacy information for this academic website.',
};

export default function PrivacyPage() {
  return (
    <main id="main" className="privacy-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span><span aria-current="page">Privacy</span>
      </nav>
      <h1>Privacy</h1>
      <p>This website has visitor analytics disabled. It does not set analytics cookies or send page views to a visitor counter.</p>
      <p>Your display preferences for the interactive brain illustration may be saved in this browser.</p>
      <p>GitHub Pages hosts this site. For information about hosting logs, see the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub General Privacy Statement</a>.</p>
      <p>Questions can be sent to <a href={'mailto:' + profile.email}>{profile.email}</a>.</p>
    </main>
  );
}
