const fs = require('fs');
const readline = require('readline');

function save3() {
  return new Promise(resolve => {
    const fileStream = fs.createReadStream('./masscan3.json');
    const writeStream = fs.createWriteStream('./ips3');

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

(async () => {
  console.log('Saving...');
  await save3();
  console.log('Saved.');
})();