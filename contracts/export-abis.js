const fs = require('fs');
const path = require('path');

const artifactsPath = path.join(__dirname, 'artifacts', 'contracts');
const outPath = path.join(__dirname, '..', 'frontend', 'lib', 'contracts');

fs.mkdirSync(outPath, { recursive: true });

function extract(contractFile, name, outName) {
  const jsonPath = path.join(artifactsPath, contractFile, `${name}.json`);
  if (!fs.existsSync(jsonPath)) {
      console.error(`Missing ${jsonPath}`);
      return;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const tsContent = `export const ${outName}ABI = ${JSON.stringify(data.abi, null, 2)} as const;\n`;
  fs.writeFileSync(path.join(outPath, `${outName}-abi.ts`), tsContent);
}

extract('FreightEscrow.sol', 'FreightEscrow', 'freightEscrow');
extract('RetailEscrow.sol', 'RetailEscrow', 'retailEscrow');
extract('Forwarder.sol', 'Forwarder', 'forwarder');
extract('MockUSDT.sol', 'MockUSDT', 'usdt');

console.log('Exported ABIs successfully.');
