const fs = require('fs');
const { exec } = require('child_process');

async function fullPort(port) {
  exec(`sudo masscan -p ${port} 0.0.0.0/0 --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan.json`, (error, stdout, stderr) => {
    console.log(stdout);
  }); 

  masscanProcess.on('exit', async (code, signal) => {
    console.log('Masscan finished.');
    await save();
    knownIps();
  });
}

async function knownIps() {
  ips = '';
  fs.open('ips', 'r', function(status, fd) {
    if (status) {
      console.log(status.message);
      return;
    }
    const size = fs.statSync('ips').size;
    var buffer = Buffer.alloc(size);
    fs.read(fd, buffer, 0, buffer.length, 0, function(err, num) {
      console.log(`size: ${size}`);
  
      for (var i = 0; i < buffer.length; i += 6) {
        if (ips != '') ips += ',';
        ips += `${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${buffer[i + 3]}`;
      }

      const masscanProcess = exec(`sudo masscan -p 1025-65535 ${ips} --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan.json`);

      masscanProcess.stdout.on('data', (data) => {
        console.log(data);
      });

      masscanProcess.on('exit', async (code, signal) => {
        console.log('Masscan finished.');
        await save();
      }); 
    });
  });
}

const save = function() {
    return new Promise(resolve => {
    const scan = require('./masscan.json');
    
    var buffer = Buffer.alloc(0);
    for (const obj of scan) {
      for (const port of obj.ports) {
        if (port.reason != "syn-ack") {
          const splitIP = obj.ip.split('.')
          buffer = Buffer.concat([
            buffer,
            Buffer.from([splitIP[0], splitIP[1], splitIP[2], splitIP[3], Math.floor(port.port / 256), port.port % 256])
          ]);
        }
      }
    }
    fs.writeFileSync('./ips', buffer);

    resolve();
  });
}

fullPort(25565);