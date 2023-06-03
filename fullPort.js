const fs = require('fs');
const { spawn } = require('child_process');
const config = require('./config.json');

async function fullPort(port) {
  const writeStream = fs.createWriteStream('./ips1');
  const childProcess = spawn('sh', ['-c', `sudo masscan -p ${port} 0.0.0.0/0 --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ -`]);

  var leftOver = null;
  childProcess.stdout.on('data', (data) => {
    console.log('Data')
    console.log(data.toString().split('\n,\n')[0] == '');
    var string = data.toString();
    if (leftOver == null) string = string.substring(string.indexOf('{'));
    if (leftOver != null) string = leftOver + string;
    console.log(`String: ${string.substring(0, 1)}`);
    for (var i = 0; i < string.split('\n,\n').length - 1; i++) {
      var line = string.split('\n,\n')[i];
      if (line.startsWith('\n') || line.startsWith(',') == '') continue;
      const obj = JSON.parse(line);
      for (const port of obj.ports) {
        if (port.reason !== "syn-ack") {
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
      }
      try {
        const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
        for (const port of obj.ports) {
          if (port.reason !== "syn-ack") {
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
        }
        leftOver = '';
      } catch (err) {
        leftOver = string.split('\n,\n')[string.split('\n,\n').length - 1];
      }
    }
  });

  childProcess.stderr.on('data', (data) => {
    // Handle any error output
    console.error(data.toString());
  });

  childProcess.on('close', async (code) => {
    if (code === 0) {
      console.log('Masscan finished.');
      writeStream.end();
      //knownIps();
    } else {
      console.error(`Command exited with code ${code}`);
    }
  });
}

fullPort(25565);