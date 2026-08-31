import React from 'react';

/**
 * Renders the light Markdown that the AI writes into job and company
 * descriptions.
 *
 * The generator is asked for "markdown headings or lists" (aiService), but
 * every screen displayed the result as raw text, so readers saw literal
 * `### About the Role` and `**Senior Backend Developer**` on the page.
 *
 * This is a deliberately small parser rather than a Markdown library:
 *  - no new dependency to install on the server before a deploy;
 *  - it builds React elements instead of HTML, so there is no
 *    dangerouslySetInnerHTML and nothing an employer types can inject;
 *  - it covers exactly the subset the model actually emits.
 *
 * Text with no Markdown in it still renders correctly — blank-line separated
 * paragraphs, which reads better than the old pre-line block.
 */

/** Inline pass: **bold**, *italic*, _italic_, `code`, and bare links. */
const renderInline = (text, keyPrefix, depth = 0) => {
  const parts = [];
  // One regex, alternated, so the pieces are consumed left to right and a
  // `**` never gets eaten by the single-asterisk italic branch. The bold
  // branch is non-greedy and tolerates inner asterisks, so a phrase like
  // `**Bold with *inner* text**` is matched whole and then parsed again.
  //
  // Underscore emphasis (_x_, __x__) is deliberately NOT supported. Job and
  // company text contains far more identifiers — snake_case_names, __init__,
  // file_name.pdf — than italics, and treating those as emphasis mangled
  // them. The model writes ** and * anyway.
  const pattern = /(\*\*[^\n]+?\*\*|\*[^*\n]+\*|`[^`\n]+`|https?:\/\/[^\s<>()]+)/g;

  let last = 0;
  let m;
  let i = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-i${i++}`;

    if (tok.startsWith('**')) {
      const inner = tok.slice(2, -2);
      parts.push(
        <strong key={key} className="font-semibold text-text-primary">
          {depth < 2 ? renderInline(inner, key, depth + 1) : inner}
        </strong>,
      );
    } else if (tok.startsWith('`')) {
      parts.push(
        <code key={key} className="px-1.5 py-0.5 rounded bg-bg-elevated border border-border-subtle text-[.9em] font-mono">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith('http')) {
      parts.push(
        <a
          key={key}
          href={tok}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-deep underline underline-offset-2 hover:text-brand-green transition-colors break-words"
        >
          {tok.replace(/^https?:\/\//, '')}
        </a>,
      );
    } else {
      parts.push(<em key={key}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
};

const BULLET = /^\s*([-*+•])\s+(.*)$/;
const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])\1{2,}\s*$/;

const headingClass = (level) => {
  // Descriptions sit inside a card that already owns the page's h2, so these
  // stay visually subordinate no matter which level the model picked.
  if (level <= 2) return 'font-display text-xl font-semibold text-text-primary mt-7 first:mt-0 mb-2.5';
  if (level === 3) return 'font-bold text-base text-brand-deep mt-7 first:mt-0 mb-2.5';
  return 'font-semibold text-[15px] text-text-primary mt-5 first:mt-0 mb-1.5';
};

const RichText = ({ children, className = '' }) => {
  const source = typeof children === 'string' ? children : '';
  if (!source.trim()) return null;

  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let list = null;      // { ordered: bool, items: string[] }
  let para = [];        // buffered plain lines

  const flushList = () => {
    if (!list) return;
    const key = `l${blocks.length}`;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={key} className="flex flex-col gap-2 my-3.5 pl-1">
        {list.items.map((item, n) => (
          <li key={`${key}-${n}`} className="flex gap-2.5">
            {list.ordered ? (
              <span className="shrink-0 mt-px w-5 text-right font-semibold text-brand-deep tabular-nums">
                {n + 1}.
              </span>
            ) : (
              <span className="shrink-0 mt-[.6em] w-1.5 h-1.5 rounded-full bg-brand-green" />
            )}
            <span className="min-w-0">{renderInline(item, `${key}-${n}`)}</span>
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };

  const flushPara = () => {
    if (!para.length) return;
    const key = `p${blocks.length}`;
    blocks.push(
      <p key={key} className="my-3 first:mt-0 last:mb-0">
        {renderInline(para.join(' '), key)}
      </p>,
    );
    para = [];
  };

  const flushAll = () => { flushList(); flushPara(); };

  for (const raw of lines) {
    if (!raw.trim()) { flushAll(); continue; }

    if (RULE.test(raw)) {
      flushAll();
      blocks.push(<hr key={`r${blocks.length}`} className="my-6 border-border-subtle" />);
      continue;
    }

    const h = raw.match(HEADING);
    if (h) {
      flushAll();
      // Always an h3 in the document: the surrounding card owns the h2, and
      // emitting h5-before-h4 (which the model's mix of ## and ### would do)
      // is a heading-order fault for screen readers. Depth changes the look,
      // not the level.
      const key = `h${blocks.length}`;
      blocks.push(
        <h3 key={key} className={headingClass(h[1].length)}>
          {renderInline(h[2], key)}
        </h3>,
      );
      continue;
    }

    const b = raw.match(BULLET);
    if (b) {
      flushPara();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(b[2]);
      continue;
    }

    const o = raw.match(ORDERED);
    if (o) {
      flushPara();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(o[2]);
      continue;
    }

    // A plain line that follows a bullet is a continuation of that bullet.
    if (list && /^\s{2,}\S/.test(raw)) {
      list.items[list.items.length - 1] += ` ${raw.trim()}`;
      continue;
    }

    flushList();
    para.push(raw.trim());
  }

  flushAll();

  return <div className={className}>{blocks}</div>;
};

export default RichText;
