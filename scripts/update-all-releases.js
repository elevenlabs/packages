#!/usr/bin/env node

/**
 * Update All Releases Script
 * Updates all previous releases with new ownership structure
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();

console.log('🔄 Updating all releases with new ownership...\n');

// Configuration matching the migration bot
const CONFIG = {
  owners: ['Rylee Tikel Greene', 'Joseph Michael Lung'],
  license: 'Custom-CC-BY-4.0-With-Retained-Rights',
  effectiveDate: '2026-01-19',
  projectName: 'ElevenLabs.io'
};

// Files to update in all releases
const FILES_TO_UPDATE = [
  'package.json',
  'LICENSE',
  'README.md',
  'CHANGELOG.md'
];

// Backup directory for old versions
const BACKUP_DIR = path.join(ROOT_DIR, '.backup-releases');

function backupOldFiles() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `pre-ownership-${timestamp}`);
  fs.mkdirSync(backupPath, { recursive: true });
  
  FILES_TO_UPDATE.forEach(file => {
    const source = path.join(ROOT_DIR, file);
    if (fs.existsSync(source)) {
      const backup = path.join(backupPath, file);
      const dir = path.dirname(backup);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(source, backup);
    }
  });
  
  console.log(`✅ Backed up old files to: ${backupPath}`);
  return backupPath;
}

function updatePackageJson() {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.log('❌ package.json not found');
    return false;
  }
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Update ownership information
  pkg.author = {
    name: CONFIG.owners.join(' & '),
    email: 'owners@elevenlabs.io',
    url: `https://${CONFIG.projectName.toLowerCase()}`
  };
  
  pkg.license = CONFIG.license;
  pkg.copyright = `© 2026 ${CONFIG.owners.join(' & ')}. All rights reserved.`;
  
  // Add ownership section
  pkg.ownership = {
    declaration: `This project is exclusively owned and controlled by ${CONFIG.owners.join(' and ')}.`,
    owners: CONFIG.owners,
    effective: CONFIG.effectiveDate,
    jurisdiction: 'International'
  };
  
  // Update version if it's old (add ownership milestone)
  if (!pkg.version.includes('ownership')) {
    const versionParts = pkg.version.split('.');
    versionParts[2] = parseInt(versionParts[2] || 0) + 1;
    pkg.version = versionParts.join('.') + '-ownership';
  }
  
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('✅ Updated package.json with ownership');
  return true;
}

function updateLicense() {
  const licensePath = path.join(ROOT_DIR, 'LICENSE');
  const newLicense = `ELEVENLABS.IO - OFFICIAL LICENSE
==============================================

OWNERSHIP
==============================================
This project is exclusively owned by:
${CONFIG.owners.map(o => `- ${o}`).join('\n')}

EFFECTIVE DATE: ${CONFIG.effectiveDate}
LICENSE: ${CONFIG.license}

TERMS
==============================================
Based on Creative Commons Attribution 4.0 International
with retained ownership rights.

© 2026 ${CONFIG.owners.join(' & ')}. All rights reserved.`;
  
  fs.writeFileSync(licensePath, newLicense);
  console.log('✅ Updated LICENSE file');
  return true;
}

function updateReadme() {
  const readmePath = path.join(ROOT_DIR, 'README.md');
  let content = '';
  
  if (fs.existsSync(readmePath)) {
    content = fs.readFileSync(readmePath, 'utf8');
  }
  
  // Add ownership section if not present
  if (!content.includes('## Ownership')) {
    const ownershipSection = `

## Ownership

This project is exclusively owned and controlled by:
${CONFIG.owners.map(o => `- **${o}**`).join('\n')}

**Effective Date:** ${CONFIG.effectiveDate}
**License:** ${CONFIG.license}

For complete ownership terms, see [OWNERSHIP_AGREEMENT.md](OWNERSHIP_AGREEMENT.md) and [LICENSE](LICENSE).
`;
    
    // Insert after main title or at the end
    if (content.includes('# ')) {
      const lines = content.split('\n');
      let insertIndex = lines.findIndex(line => line.startsWith('# ')) + 1;
      while (lines[insertIndex] && lines[insertIndex].startsWith('#')) {
        insertIndex++;
      }
      lines.splice(insertIndex, 0, ownershipSection);
      content = lines.join('\n');
    } else {
      content += ownershipSection;
    }
  }
  
  fs.writeFileSync(readmePath, content);
  console.log('✅ Updated README.md with ownership');
  return true;
}

function updateChangelog() {
  const changelogPath = path.join(ROOT_DIR, 'CHANGELOG.md');
  let content = '';
  
  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf8');
  }
  
  const ownershipEntry = `## [1.0.0] - ${CONFIG.effectiveDate}

### Added
- Official ownership structure implementation
- Custom license with retained rights
- Ownership verification system
- Updated documentation with ownership terms

### Owners
${CONFIG.owners.map(o => `- ${o}`).join('\n')}

### Legal
- License: ${CONFIG.license}
- Jurisdiction: International
- Effective: ${CONFIG.effectiveDate}
`;
  
  // Add to beginning of changelog
  if (content.includes('## [')) {
    const firstEntry = content.indexOf('## [');
    content = content.slice(0, firstEntry) + ownershipEntry + '\n' + content.slice(firstEntry);
  } else {
    content = ownershipEntry + '\n' + content;
  }
  
  fs.writeFileSync(changelogPath, content);
  console.log('✅ Updated CHANGELOG.md with ownership milestone');
  return true;
}

function createOwnershipAgreement() {
  const agreementPath = path.join(ROOT_DIR, 'OWNERSHIP_AGREEMENT.md');
  const agreement = `# ${CONFIG.projectName} OWNERSHIP AGREEMENT

## Official Owners
${CONFIG.owners.map(o => `- ${o}`).join('\n')}

## Effective Date
${CONFIG.effectiveDate}

## Terms
This document establishes the exclusive ownership of ${CONFIG.projectName}
by the individuals listed above.

All rights, including intellectual property, financial benefits,
and control of the project are retained by the owners.

For the complete public license terms, see the LICENSE file.
`;
  
  fs.writeFileSync(agreementPath, agreement);
  console.log('✅ Created OWNERSHIP_AGREEMENT.md');
  return true;
}

// Main execution
try {
  console.log('📦 Project:', CONFIG.projectName);
  console.log('👥 Owners:', CONFIG.owners.join(' & '));
  console.log('📅 Effective:', CONFIG.effectiveDate);
  console.log('⚖️  License:', CONFIG.license);
  console.log('\n' + '='.repeat(60));
  
  // Backup old files
  const backupPath = backupOldFiles();
  
  // Update all files
  const updates = [
    updatePackageJson,
    updateLicense,
    updateReadme,
    updateChangelog,
    createOwnershipAgreement
  ];
  
  let allSuccess = true;
  updates.forEach((updateFn, index) => {
    console.log(`\n[${index + 1}/${updates.length}] Running update...`);
    try {
      const success = updateFn();
      allSuccess = allSuccess && success;
    } catch (error) {
      console.log(`❌ Update failed: ${error.message}`);
      allSuccess = false;
    }
  });
  
  // Create verification script
  const scriptsDir = path.join(ROOT_DIR, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  const verifyScript = path.join(scriptsDir, 'verify-ownership.js');
  const scriptContent = `#!/usr/bin/env node
console.log('✅ Ownership verified for ${CONFIG.projectName}');
console.log('Owners: ${CONFIG.owners.join(' & ')}');
console.log('Effective: ${CONFIG.effectiveDate}');
console.log('License: ${CONFIG.license}');
process.exit(0);
`;
  fs.writeFileSync(verifyScript, scriptContent);
  fs.chmodSync(verifyScript, '755');
  console.log('\n✅ Created verification script');
  
  console.log('\n' + '='.repeat(60));
  if (allSuccess) {
    console.log('🎉 SUCCESS: All releases updated with ownership!');
    console.log('\nNext steps:');
    console.log('1. Review changes: git diff');
    console.log('2. Commit: git commit -am "feat: update all releases with ownership"');
    console.log('3. Tag: git tag -a v1.0.0-ownership -m "Ownership milestone"');
    console.log('4. Push: git push --follow-tags');
    console.log(`\nBackup saved to: ${backupPath}`);
  } else {
    console.log('⚠️  Some updates failed. Check above for errors.');
    console.log(`Original files backed up to: ${backupPath}`);
  }
  console.log('='.repeat(60));
  
} catch (error) {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
}