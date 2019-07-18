'use strict'

const handshake = require('pull-handshake')
const deferred = require('pull-defer')

const defer = (timeout) => {
  let _resolve
  let _reject

  let fired = false
  function lock (d) {
    if (fired) {
      throw new Error('already fired!')
    }
    fired = false

    d()
  }

  const prom = new Promise((resolve, reject) => {
    _resolve = resolve
    _reject = reject
  })

  prom.resolve = (...a) => process.nextTick(() => lock(() => _resolve(...a)))
  prom.reject = (...a) => process.nextTick(() => lock(() => _reject(...a)))
  setTimeout(() => prom.reject(new Error('Timeout')), timeout)

  return prom
}

class State {
  constructor (localId, remoteId, timeout) {
    this.setup()

    this.id.local = localId
    // TODO use remoteId to verify PeersIdentity
    this.id.remote = remoteId
    this.key.local = localId.privKey
    this.timeout = timeout || 60 * 1000

    this.awaitConnected = defer(this.timeout)

    this.secure = deferred.duplex()
    this.stream = handshake({ timeout: this.timeout }, (err) => this.awaitConnected.reject(err))
    this.shake = this.stream.handshake
    delete this.stream.handshake
  }

  setup () {
    this.id = { local: null, remote: null }
    this.key = { local: null, remote: null }
    this.shake = null
    this.cleanSecrets()
  }

  // remove all data from the handshake that is not needed anymore
  cleanSecrets () {
    this.shared = {}

    this.ephemeralKey = { local: null, remote: null }
    this.proposal = { in: null, out: null }
    this.proposalEncoded = { in: null, out: null }
    this.protocols = { local: null, remote: null }
    this.exchange = { in: null, out: null }
  }
}

module.exports = State
