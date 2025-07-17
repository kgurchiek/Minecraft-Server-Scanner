# Minecraft Server Scanner
Uses [masscan](https://github.com/robertdavidgraham/masscan) to search for Minecraft servers. Used for my [Minecraft Server Scanner Discord Bot](https://github.com/kgurchiek/Minecraft-Server-Scanner-Discord-Bot)

## Usage
Note: You do not need to run this yourself. It's already being hosted, and the ips file is updated automatically
- Install masscan from https://github.com/robertdavidgraham/masscan
- Install necessary packages with `npm install`
- Update config.json to your desired settings
- Run index.js

The ips will be saved in the `ips` file. Each 6 bytes represents a server, the first 4 being the ip, and the other 2 an unsigned integer for the port (big-endian).

## How It Works
For each scan, first a typical masscan is run, finidng open tcp connections. Once a connection is found, it's pinged with Minecraft protocol ([Server List Ping](https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping) for Java Edtion, [Raknet Unconnected Ping](https://wiki.bedrock.dev/servers/raknet#unconnected-pings), for Bedrock Edition) to check if it's a Minecraft server. This is run in the following steps:
1. A full 0.0.0.0/0 scan on port 25565 \(Java Edition\) or 19132 \(Bedrock Edition\)
2. For every ip found in step 1, a scan is run on that ip's /24 subnet on ports 25500-25700 (enabled by the `scan24s` setting in `config.json`)
3. For every ip found in steps 1 and 2, a scan is run on ports 1024-65535 (enabled by the `scanAllPorts` setting in `config.json`)

## Config
- **git** 
  - **push: ** Whether or not to push the final result to a git repo
  - **username:** Your git username
  - **email:** Your git email
  - **url:** URl of the git repo, include a token for authentication
  - **branch:** branch to push to
- **packetLimit:** How many packets per second masscan will send
- **rescans:** How many times to check each result for a Minecraft server. Consider settings this to 2 or 3 if you experience significant packet loss.
- **rescanRate:** How many packets per second to send when rescanning
- **rescanTimeout:** How many milliseconds to wait before deciding that a server is offline
- **scanPort:** Whether or not to scan the entire default port \(the first step in the scanning process, must be done at least once before the next two can run\)
- **scan24s:** Whether or not to scan the /24 subnets on nearby ports on the results of the previous scan \(optional, third step can still run even if this is never done\)
- **scanAllPorts:** Whether or not to scan ports 1024-65535 on the results of the previous scans
- **sudo:** Whether or not to run the masscan as sudo \(required for masscan to run, only disable if you're logged in as root\)
- **java:** Whether or not to scan for Java Edition servers
- **bedrock:** Whether or not to scan for Bedrock Edition servers
