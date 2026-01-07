// ============================================================================
// VIDEO CHAT MODULE - WebRTC P2P Video Chat
// ============================================================================
// Implementa video chat 1-a-1 usando WebRTC con señalización via Firestore
// Basado en arquitectura peer-to-peer con STUN servers gratuitos
//
// Características:
// - Video chat 1-a-1 en tiempo real
// - Audio bidireccional
// - Compartir pantalla (opcional)
// - Controles: mute, video on/off, colgar
// - Señalización via Firestore
// - Reconexión automática
// ============================================================================

import { getDb } from './firebase-config-env.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// ============================================================================
// CONFIGURACIÓN WEBRTC
// ============================================================================

const ICE_SERVERS = {
  iceServers: [
    // Google STUN servers (gratuitos)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },

    // Mozilla STUN servers
    { urls: 'stun:stun.services.mozilla.com' },

    // Twilio STUN (gratuito)
    { urls: 'stun:global.stun.twilio.com:3478' }

    // TODO: Para producción, agregar TURN servers
    // Recomendado: Twilio, Metered.ca, o self-hosted coturn
    // {
    //   urls: 'turn:YOUR_TURN_SERVER:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ],
  iceCandidatePoolSize: 10
};

// ============================================================================
// VIDEO CHAT CLASS
// ============================================================================

export class VideoChat {
  constructor(conversationId, currentUserId, remoteUserId) {
    this.conversationId = conversationId;
    this.currentUserId = currentUserId;
    this.remoteUserId = remoteUserId;

    // WebRTC
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;

    // Firestore listeners
    this.unsubscribeOffer = null;
    this.unsubscribeAnswer = null;
    this.unsubscribeIceCandidates = null;

    // Estado
    this.isCallActive = false;
    this.isMuted = false;
    this.isVideoOff = false;
    this.isScreenSharing = false;

    // Callbacks
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.onError = null;
    this.onStatusChange = null;
  }

  // ==========================================================================
  // INICIAR LLAMADA (CALLER)
  // ==========================================================================

  async startCall(localVideoElement, remoteVideoElement) {
    try {
      this.updateStatus('Iniciando llamada...');

      // 1. Obtener stream local (cámara + micrófono)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 2. Mostrar video local
      localVideoElement.srcObject = this.localStream;

      // 3. Crear peer connection
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // 4. Agregar tracks locales al peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // 5. Preparar stream remoto
      this.remoteStream = new MediaStream();
      remoteVideoElement.srcObject = this.remoteStream;

      // 6. Escuchar tracks remotos
      this.peerConnection.ontrack = event => {
        event.streams[0].getTracks().forEach(track => {
          this.remoteStream.addTrack(track);
        });
        this.updateStatus('Conectado');
        if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
      };

      // 7. Escuchar ICE candidates
      this.peerConnection.onicecandidate = event => {
        if (event.candidate) {
          this.addIceCandidate('caller', event.candidate.toJSON());
        }
      };

      // 8. Escuchar estado de conexión
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);

        if (this.peerConnection.connectionState === 'connected') {
          this.isCallActive = true;
          this.updateStatus('Conectado');
        } else if (this.peerConnection.connectionState === 'disconnected') {
          this.updateStatus('Desconectado');
          this.endCall();
        } else if (this.peerConnection.connectionState === 'failed') {
          this.updateStatus('Fallo de conexión');
          this.handleError(new Error('Fallo de conexión WebRTC'));
        }
      };

      // 9. Crear offer
      this.updateStatus('Creando oferta...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // 10. Guardar offer en Firestore
      const callDoc = {
        type: 'offer',
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        caller: this.currentUserId,
        callee: this.remoteUserId,
        status: 'calling',
        createdAt: serverTimestamp()
      };

      const db = await getDb();
      const callRef = doc(db, 'conversations', this.conversationId, 'calls', 'current');

      await setDoc(
        callRef,
        callDoc
      );

      // 11. Escuchar answer
      this.listenForAnswer();

      // 12. Escuchar ICE candidates remotos
      this.listenForRemoteIceCandidates('callee');

      this.updateStatus('Llamando...');

      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  // ==========================================================================
  // RESPONDER LLAMADA (CALLEE)
  // ==========================================================================

  async answerCall(localVideoElement, remoteVideoElement, offerData) {
    try {
      this.updateStatus('Respondiendo llamada...');

      // 1. Obtener stream local
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 2. Mostrar video local
      localVideoElement.srcObject = this.localStream;

      // 3. Crear peer connection
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // 4. Agregar tracks locales
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // 5. Preparar stream remoto
      this.remoteStream = new MediaStream();
      remoteVideoElement.srcObject = this.remoteStream;

      // 6. Escuchar tracks remotos
      this.peerConnection.ontrack = event => {
        event.streams[0].getTracks().forEach(track => {
          this.remoteStream.addTrack(track);
        });
        this.updateStatus('Conectado');
        if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
      };

      // 7. Escuchar ICE candidates
      this.peerConnection.onicecandidate = event => {
        if (event.candidate) {
          this.addIceCandidate('callee', event.candidate.toJSON());
        }
      };

      // 8. Escuchar estado de conexión
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);

        if (this.peerConnection.connectionState === 'connected') {
          this.isCallActive = true;
          this.updateStatus('Conectado');
        } else if (this.peerConnection.connectionState === 'disconnected') {
          this.updateStatus('Desconectado');
          this.endCall();
        } else if (this.peerConnection.connectionState === 'failed') {
          this.updateStatus('Fallo de conexión');
          this.handleError(new Error('Fallo de conexión WebRTC'));
        }
      };

      // 9. Set remote description (offer)
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offerData.offer)
      );

      // 10. Crear answer
      this.updateStatus('Creando respuesta...');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      const db = await getDb();
      const callRef = doc(db, 'conversations', this.conversationId, 'calls', 'current');

      // 11. Guardar answer en Firestore
      await updateDoc(
        callRef,
        {
          answer: {
            type: answer.type,
            sdp: answer.sdp
          },
          status: 'connected',
          answeredAt: serverTimestamp()
        }
      );

      // 12. Escuchar ICE candidates remotos
      this.listenForRemoteIceCandidates('caller');

      this.isCallActive = true;
      this.updateStatus('Conectado');

      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  // ==========================================================================
  // SEÑALIZACIÓN VIA FIRESTORE
  // ==========================================================================

  async listenForAnswer() {
    const db = await getDb();
    const callRef = doc(db, 'conversations', this.conversationId, 'calls', 'current');

    this.unsubscribeAnswer = onSnapshot(callRef, async snapshot => {
      const data = snapshot.data();

      if (data && data.answer && !this.peerConnection.currentRemoteDescription) {
        this.updateStatus('Respuesta recibida...');

        const answerDescription = new RTCSessionDescription(data.answer);
        await this.peerConnection.setRemoteDescription(answerDescription);

        this.updateStatus('Conectando...');
      }
    });
  }

  async addIceCandidate(type, candidate) {
    const candidatesCollection = collection(
      db,
      'conversations',
      this.conversationId,
      'calls',
      'current',
      `${type}Candidates`
    );

    await addDoc(candidatesCollection, candidate);
  }

  listenForRemoteIceCandidates(type) {
    const candidatesCollection = collection(
      db,
      'conversations',
      this.conversationId,
      'calls',
      'current',
      `${type}Candidates`
    );

    this.unsubscribeIceCandidates = onSnapshot(candidatesCollection, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.peerConnection.addIceCandidate(candidate);
        }
      });
    });
  }

  // ==========================================================================
  // CONTROLES DE LLAMADA
  // ==========================================================================

  toggleMute() {
    if (!this.localStream) return;

    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });

    return this.isMuted;
  }

  toggleVideo() {
    if (!this.localStream) return;

    this.isVideoOff = !this.isVideoOff;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = !this.isVideoOff;
    });

    return this.isVideoOff;
  }

  async toggleScreenShare(localVideoElement) {
    if (this.isScreenSharing) {
      // Volver a cámara
      const videoTrack = this.localStream.getVideoTracks()[0];
      videoTrack.stop();

      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const newVideoTrack = cameraStream.getVideoTracks()[0];
      this.localStream.addTrack(newVideoTrack);

      const sender = this.peerConnection
        .getSenders()
        .find(s => s.track.kind === 'video');
      sender.replaceTrack(newVideoTrack);

      localVideoElement.srcObject = this.localStream;
      this.isScreenSharing = false;
    } else {
      // Compartir pantalla
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = this.peerConnection
          .getSenders()
          .find(s => s.track.kind === 'video');
        sender.replaceTrack(screenTrack);

        localVideoElement.srcObject = screenStream;
        this.isScreenSharing = true;

        // Cuando el usuario deje de compartir pantalla
        screenTrack.onended = () => {
          this.toggleScreenShare(localVideoElement);
        };
      } catch (error) {
        console.error('Error compartiendo pantalla:', error);
        this.handleError(error);
      }
    }

    return this.isScreenSharing;
  }

  async endCall() {
    this.updateStatus('Finalizando llamada...');

    // Detener tracks locales
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Cerrar peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Limpiar listeners
    if (this.unsubscribeOffer) this.unsubscribeOffer();
    if (this.unsubscribeAnswer) this.unsubscribeAnswer();
    if (this.unsubscribeIceCandidates) this.unsubscribeIceCandidates();

    // Eliminar documento de llamada
    try {
      const db = await getDb();
      const callRef = doc(db, 'conversations', this.conversationId, 'calls', 'current');

      await deleteDoc(
        callRef
      );
    } catch (error) {
      console.error('Error eliminando llamada:', error);
    }

    // Guardar en historial
    await this.saveToHistory();

    // Reset estado
    this.isCallActive = false;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;

    this.updateStatus('Llamada finalizada');

    if (this.onCallEnded) this.onCallEnded();
  }

  async saveToHistory() {
    try {
      const db = await getDb();
      await addDoc(collection(db, 'conversations', this.conversationId, 'callHistory'), {
        participants: [this.currentUserId, this.remoteUserId],
        caller: this.currentUserId,
        startedAt: serverTimestamp(),
        endedAt: serverTimestamp(),
        duration: 0 // TODO: calcular duración real
      });
    } catch (error) {
      console.error('Error guardando historial:', error);
    }
  }

  // ==========================================================================
  // UTILIDADES
  // ==========================================================================

  updateStatus(status) {
    console.log('Video Chat Status:', status);
    if (this.onStatusChange) this.onStatusChange(status);
  }

  handleError(error) {
    console.error('Video Chat Error:', error);

    let message = 'Error en video chat';

    if (error.name === 'NotAllowedError') {
      message = 'Permisos de cámara/micrófono denegados';
    } else if (error.name === 'NotFoundError') {
      message = 'Cámara o micrófono no encontrados';
    } else if (error.name === 'NotReadableError') {
      message = 'Cámara o micrófono en uso por otra aplicación';
    } else if (error.message) {
      message = error.message;
    }

    this.updateStatus(`Error: ${message}`);

    if (this.onError) this.onError(error, message);
  }

  // Verificar soporte de navegador
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }
}

// ============================================================================
// HELPER PARA DETECTAR LLAMADA ENTRANTE
// ============================================================================

export async function listenForIncomingCall(conversationId, currentUserId, onIncomingCall) {
  const db = await getDb();
  const callRef = doc(db, 'conversations', conversationId, 'calls', 'current');

  return onSnapshot(callRef, snapshot => {
    const data = snapshot.data();

    if (data && data.status === 'calling' && data.callee === currentUserId) {
      // Llamada entrante
      onIncomingCall(data);
    }
  });
}

export default VideoChat;
