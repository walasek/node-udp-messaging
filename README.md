# [node-udp-messaging](https://github.com/walasek/node-udp-messaging) [![Package Version](https://img.shields.io/npm/v/udp-messaging.svg?style=flat-square)](https://www.npmjs.com/walasek/node-udp-messaging) ![License](https://img.shields.io/npm/l/udp-messaging.svg?style=flat-square) [![Dependencies](https://david-dm.org/walasek/node-udp-messaging.svg)](https://david-dm.org/walasek/node-udp-messaging.svg)  [![codecov](https://codecov.io/gh/walasek/node-udp-messaging/branch/master/graph/badge.svg)](https://codecov.io/gh/walasek/node-udp-messaging)

Reliable messaging over UDP with holepunching.

---

## Goal

Peer-to-Peer communication is a tricky subject when your peers are hidden behind routers with NAT tables. This project aims at delivering tools to:

* Allow sending and receiving whole messages of arbitrary size
* Message delivery on best-effort basis (whole message received or nothing at all)
* Allow NAT holepuching

This project **DOES NOT** provide the following:

* A session mechanism
* Anti-spoofing (datagram source is not verified, applications using this library might be victims of a DDOS attack if proper rate-limiting is not implemented)
* Sending streams

Remarks:

* Currently parts of data are sent only after receiving an ACK of a previous part. This slows down the protocol considerably, communication delay slows down speed linearly. Sending multiple parts at the same time is currently not implemented (multiple messages **can** be sent at the same time).
* Therefor: Big messages are sensitive to network delays. Sending multiple small messages is much faster.
* If too many messages are created at the same time then due to UDP's nature packets will get lost. An internal timer waits for a second before a retry. This might be tuned in the future.
* The maximum size of a message is 2^32-1 bytes, which will probably not fit into RAM anyways. Use with big-data might require a higher protocol layer on top of this library.

## Installation

Node `>=8.9.0` is required.

```bash
npm install --save udp-messaging
```

To perform tests use:

```bash
cd node_modules/udp-messaging
npm i
npm t
```

## Usage

Beware this project is still in development. There may be serious bugs or performance issues over time.

Documentation is available [here](https://walasek.github.io/node-udp-messaging/).

```javascript
(async () => {
    // Create a reliable UDP socket
    const P2PSocket = require('udp-messaging');
    const p2p = new P2PSocket({ port: 12345 });
    await p2p.bind();

    // This promise resolves when the remote end receives the message.
    // It rejects if the remote end did not respond at all.
    await p2p.sendMessage(Buffer.from('Hey there!'), '10.8.128.1', 12345);

    // The Socket is an EventEmitter.
    p2p.on('message', (data, address, port) => {
        console.log(`Message from %s:%d - %o`, address, port, data);
    });

    // Execute holepunching (get an address and port that another peer over the internet can use to reach this peer)
    const hole = await server.discoverSelf();

    // Interrupt all pending messages being sent and received
    // Note: all sendMessage Promises are resolved, not rejected!
    p2p.close();
})();
```

## Example application

The [p2p-discovery](examples/p2p-discovery.js) file contains an example application that allows maintaining a p2p mesh. Peers share addresses of other known peers with each other. The result of `node examples/p2p-discovery.js -h` is shown below. An additional `debug` tag is defined: `udp-messaging:discovery`.

```
Run a P2P discovery node

Options:
  --help, -h         Print a help
  --local_port, -p   Use a specific local port, 0 for random  [default: 0]
  --remote_ip, -t    Define a known remote peer               [default: "127.0.0.1"]
  --remote_port, -r  Define remote peer port
```

## Performance

The testsuite prints out some basic bandwidth information.

```
✓ Testing file ./tests/E2E.test.js
✓ E2E non lossy suite
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel messages over stunned ports
✓ E2E #3 - can exchange large messages over stunned ports
✓ E2E #3 Elapsed: 4.633 sec. Bandwidth: 56.58104899633067 Kb/s
✓ E2E 15% loss suite
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel messages over stunned ports
✓ E2E #3 - can exchange large messages over stunned ports
✓ E2E #3 Elapsed: 57.762 sec. Bandwidth: 4.538277760465358 Kb/s
✓ E2E 30% loss suite
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel messages over stunned ports
✓ E2E #3 - can exchange large messages over stunned ports
✓ E2E #3 Elapsed: 131.15 sec. Bandwidth: 1.9987800228745711 Kb/s
# ok
```

## Contributing

The source is documented with JSDoc. To generate the documentation use:

```bash
npm run docs
```

Extra debugging information is printed using the `debug` module:

```bash
DEBUG=udp-messaging:* npm t
```

The documentation will be put in the new `docs` directory.

To introduce an improvement please fork this project, commit changes in a new branch to your fork and add a pull request on this repository pointing at your fork. Please follow these style recommendations when working on the code:

* Use tabs (yup).
* Use `async`/`await` and/or `Promise` where possible.
* Features must be properly tested.
* New methods must be properly documented with `jscode` style comments.