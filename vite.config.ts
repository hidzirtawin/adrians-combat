import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { networkInterfaces } from 'node:os';
import { squadServer } from './server/squadPlugin.mjs';

function lanDomains(): string[] {
  const domains = new Set(['localhost', '127.0.0.1']);
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) domains.add(address.address);
    }
  }
  return [...domains];
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    squadServer(),
    ...(mode === 'https' ? [basicSsl({ name: 'adrians-combat', domains: lanDomains() })] : []),
  ],
  server: {
    host: true,
    // Over HTTPS on a phone, a hot update reloads the tab without warning and
    // wipes the run. Production/phone mode should be stable instead.
    hmr: mode === 'https' ? false : undefined,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
  },
}));
