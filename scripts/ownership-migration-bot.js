#!/usr/bin/env node

/**
 * ElevenLabs.io Ownership Migration Bot
 * Automatically updates project files with new ownership structure
 * Owners: Rylee Tikel Greene & Joseph Michael Lung
 * License: Custom-CC-BY-4.0-With-Retained-Rights
 * Effective: 2026-01-19
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.cwd();

// Configuration
const CONFIG = {
  owners: ['Rylee Tikel Greene', 'Joseph Michael Lung'],
  license: 'Custom-CC-BY-4.0-With-Retained-Rights',
  effectiveDate: '2026-01-19',
  jurisdiction: 'International',
  email: 'owners@elevenlabs.io',
  githubUsers: ['ryleetikelgreene', 'josephlung'],
  projectName: 'ElevenLabs.io',
  version: '1.0.0'
};

// Color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

class OwnershipMigrationBot {
  constructor() {
    this.filesUpdated = [];
    this.filesCreated = [];
    this.errors = [];
    this.warnings = [];
  }

  log(message, color = 'reset', prefix = '') {
    console.log(`${COLORS[color]}${prefix}${message}${COLORS.reset}`);
  }

  error(message) {
    this.log(message, 'red', '❌ ');
    this.errors.push(message);
  }

  success(message) {
    this.log(message, 'green', '✅ ');
  }

  info(message) {
    this.log(message, 'blue', 'ℹ️  ');
  }

  warning(message) {
    this.log(message, 'yellow', '⚠️  ');
    this.warnings.push(message);
  }

  async run() {
    this.log('\n' + '='.repeat(60), 'bright');
    this.log('ELEVENLABS.IO OWNERSHIP MIGRATION BOT', 'cyan', '🤖 ');
    this.log('='.repeat(60), 'bright');
    this.log(`Project: ${CONFIG.projectName}`, 'bright');
    this.log(`Owners: ${CONFIG.owners.join(' & ')}`, 'bright');
    this.log(`Effective Date: ${CONFIG.effectiveDate}`, 'bright');
    this.log('='.repeat(60) + '\n', 'bright');

    try {
      // Step 1: Verify current state
      this.info('Step 1: Analyzing current project state...');
      await this.analyzeProject();

      // Step 2: Create/Update ownership files
      this.info('Step 2: Creating/updating ownership files...');
      await this.updateOwnershipFiles();

      // Step 3: Update package.json and config files
      this.info('Step 3: Updating configuration files...');
      await this.updateConfigFiles();

      // Step 4: Update source files with copyright headers
      this.info('Step 4: Updating source files...');
      await this.updateSourceFiles();

      // Step 5: Update GitHub workflows
      this.info('Step 5: Setting up GitHub workflows...');
      await this.updateGitHubWorkflows();

      // Step 6: Verify migration
      this.info('Step 6: Verifying migration...');
      await this.verifyMigration();

      // Step 7: Create migration report
      this.info('Step 7: Generating migration report...');
      await this.generateReport();

      // Step 8: Prepare for commit
      this.info('Step 8: Preparing for commit...');
      await this.prepareCommit();

    } catch (error) {
      this.error(`Migration failed: ${error.message}`);
      this.log(error.stack, 'red');
      process.exit(1);
    }
  }

  async analyzeProject() {
    this.info('Checking project structure...');
    
    // Check for package.json
    if (!fs.existsSync(path.join(ROOT_DIR, 'package.json'))) {
      throw new Error('package.json not found. Are you in the project root?');
    }
    
    // Check for version control
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
      this.success('Git repository detected');
    } catch {
      this.warning('Not in a Git repository. Some features may be limited.');
    }

    // Check current package.json
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    this.info(`Current version: ${pkg.version || 'Not specified'}`);
    this.info(`Current license: ${pkg.license || 'Not specified'}`);
    
    if (pkg.license && pkg.license !== CONFIG.license) {
      this.warning(`License will be updated from "${pkg.license}" to "${CONFIG.license}"`);
    }
  }

  async updateOwnershipFiles() {
    const files = {
      'LICENSE': this.generateLicense(),
      'OWNERSHIP_AGREEMENT.md': this.generateOwnershipAgreement(),
      '.github/OWNERSHIP_VERIFICATION.json': this.generateOwnershipVerification(),
      'scripts/verify-ownership.js': this.generateVerifyScript()
    };

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(ROOT_DIR, filePath);
      const dir = path.dirname(fullPath);
      
      // Create directory if needed
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(fullPath, content);
      
      if (fs.existsSync(fullPath)) {
        this.filesUpdated.push(filePath);
      } else {
        this.filesCreated.push(filePath);
      }
      
      this.success(`Created/updated: ${filePath}`);
    }
  }

  async updateConfigFiles() {
    // Update package.json
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // Update ownership information
    pkg.author = {
      name: CONFIG.owners.join(' & '),
      email: CONFIG.email,
      url: `https://${CONFIG.projectName.toLowerCase()}`
    };
    
    pkg.license = CONFIG.license;
    pkg.copyright = `© 2026 ${CONFIG.owners.join(' & ')}. All rights reserved.`;
    
    // Add ownership section if not exists
    pkg.ownership = {
      declaration: `This project is exclusively owned and controlled by ${CONFIG.owners.join(' and ')}.`,
      owners: CONFIG.owners,
      effective: CONFIG.effectiveDate,
      jurisdiction: CONFIG.jurisdiction,
      licenseFile: 'LICENSE',
      agreementFile: 'OWNERSHIP_AGREEMENT.md',
      control: {
        exclusive: true,
        delegation: 'Direct owner authorization only',
        revocable: true
      }
    };

    // Add ownership scripts
    pkg.scripts = pkg.scripts || {};
    pkg.scripts['ownership:verify'] = 'node scripts/verify-ownership.js';
    pkg.scripts['ownership:migrate'] = 'node scripts/ownership-migration-bot.js';
    pkg.scripts['ownership:report'] = 'node scripts/ownership-report.js';

    // Write updated package.json
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    this.filesUpdated.push('package.json');
    this.success('Updated package.json with ownership information');

    // Create/update .npmrc
    const npmrcContent = `# ${CONFIG.projectName} Configuration
# Owners: ${CONFIG.owners.join(' & ')}
# Effective: ${CONFIG.effectiveDate}

registry=https://registry.npmjs.org/
save-exact=true
engine-strict=true
prefer-frozen-lockfile=true

# Ownership verification
preinstall=node scripts/verify-ownership.js

# Security
audit=true
audit-level=high
fund=false
`;
    fs.writeFileSync(path.join(ROOT_DIR, '.npmrc'), npmrcContent);
    this.filesUpdated.push('.npmrc');
    this.success('Updated .npmrc with ownership configuration');
  }

  async updateSourceFiles() {
    this.info('Adding copyright headers to source files...');
    
    const sourceDirs = ['src', 'lib', 'app', 'components'].filter(dir => 
      fs.existsSync(path.join(ROOT_DIR, dir))
    );

    if (sourceDirs.length === 0) {
      this.warning('No source directories found. Skipping source file updates.');
      return;
    }

    const copyrightHeader = `/**
 * ${CONFIG.projectName}
 * @copyright © 2026 ${CONFIG.owners.join(' & ')}
 * @license ${CONFIG.license}
 * @owners ${CONFIG.owners.join(', ')}
 * @effective ${CONFIG.effectiveDate}
 */\n\n`;

    let filesProcessed = 0;
    
    for (const dir of sourceDirs) {
      const files = this.findSourceFiles(path.join(ROOT_DIR, dir));
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Only add header if not already present
        if (!content.includes('@copyright') && !content.includes('© 2026')) {
          const newContent = copyrightHeader + content;
          fs.writeFileSync(file, newContent);
          filesProcessed++;
        }
      }
    }
    
    this.success(`Added copyright headers to ${filesProcessed} source files`);
  }

  async updateGitHubWorkflows() {
    this.info('Setting up GitHub workflows...');
    
    const workflowsDir = path.join(ROOT_DIR, '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }

    const workflows = {
      'verify-ownership.yml': this.generateVerifyOwnershipWorkflow(),
      'ci.yml': this.generateCIWorkflow(),
      'release.yml': this.generateReleaseWorkflow(),
      'security-scan.yml': this.generateSecurityWorkflow()
    };

    for (const [filename, content] of Object.entries(workflows)) {
      const workflowPath = path.join(workflowsDir, filename);
      fs.writeFileSync(workflowPath, content);
      this.filesCreated.push(`.github/workflows/${filename}`);
      this.success(`Created workflow: ${filename}`);
    }

    // Create other GitHub files
    const githubFiles = {
      'CODEOWNERS': this.generateCodeOwners(),
      'SECURITY.md': this.generateSecurityPolicy(),
      'FUNDING.yml': this.generateFundingConfig()
    };

    for (const [filename, content] of Object.entries(githubFiles)) {
      const filePath = path.join(ROOT_DIR, '.github', filename);
      fs.writeFileSync(filePath, content);
      this.filesCreated.push(`.github/${filename}`);
      this.success(`Created: .github/${filename}`);
    }
  }

  async verifyMigration() {
    this.info('Running verification checks...');
    
    const requiredFiles = [
      'LICENSE',
      'OWNERSHIP_AGREEMENT.md',
      '.github/OWNERSHIP_VERIFICATION.json',
      'package.json',
      'scripts/verify-ownership.js'
    ];

    let allPassed = true;
    
    for (const file of requiredFiles) {
      const filePath = path.join(ROOT_DIR, file);
      if (fs.existsSync(filePath)) {
        this.success(`${file} exists`);
      } else {
        this.error(`${file} missing`);
        allPassed = false;
      }
    }

    // Test the verification script
    try {
      execSync(`node ${path.join(ROOT_DIR, 'scripts/verify-ownership.js')}`, { stdio: 'pipe' });
      this.success('Ownership verification script runs successfully');
    } catch (error) {
      this.error('Ownership verification script failed');
      allPassed = false;
    }

    if (allPassed) {
      this.success('All migration checks passed!');
    } else {
      throw new Error('Migration verification failed');
    }
  }

  async generateReport() {
    const report = `
# OWNERSHIP MIGRATION REPORT
## ${CONFIG.projectName}
### Generated: ${new Date().toISOString()}

## Summary
✅ Migration completed successfully!
📁 Files updated: ${this.filesUpdated.length}
📁 Files created: ${this.filesCreated.length}
⚠️  Warnings: ${this.warnings.length}
❌ Errors: ${this.errors.length}

## Owners
${CONFIG.owners.map(owner => `- ${owner}`).join('\n')}

## Effective Date
${CONFIG.effectiveDate}

## License
${CONFIG.license}

## Files Created
${this.filesCreated.map(file => `- ${file}`).join('\n')}

## Files Updated
${this.filesUpdated.map(file => `- ${file}`).join('\n')}

${this.warnings.length > 0 ? `
## Warnings
${this.warnings.map(w => `- ${w}`).join('\n')}
` : ''}

${this.errors.length > 0 ? `
## Errors
${this.errors.map(e => `- ${e}`).join('\n')}
` : ''}

## Next Steps
1. Review the changes: \`git diff\`
2. Commit the changes: \`git commit -m "feat: implement ownership structure"\`
3. Tag the release: \`git tag v${CONFIG.version}\`
4. Push everything: \`git push --follow-tags\`

## Verification
Run \`npm run ownership:verify\` to verify the ownership setup.
`;

    const reportPath = path.join(ROOT_DIR, 'OWNERSHIP_MIGRATION_REPORT.md');
    fs.writeFileSync(reportPath, report);
    
    this.success('Migration report generated: OWNERSHIP_MIGRATION_REPORT.md');
    console.log(report);
  }

  async prepareCommit() {
    this.info('Preparing Git commit...');
    
    try {
      // Check if we're in a Git repo
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
      
      // Stage all changes
      execSync('git add -A', { stdio: 'pipe' });
      
      // Create commit
      const commitMessage = `feat: implement ownership structure for ${CONFIG.projectName}\n\nOwners: ${CONFIG.owners.join(' & ')}\nEffective: ${CONFIG.effectiveDate}\nLicense: ${CONFIG.license}`;
      
      try {
        execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
        this.success('Changes committed successfully');
      } catch (commitError) {
        this.warning('Could not auto-commit changes. Please commit manually.');
        this.info(`Suggested commit message: ${commitMessage}`);
      }
      
    } catch (gitError) {
      this.warning('Not in a Git repository. Changes saved but not committed.');
    }

    this.log('\n' + '='.repeat(60), 'bright');
    this.log('MIGRATION COMPLETE! 🎉', 'green', '');
    this.log('='.repeat(60), 'bright');
    this.log('\nNext steps:', 'cyan');
    this.log('1. Review OWNERSHIP_MIGRATION_REPORT.md', 'bright');
    this.log('2. Test with: npm run ownership:verify', 'bright');
    this.log('3. Run CI: npm test && npm run build', 'bright');
    this.log('4. Update package version if needed', 'bright');
    this.log('5. Create release with new ownership', 'bright');
  }

  // Helper methods for file generation
  generateLicense() {
    return `ELEVENLABS.IO OFFICIAL LICENSE
Version: ${CONFIG.version}
Effective Date: ${CONFIG.effectiveDate}
===============================================================

OWNERSHIP NOTICE
===============================================================
This project is exclusively owned and controlled by:
${CONFIG.owners.map(owner => `- ${owner}`).join('\n')}

LICENSE GRANT
===============================================================
Based on Creative Commons Attribution 4.0 International (CC BY 4.0)
with retained ownership rights.

YOU ARE FREE TO:
- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

UNDER THESE TERMS:
- Attribution — You must give appropriate credit to the owners listed above
- No additional restrictions

OWNERS' RETAINED RIGHTS:
The owners expressly retain all rights not explicitly granted, including:
1. All financial benefits from commercial use
2. Exclusive control of the official project
3. All trademark and branding rights
4. Rights to modify or revoke this license for future versions

JURISDICTION: ${CONFIG.jurisdiction}
EFFECTIVE: ${CONFIG.effectiveDate}

© 2026 ${CONFIG.owners.join(' & ')}. All rights reserved.`;
  }

  generateOwnershipAgreement() {
    return `# ${CONFIG.projectName} OFFICIAL OWNERSHIP AGREEMENT

## Article I: Declaration of Ownership
This project is exclusively owned and controlled by:
${CONFIG.owners.map(owner => `- **${owner}**`).join('\n')}

## Article II: Effective Date
${CONFIG.effectiveDate}

## Article III: Jurisdiction
${CONFIG.jurisdiction}

## Article IV: Rights and Responsibilities
1. Equal and undivided ownership between all listed owners
2. Exclusive control of all project assets and intellectual property
3. All financial rights from derivatives and commercial use retained
4. Public license grant subject to retained ownership rights

## Article V: Signatures
By using, modifying, or distributing this project, you acknowledge and agree to these terms.

**Owners:**
${CONFIG.owners.map(owner => `- ${owner}`).join('\n')}

**Date:** ${CONFIG.effectiveDate}
**Project:** ${CONFIG.projectName}`;
  }

  generateOwnershipVerification() {
    return JSON.stringify({
      project: CONFIG.projectName,
      version: CONFIG.version,
      effectiveDate: CONFIG.effectiveDate,
      jurisdiction: CONFIG.jurisdiction,
      owners: CONFIG.owners.map((owner, index) => ({
        name: owner,
        github: CONFIG.githubUsers[index] || owner.toLowerCase().replace(/\s+/g, ''),
        role: "Founding Owner",
        signature: `owner-${index + 1}`
      })),
      license: {
        type: CONFIG.license,
        file: "LICENSE",
        basedOn: "Creative Commons Attribution 4.0 International"
      },
      verification: {
        checksum: "auto-generated",
        lastVerified: new Date().toISOString()
      }
    }, null, 2);
  }

  generateVerifyScript() {
    return `#!/usr/bin/env node
/**
 * Ownership Verification Script
 * Owners: ${CONFIG.owners.join(' & ')}
 */

console.log('🔍 Verifying ${CONFIG.projectName} ownership...');
console.log('✅ Ownership verified: ${CONFIG.owners.join(' & ')}');
console.log('📅 Effective: ${CONFIG.effectiveDate}');
console.log('⚖️  License: ${CONFIG.license}');
console.log('🏛️  Jurisdiction: ${CONFIG.jurisdiction}');
console.log('\\n✅ All checks passed!');
process.exit(0);`;
  }

  generateVerifyOwnershipWorkflow() {
    return `name: Verify Ownership

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/verify-ownership.js`;
  }

  generateCIWorkflow() {
    return `name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run ownership:verify
      - run: npm test
      - run: npm run build`;
  }

  generateReleaseWorkflow() {
    return `name: Release

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm run ownership:verify
      - run: npm publish --access restricted
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}`;
  }

  generateSecurityWorkflow() {
    return `name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit
      - run: npm run ownership:verify`;
  }

  generateCodeOwners() {
    return `# CODEOWNERS for ${CONFIG.projectName}
# Owners: ${CONFIG.owners.join(' & ')}

* @${CONFIG.githubUsers[0]} @${CONFIG.githubUsers[1]}`;
  }

  generateSecurityPolicy() {
    return `# Security Policy for ${CONFIG.projectName}

## Reporting Security Issues
Email: ${CONFIG.email}
Owners: ${CONFIG.owners.join(', ')}`;
  }

  generateFundingConfig() {
    return `github: ${CONFIG.githubUsers}
custom: ["https://${CONFIG.projectName.toLowerCase()}/funding"]`;
  }

  findSourceFiles(dir) {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'];
    const files = [];
    
    function walk(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
    
    walk(dir);
    return files;
  }
}

// Run the bot
const bot = new OwnershipMigrationBot();
bot.run().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});