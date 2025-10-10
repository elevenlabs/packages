#!/bin/bash

# Test script for publish workflow validation
# This tests the logic used in .github/workflows/publish.yml

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_case() {
  local test_name="$1"
  echo -e "\n${YELLOW}TEST: $test_name${NC}"
}

pass() {
  echo -e "${GREEN}✓ PASS${NC}"
  ((TESTS_PASSED++))
}

fail() {
  echo -e "${RED}✗ FAIL: $1${NC}"
  ((TESTS_FAILED++))
}

echo "======================================"
echo "Testing Publish Workflow Validation"
echo "======================================"

# ===== TEST 1: Version extraction and validation =====
test_case "Version extraction for @elevenlabs/react-native@0.4.1"

TAG_NAME="@elevenlabs/react-native@0.4.1"
TAG_VERSION=$(echo "$TAG_NAME" | rev | cut -d'@' -f1 | rev)
PACKAGE_NAME=$(echo "$TAG_NAME" | rev | cut -d'@' -f2- | rev)
PACKAGE_PATH="packages/$(echo "$PACKAGE_NAME" | sed 's/@elevenlabs\///')"
PACKAGE_JSON_VERSION=$(node -p "require('./$PACKAGE_PATH/package.json').version")

echo "  Tag: $TAG_NAME"
echo "  Extracted package name: $PACKAGE_NAME"
echo "  Extracted tag version: $TAG_VERSION"
echo "  Package path: $PACKAGE_PATH"
echo "  package.json version: $PACKAGE_JSON_VERSION"

if [ "$PACKAGE_NAME" = "@elevenlabs/react-native" ] && [ "$TAG_VERSION" = "0.4.1" ] && [ "$TAG_VERSION" = "$PACKAGE_JSON_VERSION" ]; then
  pass
else
  fail "Version extraction or validation failed"
fi

# ===== TEST 2: Version mismatch detection =====
test_case "Version mismatch detection (tag 0.5.0 vs package.json 0.4.1)"

TAG_NAME="@elevenlabs/react-native@0.5.0"
TAG_VERSION=$(echo "$TAG_NAME" | rev | cut -d'@' -f1 | rev)
PACKAGE_NAME=$(echo "$TAG_NAME" | rev | cut -d'@' -f2- | rev)
PACKAGE_PATH="packages/$(echo "$PACKAGE_NAME" | sed 's/@elevenlabs\///')"
PACKAGE_JSON_VERSION=$(node -p "require('./$PACKAGE_PATH/package.json').version")

echo "  Tag version: $TAG_VERSION"
echo "  package.json version: $PACKAGE_JSON_VERSION"

if [ "$TAG_VERSION" != "$PACKAGE_JSON_VERSION" ]; then
  echo "  ✓ Mismatch correctly detected"
  pass
else
  fail "Should have detected version mismatch"
fi

# ===== TEST 3: Beta tag detection =====
test_case "Beta tag detection"

FULL_TAG_NAME="@elevenlabs/react-native@0.5.0-beta.1"
if [[ "$FULL_TAG_NAME" == *"beta"* ]]; then
  PUBLISH_TAG="beta"
else
  PUBLISH_TAG="latest"
fi

echo "  Tag: $FULL_TAG_NAME"
echo "  Detected publish tag: $PUBLISH_TAG"

if [ "$PUBLISH_TAG" = "beta" ]; then
  pass
else
  fail "Should have detected beta tag"
fi

# ===== TEST 4: Latest tag detection =====
test_case "Latest tag detection"

FULL_TAG_NAME="@elevenlabs/react-native@0.5.0"
if [[ "$FULL_TAG_NAME" == *"beta"* ]]; then
  PUBLISH_TAG="beta"
else
  PUBLISH_TAG="latest"
fi

echo "  Tag: $FULL_TAG_NAME"
echo "  Detected publish tag: $PUBLISH_TAG"

if [ "$PUBLISH_TAG" = "latest" ]; then
  pass
else
  fail "Should have detected latest tag"
fi

# ===== TEST 5: Workspace dependency extraction for react-native =====
test_case "Workspace dependency extraction for @elevenlabs/react-native"

PACKAGE_NAME="@elevenlabs/react-native"
PACKAGE_PATH="packages/$(echo "$PACKAGE_NAME" | sed 's/@elevenlabs\///')"

WORKSPACE_DEPS=$(node -p "
  const pkg = require('./$PACKAGE_PATH/package.json');
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  Object.entries(deps)
    .filter(([_, version]) => version.startsWith('workspace:'))
    .map(([name, version]) => {
      const pkgPath = 'packages/' + name.replace('@elevenlabs/', '') + '/package.json';
      try {
        const depPkg = require('./' + pkgPath);
        return name + '@' + depPkg.version;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .join(' ');
" 2>/dev/null || echo "")

echo "  Workspace deps: $WORKSPACE_DEPS"

if [ -n "$WORKSPACE_DEPS" ]; then
  pass
else
  fail "Should have found workspace dependencies"
fi

# ===== TEST 6: Verify published dependency =====
test_case "Verify @elevenlabs/types@0.0.2 is published on npm"

DEP_NAME="@elevenlabs/types"
DEP_VERSION="0.0.2"

if npm view "$DEP_NAME@$DEP_VERSION" version &>/dev/null; then
  echo "  ✓ $DEP_NAME@$DEP_VERSION is published"
  pass
else
  fail "$DEP_NAME@$DEP_VERSION should be published"
fi

# ===== TEST 7: Detect unpublished dependency =====
test_case "Detect unpublished dependency @elevenlabs/types@999.999.999"

DEP_NAME="@elevenlabs/types"
DEP_VERSION="999.999.999"

if npm view "$DEP_NAME@$DEP_VERSION" version &>/dev/null; then
  fail "Should not have found non-existent version"
else
  echo "  ✓ Correctly identified as unpublished"
  pass
fi

# ===== TEST 8: Package with no workspace dependencies =====
test_case "Package with no workspace dependencies (@elevenlabs/agents-cli)"

PACKAGE_NAME="@elevenlabs/agents-cli"
PACKAGE_PATH="packages/$(echo "$PACKAGE_NAME" | sed 's/@elevenlabs\///')"

WORKSPACE_DEPS=$(node -p "
  const pkg = require('./$PACKAGE_PATH/package.json');
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  Object.entries(deps)
    .filter(([_, version]) => version.startsWith('workspace:'))
    .map(([name, version]) => {
      const pkgPath = 'packages/' + name.replace('@elevenlabs/', '') + '/package.json';
      try {
        const depPkg = require('./' + pkgPath);
        return name + '@' + depPkg.version;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .join(' ');
" 2>/dev/null || echo "")

echo "  Workspace deps: ${WORKSPACE_DEPS:-<none>}"

if [ -z "$WORKSPACE_DEPS" ]; then
  echo "  ✓ Correctly identified as having no workspace dependencies"
  pass
else
  fail "Should have no workspace dependencies"
fi

# ===== TEST 9: Chain of dependencies (react -> client -> types) =====
test_case "Verify dependency chain: @elevenlabs/react -> client -> types"

PACKAGE_NAME="@elevenlabs/react"
PACKAGE_PATH="packages/$(echo "$PACKAGE_NAME" | sed 's/@elevenlabs\///')"

WORKSPACE_DEPS=$(node -p "
  const pkg = require('./$PACKAGE_PATH/package.json');
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  Object.entries(deps)
    .filter(([_, version]) => version.startsWith('workspace:'))
    .map(([name, version]) => {
      const pkgPath = 'packages/' + name.replace('@elevenlabs/', '') + '/package.json';
      try {
        const depPkg = require('./' + pkgPath);
        return name + '@' + depPkg.version;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .join(' ');
" 2>/dev/null || echo "")

echo "  Workspace deps for @elevenlabs/react: $WORKSPACE_DEPS"

ALL_PUBLISHED=true
for DEP in $WORKSPACE_DEPS; do
  DEP_NAME=$(echo "$DEP" | cut -d'@' -f1-2)
  DEP_VERSION=$(echo "$DEP" | cut -d'@' -f3)

  if npm view "$DEP_NAME@$DEP_VERSION" version &>/dev/null; then
    echo "  ✓ $DEP_NAME@$DEP_VERSION is published"
  else
    echo "  ✗ $DEP_NAME@$DEP_VERSION is NOT published"
    ALL_PUBLISHED=false
  fi
done

if [ "$ALL_PUBLISHED" = true ]; then
  pass
else
  fail "Some dependencies are not published"
fi

# ===== TEST 10: Full validation script for react-native =====
test_case "Full validation for @elevenlabs/react-native@0.4.1"

TAG_NAME="@elevenlabs/react-native@0.4.1"
TAG_VERSION=$(echo "$TAG_NAME" | rev | cut -d'@' -f1 | rev)
PACKAGE_NAME=$(echo "$TAG_NAME" | rev | cut -d'@' -f2- | rev)
PACKAGE_PATH="packages/$(echo "$PACKAGE_NAME" | sed 's/@elevenlabs\///')"
PACKAGE_JSON_VERSION=$(node -p "require('./$PACKAGE_PATH/package.json').version")

echo "  Step 1: Check version match"
if [ "$TAG_VERSION" != "$PACKAGE_JSON_VERSION" ]; then
  fail "Version mismatch in step 1"
  exit 1
fi
echo "    ✓ Version matches: $TAG_VERSION"

echo "  Step 2: Check workspace dependencies"
WORKSPACE_DEPS=$(node -p "
  const pkg = require('./$PACKAGE_PATH/package.json');
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  Object.entries(deps)
    .filter(([_, version]) => version.startsWith('workspace:'))
    .map(([name, version]) => {
      const pkgPath = 'packages/' + name.replace('@elevenlabs/', '') + '/package.json';
      try {
        const depPkg = require('./' + pkgPath);
        return name + '@' + depPkg.version;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .join(' ');
" 2>/dev/null || echo "")

if [ -z "$WORKSPACE_DEPS" ]; then
  echo "    ✓ No workspace dependencies to check"
else
  echo "    Workspace deps: $WORKSPACE_DEPS"
  for DEP in $WORKSPACE_DEPS; do
    DEP_NAME=$(echo "$DEP" | cut -d'@' -f1-2)
    DEP_VERSION=$(echo "$DEP" | cut -d'@' -f3)

    if npm view "$DEP_NAME@$DEP_VERSION" version &>/dev/null; then
      echo "      ✓ $DEP_NAME@$DEP_VERSION is published"
    else
      fail "      ✗ $DEP_NAME@$DEP_VERSION is NOT published"
      exit 1
    fi
  done
fi

pass

# ===== TEST 11: Test all publishable packages =====
test_case "Test version extraction for all packages"

for pkg_path in packages/types packages/react-native packages/agents-cli packages/client packages/react packages/convai-widget-core packages/convai-widget-embed; do
  PKG_NAME=$(node -p "require('./$pkg_path/package.json').name")
  PKG_VERSION=$(node -p "require('./$pkg_path/package.json').version")

  TAG_NAME="${PKG_NAME}@${PKG_VERSION}"
  EXTRACTED_VERSION=$(echo "$TAG_NAME" | rev | cut -d'@' -f1 | rev)
  EXTRACTED_NAME=$(echo "$TAG_NAME" | rev | cut -d'@' -f2- | rev)

  if [ "$EXTRACTED_NAME" != "$PKG_NAME" ] || [ "$EXTRACTED_VERSION" != "$PKG_VERSION" ]; then
    fail "  ✗ $PKG_NAME: extraction failed (got $EXTRACTED_NAME@$EXTRACTED_VERSION)"
    continue
  fi

  echo "  ✓ $PKG_NAME@$PKG_VERSION - extraction works"
done

pass

# ===== SUMMARY =====
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
