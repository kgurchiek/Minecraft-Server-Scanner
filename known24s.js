const fs = require('fs');
const { spawn } = require('child_process');

async function known24s() {
  ips = {};
  fs.open('ips1', 'r', function(status, fd) {
    if (status) {
      console.log(status.message);
      return;
    }
    const size = fs.statSync('ips1').size;
    var buffer = Buffer.alloc(size);
    fs.read(fd, buffer, 0, buffer.length, 0, function(err, num) {
      console.log(`size: ${size}`);

      for (var i = 0; i < buffer.length; i += 6) ips[`${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.0/24`] = 0;

      fs.writeFile('./includeFile.txt', JSON.stringify(Object.keys(ips)).replaceAll('"', '').replaceAll('[', '').replaceAll(']', ''), function (err) {
        if (err) console.error(err);
        const childProcess = spawn('sh', ['-c', `sudo masscan -p 25540-25700 --include-file includeFile.txt --rate=100000 --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan2.json`]);

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
          } else {
            console.error(`Command exited with code ${code}`);
          }
        });
      });
    });
  });
}

known24s();