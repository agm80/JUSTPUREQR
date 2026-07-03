# QR Generator

A fast, fully client-side QR code generator — style it, brand it, export it, all in the browser.

**Live demo:** [justpureqr.netlify.app](https://justpureqr.netlify.app)

## Features

- **9 content types** — Text, URL, WiFi, vCard, Email, SMS, Phone, Location, and Calendar Event, each with a dedicated input form (no manual formatting required)
- **Custom styling** — dot style (square/rounded), corner style, 4 gradient types, custom colors, and 6 ready-made color presets
- **Logo embedding** — add a center logo; error correction automatically bumps to High when a logo is present, so the code stays scannable
- **Bulk generation** — generate up to 500 QR codes at once from a list, download as a zip
- **Export formats** — PNG, PNG at custom resolution (256–2048px), JPEG, SVG, PDF (via the browser's native print dialog), and native Share
- **History** — recent QR codes are saved locally (up to 50), with favoriting and export/import
- **Dark mode, keyboard shortcuts, installable PWA**
- 100% client-side — no backend, no data leaves your browser except what you choose to export/share

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS + Radix UI primitives
- [`qrcode`](https://www.npmjs.com/package/qrcode) for encoding, with a custom canvas renderer for styling (gradients, dot/corner shapes, logo overlay)
- `jszip` for bulk zip export

## Project structure

This is a pnpm workspace monorepo. The QR generator itself is a self-contained app with **no backend dependency**:

```
artifacts/
  qr-generator/     ← the actual deployed app (this is what you want)
  mockup-sandbox/   ← local UI sandbox, not part of the deployed site
```

Everything you need to run or modify the app lives under `artifacts/qr-generator/`.

## Getting started

```bash
# Install dependencies (from the repo root)
pnpm install

# Run the dev server
pnpm --filter @workspace/qr-generator run dev

# Type-check
pnpm --filter @workspace/qr-generator run typecheck

# Production build
pnpm --filter @workspace/qr-generator run build
```

The production build outputs to `artifacts/qr-generator/dist/public/` — this is the folder to deploy (e.g. drag-and-drop to Netlify, or point any static host at it).

## Deploying

The included `netlify.toml` is already configured with the correct build command and publish directory (`artifacts/qr-generator/dist/public`). Connect the repo to Netlify, or build locally/via CI and drag the output folder to [Netlify Drop](https://app.netlify.com/drop).

## Contributing

Issues and pull requests are welcome. If you're adding a feature, please keep the app's core principle in mind: **everything runs client-side, no backend required.**

## License

MIT — see [LICENSE](./LICENSE).
