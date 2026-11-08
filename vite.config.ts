import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages のプロジェクトサイトは /<repo>/ 配下で配信される
const base = process.env.BASE_PATH ?? '/mushi-niwa/';

// 設定画面に出す 版の しるし（CI では コミットの 先頭 7 文字）
const appVersion = `${(process.env.APP_VERSION ?? process.env.GITHUB_SHA ?? 'local').slice(0, 7)} (${new Date().toISOString().slice(0, 10)})`;

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'むしにわ',
        short_name: 'むしにわ',
        description: 'いろいろな むしを おせわする 3D ゲーム',
        lang: 'ja',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#fdf6e3',
        theme_color: '#8bc34a',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // index.html は 先に 取りおきしない。ページを 開く・リロードする たびに まず ネットから 最新を 取り、
        // つながらない ときだけ 前に 開いた ページを 使う（オフラインでも 遊べる）。
        // js / css は ファイル名に ハッシュが 入るので 取りおきして よい。
        globPatterns: ['**/*.{js,css,svg,png,webmanifest}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mushi-niwa-pages',
              networkTimeoutSeconds: 4,
              // GitHub Pages の HTTP キャッシュ（10 分）も 使わず、毎回 サーバーに 確かめる
              fetchOptions: { cache: 'no-cache' },
              expiration: { maxEntries: 4 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/@react-three/') || id.includes('node_modules/postprocessing')) return 'r3f';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
});
