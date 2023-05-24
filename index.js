const fs = require('fs');
const { spawn } = require('child_process');

async function fullPort(port) {
  const childProcess = spawn('sh', ['-c', `sudo masscan -p ${port} 0.0.0.0/0 --rate=100000 --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan.json`]);

  childProcess.stdout.on('data', (data) => {
    // Process the output as needed
    console.log(data.toString());
  });

  childProcess.stderr.on('data', (data) => {
    // Handle any error output
    console.error(data.toString());
  });

  childProcess.on('close', async (code) => {
    if (code === 0) {
      console.log('Masscan finished.');
      await save();
      knownIps();
    } else {
      console.error(`Command exited with code ${code}`);
    }
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

      fs.writeFileSync('./includeFile.txt', ips);
      const childProcess = spawn('sh', ['-c', `sudo masscan -p 25500-256000 --include-file includeFile.txt --rate=100000 --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan.json`]);

      childProcess.stdout.on('data', (data) => {
        // Process the output as needed
        console.log(data.toString());
      });

      childProcess.stderr.on('data', (data) => {
        // Handle any error output
        console.error(data.toString());
      });

      childProcess.on('close', async (code) => {
        if (code === 0) {
          console.log('Masscan finished.');
          await save2();
        } else {
          console.error(`Command exited with code ${code}`);
        }
      });
    });
  });
}

function save() {
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

function save2() {
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
  fs.writeFileSync('./ips2', buffer);

  resolve();
});
}

fullPort(25565);