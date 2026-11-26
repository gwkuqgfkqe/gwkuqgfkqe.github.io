export const dynamic = 'force-static';
import {siteOrigin} from '../site-config';
export function GET(){const origin=siteOrigin();return new Response('User-agent: *\nAllow: /\n'+(origin?'Sitemap: '+origin+'/sitemap.xml\n':''),{headers:{'Content-Type':'text/plain'}})}
