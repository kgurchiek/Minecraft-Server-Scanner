function save2() {
  return new Promise(resolve => {
  const scan = require('./masscan2.json');
  
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
  fs.writeFile('./ips2', buffer, (err) => {
    console.log(err);
  });

  resolve();
});
}

save2();