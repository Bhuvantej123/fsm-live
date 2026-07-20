const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    console.log('Starting persistent mobile tunnel...');
    const tunnel = await localtunnel({ port: 3001, subdomain: 'fsm-dad-live-app' });
    console.log(`\n🚀 LIVE MOBILE TUNNEL -> ${tunnel.url}\n`);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Auto-reconnecting in 3s...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('Failed to start tunnel:', err.message);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
