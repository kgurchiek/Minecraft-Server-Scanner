const fs = require('fs');
const { spawn } = require('child_process');
const minecraftCheck = require('../minecraftCheck.js');
const config = require('../config.json');

const resultBuffers = new Set();

async function fullPort(port) {
  const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p ${port} 0.0.0.0/0 --rate=${config.packetLimit}  --excludefile ./exclude.conf -oJ -`]);

  var leftOver = null;
  childProcess.stdout.on('data', (data) => {
    var string = data.toString();
    if (leftOver == null) string = string.substring(string.indexOf('{'));
    if (leftOver != null) string = leftOver + string;
    for (var i = 0; i < string.split('\n,\n').length - 1; i++) {
      var line = string.split('\n,\n')[i];
      if (line.startsWith('[') || line.startsWith(',')) line = line.substring(1);
      if (line.substring(line.length - 1) == ']') line = line.substring(0, line.length - 1);
      if (line == '') continue;
      try {
        const obj = JSON.parse(line);
        for (const port of obj.ports) if (!resultBuffers.has(`${obj.ip}:${port.port}`)) resultBuffers.add(`${obj.ip}:${port.port}`);
        try {
          const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
          for (const port of obj.ports) if (!resultBuffers.has(`${obj.ip}:${port.port}`)) resultBuffers.add(`${obj.ip}:${port.port}`);
          leftOver = '';
        } catch (err) {
          leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
        }
      } catch (err) {
        console.log('Error parsing JSON! Please report this:');
        console.log(line)
        console.log(err)
      }
    }
  });

  childProcess.stderr.on('data', (data) => console.log(data.toString()));

  childProcess.on('close', async (code) => {
    const writeStream = fs.createWriteStream('./ips1');
    for (const server of resultBuffers) {
      const splitIp = server.split(':')[0].split('.');
      const port = parseInt(server.split(':')[1]);
      const buffer = Buffer.from([
        parseInt(splitIp[0]),
        parseInt(splitIp[1]),
        parseInt(splitIp[2]),
        parseInt(splitIp[3]),
        Math.floor(port / 256),
        port % 256
      ]);
      await (new Promise(resolve => writeStream.write(buffer, resolve)));
    }
    if (code === 0) {
      console.log('Masscan finished.');
      writeStream.end();
      await minecraftCheck('./ips1', './ips1Filtered'); 
    } else {
      console.error(`Command exited with code ${code}`);
    }
  });
}

fullPort(25565);