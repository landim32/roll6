import { describe, expect, it } from 'vitest';
import { buildShareText, markdownToWhatsApp } from './whatsappText';

describe('markdownToWhatsApp', () => {
  it('turns bold and italic into WhatsApp markers', () => {
    expect(markdownToWhatsApp('**a** e *b*')).toBe('*a* e _b_');
    expect(markdownToWhatsApp('__a__ e _b_')).toBe('*a* e _b_');
  });

  it('turns a heading into bold', () => {
    expect(markdownToWhatsApp('## Título')).toBe('*Título*');
  });

  it('drops images and HTML, keeps the text of a link', () => {
    expect(markdownToWhatsApp('veja ![x](u) aqui')).toBe('veja  aqui');
    expect(markdownToWhatsApp('<b>x</b>')).toBe('x');
    expect(markdownToWhatsApp('[ficha](https://roll6.site)')).toBe('ficha (https://roll6.site)');
  });

  it('rewrites bullet markers and keeps numbered lists, code and escapes', () => {
    expect(markdownToWhatsApp('* um\n+ dois\n1. três')).toBe('- um\n- dois\n1. três');
    expect(markdownToWhatsApp('use `*a*` assim')).toBe('use `*a*` assim');
    expect(markdownToWhatsApp('```\n**a**\n```')).toBe('```\n**a**\n```');
    expect(markdownToWhatsApp('não é \\*itálico\\*')).toBe('não é *itálico*');
  });

  it('collapses three or more newlines into one blank line', () => {
    expect(markdownToWhatsApp('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strikes text', () => {
    expect(markdownToWhatsApp('~~fora~~')).toBe('~fora~');
  });
});

describe('buildShareText', () => {
  it('is only the header when there is no narration', () => {
    expect(buildShareText({
      campaignName: 'Tormento Vil', mapName: 'Estrada 1', turnNo: null, narration: null,
    })).toBe('*Tormento Vil — Estrada 1*');
  });

  it('adds the turn and the converted narration', () => {
    expect(buildShareText({
      campaignName: 'Tormento Vil', mapName: 'Estrada 1', turnNo: 7, narration: '**Os heróis** avançam.',
    })).toBe('*Tormento Vil — Estrada 1*\n\nTurno 7\n\n*Os heróis* avançam.');
  });
});
