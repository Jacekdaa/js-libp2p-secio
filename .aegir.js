'use strict'

const multiaddr = require('multiaddr')
const pull = require('pull-stream')
const WS = require('libp2p-websockets')
const PeerId = require('peer-id')
const prom = (fnc) => new Promise((resolve, reject) => fnc((err, res) => err ? reject(err) : resolve(res)))

const secio = require('./src')

const peerNodeJSON = require('./test/fixtures/peer-node.json')
const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
let listener

module.exports = {
  hooks: {
    browser: {
      pre: async () => {
        const peerId = await PeerId.createFromJSON(peerNodeJSON)
        const ws = new WS()

        listener = ws.createListener((conn) => {
          const encryptedConn = secio.encrypt(peerId, conn, undefined)
          encryptedConn.catch(err => { throw err }) // TODO: make this better

          // echo
          pull(encryptedConn, encryptedConn)
        })

        await prom(cb => listener.listen(ma, cb))
      },
      post: async () => {
        return prom(cb => listener.close(cb))
      }
    }
  }
}
