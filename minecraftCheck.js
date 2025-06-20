const fs = require('fs');
const net = require('net');
const varint = require('varint');
const { rescans, rescanRate, rescanTimeout } = require('./config.json');

function ping(ip, port, protocol, timeout) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    const timeoutCheck = setTimeout(() => {
      client.destroy();
      resolve(false);
    }, timeout);

    client.connect(port, ip, () => {
      const handshakePacket = Buffer.concat([
        Buffer.from([0x00]), // packet ID
        Buffer.from(varint.encode(protocol)), //protocol version
        Buffer.from([ip.length]),
        Buffer.from(ip, 'utf-8'), // ip
        Buffer.from(new Uint16Array([port]).buffer).reverse(), // port
        Buffer.from([0x01]), // next state (2)
        Buffer.from([0x01]), // status request size
        Buffer.from([0x00]) // status request
      ]);
      var packetLength = Buffer.alloc(1);
      packetLength.writeUInt8(handshakePacket.length - 2);
      const buffer = Buffer.concat([packetLength, handshakePacket]);
      client.write(buffer);
    });

    client.on('data', (data) => {
      client.destroy();
      clearTimeout(timeoutCheck);
      try {
        varint.decode(data);
        const packetId = data[varint.decode.bytes];
        data = data.slice(varint.decode.bytes + 1);
        varint.decode(data);
        data = data.slice(varint.decode.bytes);
        resolve(packetId == 0 && data.toString()[0] == '{')
      } catch (e) { resolve(false) }
    });

    client.on('error', client.destroy );

    client.on('close', client.destroy );
  })
}

function readIndex(fd, index, size) {
  return new Promise(async (resolve, reject) => {
    const newBuffer = Buffer.alloc(size);
    resolve(await (new Promise((resolve, reject) => { fs.read(fd, newBuffer, 0, size, index, (err, bytesRead, buffer) => { resolve(buffer); }) })));
  })
}

module.exports = (ipsPath, newPath, prefix = '', flag = 'w') => {
  return new Promise(async (resolve, reject) => {
    const dupeCheck = new Set();
    const queue = [];
    const writeStream = fs.createWriteStream(newPath, { flags: flag });
    const serverListFD = await (new Promise((resolve, reject) => { fs.open(ipsPath, 'r', (err, fd) => { resolve(fd); }) }));
    const totalServers = fs.statSync(ipsPath).size / 6;
    console.log(prefix, `Total servers: ${totalServers}`);
    var serversPinged = 0;
    var totalResults = 0;
    var startTime;

    async function write() {
      if (queue.length > 0) {
        const buffer = Buffer.concat(queue);
        queue.splice(0);
        if (!writeStream.write(buffer)) await new Promise((res) => writeStream.once('drain', res));
      }
      setTimeout(write);
    }
    write();

    async function getServer(i) {
      const server = await readIndex(serverListFD, i * 6, 6);
      const ip = `${server[0]}.${server[1]}.${server[2]}.${server[3]}`;
      const port = server[4] * 256 + server[5];
      return { ip, port }
    }
  
    async function pingServer(serverIndex) {
      serversPinged++;
      if (dupeCheck.has(serverIndex)) return;
      const server = await getServer(serverIndex);
      try {
        if (await ping(server.ip, server.port, 0, rescanTimeout)) {
          totalResults++;
          dupeCheck.add(serverIndex);
          const splitIP = server.ip.split('.');
          queue.push(Buffer.from([
            parseInt(splitIP[0]),
            parseInt(splitIP[1]),
            parseInt(splitIP[2]),
            parseInt(splitIP[3]),
            Math.floor(server.port / 256),
            server.port % 256
          ]));
        }
      } catch (error) {}
    }
  
    function scanBatchPromise(i, startNum) {
      return new Promise((resolve, reject) => {
        async function scanBatch(i, startNum) {
          if (i >= startNum) {
            if (i + rescanRate < totalServers) {
              // scan through the end of the server list
              for (var j = i; j < i + rescanRate; j++) pingServer(j);
              setTimeout(() => { scanBatch(i + rescanRate, startNum) }, rescanTimeout);
            } else {
              // once the end of the list is reached, restart at the beginning
              for (var j = i; j < totalServers; j++) pingServer(j);
              setTimeout(() => { scanBatch(0, startNum) }, rescanTimeout);
            }
          } else {
            // scan up to the server that was started with (after restarting at the beginning)
            if (i + rescanRate < startNum) {
              for (var j = i; j < i + rescanRate; j++) pingServer(j);
              setTimeout(() => { scanBatch(i + rescanRate, startNum) }, rescanTimeout);
            } else {
              for (var j = i; j < startNum - i; j++) pingServer(j);

              resolve();
            }
          }
        }
        scanBatch(i, startNum);
      })
    }

    const progressLog = setInterval(() => {
      const averageRate = Math.floor((new Date().getTime() - startTime) / 1000) / serversPinged;
      let estimatedTime = Math.floor(totalServers - serversPinged) * averageRate;
      const hours = Math.floor(estimatedTime / 3600);
      estimatedTime %= 3600;
      const minutes = Math.floor(estimatedTime / 60);
      estimatedTime %= 60
      const seconds = Math.floor(estimatedTime);
      console.log(prefix, `${serversPinged}/${totalServers} (${Math.floor(serversPinged / totalServers * 100)}%)  Results: ${totalResults}  Estimated ${hours > 0 ? `${hours}:${minutes < 10 ? 0 : ''}${minutes}` : minutes}:${seconds < 10 ? 0 : ''}${seconds} remaining.`)
    }, 3000);

    for (var i = 0; i < rescans; i++) {
      serversPinged = 0;

      var startNum = Math.floor(Math.random() * Math.floor(totalServers / rescanRate)) * rescanRate;
      if (startNum == 0) startNum = rescanRate;
      startTime = new Date().getTime();
      await scanBatchPromise(startNum, startNum);
      clearInterval(progressLog);
      console.log(prefix, `Finished scanning ${totalResults} servers on scan ${i + 1}/${rescans} in ${(new Date() - startTime) / 1000} seconds at ${new Date().toLocaleString()}.`);
    }
    await (new Promise(res => {
      const interval = setInterval(() => {
        if (queue.length == 0) {
          clearInterval(interval);
          res();
        } else console.log(prefix, `Finishing write queue: ${queue.length} servers remanining.`);
      }, 300);
    }));
    writeStream.close();
    resolve();
  })
}