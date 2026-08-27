/**
 * Beast Motors — Hero block.
 * Structure: one row per field (rows: N, columns: 1 in the UE definition),
 * matching the `hero` model field order: image, title, subtitle,
 * ctaPrimaryText, ctaPrimaryHref, ctaSecondaryText, ctaSecondaryHref, theme.
 * Each row has a single column div — see component-definition.json for the
 * `div:nth-child(n)` selectors that map UE's panel fields to these rows.
 */

function buildCta(text, href, variant) {
  if (!text) return null;
  const a = document.createElement('a');
  a.className = `hero-cta hero-cta-${variant}`;
  a.href = href || '#';
  a.textContent = text;
  return a;
}

export default function decorate(block) {
  const rows = [...block.children].map((row) => row.firstElementChild);
  const [
    imageEl, titleEl, subtitleEl,
    ctaPrimaryTextEl, ctaPrimaryHrefEl, ctaSecondaryTextEl, ctaSecondaryHrefEl, themeEl,
  ] = rows;

  const text = (el) => el?.textContent?.trim() || '';
  const picture = imageEl?.querySelector('picture') || imageEl?.querySelector('img');

  const media = document.createElement('div');
  media.className = 'hero-media';
  if (picture) media.append(picture);

  const content = document.createElement('div');
  content.className = 'hero-content';

  if (text(titleEl)) {
    const h1 = document.createElement('h1');
    h1.textContent = text(titleEl);
    content.append(h1);
  }

  if (text(subtitleEl)) {
    const p = document.createElement('p');
    p.className = 'hero-subtitle';
    p.textContent = text(subtitleEl);
    content.append(p);
  }

  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'hero-ctas';
  const primary = buildCta(text(ctaPrimaryTextEl), text(ctaPrimaryHrefEl), 'primary');
  const secondary = buildCta(text(ctaSecondaryTextEl), text(ctaSecondaryHrefEl), 'secondary');
  if (primary) ctaWrap.append(primary);
  if (secondary) ctaWrap.append(secondary);
  if (ctaWrap.children.length) content.append(ctaWrap);

  const theme = text(themeEl) || 'dark';
  block.textContent = '';
  block.classList.add(`hero-theme-${theme}`);
  block.append(media, content);
}
