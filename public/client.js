/* global */
'use strict';

// ── Configuration ──────────────────────────────────────────────────────────
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

// ── State ───────────────────────────────────────────────────────────────────
const roomId = window.location.pathname.split('/room/')[1];
let localStream = null;
let screenStream = null;
let displayName = 'Guest';
let audioEnabled = true;
let videoEnabled = true;
let isFrontCamera = true;
let unreadMessages = 0;

/** @type {Map<string, RTCPeerConnection>} socketId → peer connection */
const peers = new Map();

/** @type {Map<string, HTMLElement>} socketId → video tile */
const tiles = new Map();

const socket = io();

// ── DOM refs ────────────────────────────────────────────────────────────────
const joinScreen = document.getElementById('join-screen');
const meetingRoom = document.getElementById('meeting-room');
const videoGrid = document.getElementById('video-grid');
const participantCountEl = document.getElementById('participant-count-num');
const roomDisplay = document.getElementById('room-display');

const joinBtn = document.getElementById('join-btn');
const inviteBtn = document.getElementById('invite-btn');
const displayNameInput = document.getElementById('display-name-input');
const previewVideo = document.getElementById('preview-video');
const previewMicBtn = document.getElementById('preview-mic-btn');
const previewCamBtn = document.getElementById('preview-cam-btn');

const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const shareBtn = document.getElementById('share-btn');
const chatBtn = document.getElementById('chat-btn');
const flipBtn = document.getElementById('flip-btn');
const leaveBtn = document.getElementById('leave-btn');

const chatPanel = document.getElementById('chat-panel');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatBadge = document.getElementById('chat-badge');

const toastContainer = document.getElementById('toast-container');

// ── Helpers ──────────────────────────────────────────────────────────────────

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function updateGridClass() {
  const count = tiles.size;
  videoGrid.className = '';
  if (count === 2) videoGrid.classList.add('peers-2');
  else if (count === 3 || count === 4) videoGrid.classList.add('peers-3');
  else if (count > 4) videoGrid.classList.add('peers-many');
  participantCountEl.textContent = count;
}

// ── Camera / mic preview ─────────────────────────────────────────────────────

async function startPreview() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
    previewVideo.srcObject = localStream;
  } catch (err) {
    console.warn('Camera/mic not available:', err);
    toast('Camera or microphone not available');
  }
}

function stopPreview() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
}

// Preview mic toggle
let previewAudio = true;
previewMicBtn.addEventListener('click', () => {
  previewAudio = !previewAudio;
  if (localStream) {
    localStream.getAudioTracks().forEach(t => { t.enabled = previewAudio; });
  }
  previewMicBtn.classList.toggle('muted', !previewAudio);
  audioEnabled = previewAudio;
});

// Preview camera toggle
let previewCam = true;
previewCamBtn.addEventListener('click', () => {
  previewCam = !previewCam;
  if (localStream) {
    localStream.getVideoTracks().forEach(t => { t.enabled = previewCam; });
  }
  previewCamBtn.classList.toggle('muted', !previewCam);
  videoEnabled = previewCam;
  updateLocalAvatar();
});

// ── Video tile creation ──────────────────────────────────────────────────────

function createTile(socketId, name, stream, isLocal = false) {
  const tile = document.createElement('div');
  tile.className = 'video-tile' + (isLocal ? ' local' : '');
  tile.dataset.socketId = socketId;

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true; // critical for iOS!
  if (isLocal) video.muted = true;
  if (stream) video.srcObject = stream;

  const nameTag = document.createElement('div');
  nameTag.className = 'name-tag';
  nameTag.textContent = name + (isLocal ? ' (You)' : '');

  const muteIcon = document.createElement('div');
  muteIcon.className = 'mute-icon';
  muteIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3 3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20H9v2h6v-2h-2v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  const initials = document.createElement('div');
  initials.className = 'initials';
  initials.textContent = getInitials(name);
  const avName = document.createElement('div');
  avName.className = 'av-name';
  avName.textContent = name;
  avatar.appendChild(initials);
  avatar.appendChild(avName);

  tile.appendChild(video);
  tile.appendChild(nameTag);
  tile.appendChild(muteIcon);
  tile.appendChild(avatar);

  videoGrid.appendChild(tile);
  tiles.set(socketId, tile);
  updateGridClass();

  return tile;
}

function removeTile(socketId) {
  const tile = tiles.get(socketId);
  if (tile) {
    tile.remove();
    tiles.delete(socketId);
    updateGridClass();
  }
}

function updateLocalAvatar() {
  const localTile = tiles.get('local');
  if (!localTile) return;
  const avatar = localTile.querySelector('.avatar');
  const video = localTile.querySelector('video');
  if (!videoEnabled) {
    avatar.classList.add('visible');
    video.style.display = 'none';
  } else {
    avatar.classList.remove('visible');
    video.style.display = '';
  }
}

// ── WebRTC peer connections ───────────────────────────────────────────────────

function createPeerConnection(remoteSocketId) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // Add local tracks
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('ice-candidate', { to: remoteSocketId, candidate });
    }
  };

  pc.ontrack = ({ streams }) => {
    const tile = tiles.get(remoteSocketId);
    if (tile && streams[0]) {
      tile.querySelector('video').srcObject = streams[0];
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') {
      pc.restartIce();
    }
  };

  peers.set(remoteSocketId, pc);
  return pc;
}

async function callPeer(remoteSocketId) {
  const pc = createPeerConnection(remoteSocketId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('offer', { to: remoteSocketId, offer });
}

// ── Socket event handlers ────────────────────────────────────────────────────

socket.on('existing-peers', async (existingPeers) => {
  for (const peer of existingPeers) {
    createTile(peer.socketId, peer.displayName, null);
    await callPeer(peer.socketId);
  }
});

socket.on('peer-joined', ({ socketId, displayName: peerName }) => {
  toast(`${peerName} joined`);
  createTile(socketId, peerName, null);
});

socket.on('offer', async ({ from, offer }) => {
  const pc = createPeerConnection(from);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('answer', { to: from, answer });
});

socket.on('answer', async ({ from, answer }) => {
  const pc = peers.get(from);
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async ({ from, candidate }) => {
  const pc = peers.get(from);
  if (pc) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('ICE candidate error:', e);
    }
  }
});

socket.on('peer-left', ({ socketId }) => {
  const tile = tiles.get(socketId);
  const name = tile ? tile.querySelector('.name-tag').textContent : 'Someone';
  removeTile(socketId);
  const pc = peers.get(socketId);
  if (pc) { pc.close(); peers.delete(socketId); }
  toast(`${name} left`);
});

socket.on('peer-media-state', ({ socketId, audioEnabled: ae, videoEnabled: ve }) => {
  const tile = tiles.get(socketId);
  if (!tile) return;
  const muteIcon = tile.querySelector('.mute-icon');
  const avatar = tile.querySelector('.avatar');
  const video = tile.querySelector('video');

  muteIcon.classList.toggle('visible', !ae);

  if (!ve) {
    avatar.classList.add('visible');
    video.style.display = 'none';
  } else {
    avatar.classList.remove('visible');
    video.style.display = '';
  }
});

socket.on('chat-message', ({ socketId, displayName: sender, message, timestamp }) => {
  addChatMessage(socketId, sender, message, socketId === socket.id, timestamp);

  // Badge counter when chat is closed
  if (chatPanel.classList.contains('hidden') && socketId !== socket.id) {
    unreadMessages++;
    chatBadge.textContent = unreadMessages;
    chatBadge.classList.remove('hidden');
  }
});

// ── Join flow ────────────────────────────────────────────────────────────────

roomDisplay.textContent = roomId;
startPreview();

joinBtn.addEventListener('click', async () => {
  displayName = displayNameInput.value.trim() || 'Guest';

  // Ensure we have media (may have failed earlier)
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      localStream = null;
    }
  }

  joinScreen.classList.add('hidden');
  meetingRoom.classList.remove('hidden');

  // Create local tile
  createTile('local', displayName, localStream, true);

  socket.emit('join-room', {
    roomId,
    peerId: socket.id,
    displayName
  });

  // Broadcast initial media state
  socket.emit('media-state', { roomId, audioEnabled, videoEnabled });

  // Keep screen on during meeting
  requestWakeLock();
});
inviteBtn.addEventListener('click', () => {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: 'Join my meeting', url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => toast('Link copied!')).catch(() => {
      prompt('Copy the invite link:', url);
    });
  }
});

// ── In-meeting controls ───────────────────────────────────────────────────────

micBtn.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  if (localStream) {
    localStream.getAudioTracks().forEach(t => { t.enabled = audioEnabled; });
  }
  micBtn.classList.toggle('muted', !audioEnabled);
  micBtn.classList.toggle('active', audioEnabled);
  micBtn.querySelector('.icon-mic-on').classList.toggle('hidden', !audioEnabled);
  micBtn.querySelector('.icon-mic-off').classList.toggle('hidden', audioEnabled);
  socket.emit('media-state', { roomId, audioEnabled, videoEnabled });
});

camBtn.addEventListener('click', () => {
  videoEnabled = !videoEnabled;
  if (localStream) {
    localStream.getVideoTracks().forEach(t => { t.enabled = videoEnabled; });
  }
  camBtn.classList.toggle('muted', !videoEnabled);
  camBtn.classList.toggle('active', videoEnabled);
  camBtn.querySelector('.icon-cam-on').classList.toggle('hidden', !videoEnabled);
  camBtn.querySelector('.icon-cam-off').classList.toggle('hidden', videoEnabled);
  updateLocalAvatar();
  socket.emit('media-state', { roomId, audioEnabled, videoEnabled });
});

// Screen share
shareBtn.addEventListener('click', async () => {
  if (screenStream) {
    // Stop sharing
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    shareBtn.classList.remove('active');

    // Restore camera
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        peers.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
      }
    }
    toast('Screen share stopped');
  } else {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      shareBtn.classList.add('active');

      const screenTrack = screenStream.getVideoTracks()[0];
      peers.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => {
        shareBtn.click(); // auto-stop
      };

      toast('Sharing screen');
    } catch (err) {
      if (err.name !== 'NotAllowedError') toast('Screen share failed');
    }
  }
});

// Flip camera (iOS front/back switch)
flipBtn.addEventListener('click', async () => {
  if (!localStream) return;
  isFrontCamera = !isFrontCamera;

  const constraints = {
    video: {
      facingMode: isFrontCamera ? 'user' : 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  try {
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    const newVideoTrack = newStream.getVideoTracks()[0];

    // Replace track in all peer connections
    peers.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(newVideoTrack);
    });

    // Update local stream
    localStream.getVideoTracks().forEach(t => t.stop());
    localStream.removeTrack(localStream.getVideoTracks()[0]);
    localStream.addTrack(newVideoTrack);

    // Update local tile video
    const localTile = tiles.get('local');
    if (localTile) {
      localTile.querySelector('video').srcObject = localStream;
    }

    // Mirror only front camera
    const localVideo = tiles.get('local')?.querySelector('video');
    if (localVideo) {
      localVideo.style.transform = isFrontCamera ? 'scaleX(-1)' : 'none';
    }
  } catch (err) {
    toast('Could not switch camera');
    isFrontCamera = !isFrontCamera; // revert
  }
});

// Leave
leaveBtn.addEventListener('click', () => {
  // Stop all media
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  if (screenStream) screenStream.getTracks().forEach(t => t.stop());

  // Close all peer connections
  peers.forEach(pc => pc.close());
  peers.clear();

  socket.disconnect();
  window.location.href = '/';
});

// ── Chat ─────────────────────────────────────────────────────────────────────

chatBtn.addEventListener('click', () => {
  chatPanel.classList.toggle('hidden');
  if (!chatPanel.classList.contains('hidden')) {
    unreadMessages = 0;
    chatBadge.classList.add('hidden');
    chatInput.focus();
  }
});

closeChatBtn.addEventListener('click', () => chatPanel.classList.add('hidden'));

function sendMessage() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit('chat-message', { roomId, message: msg, displayName });
  chatInput.value = '';
}

sendChatBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function addChatMessage(socketId, sender, message, isOwn, timestamp) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg' + (isOwn ? ' own' : '');

  const name = document.createElement('div');
  name.className = 'msg-name';
  const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  name.textContent = sender + (time ? ` · ${time}` : '');

  const text = document.createElement('div');
  text.className = 'msg-text';
  text.textContent = message;

  msg.appendChild(name);
  msg.appendChild(text);
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── iOS-specific: keep screen awake if WakeLock API available ──────────────
let wakeLock = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch { /* not critical */ }
  }
}

document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

