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
    const hole = await p2p.discoverSelf();

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
  --help, -h         Print help
  --local_port, -p   Use a specific local port, 0 for random  [default: 0]
  --remote_ip, -t    Define a known remote peer               [default: "127.0.0.1"]
  --remote_port, -r  Define remote peer port
  --stun_xval, -s    Interval between STUN requests [ms]      [default: 60000]
```

## Performance

The testsuite prints out some basic bandwidth information (tested on localhost with simulated packet loss and network delay). Keep in mind bandwidth results depend a lot on the network status, active processes and many other variables.
Performance can also be checked with the example [iperf](./examples/iperf.js) script.

```
✓ Testing file ./tests/E2E.test.js
✓ E2E non lossy, non delayed test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 1.929 sec. Bandwidth: 1061.6899948159669 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 0.017 sec. Bandwidth: 7710 Kb/s
✓ E2E 15% loss, non delayed test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 1.549 sec. Bandwidth: 1322.1433182698515 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 1.812 sec. Bandwidth: 72.33443708609272 Kb/s
✓ E2E 30% loss, non delayed test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 1.093 sec. Bandwidth: 1873.7419945105214 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 4.86 sec. Bandwidth: 26.969135802469136 Kb/s
✓ E2E non lossy, 500 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 1.135 sec. Bandwidth: 1804.4052863436123 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 0.03 sec. Bandwidth: 4369 Kb/s
✓ E2E 15% loss, 500 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.918 sec. Bandwidth: 2230.9368191721132 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 1.105 sec. Bandwidth: 118.61538461538461 Kb/s
✓ E2E 30% loss, 500 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.7 sec. Bandwidth: 2925.714285714286 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 5.234 sec. Bandwidth: 25.042032862055787 Kb/s
✓ E2E non lossy, 1000 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.679 sec. Bandwidth: 3016.20029455081 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 0.021 sec. Bandwidth: 6241.428571428572 Kb/s
✓ E2E 15% loss, 1000 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.662 sec. Bandwidth: 3093.6555891238672 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 3.219 sec. Bandwidth: 40.717614165890026 Kb/s
✓ E2E 30% loss, 1000 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.659 sec. Bandwidth: 3107.7389984825495 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 4.616 sec. Bandwidth: 28.39471403812825 Kb/s
✓ E2E non lossy, 1500 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.695 sec. Bandwidth: 2946.7625899280574 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 0.013 sec. Bandwidth: 10082.307692307691 Kb/s
✓ E2E 15% loss, 1500 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.733 sec. Bandwidth: 2793.9972714870396 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 1.505 sec. Bandwidth: 87.08970099667773 Kb/s
✓ E2E 30% loss, 1500 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 1.168 sec. Bandwidth: 1753.4246575342465 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 5.119 sec. Bandwidth: 25.604610275444422 Kb/s
✓ E2E non lossy, 2000 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.757 sec. Bandwidth: 2705.4161162483488 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 0.014 sec. Bandwidth: 9362.142857142857 Kb/s
✓ E2E 15% loss, 2000 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 0.878 sec. Bandwidth: 2332.5740318906605 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 1.628 sec. Bandwidth: 80.50982800982801 Kb/s
✓ E2E 30% loss, 2000 ms delay test suite:
✓ E2E #1 - can exchange small messages over stunned ports
✓ E2E #2 - can exchange small messages full-duplex over stunned ports
✓ E2E #2      Summary: Time elapsed 1.071 sec. Bandwidth: 1912.2315592903828 Kb/s
✓ E2E #3 - can exchange large messages half-duplex over stunned ports
✓ E2E #3     Summary: Time elapsed 5.516 sec. Bandwidth: 23.76178390137781 Kb/s
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