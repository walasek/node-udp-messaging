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
✓ E2E #2 Summary: Time elapsed 5.407 sec. Bandwidth: 378.7682633623081 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 1.308 sec. Bandwidth: 100.20642201834862 Kb/s
✓ E2E 15% loss, non delayed suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 6.522 sec. Bandwidth: 314.01410610242255 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 2.665 sec. Bandwidth: 49.18198874296435 Kb/s
✓ E2E 30% loss, non delayed suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 7.725 sec. Bandwidth: 265.1132686084142 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 3.183 sec. Bandwidth: 41.17813383600377 Kb/s
✓ E2E non lossy, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 6.201 sec. Bandwidth: 330.26931140138686 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.52 sec. Bandwidth: 252.05769230769232 Kb/s
✓ E2E 15% loss, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 6.566 sec. Bandwidth: 311.9098385622906 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 2.306 sec. Bandwidth: 56.838681699913266 Kb/s
✓ E2E 30% loss, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 7.315 sec. Bandwidth: 279.97265892002736 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 2.162 sec. Bandwidth: 60.62442183163737 Kb/s
✓ E2E non lossy, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 6.121 sec. Bandwidth: 334.5858519849698 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.854 sec. Bandwidth: 153.47775175644028 Kb/s
✓ E2E 15% loss, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 6.539 sec. Bandwidth: 313.1977366569812 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 2.394 sec. Bandwidth: 54.74937343358396 Kb/s
✓ E2E 30% loss, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 7.323 sec. Bandwidth: 279.66680322272293 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 3.517 sec. Bandwidth: 37.26755757748081 Kb/s
✓ E2E non lossy, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 5.451 sec. Bandwidth: 375.71087873784626 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 1.134 sec. Bandwidth: 115.58201058201058 Kb/s
✓ E2E 15% loss, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 6.158 sec. Bandwidth: 332.57551152971746 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 1.711 sec. Bandwidth: 76.60432495616598 Kb/s
✓ E2E 30% loss, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 7.697 sec. Bandwidth: 266.0776926075094 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 2.285 sec. Bandwidth: 57.36105032822757 Kb/s
✓ E2E non lossy, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 5.758 sec. Bandwidth: 355.67905522750954 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.461 sec. Bandwidth: 284.3167028199566 Kb/s
✓ E2E 15% loss, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 6.132 sec. Bandwidth: 333.9856490541422 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 2.526 sec. Bandwidth: 51.888361045130644 Kb/s
✓ E2E 30% loss, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 6.919 sec. Bandwidth: 295.99653129064893 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 2.349 sec. Bandwidth: 55.79821200510856 Kb/s
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