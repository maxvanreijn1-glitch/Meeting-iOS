/**
 * WebRTC utilities
 */

/**
 * Public STUN servers for ICE negotiation.
 */
export const STUN_SERVERS = [
  {urls: 'stun:stun.l.google.com:19302'},
  {urls: 'stun:stun1.l.google.com:19302'},
];

/**
 * Socket.io signaling server URL.
 * Override with your own server address in production.
 * For local development, run the signaling server on your machine and
 * use your machine's local IP address (not localhost) so that a real
 * iOS device or simulator can reach it.
 *
 * Example: 'http://192.168.1.10:3000'
 */
export const SIGNALING_SERVER_URL =
  process.env.SIGNALING_SERVER_URL ?? 'http://localhost:3000';

/**
 * Generate a random alphanumeric room ID.
 * @param {number} length - Length of the room ID (default: 8)
 * @returns {string}
 */
export function generateRoomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
