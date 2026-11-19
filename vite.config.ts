import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { host: true },
  build: { outDir: 'dist', target: 'es2020' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
