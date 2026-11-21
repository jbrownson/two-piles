# Two Piles of State

An interactive article that introduces the ideas behind Puri and deui. It is
one self-contained web page of plain HTML, CSS and JavaScript, with no
dependencies and no build tools beyond a shell script.

## Building

    sh build.sh

writes `out/two-piles.html`, the page as it is published as an Artifact,
`out/preview.html`, the same page wrapped so a browser can open it from disk,
and `out/index.html`, the page as a document of its own.
`sh build.sh <file> [title]` writes the page somewhere else, under another
title if one is given.

## On the web

Every push to `main` builds the page and publishes `out/index.html` with
GitHub Pages, at https://jbrownson.github.io/two-piles/. The workflow is
`.github/workflows/pages.yml`.

## Sources

- `src/head.html`, `src/body.html`: the page. The body holds the text and one
  empty `<div class="fig" data-fig="...">` for each figure. Boxes headed
  "To write" are outlines for prose still to come.
- `src/style.css`: all of the styling. Each figure has its own layout, as one
  grid per figure, and below 1000px wide every figure becomes a single stack.
- `src/js/`: the script, in files that `build.sh` joins in name order.
  - `00-util.js`: small helpers.
  - `10-live.js`: `LiveFig`, what every figure shares. It builds the stage
    (the two piles, the window, the disk), draws an arrow from each line of
    code that ran to what it touched, keeps the log, and runs the player:
    the script, the slider, reset and the switches.
  - `20-dom.js`: retained mode and the top figure. Real text boxes with
    hand-written handlers.
  - `30-react.js`: React. Rerun the view, compare the old tree with the new
    one, write the differences.
  - `40-kit.js`: a small toolkit whose widgets draw themselves and keep
    nothing, and the three figures built on it: immediate mode, Puri, deui.
  - `50-proof.js`: the "why now" diagram.
  - `90-boot.js`: plays each figure once when it scrolls into view.

### How a figure works

Each figure is a small working app, called its machine. The machine holds its
own state and handles input. When something runs, it tells the figure which
lines of code ran and what each one touched, and the figure draws the arrows.

All figures play the same six-step script. The script has no effects of its
own: each step calls the same handler a reader's click or key would reach,
so using a figure by hand and playing it leave it in the same state. The
slider works by resetting the machine and replaying the script up to the
chosen moment.

## Tests

The tests need Node and Playwright with Chromium. They drive the built page
in a headless browser, in real time, which is why they are slow.

    sh build.sh
    node tests/run.js            # everything, about 15 minutes
    node tests/run.js --quick    # play-through at desktop size only, about 10 minutes
    node tests/run.js log reset  # only the named tests

`tests/run.js` lists what each test checks.

## Tools

- `node tools/look.js <figure> <steps>` saves a picture of one figure at
  chosen steps of its script into `out/shots/`.
- `node tools/pictures.js <dir>` takes about 200 reference pictures of the
  page. Take a set before a change that should not alter anything on screen
  and a set after, then run `node tools/pictures.js --compare <dir> <dir>`.
