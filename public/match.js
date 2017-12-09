window.addEventListener('load', startup, false);

function startup() {
    let a = document.getElementById('a');
    let b = document.getElementById('b');
    let btn = document.getElementById('match');
    btn.addEventListener('click', () => {
        socket.emit('match_sender_receiver', { a: a.value, b: b.value });
    });
    socket.on('match_error', () => {
        console.log('match error');
    });
}
