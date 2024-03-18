const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const minecraftCheck = require('./minecraftCheck.js');
const config = require('./config.json');

function fullPort(port) {
  const dupeCheck = new Set();
  const queue = [];
  const writeStream = fs.createWriteStream('./ips1');
  async function write() {
    if (queue.length > 0) {
      const buffer = Buffer.concat(queue);
      queue.splice(0);
      if (!writeStream.write(buffer)) await new Promise((res) => writeStream.once('drain', res));
    }
    setTimeout(write);
  }
  write();

  const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p ${port} 0.0.0.0/0 --rate=${config.packetLimit}  --excludefile ./exclude.conf -oJ -`]);

  let leftOver = null;
  childProcess.stdout.on('data', async (data) => {
    let string = data.toString();
    if (leftOver == null) string = string.substring(string.indexOf('{'));
    if (leftOver != null) string = leftOver + string;
    for (let i = 0; i < string.split('\n,\n').length - 1; i++) {
      let line = string.split('\n,\n')[i];
      try {
        if (line.startsWith('[')) line = line.substring(1);
        const obj = JSON.parse(line);
        for (const port of obj.ports) {
          const splitIP = obj.ip.split('.');
          const buffer = Buffer.from([
            parseInt(splitIP[0]),
            parseInt(splitIP[1]),
            parseInt(splitIP[2]),
            parseInt(splitIP[3]),
            Math.floor(port.port / 256),
            port.port % 256
          ]);
          if (!dupeCheck.has(buffer.toString())) {
            dupeCheck.add(buffer.toString());
            queue.push(buffer);
          }
        }
        try {
          const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
          for (const port of obj.ports) {
            const splitIP = obj.ip.split('.');
            const buffer = Buffer.from([
              parseInt(splitIP[0]),
              parseInt(splitIP[1]),
              parseInt(splitIP[2]),
              parseInt(splitIP[3]),
              Math.floor(port.port / 256),
              port.port % 256
            ]);
            if (!dupeCheck.has(buffer.toString())) {
              dupeCheck.add(buffer.toString());
              queue.push(buffer);
            }
          }
          leftOver = '';
        } catch (err) {
          leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
        }
      } catch (err) {}
    }
  });

  childProcess.stderr.on('data', (data) => console.log(data.toString()));

  childProcess.on('close', async (code) => {
    if (code === 0) {
      console.log('Masscan finished.');
      await (new Promise(res => {
        const interval = setInterval(() => {
          if (queue.length == 0) {
            clearInterval(interval);
            res();
          } else console.log(`Finishing write queue: ${queue.length} servers remanining.`);
        }, 300);
      }));
      writeStream.end();
      dupeCheck.clear();
      await minecraftCheck('./ips1', './ips1Filtered');
    } else console.error(`Command exited with code ${code}`);
  });
}

async function known24s() {
  const dupeCheck = new Set();
  const queue = [];
  const writeStream = fs.createWriteStream('./ips2');
  fs.copyFileSync('./ips1Filtered', './ips2Filtered');
  const includeWriteStream = fs.createWriteStream('./includeFile.txt');
  await (new Promise((resolve, reject) => {
    const size = fs.statSync('ips1Filtered').size;
    const stream = fs.createReadStream('ips1Filtered');
    let sizeWritten = 0;
    console.log(`Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`);
    const logInterval = setInterval(() => { console.log(`Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`); }, 2000);
    const written24s = new Set();
    let lastData = null;
    stream.on('data', (data) => {
      if (lastData != null) data = Buffer.concat([lastData, data]);
      for (let i = 0; i < Math.floor(data.length / 6) * 6; i += 6) {
        sizeWritten += 6;
        if (written24s.has(data.subarray(i, i + 3).toString())) continue;
        written24s.add(data.subarray(i, i + 3).toString());
        queue.push(`${(sizeWritten == 6 && i == 0) ? '' : ',\n'}${data[i]}.${data[i + 1]}.${data[i + 2]}.0/24`)
      }
      lastData = data.length % 6 == 0 ? null : data.slice(Math.floor(data.length / 6) * 6);
    }).on('error', err => {
      throw err;
    }).on('end', () => {});
    async function finishCheck() {
      if (sizeWritten == size && queue.length == 0) {
        console.log('Finished gathering last scan data.');
        includeWriteStream.close();
        clearInterval(logInterval);
        written24s.clear();
        resolve();
      } else {
        if (queue.length > 0) {
          const queueCopy = [...queue];
          queue.splice(0);
          if (!includeWriteStream.write(queueCopy.join(''))) await new Promise((res) => includeWriteStream.once('drain', res));
        }
        setTimeout(finishCheck);
      }
    }
    finishCheck();
  }));
  
  async function write() {
    if (queue.length > 0) {
      const buffer = Buffer.concat(queue);
      queue.splice(0);
      if (!writeStream.write(buffer)) await new Promise((res) => writeStream.once('drain', res));
    }
    setTimeout(write);
  }
  write();
  
  const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p 25500-25564,25566-25700 --include-file includeFile.txt --rate=${config.packetLimit} --excludefile exclude.conf -oJ -`]);

  let leftOver = null;
  childProcess.stdout.on('data', async (data) => {
    let string = data.toString();
    if (leftOver == null) string = string.substring(string.indexOf('{'));
    if (leftOver != null) string = leftOver + string;
    for (let i = 0; i < string.split('\n,\n').length - 1; i++) {
      let line = string.split('\n,\n')[i];
      try {
        if (line.startsWith('[')) line = line.substring(1);
        const obj = JSON.parse(line);
        for (const port of obj.ports) {
          const splitIP = obj.ip.split('.');
          const buffer = Buffer.from([
            parseInt(splitIP[0]),
            parseInt(splitIP[1]),
            parseInt(splitIP[2]),
            parseInt(splitIP[3]),
            Math.floor(port.port / 256),
            port.port % 256
          ]);
          if (!dupeCheck.has(buffer.toString())) {
            dupeCheck.add(buffer.toString());
            queue.push(buffer);
          }
        }
        try {
          const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
          for (const port of obj.ports) {
            const splitIP = obj.ip.split('.');
            const buffer = Buffer.from([
              parseInt(splitIP[0]),
              parseInt(splitIP[1]),
              parseInt(splitIP[2]),
              parseInt(splitIP[3]),
              Math.floor(port.port / 256),
              port.port % 256
            ]);
            if (!dupeCheck.has(buffer.toString())) {
              dupeCheck.add(buffer.toString());
              queue.push(buffer);
            }
          }
          leftOver = '';
        } catch (err) {
          leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
        }
      } catch (err) {}
    }
  });

  childProcess.stderr.on('data', (data) => console.log(data.toString()));

  childProcess.on('close', async (code) => {
    if (code === 0) {
      fs.unlinkSync('./includeFile.txt');
      console.log('Masscan finished');
      await (new Promise(res => {
        const interval = setInterval(() => {
          if (queue.length == 0) {
            clearInterval(interval);
            res();
          } else console.log(`Finishing write queue: ${queue.length} servers remanining.`);
        }, 300);
      }));
      writeStream.end();
      await minecraftCheck('./ips2', './ips2Filtered', 'a'); 
      //knownIps();
    } else console.error(`Command exited with code ${code}`);
  });
}

async function knownIps() {
//   fs.copyFileSync(path.join(__dirname, './ips2Filtered'), path.join(__dirname, './ips'));
//   const writeStream = fs.createWriteStream('./ipsUnfiltered');
//   const includeWriteStream = fs.createWriteStream('./includeFile.txt');
//   await (new Promise((resolve, reject) => {
//     const size = fs.statSync('ips2Filtered').size;
//     const stream = fs.createReadStream('ips2Filtered');
//     var sizeWritten = 0;
//     const logInterval = setInterval(() => { console.log(`Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`); }, 2000);
//     var knownIps = {};
//     var lastData = null;
//     stream.on('data', (data) => {
//       if (lastData != null) data = Buffer.concat([lastData, data]);
//       for (var i = 0; i < Math.floor(data.length / 6) * 6; i += 6) {
//         if (knownIps[data.subarray(i, i + 4)] === null) continue;
//         knownIps[data.subarray(i, i + 4)] = null;
//         includeWriteStream.write(`${sizeWritten == 0 && i == 0 ? '' : ','}${data[i]}.${data[i + 1]}.${data[i + 2]}.${data[i + 3]}`);
//       }
//       lastData = data.length % 6 == 0 ? null : data.slice(Math.floor(data.length / 6) * 6);
//       sizeWritten += data.length;
//     }).on('error', err => {
//       knownIps = null;
//       throw err;
//     }).on('end', () => {
//       knownIps = null;
//       console.log('Finished gathering last scan data.');
//       includeWriteStream.close();
//       clearInterval(logInterval);
//       resolve();
//     });
//   }));

//   const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p 0-25499,25701-65535 --include-file includeFile.txt --rate=${config.packetLimit}  --excludefile ./exclude.conf -oJ -`]);

//   var leftOver = null;
//   childProcess.stdout.on('data', (data) => {
//     var string = data.toString();
//     if (leftOver == null) string = string.substring(string.indexOf('{'));
//     if (leftOver != null) string = leftOver + string;
//     for (var i = 0; i < string.split('\n,\n').length - 1; i++) {
//       var line = string.split('\n,\n')[i];
//       try {
//         if (line.startsWith('[')) line = line.substring(1);
//         const obj = JSON.parse(line);
//         for (const port of obj.ports) {
//           splitIP = obj.ip.split('.');
//           const buffer = Buffer.from([
//             parseInt(splitIP[0]),
//             parseInt(splitIP[1]),
//             parseInt(splitIP[2]),
//             parseInt(splitIP[3]),
//             Math.floor(port / 256),
//             port % 256
//           ]);
//           writeStream.write(buffer);
//         }
//         try {
//           const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
//           for (const port of obj.ports) {
//             splitIP = obj.ip.split('.');
//             const buffer = Buffer.from([
//               parseInt(splitIP[0]),
//               parseInt(splitIP[1]),
//               parseInt(splitIP[2]),
//               parseInt(splitIP[3]),
//               Math.floor(port / 256),
//               port % 256
//             ]);
//             writeStream.write(buffer);
//           }
//           leftOver = '';
//         } catch (err) {
//           leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
//         }
//       } catch (err) {}
//     }
//   });

//   childProcess.stderr.on('data', (data) => {
//     console.log(data.toString());
//   });

//   childProcess.on('close', async (code) => {
//     if (code === 0) {
//       console.log('Masscan finished.');
//       writeStream.end();
//       fs.unlinkSync('./includeFile.txt');
//       await minecraftCheck('./ipsUnfiltered', './ips');
      if (config.gitPush) {
        const childProcess = spawn('sh', ['-c', `git config --global user.email "${config.gitEmail}" ; git config --global user.name "${config.gitUser}" ; git add ips ; git commit -m "${Math.round((new Date()).getTime() / 1000)}" ; git push`]);
        childProcess.stdout.on('data', (data) => {
          console.log(data.toString());
        });

        childProcess.stderr.on('data', (data) => {
          console.error(data.toString());
        });

        childProcess.on('close', async (code) => {
          if (code != 0) {
            console.error(`Command exited with code ${code}`);
          }
          if (config.repeat) fullPort(25565);
        });
      } else if (config.repeat) fullPort(25565);
  //   } else {
  //     console.error(`Command exited with code ${code}`);
  //   }
  // });
}

fullPort(25565);