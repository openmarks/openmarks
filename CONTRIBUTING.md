# Contributing to Openmarks

Thanks for helping. Openmarks is a side project, worked on in spare time, so a reply can take a week or two. A slow
reply isn't a no.

## Where things go

- **Questions and ideas** go to [Discussions](https://github.com/openmarks/openmarks/discussions).
- **Bugs** go to [Issues](https://github.com/openmarks/openmarks/issues/new/choose), using the bug form.
- **Security problems** are reported privately: see [SECURITY.md](SECURITY.md).

## Before you write code

- Small fixes (a typo, an obvious bug, a broken layout) can go straight to a pull request.
- Anything bigger (a new feature or setting, a new dependency, a change to how something looks or works) needs an
  issue or discussion first, and a yes, before you start. It saves you writing code that can't be merged.
- Issues labelled `good first issue` or `help wanted` are ready to pick up. Comment on one so nobody else starts it.

## What Openmarks won't do

Openmarks stays simple and private. Requests for these are closed:

- accounts, sign-in or sync of its own (your browser's bookmark sync already does this)
- analytics, telemetry, ads or sponsored tiles
- keeping tiles anywhere but your browser's bookmarks
- new permissions, unless a feature can't work without them and it was agreed first

## Set up

You need Node 22 and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up).

```sh
pnpm install
pnpm --filter @openmarks/extension build -b firefox   # or leave out -b firefox for Chrome
```

Load the build into a browser:

- **Firefox:** open `about:debugging`, then This Firefox › Load Temporary Add-on, and pick
  `apps/extension/.output/firefox-mv3/manifest.json`.
- **Chrome:** open `chrome://extensions`, turn on Developer mode, then Load unpacked, and pick
  `apps/extension/.output/chrome-mv3`.

Where things live:

- `apps/extension`: the extension itself (manifest, background script, new tab page)
- `modules/dial`: the dial, search and settings you see on the new tab (Svelte 5)
- `packages/core`, `packages/module-sdk`: shared code, MIT-licensed
- `feed`: the daily photo feed

The website is in its own repository, [openmarks/openmarks.github.io](https://github.com/openmarks/openmarks.github.io).

## Before you open a pull request

Run the checks the CI runs:

```sh
pnpm typecheck
pnpm test
pnpm --filter @openmarks/extension build -b firefox
pnpm --filter @openmarks/extension build
```

Then:

- Keep it to one change. Under about 400 changed lines gets reviewed quickest.
- For anything you can see, add screenshots in light and dark mode, and say which browsers you tried it in.
- Write the pull request title as a [Conventional Commit](https://www.conventionalcommits.org/), for example
  `fix(dial): keep tiles in place after a drag`. Pull requests are squashed, so the title becomes the commit
  message on `main`, and `feat` and `fix` titles end up in the changelog.
- Leave the version number and the changelog alone; releases update them.
- Using AI tools is fine, but you are responsible for what you submit: understand it and test it.

By contributing, you agree that your work is released under the project's licence: GPL-3.0-or-later, or MIT for
`packages/*`.

## Releases

A release pull request stays open and collects the changes merged since the last release. Merging it tags the
version, writes the changelog and attaches the built extension to a GitHub release. The maintainer then uploads that
build to the browser stores.

## How decisions are made

Openmarks has one maintainer, who makes the final call on what goes in. People who contribute well over time may be
asked to help triage issues and review pull requests.

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).
