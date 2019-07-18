'use strict'

/* eslint-disable no-console */

const Benchmark = require('benchmark')
const pull = require('pull-stream/pull')
const infinite = require('pull-stream/sources/infinite')
const take = require('pull-stream/throughs/take')
const drain = require('pull-stream/sinks/drain')
const Connection = require('interface-connection').Connection
const pair = require('pull-pair/duplex')
const PeerId = require('peer-id')

const secio = require('../src')

const suite = new Benchmark.Suite('secio')
let peers

function sendData (a, b, opts, finish) {
  opts = Object.assign({ times: 1, size: 100 }, opts)

  pull(
    infinite(() => Buffer.allocUnsafe(opts.size)),
    take(opts.times),
    a
  )

  let length = 0

  pull(
    b,
    drain((data) => {
      length += data.length
    }, () => {
      if (length !== opts.times * opts.size) {
        throw new Error('Did not receive enough chunks')
      }
      finish.resolve()
    })
  )
}

function ifErr (conn) {
  conn.awaitConnected.catch(err => {
    console.error(err.stack)
    throw err // TODO: make this better
  })
  return conn
}

suite.add('create peers for test', async () => {
  peers = await Promise.all([
    PeerId.createFromJSON(require('./peer-a')),
    PeerId.createFromJSON(require('./peer-b'))
  ])
})

suite.add('establish an encrypted channel', (deferred) => {
  const p = pair()

  const peerA = peers[0]
  const peerB = peers[1]

  const aToB = ifErr(secio.encrypt(peerA, new Connection(p[0]), peerB))
  const bToA = ifErr(secio.encrypt(peerB, new Connection(p[1]), peerA))

  sendData(aToB, bToA, {}, deferred)
}, { defer: true })

const cases = [
  [10, 262144],
  [100, 262144],
  [1000, 262144]
  // [10000, 262144],
  // [100000, 262144],
  // [1000000, 262144]
]
cases.forEach((el) => {
  const times = el[0]
  const size = el[1]

  suite.add(`send plaintext ${times} x ${size} bytes`, (deferred) => {
    const p = pair()

    sendData(p[0], p[1], { times: times, size: size }, deferred)
  }, { defer: true })

  suite.add(`send encrypted ${times} x ${size} bytes`, (deferred) => {
    const p = pair()

    const peerA = peers[0]
    const peerB = peers[1]

    const aToB = ifErr(secio.encrypt(peerA, new Connection(p[0]), peerB))
    const bToA = ifErr(secio.encrypt(peerB, new Connection(p[1]), peerA))

    sendData(aToB, bToA, { times: times, size: size }, deferred)
  }, { defer: true })
})

suite.on('cycle', (event) => {
  console.log(String(event.target))
})

// run async
suite.run({ async: true })
