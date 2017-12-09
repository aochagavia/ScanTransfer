window.addEventListener('load', startup, false);

function startup() {
  let receiveBox = document.getElementById('receivebox');

  socket.emit('register_receiver');
  socket.on('uuid', uuid => {
    new QRious({
      element: document.getElementById('qr'),
      value: uuid
    });

    console.log('Receiver id: ' + uuid);
  });

  let receiverConnection = new RTCPeerConnection();

  // Send any ICE candidates to the other peer
  receiverConnection.onicecandidate = e => {
    if (!e.candidate) return;
    socket.emit('receiver_ice', e.candidate);
  }

  // Receive any ICE candidates from the other peer
  socket.on('sender_ice', candidate => {
    receiverConnection.addIceCandidate(candidate);
  });

  // Receive description
  socket.on('sender_description', desc => {
    receiverConnection.setRemoteDescription(desc)
    .then(() => receiverConnection.createAnswer())
    .then(answer => receiverConnection.setLocalDescription(answer))
    .then(() => socket.emit('receiver_description', receiverConnection.localDescription));
  });

  receiverConnection.ondatachannel = event => {
    let receiveChannel = event.channel;
    let download = document.getElementById('download');
    receiveChannel.onmessage = event => {
      if (typeof(event.data) === 'string') {
        // File name
        download.setAttribute('download', event.data);
      } else {
        // File as an ArrayBuffer
        let url = URL.createObjectURL(event.data);
        console.log('File received: ' + url);
        download.setAttribute('href', url);
      }
    };
    receiveChannel.onopen = () => {
      console.log('Receive channel is open!');
    }
  };
}
