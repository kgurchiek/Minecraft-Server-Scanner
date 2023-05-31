const fs = require('fs');
const readline = require('readline');
const { spawn } = require('child_process');
const { MongoClient } = require('mongodb');
const client = new MongoClient("mongodb+srv://Cornbread2100:Cornbread2100%28900%29@mcss.4nrik58.mongodb.net/?retryWrites=true&w=majority");
const scannedServers = client.db("MCSS").collection("scannedServers");
const config = require('./config.json');

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

(async () => {
  console.log('Saving...');
  await save3();
  console.log('Saved.');
})();