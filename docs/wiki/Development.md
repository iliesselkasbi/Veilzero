# Development

## Requirements

- Node.js 20
- npm

## Local setup

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Camera and microphone access requires `localhost`
or HTTPS. The install hook copies the MediaPipe runtime assets into the ignored
`public/mediapipe/` directory; do not commit generated copies.

## Checks

Run these before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run build
```

GitHub Actions runs the same checks for pull requests targeting `main` and
pushes to `main`.

## Project structure

- `src/app/`: Next.js routes and shared styles.
- `src/components/`: reusable page and interface components.
- `src/hooks/`: browser capability and interaction hooks.
- `src/lib/`: media, metadata, and processing logic.
- `public/`: static assets; generated MediaPipe files are ignored.

Preserve the client-side processing model. Changes involving camera, microphone,
or user files should clearly explain data flow, permissions, and failure
behavior.
