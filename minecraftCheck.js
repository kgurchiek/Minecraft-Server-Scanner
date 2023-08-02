const fs = require('fs');
const net = require('net');
const varint = require('varint');
const { rescans, rescanRate, rescanTimeout } = require('./config.json');

function ping(ip, port, protocol, timeout) {
  return new Promise((resolve, reject) => {
    var jsonLength = 0;

    setTimeout(function() {
      if (!hasResponded) {
        resolve('timeout');
        client.destroy();
      }
    }, timeout);

    var hasResponded = false;
    var response = '';

    const client = new net.Socket();
    client.connect(port, ip, () => {
      const handshakePacket = Buffer.concat([
      Buffer.from([0x00]), // packet ID
      Buffer.from(varint.encode(protocol)), //protocol version
      Buffer.from([ip.length]),
      Buffer.from(ip, 'utf-8'), // server address
      Buffer.from(new Uint16Array([port]).buffer).reverse(), // server port
      Buffer.from([0x01]) // next state (2)
      ]);
      var packetLength = Buffer.alloc(1);
      packetLength.writeUInt8(handshakePacket.length);
      var buffer = Buffer.concat([packetLength, handshakePacket]);
      client.write(buffer);

      const statusRequestPacket = Buffer.from([0x00]);
      packetLength = Buffer.alloc(1);
      packetLength.writeUInt8(statusRequestPacket.length);
      buffer = Buffer.concat([packetLength, statusRequestPacket]);
      client.write(buffer);
    });

    client.on('data', (data) => {
      if (jsonLength == 0) {
        try {
          varint.decode(data);
        } catch (error) {
          //console.log(`varint error on ${ip}:${port} - ${error}`);
          resolve('error');
        }
        const varint1Length = varint.decode.bytes;
        try {
          jsonLength = varint.decode(data.subarray(varint1Length + 1));
        } catch (error) {
          //console.log(`varint error on ${ip}:${port} - ${error}`);
          resolve('error');
        }
        const varint2Length = varint.decode.bytes;
        data = data.subarray(varint1Length + 1 + varint2Length);
      }
      response += data.toString();

      if (Buffer.byteLength(response) >= jsonLength) {
        client.destroy();
        try {
         resolve(JSON.parse(response));
        } catch (error) {
          //console.log(`Error on ${ip}:${port} - ${error}`);
          resolve('error');
        }
        hasResponded = true;
      }
    });

    client.on('error', (err) => {
      //console.error(`Error: ${err}`);
    });

    client.on('close', () => {
      //console.log('Connection closed');
    });
  })
}

function readIndex(fd, index, size) {
  return new Promise(async (resolve, reject) => {
    const newBuffer = Buffer.alloc(size);
    const buffer = await (new Promise((resolve, reject) => { fs.read(fd, newBuffer, 0, size, index, (err, bytesRead, buffer) => { resolve(buffer); }) }));
  })
}

module.exports = (ipsPath, newPath) => {
  return new Promise(async (resolve, reject) => {
    const writeStream = fs.createWriteStream(newPath);
    const serverListFD = await (new Promise((resolve, reject) => { fs.open(ipsPath, 'r', (err, fd) => { resolve(fd); }) }));
    const totalServers = fs.statSync(ipsPath).size / 6;
    console.log(`Total servers: ${totalServers}`);
    const verified = [];
    var serversPinged = 0;

    function getServer(i) {
      const server = readIndex(serverListFD, i * 6, 6);
      const ip = `${server[0]}.${server[1]}.${server[2]}.${server[3]}`;
      const port = server[4] * 256 + server[5];
      return { ip, port }
    }
  
    async function pingServer(serverIndex) {
      serversPinged++;
      if (serversPinged % 20000 == 0) console.log(serversPinged);
      if (verified.includes(serverIndex)) return;
      const server = getServer(serverIndex);
      try {
        const response = await ping(server.ip, server.port, 0, rescanTimeout);
        if (typeof response === 'object') {
          verified.push(serverIndex);
          writeStream.write(readIndex(serverListFD, index * 6, 5));
        }
      } catch (error) {}
    }
  
    function scanBatch(i, startNum) {
      return new Promise((resolve, reject) => {
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
            setTimeout(function() { scanBatch(0), startNum }, rescanTimeout);
          }
        } else {
          // scan up to the server that was started with (after restarting at the beginning)
          if (i + rescanRate < startNum) {
            for (var j = i; j < i + rescanRate; j++) {
              pingServer(j)
            }
            setTimeout(function() { scanBatch(i + rescanRate), startNum }, rescanTimeout);
          } else {
            for (var j = i; j < startNum - i; j++) {
              pingServer(j)
            }
    
            writeStream.close();
            resolve();
          }
        }
      })
    }

    for (var i = 0; i < rescans; i++) {
      serversPinged = 0;
      var startNum = Math.floor(Math.random() * Math.floor(totalServers / rescanRate)) * rescanRate;
      if (startNum == 0) startNum = rescanRate;
      const startTime = new Date();
      await scanBatch(startNum, startNum);
      console.log(`Finished scan ${i + 1}/${rescans} in ${(new Date() - startTime) / 1000} seconds at ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}.`);
      resolve();
    }
  })
}