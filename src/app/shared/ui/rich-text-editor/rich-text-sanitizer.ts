/**
 * Allowlist sanitizer for the rich text editor.
 *
 * The editor writes HTML straight into a contenteditable element, so anything that
 * arrives from storage or the clipboard has to be cleaned first. Angular's built-in
 * HTML sanitizer is not usable here: it drops the inline `style` attribute, which is
 * exactly where `text-align` lives after an alignment command, so formatting would be
 * silently lost on every reload.
 *
 * Parsing happens in an inert document (`DOMParser` with `text/html` never executes
 * scripts or fetches resources), then we keep only what the toolbar can produce.
 */

/** Elements kept as-is. Anything else is unwrapped, keeping its text content. */
const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'P', 'DIV', 'SPAN', 'BR',
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'UL', 'OL', 'LI',
  'BLOCKQUOTE', 'H1', 'H2', 'H3',
  'A', 'CENTER',
]);

/** Elements dropped together with their content - unwrapping these would leak payloads. */
const DROP_WITH_CONTENT: ReadonlySet<string> = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'APPLET',
  'LINK', 'META', 'BASE', 'TITLE', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'FORM',
]);

const GLOBAL_ATTRS: ReadonlySet<string> = new Set(['style', 'align', 'dir']);
const TAG_ATTRS: Readonly<Record<string, ReadonlySet<string>>> = {
  A: new Set(['href', 'target', 'rel', 'title']),
};

const ALLOWED_STYLE_PROPS: ReadonlySet<string> = new Set([
  'text-align', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line',
]);

/** Deliberately excludes `(` and `:` so `url(...)` and `expression(...)` cannot appear. */
const SAFE_STYLE_VALUE = /^[a-z0-9 ,.%#_-]+$/i;

/** Absolute http(s)/mail/tel links, in-page anchors, and relative paths. */
const SAFE_URL = /^(?:https?:\/\/|mailto:|tel:|#|\/(?!\/)|\.{0,2}\/)/i;

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

export function sanitizeRichText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  cleanChildren(doc.body);
  return doc.body.innerHTML;
}

/** Strips every tag, for placeholder/empty checks and plain text email fallbacks. */
export function richTextToPlainText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return (doc.body.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

function cleanChildren(parent: Element): void {
  // Snapshot first: the loop replaces and removes nodes as it goes.
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) continue;

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove(); // comments, processing instructions, CDATA
      continue;
    }

    const el = node as Element;

    // Foreign content (SVG, MathML) is the classic mutation-XSS vector: its parsing rules
    // differ from HTML, so markup can change meaning when this output is re-parsed on
    // insert. It also reports case-sensitive lowercase tag names, which would slip past
    // the uppercase sets below. Drop the whole subtree rather than try to clean it.
    if (el.namespaceURI !== HTML_NAMESPACE) {
      el.remove();
      continue;
    }

    const tag = el.tagName.toUpperCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      el.remove();
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      cleanChildren(el);
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    cleanAttributes(el);
    cleanChildren(el);
  }
}

function cleanAttributes(el: Element): void {
  const tag = el.tagName.toUpperCase();
  const tagAttrs = TAG_ATTRS[tag];

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();

    // Everything not explicitly allowed goes, which covers all `on*` handlers.
    if (!GLOBAL_ATTRS.has(name) && !tagAttrs?.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }

    if (name === 'style') {
      const safe = filterStyle(attr.value);
      if (safe) el.setAttribute('style', safe);
      else el.removeAttribute('style');
    } else if (name === 'href' && !SAFE_URL.test(attr.value.trim())) {
      el.removeAttribute('href');
    }
  }

  if (tag === 'A' && el.hasAttribute('target')) {
    // Only _blank is worth supporting, and it always needs the opener severed.
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
  }
}

function filterStyle(value: string): string {
  const declarations: string[] = [];

  for (const raw of value.split(';')) {
    const separator = raw.indexOf(':');
    if (separator < 0) continue;

    const prop = raw.slice(0, separator).trim().toLowerCase();
    const propValue = raw.slice(separator + 1).trim();

    if (ALLOWED_STYLE_PROPS.has(prop) && SAFE_STYLE_VALUE.test(propValue)) {
      declarations.push(`${prop}: ${propValue}`);
    }
  }

  return declarations.join('; ');
}
