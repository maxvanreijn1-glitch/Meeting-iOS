/**
 * Controls
 *
 * In-call control bar: mute, camera toggle, camera flip, and leave.
 * Uses accessible TouchableOpacity buttons with icon-style emoji labels
 * (replace with a proper icon library such as react-native-vector-icons
 * once the full iOS build environment is configured).
 */

import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';

function Controls({
  isMuted,
  isCameraOff,
  isFrontCamera,
  onToggleMute,
  onToggleCamera,
  onFlipCamera,
  onLeave,
}) {
  return (
    <View style={styles.bar}>
      <ControlButton
        label={isMuted ? '🔇' : '🎤'}
        accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
        onPress={onToggleMute}
        active={!isMuted}
      />
      <ControlButton
        label={isCameraOff ? '📷' : '📸'}
        accessibilityLabel={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        onPress={onToggleCamera}
        active={!isCameraOff}
      />
      <ControlButton
        label="🔄"
        accessibilityLabel={isFrontCamera ? 'Switch to rear camera' : 'Switch to front camera'}
        onPress={onFlipCamera}
        active
      />
      <ControlButton
        label="📵"
        accessibilityLabel="Leave meeting"
        onPress={onLeave}
        danger
      />
    </View>
  );
}

function ControlButton({label, accessibilityLabel, onPress, active = true, danger = false}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        !active && styles.buttonInactive,
        danger && styles.buttonDanger,
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button">
      <Text style={styles.icon}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a2e',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInactive: {
    backgroundColor: '#444',
  },
  buttonDanger: {
    backgroundColor: '#e94560',
  },
  icon: {
    fontSize: 26,
  },
});

export default Controls;
