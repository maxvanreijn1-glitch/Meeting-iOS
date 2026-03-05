/**
 * VideoStream
 *
 * Thin wrapper around RTCView that applies consistent styling and
 * optional mirroring for the local camera preview.
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {RTCView} from 'react-native-webrtc';

function VideoStream({stream, style, mirror = false, muted = false}) {
  if (!stream) {
    return <View style={[styles.placeholder, style]} />;
  }

  return (
    <RTCView
      streamURL={stream.toURL()}
      style={[styles.video, style]}
      objectFit="cover"
      mirror={mirror}
      zOrder={muted ? 0 : 1}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    flex: 1,
    backgroundColor: '#111',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#222',
  },
});

export default VideoStream;
