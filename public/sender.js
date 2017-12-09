let sendButton = null;
let messageInputBox = null;

let localConnection = null;
let sendChannel = null;

window.addEventListener('load', startup, false);

function startup() {
  sendButton = document.getElementById('sendButton');
  messageInputBox = document.getElementById('message');
  receiveBox = document.getElementById('receivebox');

  sendButton.addEventListener('click', sendMessage, false);

  socket.emit('register_sender');
  socket.on('uuid', uuid => {
    new QRious({
      element: document.getElementById('qr'),
      value: uuid
    });

    console.log('Sender id: ' + uuid);
  });
}

// If someone has matched on this sender, start the connection
socket.on('match', connect);

function connect() {
  localConnection = new RTCPeerConnection();

  // Create the data channel and establish its event listeners
  sendChannel = localConnection.createDataChannel("sendChannel");
  sendChannel.onopen = statusChange;
  sendChannel.onclose = statusChange;

  // Send ICE candidates
  localConnection.onicecandidate = e => {
    if (!e.candidate) return;
    socket.emit('sender_ice', e.candidate);
  }

  // Receive ICE candidates
  socket.on('receiver_ice', candidate => {
    localConnection.addIceCandidate(candidate);
  });

  // Create an offer to connect
  localConnection.createOffer()
  .then(offer => localConnection.setLocalDescription(offer) )
  .then(() => socket.emit('sender_description', localConnection.localDescription));

  // Finish setting up stuff using the receiver's description
  socket.on('receiver_description', desc => {
    localConnection.setRemoteDescription(desc)
  });
}

function sendMessage() {
  var selectedFile = document.getElementById('file').files[0];
  console.log(selectedFile);
  let reader = new FileReader();
  reader.onloadend = () => {
    console.log('File loaded');
    sendChannel.send(selectedFile.name);
    sendChannel.send(reader.result);
  };
  reader.readAsArrayBuffer(selectedFile);

  //sendChannel.send(messageInputBox.value);

  // Clear the input box and re-focus it, so that we're
  // ready for the next message.
  messageInputBox.value = "";
  messageInputBox.focus();

  //var reader = new FileReader();
  //reader.readAsArrayBuffer(selectedFile);

}

function statusChange(event) {
  let state = sendChannel.readyState;
  console.log('state changed: ' + state);
  if (state === "open") {
    messageInputBox.disabled = false;
    messageInputBox.focus();
    sendButton.disabled = false;
  } else {
    messageInputBox.disabled = true;
    sendButton.disabled = true;
  }
}
