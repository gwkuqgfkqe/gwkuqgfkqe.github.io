export const dynamic = 'force-static';
import {siteOrigin} from '../site-config';
import {projects} from '../content';
export function GET(){const origin=siteOrigin();if(!origin)return new Response('Sitemap available after publication.',{status:503});const paths=['/','/cv','/privacy',...projects.map(p=>'/research/'+p.id)];return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>`<url><loc>${origin+(p==='/'?'/':p+'/')}</loc></url>`).join('')+'</urlset>',{headers:{'Content-Type':'application/xml','Cache-Control':'public,max-age=3600'}})}
