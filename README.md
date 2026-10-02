# WhereYouHurt

WhereHurt is a small, experimental reference tool for exploring body areas, pain descriptions, and visible signs through a 3D anatomy viewer. It was built to test Codex dot and is intentionally lightweight: the interface runs in the browser, the matching rules are local JSON, and there is no remote inference service.

The results are rule-based references, not medical diagnoses. Do not use this project to make clinical decisions. Seek professional care for severe, persistent, rapidly worsening, or neurologic symptoms.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

The included GitHub Actions workflow builds and deploys `dist/` to GitHub Pages when enabled for the repository.

## What is included

- React, Vite, Three.js, and React Three Fiber
- Skeleton, muscle, and nervous-system viewing layers
- Bilingual English/Chinese interface
- Local weighted matching from `data/knowledge.json`
- Light/dark display modes and touch-friendly controls

## Anatomy assets and attribution

The viewer loads the following public GLB assets from [Anatria-3D](https://github.com/Nurkan1/Anatria-3D/tree/main/public/anatomy):

- `skeletal_male.glb`
- `muscular_male.glb`
- `nervous_male.glb`

Anatria-3D identifies these files as derived from Z-Anatomy / BodyParts3D and distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Attribution and license information are recorded in [`NOTICE`](NOTICE). If you redistribute the anatomy assets or modified versions, review and follow the upstream license terms.

## Scope and limitations

This repository contains a prototype, not a validated medical product. The percentages shown in the interface are relative scores produced by local rules; they are not probabilities. Anatomy assets are loaded from the upstream GitHub repository at runtime, so the viewer requires network access for the 3D models even though the matching data is local.

## Contributing

Small fixes and clear issue reports are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## License

Original source code and project documentation are licensed under the MIT License; see [`LICENSE`](LICENSE). Third-party dependencies and anatomy assets retain their own licenses.

## Installable web app

The production build includes a lightweight Progressive Web App shell. Open the deployed site in a modern browser and use its **Install app / Add to Home Screen** action. The shell, manifest, and local matching data can load offline after the first visit; anatomy GLB models are still fetched from the upstream CDN and require connectivity the first time each layer is opened. This is a web PWA, not an APK or native mobile package.
