{
  "project": "ElevenLabs.io",
  "version": "1.0.0",
  "effectiveDate": "2026-01-19",
  "jurisdiction": "International",
  
  "owners": [
    {
      "name": "Rylee Tikel Greene",
      "role": "Founding Owner",
      "github": "ryleetikelgreene",
      "email": "rylee@elevenlabs.io",
      "permissions": [
        "admin",
        "maintain",
        "push",
        "triage",
        "pull"
      ],
      "signature": "verified-owner-001"
    },
    {
      "name": "Joseph Michael Lung",
      "role": "Founding Owner",
      "github": "josephlung",
      "email": "joseph@elevenlabs.io",
      "permissions": [
        "admin",
        "maintain",
        "push",
        "triage",
        "pull"
      ],
      "signature": "verified-owner-002"
    }
  ],
  
  "license": {
    "type": "Custom-CC-BY-4.0-With-Retained-Rights",
    "file": "LICENSE",
    "basedOn": "Creative Commons Attribution 4.0 International",
    "retainedRights": [
      "financial_benefits",
      "commercial_control",
      "trademark",
      "brand_control",
      "infrastructure_access",
      "derivative_profits"
    ]
  },
  
  "agreements": {
    "ownership": "OWNERSHIP_AGREEMENT.md",
    "contributions": "CONTRIBUTING.md",
    "security": ".github/SECURITY.md"
  },
  
  "workflowPermissions": {
    "allowRuns": true,
    "requireOwnershipCheck": true,
    "allowedActions": [
      "actions/checkout",
      "actions/setup-node",
      "actions/upload-artifact",
      "actions/download-artifact",
      "codecov/codecov-action",
      "softprops/action-gh-release",
      "snyk/actions/node",
      "gitguardian/ggshield-action",
      "github/codeql-action/analyze",
      "actions/dependency-review-action"
    ],
    "restrictedActions": [],
    "maxConcurrentRuns": 10,
    "timeoutMinutes": 360
  },
  
  "ciCdRules": {
    "verifyOn": ["push", "pull_request", "workflow_dispatch"],
    "requiredChecks": [
      "verify-ownership",
      "test",
      "build",
      "security-scan"
    ],
    "branchProtection": {
      "main": ["owners", "signed-commits"],
      "develop": ["owners", "code-review"]
    },
    "autoApprove": {
      "dependencies": false,
      "docs": false,
      "workflows": false
    }
  },
  
  "releaseControl": {
    "tagPattern": "^v\\d+\\.\\d+\\.\\d+(-.+)?$",
    "requireOwners": 2,
    "signReleases": true,
    "publishTo": ["npm"],
    "artifacts": ["dist/**/*", "LICENSE", "OWNERSHIP_AGREEMENT.md"]
  },
  
  "verification": {
    "method": "file-presence",
    "requiredFiles": [
      "LICENSE",
      "OWNERSHIP_AGREEMENT.md",
      ".github/OWNERSHIP_VERIFICATION.json"
    ],
    "checksum": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "lastVerified": "2026-01-19T00:00:00Z"
  },
  
  "accessControl": {
    "repository": "private",
    "collaborators": "owner-only",
    "forking": false,
    "pages": "disabled",
    "environments": ["production", "staging"],
    "secrets": ["NPM_TOKEN", "SNYK_TOKEN", "GITGUARDIAN_API_KEY"]
  },
  
  "metadata": {
    "generated": "2026-01-19T00:00:00Z",
    "generator": "GitHub-Actions-Ownership-Validator",
    "schemaVersion": "1.0"
  }
}