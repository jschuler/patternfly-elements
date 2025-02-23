import type { Plugin } from '@web/dev-server-core';
import type { DevServerConfig } from '@web/dev-server';
import type { InjectSetting } from '@web/dev-server-import-maps/dist/importMapsPlugin';
import type { Context, Next } from 'koa';

import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import rollupReplace from '@rollup/plugin-replace';
import nunjucks from 'nunjucks';
import _glob from 'glob';

import { litCss, type LitCSSOptions } from 'web-dev-server-plugin-lit-css';
import { fromRollup } from '@web/dev-server-rollup';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { importMapsPlugin } from '@web/dev-server-import-maps';
import { promisify } from 'node:util';

import Router from '@koa/router';
import { Manifest, type DemoRecord } from '../custom-elements-manifest/lib/Manifest.js';
import { makeDemoEnv } from '../environment.js';
import { getPfeConfig, deslugify, type PfeConfig } from '../config.js';

const glob = promisify(_glob);
const replace = fromRollup(rollupReplace);

const env = nunjucks
  .configure(dirname(fileURLToPath(import.meta.url)))
  .addFilter('log', x => (console.log(x, '')))
  .addFilter('deslugify', x => deslugify(x))
  .addFilter('isElementGroup', (group: DemoRecord[], primary) =>
    group.every(x => !!primary && x.primaryElementName === primary));

type Base = (DevServerConfig & PfeConfig);

export interface PfeDevServerConfigOptions extends Base {
  hostname?: string;
  importMap?: InjectSetting['importMap'];
  litcssOptions?: LitCSSOptions;
  tsconfig?: string;
  /** Extra dev server plugins */
  loadDemo?: boolean;
  plugins?: Plugin[];
  watchFiles?: string;
}

type PfeDevServerInternalConfig = Required<PfeDevServerConfigOptions> & { site: Required<PfeConfig['site']> };

function renderBasic(context: Context, demos: unknown[], options: PfeDevServerConfigOptions) {
  return env.render('index.html', { context, options, demos });
}

const isPFEManifest = (x: Manifest) => x.packageJson?.name === '@patternfly/elements';

/** cludge to ensure the dev server starts up only after the manifests are generated */
async function getManifests(options: PfeDevServerInternalConfig) {
  let count = 0;
  let manifests = Manifest.getAll(options.rootDir);
  while (count < 1000 && manifests.find(isPFEManifest)?.manifest === null) {
    await new Promise(r => setTimeout(r, 50));
    count++;
    manifests = Manifest.getAll(options.rootDir);
  }
  return manifests;
}

/**
 * Renders the demo page for a given url
 */
async function renderURL(context: Context, options: PfeDevServerInternalConfig): Promise<string> {
  const url = new URL(context.request.url, `http://${context.request.headers.host}`);
  const manifests = await getManifests(options);
  const demos = manifests
    .flatMap(manifest => manifest.getTagNames()
      .flatMap(tagName => manifest.getDemoMetadata(tagName, options as PfeDevServerInternalConfig)));
  const demo = demos.find(x => x.permalink === url.pathname);
  const manifest = demo?.manifest;

  if (!manifest || !demo || !demo.filePath || !existsSync(demo.filePath)) {
    return renderBasic(context, demos, options);
  } else {
    const templateContent = await readFile(demo.filePath, 'utf8');
    return env.render('index.html', { context, options, demo, demos, templateContent, manifest });
  }
}

/**
 * Generate HTML for each component by rendering a nunjucks template
 * Watch repository source files and reload the page when they change
 */
function pfeDevServerPlugin(options: PfeDevServerInternalConfig): Plugin {
  return {
    name: 'pfe-dev-server',
    async serverStart({ fileWatcher, app }) {
      const { elementsDir, tagPrefix, aliases } = options;
      const { componentSubpath } = options.site;

      const router =
        new Router()
          .get(/\/pf-icon\/icons\/.*\.js$/, (ctx, next) => {
            ctx.type = 'application/javascript';
            return next();
          })
          .get('/tools/pfe-tools/environment.js(.js)?', async ctx => {
            ctx.body = await makeDemoEnv(options.rootDir);
            ctx.type = 'application/javascript';
          })
          // Redirect `components/jazz-hands/*.js` to `components/pf-jazz-hands/*.ts`
          .get(`/${componentSubpath}/:element/:fileName.js`, async ctx => {
            const { element, fileName } = ctx.params;
            const prefixedElement = deslugify(element);

            ctx.redirect(`/${elementsDir}/${prefixedElement}/${fileName}.ts`);
          })
          // Redirect `elements/jazz-hands/*.js` to `elements/pf-jazz-hands/*.ts`
          .get(`/${elementsDir}/:element/:fileName.js`, async ctx => {
            const { element, fileName } = ctx.params;
            const prefixedElement = deslugify(element);

            ctx.redirect(`/${elementsDir}/${prefixedElement}/${fileName}.ts`);
          })
          // Redirect `components/pf-jazz-hands|jazz-hands/demo/*-lightdom.css` to `components/pf-jazz-hands/*-lightdom.css`
          // Redirect `components/jazz-hands/demo/*.js|css` to `components/pf-jazz-hands/demo/*.js|css`
          .get(`/${componentSubpath}/:element/demo/:demoSubDir?/:fileName.:ext`, async (ctx, next) => {
            const { element, fileName, ext } = ctx.params;
            const prefixedElement = deslugify(element);

            if (fileName.includes('-lightdom') && ext === 'css') {
              ctx.redirect(`/${elementsDir}/${prefixedElement}/${fileName}.${ext}`);
            } else if (!element.includes(tagPrefix)) {
              ctx.redirect(`/${elementsDir}/${prefixedElement}/demo/${fileName}.${ext}`);
            } else {
              return next();
            }
          })
          // Redirect `components/jazz-hands/*` to `components/pf-jazz-hands/*` for requests not previously handled
          .get(`/${componentSubpath}/:element/:splatPath*`, async (ctx, next) => {
            const { element, splatPath } = ctx.params;
            const prefixedElement = deslugify(element);

            if (splatPath.includes('demo')) {
              /* if its the demo directory return */
              return next();
            }
            if (!element.includes(tagPrefix)) {
              ctx.redirect(`/${elementsDir}/${prefixedElement}/${splatPath}`);
            } else {
              return next();
            }
          });
      app.use(router.routes());
      const files = await glob(options.watchFiles, { cwd: process.cwd() });
      for (const file of files) {
        fileWatcher.add(file);
      }
    }
  };
}

function normalizeOptions(options?: PfeDevServerConfigOptions): PfeDevServerInternalConfig {
  const config = { ...getPfeConfig(), ...options ?? {} };
  config.site = { ...config.site, ...options?.site ?? {} };
  config.loadDemo ??= true;
  config.watchFiles ??= '{elements,core}/**/*.{css,html}';

  config.litcssOptions ??= {
    include: /\.css$/,
    exclude: /(((fonts|demo)|(demo\/.*))\.css$)|(.*(-lightdom.css$))/
  };

  return config as PfeDevServerInternalConfig;
}

/** CORS middleware */
function cors(ctx: Context, next: Next) {
  ctx.set('Access-Control-Allow-Origin', '*');
  return next();
}

async function cacheBusterMiddleware(ctx: Context, next: Next) {
  await next();
  if (ctx.path.match(/elements\/[\w-]+\/[\w-]+.js$/)) {
    const lm = new Date().toString();
    const etag = Date.now().toString();
    ctx.response.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    ctx.response.set('Pragma', 'no-cache');
    ctx.response.set('Last-Modified', lm);
    ctx.response.etag = etag;
  }
}

// Render the demo page whenever there's a trailing slash
function nunjucksMiddleware(options: PfeDevServerInternalConfig) {
  return async function(ctx: Context, next: Next) {
    const { method, path } = ctx;
    if (options.loadDemo && !(method !== 'HEAD' && method !== 'GET' || path.includes('.'))) {
      ctx.cwd = process.cwd();
      ctx.type = 'html';
      ctx.status = 200;
      ctx.body = await renderURL(ctx, options);
    }
    return next();
  };
}

/**
 * Creates a default config for PFE's dev server.
 */
export function pfeDevServerConfig(options?: PfeDevServerConfigOptions): DevServerConfig {
  const config = normalizeOptions(options);

  /**
   * Plain case: this file is running from `/node_modules/@patternfly/pfe-tools`.
   *             two dirs up from here is `node_modules`, so we just shear it clean off the path string
   * Other case: this file is running in the `patternfly/patternfly-elements` monorepo
   *             two dirs up from here is the project root. There is no `/node_modules$` to replace,
   *             so we get the correct path
   * Edge/Corner cases: all other cases must set the `rootDir` option themselves so as to avoid 404s
   */
  const rootDir = options?.rootDir ?? fileURLToPath(new URL('../../..', import.meta.url))
    .replace(/node_modules\/$/, '/')
    .replace(/\/node_modules$/, '/')
    .replace('//', '/');

  const tsconfig = options?.tsconfig;

  return {
    rootDir,

    nodeResolve: true,

    ...options ?? {},

    middleware: [
      cors,
      cacheBusterMiddleware,
      nunjucksMiddleware(config),
      ...options?.middleware ?? [],
    ],

    plugins: [
      ...options?.plugins ?? [],

      ...options?.importMap ? [importMapsPlugin({ inject: { importMap: options.importMap } })] : [],

      // serve typescript sources as javascript
      esbuildPlugin({
        ts: true,
        tsconfig,
      }),

      replace({
        'preventAssignment': true,
        'process.env.NODE_ENV': '"production"',
      }),

      // load .css files as lit CSSResult modules
      litCss(config.litcssOptions),

      // Dev server app which loads component demo files
      pfeDevServerPlugin(config),
    ],
  };
}
