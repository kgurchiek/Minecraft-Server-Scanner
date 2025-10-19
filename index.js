const fs = require('fs');
const simpleGit = require('simple-git');
const minecraftCheck = require('./minecraftCheck.js');
const masscan = require('./masscan.js');
const config = require('./config.json');

async function scanPort() {
    if (config.scanPort.enabled) {
        if (config.java) {
            await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p ${config.scanPort.port.java} ${config.scanPort.range.java} --rate=${config.packetLimit} --excludefile exclude.conf -oJ -`, 'ips1Unfiltered', '[1] [Java]');
            await minecraftCheck('ips1Unfiltered', 'ips1', '[1] [Java]');
        }
        if (config.bedrock) {
            await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p U:${config.scanPort.port.bedrock} ${config.scanPort.range.bedrock} --rate=${config.packetLimit} --excludefile exclude.conf -oJ - --nmap-payloads nmap.txt`, 'ips1Unfiltered_b', '[1] [Bedrock]');
            await minecraftCheck('ips1Unfiltered_b', 'ips1_b', '[1] [Bedrock]', 'bedrock');
        }
    }

  known24s();
}

async function known24s() {
    if (config.java) fs.copyFileSync('ips1', 'ips2');
    if (config.bedrock) fs.copyFileSync('ips1_b', 'ips2_b');

    if (config.scan24s.enabled) {
        const include24s = (file) => new Promise((resolve, reject) => {
            const includeWriteStream = fs.createWriteStream('includeFile.txt');
            const size = fs.statSync(file).size;
            const stream = fs.createReadStream(file);
            let sizeWritten = 0;
            console.log('[2]', `Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`);
            const logInterval = setInterval(() => console.log('[2]', `Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`), 2000);
            const written24s = new Set();
            let queue = [];
            let lastData = null;
            stream.on('data', (data) => {
                if (lastData != null) data = Buffer.concat([lastData, data]);
                for (let i = 0; i < Math.floor(data.length / 6) * 6; i += 6) {
                    sizeWritten += 6;
                    if (written24s.has(data.subarray(i, i + 3).toString('hex'))) continue;
                    written24s.add(data.subarray(i, i + 3).toString('hex'));
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
                    if (queue.length > 0 && !includeWriteStream.write(queue.splice(0).join(''))) await new Promise((res) => includeWriteStream.once('drain', res));
                    setTimeout(finishCheck);
                }
            }
            finishCheck();
        });
        
        if (config.java) {
            await include24s('ips1');
            await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p ${config.scanPort.port.java - (config.scan24s.portRange.java / 2)}-${config.scanPort.port.java - 1},${config.scanPort.port.java + 1}-${config.scanPort.port.java + (config.scan24s.portRange.java / 2)} --include-file includeFile.txt --rate=${config.packetLimit} --excludefile exclude.conf -oJ -`, 'ips2Unfiltered', '[2] [Java]');
            await minecraftCheck('ips2Unfiltered', 'ips2', '[2] [Java]', 'java', 'a');
        }
        if (config.bedrock) {
            await include24s('ips1_b');
            await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p U:${config.scanPort.port.bedrock - (config.scan24s.portRange.bedrock / 2)}-${config.scanPort.port.bedrock - 1},U:${config.scanPort.port.bedrock + 1}-${config.scanPort.port.bedrock + (config.scan24s.portRange.bedrock / 2)} --include-file includeFile.txt --rate=${config.packetLimit} --excludefile exclude.conf -oJ - --nmap-payloads nmap.txt`, 'ips2Unfiltered_b', '[2] [Bedrock]');
            await minecraftCheck('ips2Unfiltered_b', 'ips2_b', '[2] [Bedrock]', 'bedrock', 'a');
        }
    }

  knownIps();
}

async function knownIps() {
  if (config.java) fs.copyFileSync('ips2', 'ips');
  if (config.bedrock) fs.copyFileSync('ips2_b', 'ips_b');

    if (config.scanAllPorts.enabled) {
        const includeIps = (file) => new Promise((resolve, reject) => {
            const includeWriteStream = fs.createWriteStream('includeFile.txt');
            const size = fs.statSync(file).size;
            const stream = fs.createReadStream(file);
            let sizeWritten = 0;
            console.log('[3]', `Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`);
            const logInterval = setInterval(() => console.log('[3]', `Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`), 2000);
            const writtenIps = new Set();
            let queue = [];
            let lastData = null;
            stream.on('data', (data) => {
                if (lastData != null) data = Buffer.concat([lastData, data]);
                for (let i = 0; i < Math.floor(data.length / 6) * 6; i += 6) {
                    sizeWritten += 6;
                    if (writtenIps.has(data.subarray(i, i + 4).toString('hex'))) continue;
                    writtenIps.add(data.subarray(i, i + 4).toString('hex'));
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
                    if (queue.length > 0 && !includeWriteStream.write(queue.splice(0).join(''))) await new Promise((res) => includeWriteStream.once('drain', res));
                    setTimeout(finishCheck);
                }
            }
            finishCheck();
        });
    
        if (config.java) {
            await includeIps('ips2');
            await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p 1024-${config.scanPort.port.java - (config.scan24s.portRange / 2) - 1},${config.scanPort.port.java + (config.scan24s.portRange / 2) + 1}-65535 --include-file includeFile.txt --rate=${config.packetLimit} --excludefile exclude.conf -oJ -`, 'ipsUnfiltered', '[3] [Java]');
            await minecraftCheck('ipsUnfiltered', 'ips', '[3] [Java]', 'java', 'a');
        }
        if (config.bedrock) {
            await includeIps('ips2_b');
            await masscan(`${config.sudo ? 'sudo ' : '' }masscan -p U:1024-${config.scanPort.port.bedrock - (config.scan24s.portRange / 2) - 1},U:${config.scanPort.port.java + (config.scan24s.portRange / 2) + 1}-65535 --include-file includeFile.txt --rate=${config.packetLimit} --excludefile exclude.conf -oJ - --nmap-payloads nmap.txt`, 'ipsUnfiltered_b', '[3] [Bedrock]');
            await minecraftCheck('ipsUnfiltered_b', 'ips_b', '[3] [Bedrock]', 'bedrock', 'a');
        }
    }

    if (config.git.push) {
        try {
            let git = new simpleGit();
            await git.addConfig('user.name', config.git.username);
            await git.addConfig('user.email', config.git.email);
            if ((await git.getRemotes()).find(a => a.name == 'origin')) await git.removeRemote('origin');
            await git.addRemote('origin', config.git.url);
            if (config.java) await git.add('ips');
            if (config.bedrock) await git.add('ips_b');
            await git.commit(String(Math.round((new Date()).getTime() / 1000)));
            await git.push('origin', config.git.branch);
            console.log('Pushed to repo.');
        } catch (err) {
            console.log('Error pushing to repo:', err);
        }
    }
    process.exit();
}

scanPort();