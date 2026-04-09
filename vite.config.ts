import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'escape-non-ascii',
          apply: 'build',
          closeBundle() {
            const assetsDir = path.resolve(__dirname, 'dist/assets');
            if (!fs.existsSync(assetsDir)) return;
            for (const file of fs.readdirSync(assetsDir)) {
              if (!file.endsWith('.js')) continue;
              const filePath = path.join(assetsDir, file);
              const content = fs.readFileSync(filePath, 'utf-8');
              const escaped = content.replace(/[^\x00-\x7F]/g, (char) => {
                const cp = char.codePointAt(0)!;
                return cp > 0xFFFF
                  ? `\\u{${cp.toString(16)}}`
                  : `\\u${cp.toString(16).padStart(4, '0')}`;
              });
              fs.writeFileSync(filePath, escaped, 'utf-8');
            }
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
