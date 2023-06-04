const fs = require('fs');
const readline = require('readline');
const { spawn } = require('child_process');
const { MongoClient } = require('mongodb');
const client = new MongoClient("mongodb+srv://Cornbread2100:Cornbread2100%28900%29@mcss.4nrik58.mongodb.net/?retryWrites=true&w=majority");
const scannedServers = client.db("MCSS").collection("scannedServers");
const config = require('./config.json');

async function fullPort(port) {
  const writeStream = fs.createWriteStream('./ips1');
  const childProcess = spawn('sh', ['-c', `sudo masscan -p ${port} 185.0.0.0/8 --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ -`]);

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
        const childProcess = spawn('sh', ['-c', `sudo masscan -p 25540-25700 --include-file includeFile.txt --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan2.json`]);

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
  ips = '';
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
        if (ips != '') ips += ',';
        ips += `${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${buffer[i + 3]}`;
      }

      fs.writeFile('./includeFile.txt', ips, function (err) {
        if (err) console.error(err);
        const childProcess = spawn('sh', ['-c', `sudo masscan -p 0-65535 --include-file includeFile.txt --rate=${config.packetLimit} --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan3.json`]);

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
            await save3();
            fullPort(25565);
          } else {
            console.error(`Command exited with code ${code}`);
          }
        });
      });
    });
  });
}

function save() {
  return new Promise(resolve => {
    const fileStream = fs.createReadStream('./masscan.json');
    const writeStream = fs.createWriteStream('./ips1');

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    var i = 0;
    rl.on('line', line => {
      if (i % 100000 == 0) console.log(i);
      i++;
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
      }
    });

    rl.on('close', () => {
      console.log(i);
      writeStream.end();
      resolve();
    });
  });
}

function save2() {
  return new Promise(resolve => {
    const fileStream = fs.createReadStream('./masscan2.json');
    const writeStream = fs.createWriteStream('./ips2');

    fs.open('ips1', 'r', function(status, fd) {
      if (status) {
        console.log(status.message);
        return;
      }
      const size = fs.statSync('ips1').size;
      var buffer = Buffer.alloc(size);
      fs.read(fd, buffer, 0, buffer.length, 0, function(err, num) {
        writeStream.write(buffer);
      })
    })

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    var i = 0;
    rl.on('line', line => {
      if (i % 100000 == 0) console.log(i);
      i++;
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
      }
    });

    rl.on('close', () => {
      console.log(i);
      writeStream.end();
      resolve();
    });
  });
}

function save3() {
  return new Promise(resolve => {
    (async () => {
      const fileStream = fs.createReadStream('./masscan3.json');
      const writeStream = fs.createWriteStream('./ips');

      fs.open('ips2', 'r', function(status, fd) {
        if (status) {
          console.log(status.message);
          return;
        }
        const size = fs.statSync('ips2').size;
        var buffer = Buffer.alloc(size);
        fs.read(fd, buffer, 0, buffer.length, 0, function(err, num) {
          writeStream.write(buffer);
        })
      })

      var totalServers = await scannedServers.countDocuments({ 'lastSeen': { '$gte': Math.round((new Date()).getTime() / 1000) - 86400 }});
      var i = 0;
      await scannedServers.find({ 'lastSeen': { '$gte': Math.round((new Date()).getTime() / 1000) - 86400 }}).forEach(doc => {
        console.log(`${i}/${totalServers}`);
        i++;
        const splitIP = doc.ip.split('.');
        const buffer = Buffer.from([
          parseInt(splitIP[0]),
          parseInt(splitIP[1]),
          parseInt(splitIP[2]),
          parseInt(splitIP[3]),
          Math.floor(doc.port / 256),
          doc.port % 256
        ]);
        writeStream.write(buffer);
      })

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      var i = 0;
      rl.on('line', line => {
        if (i % 100000 == 0) console.log(i);
        i++;
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
        }
      });

      rl.on('close', () => {
        console.log(i);
        writeStream.end();

        const childProcess = spawn('sh', ['-c', `git config --global user.email "${config.gitEmail}" ; git config --global user.name "${config.gitUser}" ; git add ips ; git commit -m "${(new Date()).getTime() / 1000}" ; git push`]);

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
          resolve();
        });
      });
    })();
  });
}

fullPort(25565);