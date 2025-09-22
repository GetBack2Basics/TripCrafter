const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getGitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return null;
  }
}

function main() {
  const outDir = path.resolve(__dirname, '..', 'public');
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const now = new Date().toISOString();
    const sha = getGitShortSha();
    const version = { version: process.env.npm_package_version || '0.0.0', buildTime: now, git: sha };
    const outPath = path.join(outDir, 'version.json');
    fs.writeFileSync(outPath, JSON.stringify(version, null, 2));
    console.log('Wrote version.json ->', outPath);
  } catch (err) {
    console.error('Failed to write version.json', err);
    process.exitCode = 1;
  }
}

main();
