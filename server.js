const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const uuidv4 = require('uuid/v4');
const HashMap = require('hashmap');

// Hashmaps to handle pairing
let clientToClient = new HashMap();

// Hashmaps related to ids and sockets
let clientIdToSocket = new HashMap();
let socketToClientId = new HashMap();

// Websocket stuff to setup WebRTC communication
io.on('connection', socket => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    // Remove registered sockets
    if (socketToClientId.has(socket)) {
      let id = socketToClientId.get(socket);
      socketToClientId.delete(socket);
      clientIdToSocket.delete(id);
    }

    // Remove pairing, if any
    if (clientToClient.has(socket)) {
      let counterpart = clientToClient.get(socket);
      clientToClient.delete(socket);
      clientToClient.delete(counterpart);
    }

    console.log('Client disconnected');
  });

  socket.on('register', () => {
    let id = uuidv4();
    clientIdToSocket.set(id, socket);
    socketToClientId.set(socket, id);
    socket.emit('uuid', id);
    console.log('Client registered: ' + id);
  });

  socket.on('attempt_match', ids => {
    function logMatchError(msg) {
      socket.emit('match_error', msg);
      console.log(`Match error: ${msg}`);
    }
    if (!ids.length) {
      logMatchError('Invalid parameter');
      return;
    }
    if (ids.length !== 2) {
      logMatchError(`Id list has ${ids.length} elements`)
      return;
    }

    let [idA, idB] = ids;
    if (idA === idB) {
      logMatchError('Ids are equal');
      return;
    }

    let socketA = clientIdToSocket.get(idA);
    let socketB = clientIdToSocket.get(idB);
    if (!socketA) {
      logMatchError(`No client with id ${idA}`);
      return;
    }
    if (!socketB) {
      logMatchError(`No client with id ${idB}`);
    }

    clientToClient.set(socketA, socketB);
    clientToClient.set(socketB, socketA);

    console.log(`Match: ${idA} and ${idB}`);

    // Arbitrarily, the first scanned socket will initiate the connection
    socketA.emit('match_found');
  });

  function getCounterpart(s) {
    return clientToClient.get(s);
  }

  socket.on('send_ice_candidate', candidate => {
    getCounterpart(socket).emit('recv_ice_candidate', candidate);
  });

  // Sent by receiver
  socket.on('receiver_description', desc => {
    getCounterpart(socket).emit('receiver_description', desc);
  });

  // Sent by sender
  socket.on('sender_description', desc => {
    getCounterpart(socket).emit('sender_description', desc);
  });
});

// Http stuff
app.use(express.static('public'));

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`server is listening on ${port}`)
});
