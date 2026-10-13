# Wardrobe AI

A digital wardrobe. Photograph your clothes, and the app cuts each item out of
its background, detects its colour, and builds outfits from what you own.

- **My Wardrobe**: a three-column grid of your items, filterable by type.
- **Add Item**: take a photo with your webcam or upload one, then tag its type,
  fit and pattern. The background is removed and the colour detected for you.
- **Outfit Generator**: one button that builds a new outfit each time and adds
  it to a feed, with the reasons it works.

## How outfits are chosen

The style engine ([frontend/src/style/engine.ts](frontend/src/style/engine.ts))
runs in the browser and applies four rules:

| Rule        | What it enforces                                             |
| ----------- | ------------------------------------------------------------ |
| Fit         | An oversized top is never paired with an oversized bottom.   |
| Layering    | Tops are the base, mid layers go over them, outerwear over both. Nothing oversized goes under a tighter layer. |
| Colour      | Every pair of pieces must be compatible on a colour matrix. Neutrals go with anything. |
| Focal point | At most one graphic or patterned piece per outfit.           |

## Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite. Background removal uses
  [rembg](https://github.com/danielgatis/rembg) running locally, so no API key
  or cloud account is needed.
- **Frontend**: React, TypeScript, Vite.

## Running it

Requires [uv](https://docs.astral.sh/uv/) and Node.js.

```sh
cd frontend && npm install && cd ..
./dev.sh
```

This starts the API on port 8000 and opens the app at http://localhost:5173.
The first start downloads the background removal model (about 176 MB).

### On a phone

With the phone on the same Wi-Fi as the computer, open the `Network` address that
`./dev.sh` prints (for example `http://192.168.1.20:5173`) in Safari or Chrome.
"Use camera" opens the phone's own camera app there, because browsers only allow a
live in-page preview on https or localhost.

## Tests

```sh
cd backend && uv run pytest
cd frontend && npm test
```

## Configuration

Settings are read from environment variables or `backend/.env`, prefixed with
`WARDROBE_`. Set `WARDROBE_SECRET_KEY` to a long random value before deploying
anywhere other than your own machine.
