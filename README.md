# Meeting — iOS

A React Native video-conferencing app for iOS.  
Users skip a landing page and jump directly into a meeting room via a share-able room code.

---

## Features

- **Direct join** — enter a room code and your name, no landing page
- **WebRTC video & audio** — peer-to-peer streams via `react-native-webrtc`
- **Camera controls** — mute/unmute, camera on/off, front/rear flip
- **Participant list** — see who's in the room; tap the room code to copy it
- **Signaling server** — lightweight Socket.io server included in `server/`

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| React Native CLI | latest |
| Xcode | ≥ 15 |
| CocoaPods | ≥ 1.14 |
| iOS Simulator / device | iOS ≥ 13.4 |

---

## Getting Started

### 1. Install JS dependencies

```bash
npm install
```

### 2. Install iOS native dependencies

```bash
cd ios && pod install && cd ..
```

### 3. Start the signaling server

```bash
cd server
npm install
npm start   # listens on port 3000
```

> **Physical device:** replace `localhost` with your machine's LAN IP in
> `src/utils/webrtc.js` (`SIGNALING_SERVER_URL`).

### 4. Run on iOS

```bash
npm run ios
# or open ios/MeetingIOS.xcworkspace in Xcode and press ▶
```

---

## Project Structure

```
Meeting-iOS/
├── App.js                     # Navigation root (no landing page)
├── index.js                   # React Native entry point
├── app.json                   # App name / display name
├── babel.config.js
├── metro.config.js
├── package.json
├── src/
│   ├── screens/
│   │   ├── JoinScreen.js      # Enter name + room code → join
│   │   └── MeetingRoom.js     # Live video room
│   ├── components/
│   │   ├── VideoStream.js     # RTCView wrapper
│   │   ├── Controls.js        # Mute / camera / flip / leave
│   │   └── ParticipantList.js # Horizontal participant strip
│   └── utils/
│       └── webrtc.js          # STUN config, signaling URL, room ID helper
├── server/
│   ├── index.js               # Socket.io signaling server
│   └── package.json
├── ios/
│   ├── Podfile
│   └── MeetingIOS/
│       ├── AppDelegate.h
│       ├── AppDelegate.mm
│       ├── main.m
│       └── Info.plist         # Camera & mic permissions, background modes
└── __tests__/
    ├── App-test.js
    └── webrtc-test.js
```

---

## iOS Permissions

The following usage descriptions are pre-configured in `ios/MeetingIOS/Info.plist`:

| Key | Purpose |
|-----|---------|
| `NSCameraUsageDescription` | Show your video to participants |
| `NSMicrophoneUsageDescription` | Transmit your audio |
| `NSLocalNetworkUsageDescription` | Low-latency LAN peer connections |

Background audio and VoIP modes are also enabled so calls continue when the app is backgrounded.

---

## Configuration

| Variable | File | Default |
|----------|------|---------|
| Signaling server URL | `src/utils/webrtc.js` → `SIGNALING_SERVER_URL` | `http://localhost:3000` |
| STUN servers | `src/utils/webrtc.js` → `STUN_SERVERS` | Google public STUN |

---

## Running Tests

```bash
npm test
```
