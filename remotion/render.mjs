// Render the DashboardDemo composition to WebM for the landing page.
// Usage: node remotion/render.mjs

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const main = async () => {
  console.log('Bundling Remotion project...');
  const bundled = await bundle({
    entryPoint: join(__dirname, 'index.ts'),
    // Disable Next.js webpack config interference
    webpackOverride: (config) => config,
  });

  console.log('Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'DashboardDemo',
  });

  const webmPath = join(__dirname, '..', 'public', 'dashboard-demo.webm');
  const mp4Path = join(__dirname, '..', 'public', 'dashboard-demo.mp4');

  console.log(`Rendering WebM to ${webmPath}...`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'vp8',
    outputLocation: webmPath,
  });
  console.log('WebM done!');

  console.log(`Rendering MP4 to ${mp4Path}...`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: mp4Path,
  });
  console.log('MP4 done!');

  console.log('Both videos saved to public/');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
