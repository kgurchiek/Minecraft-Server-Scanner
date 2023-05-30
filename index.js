const fs = require('fs');
const readline = require('readline');
const { spawn } = require('child_process');
const config = require('./config.json');

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
      known24s();
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
        const childProcess = spawn('sh', ['-c', `sudo masscan -p 25000-33000 --include-file includeFile.txt --rate=100000 --source-port 61000 --banners --excludefile ../masscan/data/exclude.conf -oJ masscan3.json`]);

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
        resolve();
      });
    });
  });
}

fullPort(25565);