# SWOP Wordle

A custom Wordle-style word challenge game. Pick a word, send the link to friends, and see who guesses it in fewer tries.

**Built by [SWOP Labs](https://swop.trade) · Riccardo Dana**

---

## Features

- Choose 4, 5, or 6 letter words
- Set your own secret word + optional hint
- Generates a shareable URL — no backend needed (word encoded in URL hash)
- Green / Yellow / Gray tile color feedback
- On-screen keyboard with live letter state
- Emoji result grid to paste in group chats
- Mobile-friendly dark UI

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## How it works

The secret word and hint are base64-encoded directly into the URL hash. No server, no database — just a link.

## Build

```bash
npm run build
```

Output goes to `dist/` — deploy anywhere (Vercel, Netlify, GitHub Pages).

## License

MIT © 2026 Riccardo Dana / SWOP Labs
