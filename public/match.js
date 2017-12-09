window.addEventListener('load', startup, false);

// For debugging
function send_match(a, b) {
    socket.emit('match_sender_receiver', { a, b });
}

function startup() {
    socket.on('match_error', () => {
        console.log('match error');
    });

    // Get Instascan running
    let config = {
        video: document.getElementById('preview'),
        mirror: false,
        scanPeriod: 5
    };
    let scanner = new Instascan.Scanner(config);
    let codes = [];
    scanner.addListener('scan', content => {
        // Ignore repeated scans
        if (codes.includes(content)) return;
        alert('Match');
        codes.push(content);
        if (codes.length === 2) {
            socket.emit('match_sender_receiver', { a: codes[0], b: codes[1] });
        }
    });
    Instascan.Camera.getCameras().then(function (cameras) {
        if (cameras.length > 0) {
            scanner.start(cameras[0]);
        } else {
            alert('No cameras found.');
        }
    }).catch(function (e) {
        alert('Error: ' + e);
    });
}
