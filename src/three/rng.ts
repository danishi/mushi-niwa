/** 種（seed）から 決まる 乱数。同じ 種なら いつも 同じ 並びに なる */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
