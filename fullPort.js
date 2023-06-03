const fs = require('fs');
const { spawn } = require('child_process');

async function fullPort(port) {
  const writeStream = fs.createWriteStream('./ips1');
  const childProcess = spawn('sh', ['-c', `sudo masscan -p ${port} 0.0.0.0/0 --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ -`]);

  childProcess.stdout.on('data', (data) => {
    // Process the output as needed
    if (line.startsWith('{')) {
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
    } else {
      console.log(data.toString());
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

fullPort(25500);