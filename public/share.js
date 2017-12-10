let sendButton = null;
let channel = null;
let download = null;

window.addEventListener('load', startup, false);

function startup() {
  sendButton = document.getElementById('sendButton');
  download = document.getElementById('download');

  sendButton.addEventListener('click', sendMessage, false);

  socket.emit('register');
  socket.on('uuid', uuid => {
    new QRious({
      element: document.getElementById('qr'),
      value: uuid
    });

    console.log('Sender id: ' + uuid);
  });
}

let connection = new RTCPeerConnection();

// Send ICE candidates
connection.onicecandidate = e => {
  if (!e.candidate) return;
  console.log('Sending ICE candidates');
  socket.emit('send_ice_candidate', e.candidate);
}

// Receive ICE candidates
socket.on('recv_ice_candidate', candidate => {
  console.log('Receiving ICE candidates')
  connection.addIceCandidate(candidate);
});

// This code is used when the client acts as a receiver
socket.on('sender_description', desc => {
  console.log('Receiving descr from the initiator')
  connection.setRemoteDescription(desc)
  .then(() => connection.createAnswer())
  .then(answer => connection.setLocalDescription(answer))
  .then(() => socket.emit('receiver_description', connection.localDescription));
});

// Used when the client acts as a receiver
// Note that this event is only called when the data channel has been created by the other party
connection.ondatachannel = event => {
  initChannel(event.channel);
};

// A match has been found and this client has been arbitrarily chosen to
// initiate the connection
socket.on('match_found', () => {
  // Create the data channel
  let c = connection.createDataChannel("channel");
  initChannel(c);

  // Create an offer to connect
  connection.createOffer()
  .then(offer => connection.setLocalDescription(offer))
  .then(() => socket.emit('sender_description', connection.localDescription));

  // Finish setting up stuff using the receiver's description
  socket.on('receiver_description', desc => {
    connection.setRemoteDescription(desc)
  });
});

function initChannel(c) {
  channel = c;
  channel.onmessage = receiveMessage;
  channel.onopen = statusChange;
  channel.onclose = statusChange;
}

function receiveMessage(event) {
  if (typeof(event.data) === 'string') {
    // File name
    download.setAttribute('download', event.data);
  } else {
    // File as an ArrayBuffer
    let url = URL.createObjectURL(event.data);
    console.log('File received: ' + url);
    download.setAttribute('href', url);
  }
}

function sendMessage() {
  var selectedFile = document.getElementById('file').files[0];
  console.log(selectedFile);
  let reader = new FileReader();
  reader.onloadend = () => {
    console.log('File loaded');
    channel.send(selectedFile.name);
    channel.send(reader.result);
  };
  reader.readAsArrayBuffer(selectedFile);
}

function statusChange(event) {
  let state = channel.readyState;
  console.log('state changed: ' + state);
  if (state === "open") {
    sendButton.disabled = false;
  } else {
    sendButton.disabled = true;
  }
}
