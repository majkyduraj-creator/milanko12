import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { missingFields, renderTemplate } from './build/template';
import { getSite } from './site.config';
import { contactNodeHandler } from './server/node-adapter';

export default defineConfig(({ mode }) => {
  // Načíta .env (aj premenné bez prefixu VITE_) – tie sa však do klienta NEDOSTANÚ.
  const fileEnv = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(fileEnv)) process.env[k] ??= v;
  const site = getSite();

  const siteTemplate: Plugin = {
    name: 'site-template',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => renderTemplate(html, site),
    },
    buildStart() {
      const missing = missingFields(site);
      if (missing.length) {
        this.warn(`Chýbajúce údaje v site.config.ts (zobrazia sa ako zástupný text): ${missing.join(', ')}`);
      }
    },
  };

  // Lokálny /api/contact pre `vite dev` a `vite preview` (v produkcii to rieši api/contact.ts).
  const contactApi: Plugin = {
    name: 'contact-api',
    configureServer(server) {
      server.middlewares.use('/api/contact', (req, res) => void contactNodeHandler(req, res, process.env));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/contact', (req, res) => void contactNodeHandler(req, res, process.env));
    },
  };

  return {
    plugins: [siteTemplate, contactApi],
    define: {
      // Do prehliadača ide iba tento verejný výber údajov – nikdy nie API kľúče.
      __SITE__: JSON.stringify({ email: site.email, testimonials: site.testimonials }),
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          privacy: resolve(__dirname, 'ochrana-osobnych-udajov.html'),
        },
      },
    },
  };
});
