/**
 * ParticipantList
 *
 * Horizontal strip showing connected participants and the current room ID.
 * Tapping the room ID copies it to the clipboard so users can share it.
 */

import React, {useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

function ParticipantList({participants, localName, roomId}) {
  const allParticipants = [{name: `${localName} (You)`, isLocal: true}, ...participants];

  const copyRoomId = useCallback(() => {
    Clipboard.setString(roomId);
    Alert.alert('Copied', `Room code "${roomId}" copied to clipboard.`);
  }, [roomId]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={copyRoomId} accessibilityLabel="Copy room code">
        <Text style={styles.roomId}>Room: {roomId} 📋</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {allParticipants.map((p, index) => (
          <View key={p.peerId ?? index} style={styles.participant}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(p.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roomId: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  participant: {
    alignItems: 'center',
    marginRight: 16,
    maxWidth: 64,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  name: {
    fontSize: 11,
    color: '#ccc',
    textAlign: 'center',
  },
});

export default ParticipantList;
