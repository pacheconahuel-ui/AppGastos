import { defineConfig } from 'vitest/config';

// Solo las pruebas de lógica; las de navegador (e2e/) las corre Playwright
export default defineConfig({ test: { include: ['tests/**/*.test.js'] } });
