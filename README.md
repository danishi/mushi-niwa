# むしにわ（mushi-niwa）

いろいろな昆虫をお世話する、子ども向けの 3D ブラウザゲームです。スマホ・iPad 向け。PWA としてホーム画面に追加でき、オフラインでも遊べます。

▶ https://danishi.github.io/mushi-niwa/

- 広告・課金・外部トラッキングなし。データは端末の中だけに保存します。
- 虫のモデル・音はすべてプログラムで生成しています（外部アセットなし）。

```bash
npm ci
npm run dev   # http://localhost:5173/mushi-niwa/
npm test
npm run build && npm run e2e
```

開発方針は [CLAUDE.md](CLAUDE.md) を参照してください。
