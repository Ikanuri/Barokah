/**
 * Dev server wrapper — detect local IPs and display them before starting Next.js
 */
const { spawn, execSync } = require('child_process');
const os = require('os');

// Collect all non-loopback, non-APIPA IPv4 addresses
// Node.js <18 uses family:'IPv4', Node.js >=18 uses family:4
const localIPs = [];
for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces) {
    const isIPv4 = iface.family === 'IPv4' || iface.family === 4;
    if (isIPv4 && !iface.internal && !iface.address.startsWith('169.254.')) {
      localIPs.push(iface.address);
    }
  }
}

// Fallback: try PowerShell if os.networkInterfaces() returns nothing
if (localIPs.length === 0) {
  try {
    const result = execSync(
      'powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike \'127.*\' -and $_.IPAddress -notlike \'169.254.*\' } | Select-Object -ExpandProperty IPAddress"',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    result.trim().split(/\r?\n/).forEach(ip => {
      if (ip.trim()) localIPs.push(ip.trim());
    });
  } catch {
    // ignore
  }
}

const W = 48;
const line = '═'.repeat(W);
const pad = (str, total) => str + ' '.repeat(Math.max(0, total - str.length));

console.log(`\n  ╔${line}╗`);
console.log(`  ║${pad('  POS App — Network Access', W)}║`);
console.log(`  ╠${line}╣`);
console.log(`  ║${pad('  Local  : http://localhost:3000', W)}║`);
if (localIPs.length === 0) {
  console.log(`  ║${pad('  Network: (tidak terdeteksi)', W)}║`);
} else {
  for (const ip of localIPs) {
    console.log(`  ║${pad(`  Network: http://${ip}:3000`, W)}║`);
  }
}
console.log(`  ╚${line}╝\n`);

// Start Next.js bound to all interfaces
const args = ['next', 'dev', '-H', '0.0.0.0'];
const next = spawn('npx', args, { stdio: 'inherit', shell: true });
next.on('exit', (code) => process.exit(code ?? 0));
