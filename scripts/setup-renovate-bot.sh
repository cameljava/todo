#!/bin/bash

# Setup Renovate Bot for Automated Dependency Updates
# This script helps configure Renovate Bot for Bitbucket repositories

set -e

echo "🤖 Setting up Renovate Bot for Automated Dependency Updates"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
REPO_OWNER="kevinlee"
REPO_NAME="cloud-engineer-challenge-klee"
RENOVATE_CONFIG_FILE="renovate.json"

echo -e "${BLUE}📋 Renovate Bot Setup Checklist${NC}"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "bitbucket-pipelines.yml" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    echo "Expected files: package.json, bitbucket-pipelines.yml"
    exit 1
fi

echo -e "${GREEN}✅ Project structure validated${NC}"

# Check if Renovate config exists
if [ -f "$RENOVATE_CONFIG_FILE" ]; then
    echo -e "${GREEN}✅ Renovate configuration file found: $RENOVATE_CONFIG_FILE${NC}"
else
    echo -e "${RED}❌ Renovate configuration file not found: $RENOVATE_CONFIG_FILE${NC}"
    exit 1
fi

# Validate JSON configuration
if command -v jq &> /dev/null; then
    if jq empty "$RENOVATE_CONFIG_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ Renovate configuration JSON is valid${NC}"
    else
        echo -e "${RED}❌ Invalid JSON in $RENOVATE_CONFIG_FILE${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ jq not found - skipping JSON validation${NC}"
fi

# Check CODEOWNERS file
if [ -f ".bitbucket/CODEOWNERS" ]; then
    echo -e "${GREEN}✅ CODEOWNERS file found${NC}"
else
    echo -e "${YELLOW}⚠️ CODEOWNERS file not found at .bitbucket/CODEOWNERS${NC}"
    echo "   This is recommended for proper review of dependency updates"
fi

echo ""
echo -e "${BLUE}🔧 Renovate Bot Setup Instructions${NC}"
echo "=================================="

echo ""
echo -e "${YELLOW}1. Enable Renovate Bot on Bitbucket:${NC}"
echo "   • Go to: https://bitbucket.org/$REPO_OWNER/$REPO_NAME/admin/addon/admin"
echo "   • Find 'Renovate' in the Bitbucket App Directory"
echo "   • Click 'Install' and follow the setup process"
echo "   • Grant necessary permissions to the repository"

echo ""
echo -e "${YELLOW}2. Configure Bitbucket Repository Variables:${NC}"
echo "   Go to: https://bitbucket.org/$REPO_OWNER/$REPO_NAME/admin/addon/admin/pipelines/repository-variables"
echo "   Add the following variables (if not already present):"
echo ""
echo "   Required Variables:"
echo "   • SNYK_TOKEN=<your-snyk-token> (optional but recommended)"
echo "   • DOCKER_SCOUT_HUB_TOKEN=<token> (optional)"
echo "   • DOCKER_SCOUT_HUB_USER=<username> (optional)"
echo ""
echo "   Existing Variables (verify these are set):"
echo "   • AWS_ACCESS_KEY_ID"
echo "   • AWS_SECRET_ACCESS_KEY"
echo "   • AWS_DEFAULT_REGION"
echo "   • ECR_REPOSITORY_URI"
echo "   • FRONTEND_BUCKET_NAME"
echo "   • CLOUDFRONT_DISTRIBUTION_ID"
echo "   • APP_RUNNER_SERVICE_ARN"

echo ""
echo -e "${YELLOW}3. Renovate Bot Configuration Summary:${NC}"
echo "   ✅ Auto-merge: Patch and minor updates for production dependencies"
echo "   ✅ Security Updates: Immediate processing with high priority"
echo "   ✅ Major Updates: Manual review required via CODEOWNERS"
echo "   ✅ Grouped Updates: AWS SDK, React ecosystem, ESLint/Prettier"
echo "   ✅ Schedule: Weekly updates on Monday mornings (6am PT)"
echo "   ✅ Dashboard: Dependency update tracking and management"

echo ""
echo -e "${YELLOW}4. Testing the Setup:${NC}"
echo "   • Renovate will create an onboarding PR when first enabled"
echo "   • Check for dependency updates within 24 hours"
echo "   • Monitor the Dependency Dashboard issue for pending updates"
echo "   • Verify that PRs trigger the correct Bitbucket Pipeline"

echo ""
echo -e "${YELLOW}5. Monitoring and Maintenance:${NC}"
echo "   • Check Renovate logs in Bitbucket for any issues"
echo "   • Review auto-merged PRs to ensure they deploy successfully"
echo "   • Update Renovate configuration as needed"
echo "   • Monitor security vulnerability alerts"

echo ""
echo -e "${BLUE}🚀 Pipeline Integration${NC}"
echo "======================="
echo "The following pipeline features are now configured:"
echo ""
echo "✅ Enhanced dependency checking on all builds"
echo "✅ Special Renovate PR validation pipeline"
echo "✅ Automated security scanning for dependency updates"
echo "✅ Custom dependency update check pipeline"
echo "✅ Proper artifact collection for dependency reports"

echo ""
echo -e "${BLUE}📊 Available Pipeline Commands${NC}"
echo "=============================="
echo "Manual dependency check:"
echo "   bitbucket-pipelines run dependency-update-check"
echo ""
echo "The following will trigger automatically:"
echo "   • All pushes: dependency security check"
echo "   • Renovate PRs: enhanced validation"
echo "   • Pull requests: full security scan"

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Commit and push these configuration changes"
echo "2. Enable Renovate Bot on your Bitbucket repository"
echo "3. Configure repository variables as listed above"
echo "4. Monitor for the first Renovate PR within 24 hours"
echo ""
echo "For more information:"
echo "• Renovate Documentation: https://docs.renovatebot.com/"
echo "• Bitbucket Pipelines: https://bitbucket.org/$REPO_OWNER/$REPO_NAME/admin/addon/admin/pipelines"
echo ""
echo -e "${GREEN}Happy dependency management! 🚀${NC}" 