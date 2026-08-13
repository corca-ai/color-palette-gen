# Operator Acceptance

## Read first

1. `readme.md` for scope and limitations.
2. `docs/v2-spec.md` and `docs/v2-decisions/README.md` for the current palette
   contract and decision evidence.
3. `docs/collaboration.md` for the public-repository boundary.

## Local acceptance

Use the Node version declared by `.node-version`, then run:

```sh
npm ci
npx playwright install chromium
npm run check
npm run build
npm run check:e2e:smoke
```

The check, build, and browser smoke commands are the baseline acceptance path.
For palette-policy changes, broad UI changes, or release confidence, also run
`npm run check:full`. Linux CI provisions system browser dependencies with
`npx playwright install --with-deps chromium`.

Acceptance is complete when the relevant checks pass, generated output contains
no internal sensitive information, and public-source versus private/internal
evidence is identified without copying private content into the repository.
The build's automated public-artifact scan catches known deterministic markers;
human review remains required for sensitive meaning that does not match a
machine-readable pattern.

## Deployment and operations

- GitHub Actions deploys the static build to public GitHub Pages from main. Public artifacts must contain no internal sensitive information or non-public resource content.

Before merging to `main`, review the built `dist/` artifact and the Git diff for
secrets, internal URLs, private identifiers, private screenshots, and claims
whose evidence cannot be published. After merge, confirm the GitHub Pages
workflow succeeds and smoke-test the public v2 and v1 URLs linked from
`readme.md`.

## Remaining human judgment

- Confirm palette quality in representative UI states; automated contrast and
  gamut checks do not establish production suitability.
- Confirm that any internally informed decision is expressed generically and
  that its public rationale stands without access to private material.
