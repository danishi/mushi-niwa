import { describe, expect, it } from 'vitest';
import { parseRuby, toPlain, toReading } from './ruby';

describe('ruby markup', () => {
  it('converts to reading for speech', () => {
    expect(toReading('{森|もり}に かえそう')).toBe('もりに かえそう');
  });
  it('converts to plain text', () => {
    expect(toPlain('{森|もり}に かえそう')).toBe('森に かえそう');
  });
  it('parses segments', () => {
    expect(parseRuby('あ{木|き}い')).toEqual(['あ', { base: '木', yomi: 'き' }, 'い']);
  });
});
