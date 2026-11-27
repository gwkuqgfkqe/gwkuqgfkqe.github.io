'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copied');
    } catch {
      setMessage('Select the citation below to copy it.');
    }
  }
  return <button type="button" className="copy-link" onClick={copy}>
    {message === 'Copied' ? <Check size={14} /> : <Copy size={14} />}
    <span aria-live="polite">{message || label}</span>
  </button>;
}

const navLinks = [['Research', '/#research'], ['Publications', '/#publications'], ['Experience', '/#experience'], ['CV', '/cv/']];

export function SiteHeader() {
  const isHome = usePathname() === '/';
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menu.current?.focus(); }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    {!isHome && <header className="site-header"><div className="header-inner">
      <a className="wordmark" href="/">Zonghan Du</a>
      <button ref={menu} className="menu-toggle" type="button" aria-controls="main-nav"
        aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}
        onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
      <nav id="main-nav" className={open ? 'open' : ''} aria-label="Main navigation">
        {navLinks.map(([name, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{name}</a>)}
      </nav>
    </div></header>}
  </>;
}

export function SiteFooter() {
  return <footer className="site-footer" id="contact">
    <span>© 2026 Zonghan Du</span>
    <a href="mailto:zonghan_du@brown.edu">zonghan_du@brown.edu</a>
    <a href="/privacy/">Privacy</a>
    <a href="https://jonbarron.info/">Layout inspired by Jon Barron</a>
  </footer>;
}
