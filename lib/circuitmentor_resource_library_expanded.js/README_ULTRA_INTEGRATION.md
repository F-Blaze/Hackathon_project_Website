# CircuitMentor Ultra Resource Library

This is a drop-in replacement for your existing Replit file:

`lib/circuitmentor_resource_library_expanded.js`

## Counts
- Previous mega resources included: 284
- New ultra resources added: 453
- Total resources: 737

## Install
1. Delete the old `lib/circuitmentor_resource_library_expanded.js`.
2. Upload the new `circuitmentor_resource_library_expanded.js` from this package.
3. Keep the same filename and location:

```text
lib/circuitmentor_resource_library_expanded.js
```

Your existing import should still work:

```js
import { findResourcesForStep } from '../lib/circuitmentor_resource_library_expanded';
```

## Use
For every roadmap step:

```js
const resources = findResourcesForStep(step, userProfile, 4);
```

Recommended userProfile fields:

```js
{
  userName,
  dreamProject,
  learningPreferences, // array: ['videos', 'hands-on projects', 'written guides']
  selectedPathType,
  recommendedBoard,
  skillLevel,
  budget,
  existingParts,
  mentorAccess
}
```

## Extra helper functions
This file exports:
- `resourceLibrary`
- `findResourcesForStep(step, userProfile, minCount)`
- `getYouTubeEmbedUrl(url)`
- `getResourceSummary(resource, step, userProfile)`
- `getPurchaseLinksForPart(partName)`
- `makeYouTubeSearchUrl(query)`
- `makeGoogleSearchUrl(query)`
- `makeShoppingSearchUrl(site, query)`

## Recommended prompt for Replit Agent

Tell Replit Agent:

> I replaced `lib/circuitmentor_resource_library_expanded.js` with the new Ultra resource library. Keep the same import, but update the UI to use `findResourcesForStep(step, userProfile, 4)` for every roadmap step. Use `getYouTubeEmbedUrl` to embed exact YouTube videos when possible, `getResourceSummary` to show simplified written-guide summaries, and `getPurchaseLinksForPart` for missing parts in the cart. No roadmap step should appear without resources.
