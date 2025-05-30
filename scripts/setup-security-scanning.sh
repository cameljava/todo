#!/bin/bash

# Security Scanning Setup Script for Todo Application
# This script helps configure security scanning tools and environment variables

set -e

echo "🔒 Setting up Security Scanning for Todo Application"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running in CI environment
if [ "$CI" = "true" ]; then
    print_info "Running in CI environment"
    CI_MODE=true
else
    print_info "Running in local development environment"
    CI_MODE=false
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo -e "\n${BLUE}Checking dependencies...${NC}"

# Node.js and npm
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 22+"
    exit 1
fi

if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm not found. Please install npm"
    exit 1
fi

# Docker (for local testing)
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    print_status "Docker found: $DOCKER_VERSION"
else
    print_warning "Docker not found. Docker image scanning will be skipped in local mode"
fi

# Install security scanning tools locally (if not in CI)
if [ "$CI_MODE" = false ]; then
    echo -e "\n${BLUE}Installing security scanning tools...${NC}"
    
    # Install npm-based security tools
    if ! command_exists snyk; then
        print_info "Installing Snyk CLI..."
        npm install -g snyk || print_warning "Failed to install Snyk (may require SNYK_TOKEN)"
    else
        print_status "Snyk CLI already installed"
    fi
    
    # Install Trivy (for Docker image scanning)
    if ! command_exists trivy; then
        print_info "Installing Trivy..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command_exists brew; then
                brew install trivy || print_warning "Failed to install Trivy via Homebrew"
            else
                print_warning "Homebrew not found. Please install Trivy manually"
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin || print_warning "Failed to install Trivy"
        else
            print_warning "Unsupported OS for automatic Trivy installation"
        fi
    else
        print_status "Trivy already installed"
    fi
    
    # Install Grype
    if ! command_exists grype; then
        print_info "Installing Grype..."
        curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin || print_warning "Failed to install Grype"
    else
        print_status "Grype already installed"
    fi
    
    # Install Semgrep
    if ! command_exists semgrep; then
        print_info "Installing Semgrep..."
        if command_exists python3 && command_exists pip3; then
            pip3 install semgrep || print_warning "Failed to install Semgrep"
        else
            print_warning "Python3/pip3 not found. Please install Semgrep manually"
        fi
    else
        print_status "Semgrep already installed"
    fi
fi

# Check environment variables
echo -e "\n${BLUE}Checking environment variables...${NC}"

# Required AWS variables
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    print_status "AWS_ACCESS_KEY_ID is set"
else
    print_warning "AWS_ACCESS_KEY_ID not set (required for CI/CD)"
fi

if [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    print_status "AWS_SECRET_ACCESS_KEY is set"
else
    print_warning "AWS_SECRET_ACCESS_KEY not set (required for CI/CD)"
fi

if [ -n "$AWS_DEFAULT_REGION" ]; then
    print_status "AWS_DEFAULT_REGION is set: $AWS_DEFAULT_REGION"
else
    print_warning "AWS_DEFAULT_REGION not set (required for CI/CD)"
fi

if [ -n "$ECR_REPOSITORY_URI" ]; then
    print_status "ECR_REPOSITORY_URI is set"
else
    print_warning "ECR_REPOSITORY_URI not set (required for Docker image scanning)"
fi

# Optional security scanning variables
if [ -n "$SNYK_TOKEN" ]; then
    print_status "SNYK_TOKEN is set (enhanced security scanning enabled)"
else
    print_warning "SNYK_TOKEN not set (Snyk scanning will be skipped)"
fi

if [ -n "$DOCKER_SCOUT_HUB_TOKEN" ]; then
    print_status "DOCKER_SCOUT_HUB_TOKEN is set (Docker Scout scanning enabled)"
else
    print_warning "DOCKER_SCOUT_HUB_TOKEN not set (Docker Scout scanning will be skipped)"
fi

# Create security configuration files if they don't exist
echo -e "\n${BLUE}Setting up security configuration files...${NC}"

# Check for .semgrep.yml
if [ -f ".semgrep.yml" ]; then
    print_status ".semgrep.yml found"
else
    print_warning ".semgrep.yml not found. Custom Semgrep rules will not be applied"
fi

# Check for .trivyignore
if [ -f ".trivyignore" ]; then
    print_status ".trivyignore found"
else
    print_warning ".trivyignore not found. All Trivy findings will be reported"
fi

# Run local security tests if not in CI
if [ "$CI_MODE" = false ] && [ "$1" = "--test" ]; then
    echo -e "\n${BLUE}Running local security tests...${NC}"
    
    # Run npm audit
    print_info "Running npm audit on backend..."
    (cd backend && npm audit --audit-level=moderate) || print_warning "npm audit found vulnerabilities in backend"
    
    print_info "Running npm audit on frontend..."
    (cd frontend && npm audit --audit-level=moderate) || print_warning "npm audit found vulnerabilities in frontend"
    
    # Run Semgrep if available
    if command_exists semgrep; then
        print_info "Running Semgrep SAST scan..."
        semgrep --config=auto --quiet . || print_warning "Semgrep found potential security issues"
    fi
    
    # Run Snyk if available and token is set
    if command_exists snyk && [ -n "$SNYK_TOKEN" ]; then
        print_info "Running Snyk security scan..."
        snyk auth "$SNYK_TOKEN" >/dev/null 2>&1 || print_warning "Snyk authentication failed"
        (cd backend && snyk test --severity-threshold=high) || print_warning "Snyk found vulnerabilities in backend"
        (cd frontend && snyk test --severity-threshold=high) || print_warning "Snyk found vulnerabilities in frontend"
    fi
fi

# Generate environment variable template
if [ "$1" = "--generate-env" ]; then
    echo -e "\n${BLUE}Generating environment variable template...${NC}"
    
    cat > .env.security.template << 'EOF'
# Security Scanning Environment Variables
# Copy this file to .env.security and fill in your values

# AWS Configuration (Required for CI/CD)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_DEFAULT_REGION=us-east-1
ECR_REPOSITORY_URI=your_account_id.dkr.ecr.us-east-1.amazonaws.com/todo-app

# Snyk Configuration (Optional - for enhanced dependency scanning)
# Sign up at https://snyk.io/ and get your token from Account Settings
SNYK_TOKEN=your_snyk_token

# Docker Scout Configuration (Optional - for Docker native scanning)
# Sign up at https://hub.docker.com/ and create an access token
DOCKER_SCOUT_HUB_TOKEN=your_docker_hub_token
DOCKER_SCOUT_HUB_USER=your_docker_hub_username

# Notification Configuration (Optional)
SLACK_WEBHOOK_URL=your_slack_webhook_url
TEAMS_WEBHOOK_URL=your_teams_webhook_url
EOF
    
    print_status "Environment variable template created: .env.security.template"
fi

# Summary
echo -e "\n${GREEN}Security Scanning Setup Complete!${NC}"
echo "============================================"

if [ "$CI_MODE" = false ]; then
    echo "Next steps for local development:"
    echo "1. Install any missing tools mentioned above"
    echo "2. Set up environment variables (run with --generate-env for template)"
    echo "3. Run security tests with: $0 --test"
else
    echo "CI environment detected. Security scanning will run automatically in pipeline."
fi

echo -e "\nFor more information, see: docs/security-scanning-implementation.md"

# Check for updates to security tools
if [ "$1" = "--update" ]; then
    echo -e "\n${BLUE}Updating security scanning tools...${NC}"
    
    if command_exists npm; then
        npm update -g snyk || print_warning "Failed to update Snyk"
    fi
    
    if command_exists trivy; then
        print_info "Updating Trivy database..."
        trivy image --download-db-only || print_warning "Failed to update Trivy database"
    fi
    
    if command_exists pip3; then
        pip3 install --upgrade semgrep || print_warning "Failed to update Semgrep"
    fi
    
    print_status "Security tools update complete"
fi

echo -e "\n${GREEN}🔒 Security setup finished successfully!${NC}" 