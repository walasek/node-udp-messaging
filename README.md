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

The testsuite prints out some basic bandwidth information (tested on localhost with simulated packet loss and network delay). Keep in mind bandwidth results depend a lot on the network status, active processes and many other variables.

```
✓ Testing file ./tests/E2E.test.js
✓ E2E non lossy, non delayed suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.989 sec. Bandwidth: 513.4118826773628 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.1 sec. Bandwidth: 1310.7 Kb/s
✓ E2E 15% loss, non delayed suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.888 sec. Bandwidth: 526.7489711934156 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 5.151 sec. Bandwidth: 25.445544554455445 Kb/s
✓ E2E 30% loss, non delayed suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 5.521 sec. Bandwidth: 370.9472921572179 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 14.781 sec. Bandwidth: 8.867464988837021 Kb/s
✓ E2E non lossy, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 5.221 sec. Bandwidth: 392.2620187703505 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.1 sec. Bandwidth: 1310.7 Kb/s
✓ E2E 15% loss, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.591 sec. Bandwidth: 570.3146755778334 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 6.754 sec. Bandwidth: 19.40627776132662 Kb/s
✓ E2E 30% loss, 500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.223 sec. Bandwidth: 484.9632962349041 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 13.177 sec. Bandwidth: 9.94687713440085 Kb/s
✓ E2E non lossy, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.928 sec. Bandwidth: 521.3849287169043 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.101 sec. Bandwidth: 1297.7227722772277 Kb/s
✓ E2E 15% loss, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.538 sec. Bandwidth: 451.3001322168356 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 4.207 sec. Bandwidth: 31.155217494651772 Kb/s
✓ E2E 30% loss, 1000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.876 sec. Bandwidth: 420.0164068908942 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 11.567 sec. Bandwidth: 11.331373735627215 Kb/s
✓ E2E non lossy, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 5.166 sec. Bandwidth: 396.4382500967867 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.108 sec. Bandwidth: 1213.611111111111 Kb/s
✓ E2E 15% loss, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.88 sec. Bandwidth: 419.672131147541 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 5.795 sec. Bandwidth: 22.617773943054356 Kb/s
✓ E2E 30% loss, 1500 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.562 sec. Bandwidth: 448.925909688733 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 14.831 sec. Bandwidth: 8.837569954824355 Kb/s
✓ E2E non lossy, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.776 sec. Bandwidth: 542.3728813559322 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 0.109 sec. Bandwidth: 1202.4770642201836 Kb/s
✓ E2E 15% loss, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 3.862 sec. Bandwidth: 530.2951838425686 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 2.585 sec. Bandwidth: 50.704061895551256 Kb/s
✓ E2E 30% loss, 2000 ms delay suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange parallel full-duplex messages over stunned ports
✓ E2E #2 Summary: Time elapsed 4.542 sec. Bandwidth: 450.90268604139146 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3 Summary: Time elapsed 16.067 sec. Bandwidth: 8.157714570237133 Kb/s
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