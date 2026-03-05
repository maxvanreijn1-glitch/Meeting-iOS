import {generateRoomId} from '../src/utils/webrtc';

describe('generateRoomId', () => {
  it('returns a string of the default length (8)', () => {
    const id = generateRoomId();
    expect(typeof id).toBe('string');
    expect(id).toHaveLength(8);
  });

  it('returns a string of the requested length', () => {
    expect(generateRoomId(12)).toHaveLength(12);
    expect(generateRoomId(4)).toHaveLength(4);
  });

  it('only contains alphanumeric characters', () => {
    const id = generateRoomId(50);
    expect(/^[A-Za-z0-9]+$/.test(id)).toBe(true);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({length: 100}, () => generateRoomId()));
    // With 62^8 possibilities, 100 IDs should all be unique
    expect(ids.size).toBe(100);
  });
});
