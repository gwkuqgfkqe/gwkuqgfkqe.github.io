import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from './shared';
import { siteOrigin } from './site-config';
import { profile } from './content';
import './globals.css';

const title = 'Zonghan Du | Neural Engineering';
const description = 'Research on intracortical brain–computer interfaces, cross-session neural decoding, and neural population dynamics at Brown University and Massachusetts General Hospital.';
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()), title, description, alternates: {canonical: '/'},
  openGraph: {type: 'website', title, description, url: '/', images: [{url: '/og.png', width: 1200, height: 630, alt: 'Zonghan Du · Neural engineering'}]},
  twitter: {card: 'summary_large_image', title, description, images: ['/og.png']},
  icons: { icon: '/favicon.svg' },
};

export default function Layout({children}: {children: React.ReactNode}) {
  const person = {'@context':'https://schema.org','@type':'Person',name:profile.name,
    url:siteOrigin(),email:'mailto:'+profile.email,sameAs:[profile.github,profile.scholar,profile.linkedin],
    affiliation:[{'@type':'Organization',name:'Brown University'},{'@type':'Organization',name:'BrainGate'}]};
  return <html lang="en"><body><SiteHeader/>{children}<SiteFooter/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(person).replace(/</g,'\\u003c')}}/>
  </body></html>;
}
