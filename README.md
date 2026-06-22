# CircuitMentor AI

CircuitMentor AI turns a beginner's dream electronics, robotics, IoT, automation, or computer-vision project into a personalized learning roadmap.

The app interviews the learner, adapts to their budget and existing parts, generates four genuinely different paths, and provides lessons, direct videos, quizzes, purchasing guidance, and safety gates.

## Highlights

- Four distinct roadmap engines: Optimal, Fastest, Lowest-Cost, and Deep Learning
- Personalized board and part selection that prioritizes owned hardware
- 737-resource learning library
- Direct embedded videos instead of YouTube search pages
- In-product lesson summaries instead of web-search exits
- Step-specific quizzes with teaching feedback
- Missing-parts planning and comparison links
- Human-review safety gates for batteries, motors, high current, and uncertain wiring
- Context-aware mentor chatbot and progress-image preview
- Responsive light and dark themes with saved preference

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- Git, if you want to clone or publish the project

The project has no runtime npm dependencies.

## Install and run

```bash
git clone https://github.com/YOUR-USERNAME/circuitmentor-ai.git
cd circuitmentor-ai
npm install
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

For a different port:

```bash
PORT=3000 npm start
```

PowerShell:

```powershell
$env:PORT=3000
npm start
```

## Production build

```bash
npm run build
```

The deployable static website will be created in `dist/`.

## Publish to a GitHub repository

1. Create an empty repository on GitHub.
2. Extract this package and open a terminal inside the `circuitmentor-ai` folder.
3. Run:

```bash
git init
git add .
git commit -m "Initial CircuitMentor AI release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/circuitmentor-ai.git
git push -u origin main
```

## Publish with GitHub Pages

Because the application is static and uses relative asset paths, it can run directly from GitHub Pages.

1. Push the project files so `index.html` is at the repository root.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.
5. Save and wait for GitHub to provide the public URL.

## Project structure

```text
circuitmentor-ai/
├── index.html
├── styles.css
├── app.js
├── roadmaps.js
├── server.mjs
├── package.json
├── package-lock.json
├── lib/
│   ├── circuitmentor_resource_library_expanded.js
│   └── verified_video_matches.js
└── scripts/
    └── build.mjs
```

## Important safety note

CircuitMentor AI provides educational guidance. It does not certify wiring as safe. Batteries, motors, soldering, high-current circuits, wall power, and unclear wiring should always be reviewed by a qualified or experienced person before power is applied.

## License

MIT — see [LICENSE](./LICENSE).
