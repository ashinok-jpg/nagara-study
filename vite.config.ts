import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages では https://<ユーザー名>.github.io/<リポジトリ名>/ に置かれるので、相対パスで出力する
  base: './',
  plugins: [react()],
  server: { fs: { allow: ['.'] } },
  // 同梱の教材（約390KB）を含むため、1ファイルが500KBを超える。教材が本体なので警告の上限を上げる
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
