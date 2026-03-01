/**
 * @module PM2EcosystemConfig
 * @description PM2 configuration file for simultaneously running the Node.js server and Python vision module.
 *
 * Useful Commands:
 * - Start all apps:     pm2 start ecosystem.config.js
 * - Stop all apps:      pm2 stop ecosystem.config.js
 * - Restart all apps:   pm2 restart ecosystem.config.js
 * - Check status:       pm2 status
 * - View logs:          pm2 logs
 */
module.exports = {
    apps: [
        {
            name: 'bird-server',
            script: 'npm',
            args: 'start',
            cwd: './server', // Path relative to the ecosystem file
            env: {
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm Z',
        },
        {
            name: 'bird-vision',
            script: './venv/bin/python', // Use the virtual environment Python
            args: 'main.py',
            cwd: './vision',
            env: {
                PYTHONUNBUFFERED: '1', // Ensures Python logs are output immediately
            },
            log_date_format: 'YYYY-MM-DD HH:mm Z',
        }
    ]
};
