'use strict'

const propose = require('./propose')
const exchange = require('./exchange')
const finish = require('./finish')

// Performs initial communication over insecure channel to share keys, IDs,
// and initiate communication, assigning all necessary params.
module.exports = function handshake (state) {
  const { awaitConnected } = state

  const main = async () => {
    await propose(state)
    await exchange(state)
    await finish(state)
  }

  main().then(() => {
    state.cleanSecrets()
    awaitConnected.resolve() // TODO: maybe pass in the conn as argument here?
  }).catch(err => {
    state.cleanSecrets()

    if (err === true) {
      err = new Error('Stream ended prematurely')
    }

    state.shake.abort(err) // send the error through the wire as well
    awaitConnected.reject(err)
  })

  return state.stream
}
