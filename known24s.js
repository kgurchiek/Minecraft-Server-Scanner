const fs = require('fs');
const { spawn } = require('child_process');
const config = require('./config.json')

async function known24s() {
  const writeStream = fs.createWriteStream('./ips2');
  const ips = {};
  const ipRanges = {};
  fs.open('ips1', 'r', function(status, fd) {
    if (status) {
      console.log(status.message);
      return;
    }
    const size = fs.statSync('ips1').size;
    var buffer = Buffer.alloc(size);
    fs.read(fd, buffer, 0, buffer.length, 0, function(err, num) {
      console.log(`size: ${size}`);

      for (var i = 0; i < buffer.length; i += 6) {
        ips[`${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${buffer[i + 3]}:${buffer[i + 4] * 256 + buffer[i + 5]}`] = 0;
        ipRanges[`${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.0/24`] = 0;
      }

      fs.writeFile('./includeFile.txt', JSON.stringify(Object.keys(ipRanges)).replaceAll('"', '').replaceAll('[', '').replaceAll(']', ''), function (err) {
        if (err) console.error(err);
        const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p 25500-25700 --include-file includeFile.txt --rate=${config.packetLimit}  --excludefile ./exclude.conf -oJ -`]);

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
                ips[`${obj.ip}:${port.port}`] = 0;
              }
              try {
                const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
                for (const port of obj.ports) {
                  ips[`${obj.ip}:${port.port}`] = 0;
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
            for (const ip of Object.keys(ips)) {
              splitIP = ip.split(':')[0].split('.');
              port = ip.split(':')[1];
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
            console.log('Masscan finished.');
            writeStream.end();
            //knownIps();
          } else {
            console.error(`Command exited with code ${code}`);
          }
        });
      });
    });
  });
}

known24s();