import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlanMarkdown } from './PlanMarkdown';

const FILE = '0123456789abcdef0123456789abcdef.png';
const URLS = { [FILE]: 'https://cdn.example/plan.png?sig=1' };

const render = (value: string) => renderToStaticMarkup(createElement(PlanMarkdown, { value, imageUrls: URLS }));

describe('PlanMarkdown', () => {
  it('shows plan images through their current URL, keeping the markdown', () => {
    const html = render(`# Capítulo\n\n![mapa](roll6-image:${FILE})`);
    expect(html).toContain('<h1');
    expect(html).toContain('src="https://cdn.example/plan.png?sig=1"');
    expect(html).not.toContain('roll6-image:');
  });

  it('drops unknown references', () => {
    expect(render('![x](roll6-image:ffffffffffffffffffffffffffffffff.png)')).not.toContain('roll6-image:');
  });

  it('never renders scripts, event handlers or javascript: links', () => {
    const html = render([
      '<script>alert(1)</script>',
      '<img src="x" onerror="alert(2)">',
      '[clique](javascript:alert(3))',
      '<a href="javascript:alert(4)">a</a>',
    ].join('\n\n'));
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it('keeps ordinary links and external images', () => {
    const html = render('[site](https://example.com) ![ext](https://example.com/a.png)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('src="https://example.com/a.png"');
  });
});
