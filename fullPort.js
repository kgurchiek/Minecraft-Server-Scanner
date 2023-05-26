const fs = require('fs');
const { spawn } = require('child_process');

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
      //await save();
      //knownIps();
    } else {
      console.error(`Command exited with code ${code}`);
    }
  });
}

fullPort(25500);