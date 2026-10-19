import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownView } from './MarkdownView';

const render = (value: string) => renderToStaticMarkup(createElement(MarkdownView, { value, strict: true }));

describe('MarkdownView strict (093)', () => {
  it('keeps ordinary markdown', () => {
    const html = render('**Sim**: a porta está *trancada*.\n\n- um\n- dois');
    expect(html).toContain('<strong>Sim</strong>');
    expect(html).toContain('<li>');
  });

  it('drops links and images but keeps their text', () => {
    const html = render('[clique aqui](https://evil.example/login) ![pixel](https://evil.example/p.png)');
    expect(html).not.toMatch(/<a\b/i);
    expect(html).not.toMatch(/<img\b/i);
    expect(html).not.toContain('evil.example');
    expect(html).toContain('clique aqui');
  });

  it('never renders raw HTML, scripts or handlers', () => {
    const html = render('<script>alert(1)</script>\n\n<img src="x" onerror="alert(2)">\n\n<a href="javascript:alert(3)">a</a>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/javascript:/i);
  });
});
