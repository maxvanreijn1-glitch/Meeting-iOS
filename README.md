# Meeting – iOS-Optimised Video Meeting App

A peer-to-peer video meeting app built with WebRTC, Node.js, and Socket.io, fully optimised for iOS Safari and installable as a Progressive Web App (PWA).

## Features

- **No landing page** – visiting `/` automatically generates a new room and redirects you straight in
- **WebRTC peer-to-peer video & audio** with automatic STUN negotiation
- **iOS-first design**
  - `viewport-fit=cover` + CSS `env(safe-area-inset-*)` for notch / home-indicator support
  - `playsinline` on all `<video>` elements (required for iOS autoplay)
  - `font-size: 16px` on all inputs (prevents iOS zoom on focus)
  - `-webkit-overflow-scrolling: touch` for momentum scroll in chat
  - Screen Wake Lock API to keep the display on during calls
- **Camera flip** (front ↔ back) using `facingMode` constraint – ideal for iPhone / iPad
- **Screen sharing** via `getDisplayMedia`
- **In-call chat** with unread badge
- **Invite via Web Share API** (iOS share sheet) with clipboard fallback
- **PWA manifest** – add to iOS home screen via Safari → Share → Add to Home Screen

## Getting Started

```bash
npm install
npm start        # http://localhost:3000
```

Open the URL on your iPhone or iPad. Safari will redirect you to a unique room. Share the link to invite others.

### Environment Variables

| Variable          | Default | Description                                                         |
|-------------------|---------|---------------------------------------------------------------------|
| `PORT`            | `3000`  | HTTP port                                                           |
| `ALLOWED_ORIGINS` | *(same origin)* | Comma-separated list of allowed CORS origins (e.g. `https://myapp.glitch.me`) |

## Project Structure

```
├── server.js          # Express + Socket.io signalling server
├── public/
│   ├── index.html     # Meeting UI (no separate landing page)
│   ├── style.css      # iOS-optimised styles
│   ├── client.js      # WebRTC + Socket.io client logic
│   ├── manifest.json  # PWA manifest
│   └── icons/         # App icons
└── package.json
```
