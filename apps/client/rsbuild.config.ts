import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSolid } from '@rsbuild/plugin-solid';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

// Load .env only when SERVER is not set in the environment
if (!process.env.SERVER) {
  dotenv.config({ path: resolve(process.cwd(), '.env') });
}

export default defineConfig({
  plugins: [
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
    }),
    pluginSolid(),
  ],
  html: {
    template: './src/index.html',
  },
  source: {
    entry: {
      index: './src/index.tsx',
    },
    define: {
      'process.env.SERVER': JSON.stringify(process.env.SERVER ?? ''),
    },
  },
});