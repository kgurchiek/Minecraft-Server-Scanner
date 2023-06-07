# Minecraft Server Scanner
Uses [Mat's fork of masscan](https://github.com/mat-1/masscan) to search for Minecraft servers. Used for my [Minecraft Server Scanner Discord Bot](https://github.com/kgurchiek/Minecraft-Server-Scanner-Discord-Bot)

## Usage
Note: You do not need to run this yourself. It's already being hosted, and the ips file is updated automatically
- Install mat's fork of masscan from https://github.com/mat-1/masscan, and install it \(use the same install instructions from [the original masscan](https://github.com/robertdavidgraham/masscan)\)
- Update config.json with your github username and email, and set the packet rate limit (per second). 100000 is recommended, but please do not do it this fast on your personal internet, as it will likely be obliterated.
- Run index.js (the other js files are just for debugging functions, you can ignore them)

The ips will be saved in the `ips` file. Each 6 bytes represents a server, the first 4 being the ip, and the other 2 making the port (1st byte * 256 + 2nd byte)

## How It Works
For each scan, first a typical masscan is run, finidng open tcp connections. Once a connection is found, it's pinged with Minecraft protocol to check if it's a Minecraft server. This is run in the following steps:
1. A full 0.0.0.0/0 scan on port 25565
2. For every ip found in step 1, a scan is run on that ip's /24 subnet on ports 25540-25700
3. For every ip found in steps 1 and 2, a scan is run on every port.
