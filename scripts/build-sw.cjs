const { generateSW } = require('workbox-build');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

(async () => {
  try {
    const { count, size, warnings } = await generateSW({
      globDirectory: dist,
      globPatterns: ['**/*.{html,js,css,svg,png,webmanifest,json}'],
      swDest: path.join(dist, 'sw.js'),
      navigateFallback: '/index.html',
      runtimeCaching: [
        {
          urlPattern: /\/api\/.*$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ],
      skipWaiting: true,
      clientsClaim: true,
    });
    if (warnings && warnings.length) console.warn('Workbox warnings:', warnings);
    console.log(`Generated sw.js, precached ${count} files, total ${size} bytes`);
  } catch (e) {
    console.error('Workbox generation failed', e && e.stack);
    process.exit(1);
  }
})();
