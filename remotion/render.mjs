// Render the DashboardDemo composition to WebM for the landing page.
// Usage: node remotion/render.mjs [scale]
//   scale is a device-pixel-ratio multiplier on the 720x480 composition.
//   1 = 720x480, 2 = 1440x960 (default), 3 = 2160x1440.

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const scale = Number(process.argv[2] ?? 2);

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

  console.log(
    `Rendering at scale ${scale} (${composition.width * scale}x${composition.height * scale})`,
  );

  const webmPath = join(__dirname, '..', 'public', 'dashboard-demo.webm');
  const mp4Path = join(__dirname, '..', 'public', 'dashboard-demo.mp4');

  // PNG frames keep 1px borders and small text lossless before encoding;
  // JPEG (the default) softens them noticeably on UI content.
  const shared = {
    composition,
    serveUrl: bundled,
    scale,
    imageFormat: 'png',
  };

  console.log(`Rendering WebM to ${webmPath}...`);
  await renderMedia({
    ...shared,
    codec: 'vp8',
    crf: 6, // vp8 range 4-63, default 9. Lower = higher quality.
    outputLocation: webmPath,
  });
  console.log('WebM done!');

  console.log(`Rendering MP4 to ${mp4Path}...`);
  await renderMedia({
    ...shared,
    codec: 'h264',
    crf: 16, // h264 range 1-51, default 18. Lower = higher quality.
    x264Preset: 'slow',
    outputLocation: mp4Path,
  });
  console.log('MP4 done!');

  console.log('Both videos saved to public/');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
