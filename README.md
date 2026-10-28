# Lumora — candle catalogue

Site: https://yevhen-2012.github.io/lumora/
Repository: https://github.com/Yevhen-2012/lumora

Static catalogue migrated from the `e-comerce-cms` Webflow export and four CSV files. It preserves the exported design, local Geist fonts, responsive breakpoints and Webflow interactions.

## Local development

Node.js 24 or newer is required. No dependencies need to be installed.

```sh
npm run build
npm run check
npm start
```

The default local address is http://127.0.0.1:4174/. To preview the production files with the GitHub Pages subdirectory:

```sh
node scripts/serve.mjs --port=4175 --base=/lumora/ --dist
```

Open http://127.0.0.1:4175/lumora/.

## Content and assets

The site contains 53 HTML pages, 9 products with 25 variant rows, 6 collections, 6 articles and 4 journal categories. Product and article pages use the original slugs with `.html` extensions.

`source-export/` contains the original templates and `data/` contains the CMS exports. `scripts/build.mjs` generates the static pages. The asset map rewrites 65 public Webflow-hosted resources to local files in `assets/imported/`; the exported CSS, images, scripts and fonts also remain local. The original public CDN URLs are retained only in the source data/templates and the asset map for reproducibility.

After adding new remote Webflow images to the content, run the template build first and then `npm run prepare-media` once with network access. Normal builds and GitHub Actions use the checked-in files without downloading Webflow assets.

## Publication

GitHub Actions builds the catalogue, checks local links and resources, and deploys only `dist/` to GitHub Pages after a push to `main`. Source CSV files, original templates, build scripts and this README are available in the public repository but are excluded from the Pages artifact.

Pages uses relative links, so the site works under `/lumora/` and its nested product, category and journal routes.

## Catalogue behaviour

The site is a catalogue. Cart checkout, online payments, customer accounts and newsletter submissions are disabled. Product size selection and price/image updates work locally. The shop search filters product cards in the browser. These behaviours do not require Webflow CMS or a backend.

The catalogue is a static snapshot and does not automatically synchronize future Webflow changes.

