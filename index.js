const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const minecraftCheck = require('./minecraftCheck.js');
const masscan = require('./masscan.js');
const config = require('./config.json');

async function scanPort() {
  if (config.scanPort) {
    await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p 25565 0.0.0.0/0 --rate=${config.packetLimit} --excludefile ./exclude.conf -oJ -`, 'ips1Unfiltered', '[1]');
    await minecraftCheck('ips1Unfiltered', 'ips1', '[1]');
  }

  known24s();
}

async function known24s() {
  fs.copyFileSync('./ips1', './ips2');

  if (config.scan24s) {
    const includeWriteStream = fs.createWriteStream('./includeFile.txt');
    await (new Promise((resolve, reject) => {
      const size = fs.statSync('ips1').size;
      const stream = fs.createReadStream('ips1');
      let sizeWritten = 0;
      console.log('[2]', `Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`);
      const logInterval = setInterval(() => console.log('[2]', `Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`), 2000);
      const written24s = new Map();
      let queue = [];
      let lastData = null;
      stream.on('data', (data) => {
        if (lastData != null) data = Buffer.concat([lastData, data]);
        for (let i = 0; i < Math.floor(data.length / 6) * 6; i += 6) {
          sizeWritten += 6;
          if (written24s.get(data.subarray(i, i + 3))) continue;
          written24s.set(data.subarray(i, i + 3), true);
          queue.push(`${data[i]}.${data[i + 1]}.${data[i + 2]}.0/24\n`);
        }
        lastData = data.length % 6 == 0 ? null : data.slice(Math.floor(data.length / 6) * 6);
      }).on('error', err => {
        throw err;
      }).on('end', () => {});
      async function finishCheck() {
        if (sizeWritten == size && queue.length == 0) {
          console.log('[2]', 'Finished gathering last scan data.');
          includeWriteStream.close();
          clearInterval(logInterval);
          written24s.clear();
          resolve();
        } else {
          if (queue.length > 0) {
            if (!includeWriteStream.write(queue.splice(0).join(''))) await new Promise((res) => includeWriteStream.once('drain', res));
          }
          setTimeout(finishCheck);
        }
      }
      finishCheck();
    }));
    
    await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p 25500-25564,25566-25700 --include-file includeFile.txt --rate=${config.packetLimit} --excludefile exclude.conf -oJ -`, 'ips2Unfiltered', '[2]');
    await minecraftCheck('ips2Unfiltered', 'ips2', '[2]', 'a');
  }

  knownIps();
}

async function knownIps() {
  fs.copyFileSync('./ips2', './ips');

  if (config.scanAllPorts) {
    const includeWriteStream = fs.createWriteStream('./includeFile.txt');
    await (new Promise((resolve, reject) => {
      const size = fs.statSync('ips2').size;
      const stream = fs.createReadStream('ips2');
      let sizeWritten = 0;
      console.log('[3]', `Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`);
      const logInterval = setInterval(() => console.log('[3]', `Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`), 2000);
      const writtenIps = new Map();
      let queue = [];
      let lastData = null;
      stream.on('data', (data) => {
        if (lastData != null) data = Buffer.concat([lastData, data]);
        for (let i = 0; i < Math.floor(data.length / 6) * 6; i += 6) {
          sizeWritten += 6;
          if (writtenIps.get(data.subarray(i, i + 4))) continue;
          writtenIps.set(data.subarray(i, i + 4), true);
          queue.push(`${data[i]}.${data[i + 1]}.${data[i + 2]}.${data[i + 3]}\n`);
        }
        lastData = data.length % 6 == 0 ? null : data.slice(Math.floor(data.length / 6) * 6);
      }).on('error', err => {
        throw err;
      }).on('end', () => {});
      async function finishCheck() {
        if (sizeWritten == size && queue.length == 0) {
          console.log('[3]', 'Finished gathering last scan data.');
          includeWriteStream.close();
          clearInterval(logInterval);
          writtenIps.clear();
          resolve();
        } else {
          if (queue.length > 0) {
            if (!includeWriteStream.write(queue.splice(0).join(''))) await new Promise((res) => includeWriteStream.once('drain', res));
          }
          setTimeout(finishCheck);
        }
      }
      finishCheck();
    }));
    
    await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p 1024-25499,25701-65535 --include-file includeFile.txt --rate=${config.packetLimit} --excludefile exclude.conf -oJ -`, 'ipsUnfiltered', '[3]');
    await minecraftCheck('ipsUnfiltered', 'ips', '[3]', 'a');
    
    if (config.gitPush) {
      await new Promise(res => {
        const childProcess = spawn('sh', ['-c', `git config --global user.email "${config.gitEmail}" ; git config --global user.name "${config.gitUser}" ; git add ips ; git commit -m "${Math.round((new Date()).getTime() / 1000)}" ; git push`]);
        childProcess.stdout.on('data', (data) => console.log('[3]', data.toString()));

        childProcess.stderr.on('data', (data) => console.error('[3]', data.toString()));

        childProcess.on('close', async (code) => {
          if (code != 0) console.error(`Command exited with code ${code}`);
          res();
        });
      });
    }
    if (config.repeat) scanPort();
  }
}

scanPort();