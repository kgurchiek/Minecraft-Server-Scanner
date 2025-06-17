# Minecraft Server Scanner
Uses [masscan](https://github.com/robertdavidgraham/masscan) to search for Minecraft servers. Used for my [Minecraft Server Scanner Discord Bot](https://github.com/kgurchiek/Minecraft-Server-Scanner-Discord-Bot)

## Usage
Note: You do not need to run this yourself. It's already being hosted, and the ips file is updated automatically
- Install masscan from https://github.com/robertdavidgraham/masscan
- Install necessary packages with `npm install`
- Update config.json to your desired settings
- Run index.js

The ips will be saved in the `ips` file. Each 6 bytes represents a server, the first 4 being the ip, and the other 2 representing the port \(1st byte * 256 + 2nd byte\).

## How It Works
For each scan, first a typical masscan is run, finidng open tcp connections. Once a connection is found, it's pinged with Minecraft protocol to check if it's a Minecraft server. This is run in the following steps:
1. A full 0.0.0.0/0 scan on port 25565
2. For every ip found in step 1, a scan is run on that ip's /24 subnet on ports 25500-25700 (enabled by the `scan24s` setting in `config.json`)
3. For every ip found in steps 1 and 2, a scan is run on every port (enabled by the `scanAllPorts` setting in `config.json`)

# Config
**gitPush:** Whether or not to push the final result to the git repo
**gitUser:** Your git username \(only used if `gitPush` is `true`\)
**gitEmail":** Your git username \(only used if `gitPush` is `true`\)
**packetLimit:** How many packets per second masscan will send \(100000 recommended\)
**sudo:** Whether or not to run the masscan as sudo \(required for masscan to run, only disable if commands are sudo by default\)
**repeat:** Whether or not to automatically run another scan once the scan finishes