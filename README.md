# Zonghan Du · Academic homepage

Live site: https://gwkuqgfkqe.github.io/

The repository root contains the static website served by GitHub Pages. The editable Next.js project is in `site-src/`. The site includes research project pages, publication and poster filters, BibTeX citations, an interactive biological–mechanical brain with directional signals and a three-view fsaverage5 cortical atlas, a neural alignment demonstration, and the public CV. Visitor analytics are disabled.

## Updating the site

1. Edit the content in `site-src/app/` or replace a public asset in `site-src/public/`.
2. Run `npm ci` and `npm run build` from `site-src/`.
3. Copy the contents of `site-src/out/` into the repository root, including the generated `_next/` directory. Keep `.nojekyll` at the root.
4. Commit the source and the updated static files to `main`. GitHub Pages publishes from the repository root.

Research records and references are in `site-src/app/academic.json`. The public CV omits the personal telephone number. Surface and font credits are in `site-src/public/credits/`.
