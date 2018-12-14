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

* Big messages are more sensitive to network delays and packet loss. Sending multiple small messages is much more reliable.
* If too many messages are created at the same time then due to UDP's nature packets will get lost. An internal timer waits before retry.
* The maximum size of a message is 2^32-1 bytes, which will probably not fit into RAM anyways. Use with big-data might require a higher protocol layer on top of this library to allow data streaming.

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

The testsuite prints out some basic bandwidth information (tested on localhost with simulated packet loss and network delay).

```
✓ Testing file ./tests/E2E.test.js
✓ E2E non lossy, non delayed suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 2.619 sec. Bandwidth: 781.9778541428026 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.339 sec. Bandwidth: 386.6371681415929 Kb/s
✓ E2E 15% loss, non delayed suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.672 sec. Bandwidth: 557.7342047930283 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 6.355 sec. Bandwidth: 20.624704956726987 Kb/s
✓ E2E 30% loss, non delayed suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.072 sec. Bandwidth: 502.9469548133595 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 6.993 sec. Bandwidth: 18.74302874302874 Kb/s
✓ E2E non lossy, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 2.513 sec. Bandwidth: 814.9621965777955 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.102 sec. Bandwidth: 1285 Kb/s
✓ E2E 15% loss, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.466 sec. Bandwidth: 458.57590685176893 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 4.299 sec. Bandwidth: 30.488485694347524 Kb/s
✓ E2E 30% loss, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.484 sec. Bandwidth: 456.7350579839429 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 5.789 sec. Bandwidth: 22.64121609949905 Kb/s
✓ E2E non lossy, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 2.533 sec. Bandwidth: 808.5274378207658 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.342 sec. Bandwidth: 383.2456140350877 Kb/s
✓ E2E 15% loss, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.302 sec. Bandwidth: 620.2301635372502 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 7.438 sec. Bandwidth: 17.62167249260554 Kb/s
✓ E2E 30% loss, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.857 sec. Bandwidth: 421.65946057236977 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 7.61 sec. Bandwidth: 17.223390275952696 Kb/s
✓ E2E non lossy, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 2.575 sec. Bandwidth: 795.3398058252427 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.105 sec. Bandwidth: 1248.2857142857142 Kb/s
✓ E2E 15% loss, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.262 sec. Bandwidth: 627.835683629675 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 3.774 sec. Bandwidth: 34.729729729729726 Kb/s
✓ E2E 30% loss, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.862 sec. Bandwidth: 421.2258329905389 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 6.175 sec. Bandwidth: 21.225910931174088 Kb/s
✓ E2E non lossy, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 2.558 sec. Bandwidth: 800.625488663018 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.338 sec. Bandwidth: 387.7810650887574 Kb/s
✓ E2E 15% loss, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.692 sec. Bandwidth: 554.7128927410618 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 3.856 sec. Bandwidth: 33.99118257261411 Kb/s
✓ E2E 30% loss, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.489 sec. Bandwidth: 456.2263310314101 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 6.459 sec. Bandwidth: 20.29261495587552 Kb/s
✓ ok
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