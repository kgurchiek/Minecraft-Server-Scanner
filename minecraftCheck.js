const fs = require('fs');
const net = require('net');
const varint = require('varint');
const { rescans, rescanRate, rescanTimeout } = require('./config.json');

function ping(ip, port, protocol, timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!hasResponded) {
        resolve(false);
        client.destroy();
      }
    }, timeout);
    var hasResponded = false;

    const client = new net.Socket();
    client.connect(port, ip, () => {
      const handshakePacket = Buffer.concat([
        Buffer.from([0x00]), // packet ID
        Buffer.from(varint.encode(protocol)), //protocol version
        Buffer.from([ip.length]),
        Buffer.from(ip, 'utf-8'), // server address
        Buffer.from(new Uint16Array([port]).buffer).reverse(), // server port
        Buffer.from([0x01]), // next state (2)
        Buffer.from([0x00]) // status request
      ]);
      var packetLength = Buffer.alloc(1);
      packetLength.writeUInt8(handshakePacket.length);
      var buffer = Buffer.concat([packetLength, handshakePacket]);
      client.write(buffer);
    });

    client.on('data', (data) => {
      client.destroy();
      try {
        if (JSON.parse(data).players === undefined) console.log(data);
      } catch (error) {
        //console.log(data);
      }
      resolve(true);
    });

    client.on('error', () => {
      client.destroy();
    });

    client.on('close', () => {
      client.destroy();
    });
  })
}

function readIndex(fd, index, size) {
  return new Promise(async (resolve, reject) => {
    const newBuffer = Buffer.alloc(size);
    resolve(await (new Promise((resolve, reject) => { fs.read(fd, newBuffer, 0, size, index, (err, bytesRead, buffer) => { resolve(buffer); }) })));
  })
}

module.exports = (ipsPath, newPath, flag = 'w') => {
  return new Promise(async (resolve, reject) => {
    const writeStream = fs.createWriteStream(newPath, { flags: flag });
    const serverListFD = await (new Promise((resolve, reject) => { fs.open(ipsPath, 'r', (err, fd) => { resolve(fd); }) }));
    const totalServers = fs.statSync(ipsPath).size / 6;
    console.log(`Total servers: ${totalServers}`);
    const verified = [];
    var serversPinged = 0;

    async function getServer(i) {
      const server = await readIndex(serverListFD, i * 6, 6);
      const ip = `${server[0]}.${server[1]}.${server[2]}.${server[3]}`;
      const port = server[4] * 256 + server[5];
      return { ip, port }
    }
  
    async function pingServer(serverIndex) {
      serversPinged++;
      if (serversPinged % 20000 == 0) console.log(serversPinged);
      if (verified.includes(serverIndex)) return;
      const server = await getServer(serverIndex);
      try {
        if (await ping(server.ip, server.port, 0, rescanTimeout)) {
          verified.push(serverIndex);
          writeStream.write(await readIndex(serverListFD, serverIndex * 6, 5));
        }
      } catch (error) {}
    }
  
    function scanBatchPromise(i, startNum) {
      return new Promise((resolve, reject) => {
        function scanBatch(i, startNum) {
          if (i >= startNum) {
            if (i + rescanRate < totalServers) {
              // scan through the end of the server list
              for (var j = i; j < i + rescanRate; j++) {
                pingServer(j)
              }
              setTimeout(function() { scanBatch(i + rescanRate, startNum) }, rescanTimeout);
            } else {
              // once the end of the list is reached, restart at the beginning
              for (var j = i; j < totalServers; j++) {
                pingServer(j)
              }
              setTimeout(function() { scanBatch(0, startNum) }, rescanTimeout);
            }
          } else {
            // scan up to the server that was started with (after restarting at the beginning)
            if (i + rescanRate < startNum) {
              for (var j = i; j < i + rescanRate; j++) {
                pingServer(j)
              }
              setTimeout(function() { scanBatch(i + rescanRate, startNum) }, rescanTimeout);
            } else {
              for (var j = i; j < startNum - i; j++) {
                pingServer(j)
              }
      
              writeStream.close();
              resolve();
            }
          }
        }
        scanBatch(i, startNum);
      })
    }

    for (var i = 0; i < rescans; i++) {
      serversPinged = 0;
      var startNum = Math.floor(Math.random() * Math.floor(totalServers / rescanRate)) * rescanRate;
      if (startNum == 0) startNum = rescanRate;
      const startTime = new Date();
      await scanBatchPromise(startNum, startNum);
      console.log(`Finished scan ${i + 1}/${rescans} in ${(new Date() - startTime) / 1000} seconds at ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}.`);
      resolve();
    }
  })
}