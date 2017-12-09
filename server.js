const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const uuidv4 = require('uuid/v4');

// Hashmaps to handle pairing
let senderToReceiver = {};
let receiverToSender = {};

// Hashmaps related to ids and sockets
let receiverToSocket = {};
let receiverToId = {};
let senderToId = {};
let senderToSocket = {};

// Websocket stuff to setup WebRTC communication
io.on('connection', function(socket){
  socket.on('disconnect', () => {
    // FIXME: remove pairing

    // FIXME: remove the rest
  });

  socket.on('register_receiver', () => {
    let id = uuidv4();
    receiverToId[socket] = id;
    receiverToSocket[id] = socket;

    socket.emit('uuid', id);
    console.log('Receiver registered with id: ' + id);
  });

  socket.on('register_sender', () => {
    let id = uuidv4();
    senderToId[socket] = id;
    senderToSocket[id] = socket;

    socket.emit('uuid', id);
    console.log('Sender registered with id: ' + id);
  });

  socket.on('match_sender_receiver', ids => {
    console.log(`matching: ${ids.a} and ${ids.b}`);

    // We expect two ids: a and b
    // They can point to a sender or a receiver, we don't care, because we use UUIDs

    // Check whether a corresponds to a sender
    let senderId = null;
    let receiverId = null;
    if (senderToSocket[ids.a] !== undefined) {
      senderId = ids.a;
      receiverId = ids.b;
    } else {
      senderId = ids.b;
      receiverId = ids.a;
    }

    let sender = senderToSocket[senderId];
    let receiver = receiverToSocket[receiverId];

    if (!sender || !receiver) {
      socket.emit('match_error', 'invalid QR code');
      return;
    }

    senderToReceiver[sender] = receiver;
    receiverToSender[receiver] = sender;

    sender.emit('match');
  });

  // Sent by receiver
  socket.on('receiver_ice', candidate => {
    receiverToSender[socket].emit('receiver_ice', candidate);
  });

  // Sent by receiver
  socket.on('receiver_description', desc => {
    receiverToSender[socket].emit('receiver_description', desc);
  })

  // Sent by sender
  socket.on('sender_ice', candidate => {
    senderToReceiver[socket].emit('sender_ice', candidate);
  });

  // Sent by sender
  socket.on('sender_description', desc => {
    senderToReceiver[socket].emit('sender_description', desc);
  });
});

// Http stuff
app.use(express.static('public'));

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`server is listening on ${port}`)
});
