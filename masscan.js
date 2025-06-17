const fs = require('fs');
const { spawn } = require('child_process');

module.exports = (command, output, prefix) => {
    const dupeCheck = new Map();
    const queue = [];
    const writeStream = fs.createWriteStream(output);
    return new Promise(res => {
        async function write() {
            if (queue.length > 0) {
                const buffer = Buffer.concat(queue);
                queue.splice(0);
                if (!writeStream.write(buffer)) await new Promise((res) => writeStream.once('drain', res));
            }
            setTimeout(write);
        }
        write();

        const childProcess = spawn('sh', ['-c', command]);

        let leftOver = '';
        childProcess.stdout.on('data', async (data) => {
            let string = data.toString();
            string = leftOver + string;
            leftOver = '';
            const items = string.split('\n,\n');
            for (let i = 0; i < items.length; i++) {
                let line = items[i];
                if (line.startsWith('[\n')) line = line.substring(2);
                if (line.endsWith('\n]\n')) line = line.substring(0, line.length - 3);
                try {
                    const obj = JSON.parse(line);
                    for (const port of obj.ports) {
                        const splitIP = obj.ip.split('.');
                        const buffer = Buffer.from([
                            parseInt(splitIP[0]),
                            parseInt(splitIP[1]),
                            parseInt(splitIP[2]),
                            parseInt(splitIP[3]),
                            Math.floor(port.port / 256),
                            port.port % 256
                        ]);
                        if (!dupeCheck.get(buffer.toString('hex'))) {
                            dupeCheck.set(buffer.toString('hex'), true);
                            queue.push(buffer);
                        }
                    }
                } catch (err) {
                    leftOver = items[items.length - 1];
                }
            }
        });

        childProcess.stderr.on('data', (data) => console.log(prefix, data.toString()));

        childProcess.on('close', async (code) => {
            if (code === 0) {
                console.log(prefix, 'Masscan finished.');
                await (new Promise(res => {
                    const interval = setInterval(() => {
                        if (queue.length == 0) {
                            clearInterval(interval);
                            res();
                        } else console.log(prefix, `Finishing write queue: ${queue.length} servers remanining.`);
                    }, 300);
                }));
                writeStream.end();
                dupeCheck.clear();
                res();
            } else console.error(prefix, `Command exited with code ${code}`);
        });
    })
}