// Online play without a game server of our own. The two browsers talk to
// each other directly (WebRTC). A free public broker, PeerJS, only introduces
// them: the host registers under the room code and the guest asks for that name.
// After that the broker is out of the picture.
//
// ponytail: one public broker and no fallback. If it proves unreliable, run a
// PeerServer of our own and pass its address to `new Peer(...)`.

/**
 * Open a link to the other player in room `code`.
 * @param isHost     the host waits in the room; the guest dials it
 * @param onMessage  called with every message the other side sends (untrusted: check it!)
 * @param onGone     called when the other side leaves
 * @returns {{ ready: Promise<void>, send: (message: object) => void, close: () => void }}
 *   `ready` resolves once both browsers are connected. It rejects with an error
 *   whose `type` says why not: 'peer-unavailable' (no such room),
 *   'unavailable-id' (the code is taken), 'network', …
 */
export function openLink(code, isHost, onMessage, onGone) {
  let peer = null, conn = null, closed = false;

  const ready = (async () => {
    const { Peer } = await import('peerjs'); // a separate download, fetched only when somebody plays online
    if (closed) throw new Error('closed');
    const room = `chance-quest-${code}`;
    peer = isHost ? new Peer(room) : new Peer();
    await new Promise((resolve, reject) => {
      const wire = connection => {
        if (conn) return connection.close(); // a duel has two players: a third caller is turned away
        conn = connection;
        conn.on('open', resolve);
        conn.on('error', reject);
      };
      peer.on('error', reject);
      if (isHost) peer.on('connection', wire);
      else peer.on('open', () => wire(peer.connect(room, { serialization: 'json' })));
    });
    conn.on('data', onMessage);
    conn.on('close', onGone);
  })();

  return {
    ready,
    send(message) { if (conn?.open) conn.send(message); },
    close() { closed = true; peer?.destroy(); },
  };
}
