/**
 * JoinScreen
 *
 * Direct meeting join interface — users enter a room code and their name
 * to join or create a meeting. No landing page; this is the app's first screen.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {generateRoomId} from '../utils/webrtc';

function JoinScreen({navigation}) {
  const [roomId, setRoomId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    const trimmedRoom = roomId.trim();
    const trimmedName = displayName.trim();

    if (!trimmedRoom) {
      Alert.alert('Room Required', 'Please enter a room code to join.');
      return;
    }
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter your display name.');
      return;
    }

    setIsJoining(true);
    try {
      navigation.navigate('MeetingRoom', {
        roomId: trimmedRoom,
        displayName: trimmedName,
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreate = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={styles.appTitle}>Meeting</Text>
          <Text style={styles.subtitle}>Secure video meetings</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="#666"
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={50}
            />

            <Text style={styles.label}>Room Code</Text>
            <View style={styles.roomRow}>
              <TextInput
                style={[styles.input, styles.roomInput]}
                value={roomId}
                onChangeText={setRoomId}
                placeholder="Enter room code"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="join"
                onSubmitEditing={handleJoin}
                maxLength={20}
              />
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleCreate}
                accessibilityLabel="Generate new room code">
                <Text style={styles.generateButtonText}>New</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
              onPress={handleJoin}
              disabled={isJoining}
              accessibilityLabel="Join meeting">
              {isJoining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinButtonText}>Join Meeting</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  appTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  roomRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roomInput: {
    flex: 1,
  },
  generateButton: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#e94560',
    fontWeight: '600',
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default JoinScreen;
