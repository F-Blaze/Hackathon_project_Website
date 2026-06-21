# CircuitMentor AI

A self-contained, responsive website for personalized beginner hardware mentoring.

## Run locally

From PowerShell:

```powershell
.\start.ps1
```

Then open `http://127.0.0.1:4173`.

The site is static and has no backend dependency. It must be served over HTTP because the roadmap and 737-resource library use native JavaScript modules.

## Key implementation files

- `app.js` — intake, interface, lessons, quizzes, shopping, safety, and contextual chatbot
- `roadmaps.js` — four separate roadmap generators and personalization logic
- `lib/circuitmentor_resource_library_expanded.js` — supplied Ultra resource library
- `styles.css` — light/dark theme and responsive product design

