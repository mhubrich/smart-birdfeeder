# Raspberry Pi Systemd Deployment

## Philosophy
Use `systemd` for process persistence. If the vision script crashes (common with network/RTSP glitches), it must auto-restart.

## 1. Vision Service (`/etc/systemd/system/bird-vision.service`)
```ini
[Unit]
Description=Bird Feeder Vision Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/bird-feeder/vision
ExecStart=/home/pi/bird-feeder/venv/bin/python main.py
Restart=always
RestartSec=10
EnvironmentFile=/home/pi/bird-feeder/.env

[Install]
WantedBy=multi-user.target
```

## 2. App Service (`/etc/systemd/system/bird-server.service`)
```ini
[Unit]
Description=Bird Feeder Node Server
After=network.target bird-vision.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/bird-feeder/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
Environment="NODE_ENV=production"
EnvironmentFile=/home/pi/bird-feeder/.env

[Install]
WantedBy=multi-user.target
```
