import { Fragment, type ReactNode } from 'react';

/**
 * 文言は「ひらがな中心＋漢字には {漢字|よみ} 記法でルビ」で書く。
 *   例: "{森|もり}に かえそう"
 * - <Ruby> で <ruby> 要素に展開する
 * - toReading() で読み上げ用のひらがな文字列にする
 */
const RE = /\{([^|}]+)\|([^}]+)\}/g;

export function toReading(text: string): string {
  return text.replace(RE, (_m, _base: string, yomi: string) => yomi);
}

export function toPlain(text: string): string {
  return text.replace(RE, (_m, base: string) => base);
}

export function parseRuby(text: string): Array<string | { base: string; yomi: string }> {
  const out: Array<string | { base: string; yomi: string }> = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push({ base: m[1]!, yomi: m[2]! });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Ruby({ text }: { text: string }): ReactNode {
  return (
    <>
      {parseRuby(text).map((p, i) =>
        typeof p === 'string' ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <ruby key={i}>
            {p.base}
            <rp>(</rp>
            <rt>{p.yomi}</rt>
            <rp>)</rp>
          </ruby>
        ),
      )}
    </>
  );
}
