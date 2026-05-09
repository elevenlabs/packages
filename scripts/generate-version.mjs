import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const version = process.env.npm_package_version;
const outputPath = process.argv[2] || 'src/version.ts';

if (!version) {
  console.error('npm_package_version environment variable is not set');
  process.exit(1);
}

const content = `// This file is auto-generated during build
export const PACKAGE_VERSION = "${version}";
`;

try {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, 'utf8');
  console.log(`Generated version file at ${outputPath} with version ${version}`);
} catch (error) {
  console.error(`Failed to generate version file: ${error.message}`);
  process.exit(1);
}
