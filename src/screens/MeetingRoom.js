/**
 * MeetingRoom
 *
 * Core meeting screen. Manages local/remote video streams via WebRTC,
 * handles peer signalling over Socket.io, and exposes in-call controls.
 */

import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  Alert,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';
import {io} from 'socket.io-client';

import VideoStream from '../components/VideoStream';
import Controls from '../components/Controls';
import ParticipantList from '../components/ParticipantList';
import {STUN_SERVERS, SIGNALING_SERVER_URL} from '../utils/webrtc';

const PC_CONFIG = {iceServers: STUN_SERVERS};

function MeetingRoom({route, navigation}) {
  const {roomId, displayName} = route.params;

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [participants, setParticipants] = useState([]);

  // ─── Media setup ────────────────────────────────────────────────────
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          frameRate: {ideal: 30},
          width: {ideal: 1280},
          height: {ideal: 720},
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      Alert.alert(
        'Camera/Mic Error',
        'Could not access camera or microphone. Please check permissions in Settings.',
      );
      return null;
    }
  }, []);

  // ─── Peer connection helpers ─────────────────────────────────────────
  const createPeerConnection = useCallback(
    peerId => {
      const pc = new RTCPeerConnection(PC_CONFIG);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.ontrack = event => {
        const [stream] = event.streams;
        setRemoteStreams(prev => {
          const exists = prev.find(s => s.streamId === stream.id);
          if (exists) return prev;
          return [...prev, {peerId, streamId: stream.id, stream}];
        });
      };

      pc.onicecandidate = event => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', {
            to: peerId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setRemoteStreams(prev => prev.filter(s => s.peerId !== peerId));
          delete peerConnectionsRef.current[peerId];
        }
      };

      peerConnectionsRef.current[peerId] = pc;
      return pc;
    },
    [],
  );

  // ─── Signaling ───────────────────────────────────────────────────────
  useEffect(() => {
    let socket;

    const init = async () => {
      const stream = await startLocalStream();
      if (!stream) return;

      socket = io(SIGNALING_SERVER_URL, {transports: ['websocket']});
      socketRef.current = socket;

      socket.emit('join-room', {roomId, displayName});

      socket.on('participants', list => setParticipants(list));

      socket.on('user-joined', async ({peerId, name}) => {
        setParticipants(prev => [...prev, {peerId, name}]);
        const pc = createPeerConnection(peerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', {to: peerId, offer});
      });

      socket.on('offer', async ({from, offer}) => {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', {to: from, answer});
      });

      socket.on('answer', async ({from, answer}) => {
        const pc = peerConnectionsRef.current[from];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on('ice-candidate', async ({from, candidate}) => {
        const pc = peerConnectionsRef.current[from];
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on('user-left', ({peerId}) => {
        setParticipants(prev => prev.filter(p => p.peerId !== peerId));
        setRemoteStreams(prev => prev.filter(s => s.peerId !== peerId));
        const pc = peerConnectionsRef.current[peerId];
        if (pc) {
          pc.close();
          delete peerConnectionsRef.current[peerId];
        }
      });
    };

    init();

    return () => {
      socket?.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    };
  }, [roomId, displayName, startLocalStream, createPeerConnection]);

  // ─── Hardware back button (Android) ──────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmLeave();
      return true;
    });
    return () => subscription.remove();
  }, [confirmLeave]);

  // ─── Controls ────────────────────────────────────────────────────────
  const confirmLeave = useCallback(() => {
    Alert.alert('Leave Meeting', 'Are you sure you want to leave?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Leave', style: 'destructive', onPress: () => navigation.goBack()},
    ]);
  }, [navigation]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(prev => !prev);
    }
  }, []);

  const flipCamera = useCallback(() => {
    if (localStreamRef.current) {
      // react-native-webrtc exposes _switchCamera() on video tracks as the
      // canonical way to toggle front/rear camera.  It is an intentional part
      // of the library's public surface even though the underscore prefix may
      // suggest otherwise — see https://github.com/react-native-webrtc/react-native-webrtc
      localStreamRef.current.getVideoTracks().forEach(track => {
        track._switchCamera();
      });
      setIsFrontCamera(prev => !prev);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoArea}>
        {/* Remote participants */}
        {remoteStreams.map(({streamId, stream}) => (
          <VideoStream key={streamId} stream={stream} style={styles.remoteVideo} />
        ))}

        {/* Local preview (picture-in-picture) */}
        {localStream && (
          <VideoStream
            stream={localStream}
            style={styles.localVideo}
            mirror={isFrontCamera}
            muted
          />
        )}
      </View>

      <ParticipantList
        participants={participants}
        localName={displayName}
        roomId={roomId}
      />

      <Controls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isFrontCamera={isFrontCamera}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onFlipCamera={flipCamera}
        onLeave={confirmLeave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoArea: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 90,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e94560',
    zIndex: 10,
  },
});

export default MeetingRoom;
