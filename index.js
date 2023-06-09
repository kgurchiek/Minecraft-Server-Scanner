const fs = require('fs');
const readline = require('readline');
const { spawn } = require('child_process');
const { MongoClient } = require('mongodb');
const client = new MongoClient("mongodb+srv://public:public@mcss.4nrik58.mongodb.net/?retryWrites=true&w=majority");
const scannedServers = client.db("MCSS").collection("scannedServers");
const config = require('./config.json');

async function fullPort(port) {
  const writeStream = fs.createWriteStream('./ips1');
  const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p ${port} 0.0.0.0/0 --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ./exclude.conf -oJ -`]);

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
      } catch (err) {}
    }
  });

  childProcess.stderr.on('data', (data) => {
    // Handle any error output
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
        const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p 25540-25700 --include-file includeFile.txt --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ./exclude.conf -oJ -`]);

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
                if (port.reason !== "syn-ack") ips[`${obj.ip}:${port.port}`] = 0;
              }
              try {
                const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
                for (const port of obj.ports) {
                  if (port.reason !== "syn-ack") ips[`${obj.ip}:${port.port}`] = 0;
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
            knownIps();
          } else {
            console.error(`Command exited with code ${code}`);
          }
        });
      });
    });
  });
}

async function knownIps() {
  const writeStream = fs.createWriteStream('./ips');
  const ips = {};
  const ipPorts = {};
  fs.open('ips2', 'r', function(status, fd) {
    if (status) {
      console.log(status.message);
      return;
    }
    const size = fs.statSync('ips2').size;
    var buffer = Buffer.alloc(size);
    fs.read(fd, buffer, 0, buffer.length, 0, function(err, num) {
      console.log(`size: ${size}`);

      for (var i = 0; i < buffer.length; i += 6) {
        ips[`${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${buffer[i + 3]}`] = 0;
        ipPorts[`${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${buffer[i + 3]}:${buffer[i + 4] * 256 + buffer[i + 5]}`] = 0;
      }

      fs.writeFile('./includeFile.txt', JSON.stringify(Object.keys(ips)).replaceAll('"', '').replaceAll('[', '').replaceAll(']', ''), function (err) {
        if (err) console.error(err);
        const childProcess = spawn('sh', ['-c', `${config.sudo ? 'sudo ' : '' }masscan -p 0-65535 --include-file includeFile.txt --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ./exclude.conf -oJ masscan2.json`]);

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
                if (port.reason !== "syn-ack") ipPorts[`${obj.ip}:${port.port}`] = 0;
              }
              try {
                const obj = JSON.parse(string.split('\n,\n')[string.split('\n,\n').length - 1]);
                for (const port of obj.ports) {
                  if (port.reason !== "syn-ack") ipPorts[`${obj.ip}:${port.port}`] = 0;
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
            var totalServers = await scannedServers.countDocuments({ 'lastSeen': { '$gte': Math.round((new Date()).getTime() / 1000) - 86400 }});
            var i = 0;
            await scannedServers.find({ 'lastSeen': { '$gte': Math.round((new Date()).getTime() / 1000) - 86400 }}).forEach(doc => {
              console.log(`${i}/${totalServers}`);
              i++;
              ipPorts[`${doc.ip}:${doc.port}`] = 0;
            })
            for (const ip of Object.keys(ipPorts)) {
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
            const childProcess = spawn('sh', ['-c', `git config --global user.email "${config.gitEmail}" ; git config --global user.name "${config.gitUser}" ; git add ips ; git commit -m "${Math.round((new Date()).getTime() / 1000)}" ; git push`]);
            childProcess.stdout.on('data', (data) => {
              // Process the output as needed
              console.log(data.toString());
            });

            childProcess.stderr.on('data', (data) => {
              // Handle any error output
              console.error(data.toString());
            });

            childProcess.on('close', async (code) => {
              if (code != 0) {
                console.error(`Command exited with code ${code}`);
              }
              fullPort(25565);
            });
          } else {
            console.error(`Command exited with code ${code}`);
          }
        });
      });
    });
  });
}

fullPort(25565);