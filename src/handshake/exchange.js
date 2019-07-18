'use strict'

const debug = require('debug')

const support = require('../support')
const crypto = require('./crypto')

const log = debug('libp2p:secio')
log.error = debug('libp2p:secio:error')

// step 2. Exchange
// -- exchange (signed) ephemeral keys. verify signatures.
module.exports = async function exchange (state) {
  log('2. exchange - start')

  log('2. exchange - writing exchange')
  const ex = await crypto.createExchange(state)

  support.write(state, ex)
  const msg = await support.read(state.shake)

  log('2. exchange - reading exchange')
  await crypto.verify(state, msg)

  await crypto.generateKeys(state)
  log('2. exchange - finish')
}
