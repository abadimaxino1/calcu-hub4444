const esbuild = require('esbuild');
const path = require('path');

(async () => {
  try {
    await esbuild.build({
      entryPoints: [
        path.resolve(__dirname, '..', 'src', 'lib', 'workhours.ts'),
        path.resolve(__dirname, '..', 'src', 'lib', 'payroll.ts'),
        path.resolve(__dirname, '..', 'src', 'lib', 'eos.ts'),
        path.resolve(__dirname, '..', 'src', 'lib', 'dates.ts'),
      ],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outdir: path.resolve(__dirname, '..', '.tmp_build'),
      format: 'cjs',
      outExtension: { '.js': '.cjs' },
      sourcemap: false,
    });
    console.log('libs bundled to .tmp_build');
  } catch (e) {
    console.error('esbuild failed', e);
    process.exit(1);
  }
})();
