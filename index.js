const fs = require('fs');
const { spawn } = require('child_process');
const config = require('./config.json');

async function fullPort(port) {
  const writeStream = fs.createWriteStream('./ips1');
  const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p ${port} 0.0.0.0/0 --rate=${config.packetLimit} --excludefile ./exclude.conf -oJ -`]);

  var leftOver = null;
  childProcess.stdout.on('data', (data) => {
    var string = data.toString();
    if (leftOver == null) string = string.substring(string.indexOf('{'));
    if (leftOver != null) string = leftOver + string;
    for (var i = 0; i < string.split('\n,\n').length - 1; i++) {
      var line = string.split('\n,\n')[i];
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
          writeStream.write(buffer);
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
            writeStream.write(buffer);
          }
          leftOver = '';
        } catch (err) {
          leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
        }
      } catch (err) {}
    }
  });

  childProcess.stderr.on('data', (data) => {
    console.log(data.toString());
  });

  childProcess.on('close', async (code) => {
    if (code === 0) {
      console.log('Masscan finished.');
      writeStream.end();
      known24s();
    } else {
      console.error(`Command exited with code ${code}`);
    }
  });
}

async function known24s() {
  fs.copyFileSync('./ips1', './ips2');
  const writeStream = fs.createWriteStream('./ips2');
  const includeWriteStream = fs.createWriteStream('./includeFile.txt');
  await (new Promise((resolve, reject) => {
    const size = fs.statSync('ips1').size;
    const stream = fs.createReadStream('ips1');
    var sizeWritten = 0;
    const logInterval = setInterval(() => { console.log(`Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`); }, 2000);
    var lastData = null;
    stream.on('data', (data) => {
      if (lastData != null) data = Buffer.concat([lastData, data]);
      for (var i = 0; i < Math.floor(data.length / 6) * 6; i += 6) {
        includeWriteStream.write(`${sizeWritten == 0 && i == 0 ? '' : ','}${data[i]}.${data[i + 1]}.${data[i + 2]}.0/24`);
      }
      lastData = data.length % 6 == 0 ? null : data.slice(Math.floor(data.length / 6) * 6);
      sizeWritten += data.length;
    }).on('error', err => {
      throw err;
    }).on('end', () => {
      console.log('Finished gathering last scan data.');
      includeWriteStream.close();
      clearInterval(logInterval);
      resolve();
    });
  }));
  
  const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p 25500-25564,25566-25700 --include-file includeFile.txt --rate=${config.packetLimit}  --excludefile ./exclude.conf -oJ -`]);

  var leftOver = null;
  childProcess.stdout.on('data', (data) => {
    var string = data.toString();
    if (leftOver == null) string = string.substring(string.indexOf('{'));
    if (leftOver != null) string = leftOver + string;
    for (var i = 0; i < string.split('\n,\n').length - 1; i++) {
      var line = string.split('\n,\n')[i];
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
          writeStream.write(buffer);
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
            writeStream.write(buffer);
          }
          leftOver = '';
        } catch (err) {
          leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
        }
      } catch (err) {}
    }
  });

  childProcess.stderr.on('data', (data) => {
    console.log(data.toString());
  });

  childProcess.on('close', async (code) => {
    if (code === 0) {
      fs.unlinkSync('./includeFile.txt');
      writeStream.end();
      console.log('Masscans finished');
      knownIps();
    } else {
      console.error(`Command exited with code ${code}`);
    }
  });
}

async function knownIps() {
  fs.copyFileSync('./ips2', './ips');
  const writeStream = fs.createWriteStream('./ips');
  const includeWriteStream = fs.createWriteStream('./includeFile.txt');
  await (new Promise((resolve, reject) => {
    const size = fs.statSync('ips2').size;
    const stream = fs.createReadStream('ips2');
    var sizeWritten = 0;
    const logInterval = setInterval(() => { console.log(`Gathering last scan data: ${sizeWritten}/${size} (${Math.floor(sizeWritten / size * 100)}%)`); }, 2000);
    var lastData = null;
    stream.on('data', (data) => {
      if (lastData != null) data = Buffer.concat([lastData, data]);
      for (var i = 0; i < Math.floor(data.length / 6) * 6; i += 6) {
        includeWriteStream.write(`${sizeWritten == 0 && i == 0 ? '' : ','}${data[i]}.${data[i + 1]}.${data[i + 2]}.${data[i + 3]}`);
      }
      lastData = data.length % 6 == 0 ? null : data.slice(Math.floor(data.length / 6) * 6);
      sizeWritten += data.length;
    }).on('error', err => {
      throw err;
    }).on('end', () => {
      console.log('Finished gathering last scan data.');
      includeWriteStream.close();
      clearInterval(logInterval);
      resolve();
    });
  }));

  const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p 0-25499,25701-65535 --include-file includeFile.txt --rate=${config.packetLimit}  --excludefile ./exclude.conf -oJ -`]);

  var leftOver = null;
  childProcess.stdout.on('data', (data) => {
    var string = data.toString();
    if (leftOver == null) string = string.substring(string.indexOf('{'));
    if (leftOver != null) string = leftOver + string;
    for (var i = 0; i < string.split('\n,\n').length - 1; i++) {
      var line = string.split('\n,\n')[i];
      try {
        if (line.startsWith('[')) line = line.substring(1);
        const obj = JSON.parse(line);
        for (const port of obj.ports) {
          splitIP = obj.ip.split('.');
          const buffer = Buffer.from([
            parseInt(splitIP[0]),
            parseInt(splitIP[1]),
            parseInt(splitIP[2]),
            parseInt(splitIP[3]),
            Math.floor(port / 256),
            port % 256
          ]);
          writeStream.write(buffer);
        }
        try {
          const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
          for (const port of obj.ports) {
            splitIP = obj.ip.split('.');
            const buffer = Buffer.from([
              parseInt(splitIP[0]),
              parseInt(splitIP[1]),
              parseInt(splitIP[2]),
              parseInt(splitIP[3]),
              Math.floor(port / 256),
              port % 256
            ]);
            writeStream.write(buffer);
          }
          leftOver = '';
        } catch (err) {
          leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
        }
      } catch (err) {}
    }
  });

  childProcess.stderr.on('data', (data) => {
    console.log(data.toString());
  });

  childProcess.on('close', async (code) => {
    if (code === 0) {
      console.log('Masscan finished.');
      writeStream.end();
      fs.unlinkSync('./includeFile.txt');
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
      } else {
        if (config.repeat) fullPort(25565);
      }
    } else {
      console.error(`Command exited with code ${code}`);
    }
  });
}

fullPort(25565);