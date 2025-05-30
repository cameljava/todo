#!/bin/bash

# Health Check Script for Todo Application
# Usage: ./scripts/health-check.sh [URL] [--detailed]

set -e

# Default URL (localhost for development)
URL="${1:-http://localhost:3000}"
DETAILED="${2:-}"

echo "🏥 Health Check for Todo Application"
echo "Target: $URL"
echo "Time: $(date)"
echo "=================================="

# Basic health check
echo "📋 Basic Health Check:"
HEALTH_RESPONSE=$(curl -s "$URL/health" || echo "ERROR")

if [ "$HEALTH_RESPONSE" = "ERROR" ]; then
    echo "❌ Health check failed - service not responding"
    exit 1
fi

echo "✅ Service is responding"

# Parse and display health status
STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status' 2>/dev/null || echo "unknown")
echo "   Status: $STATUS"

if [ "$STATUS" = "ok" ]; then
    echo "✅ All systems healthy"
elif [ "$STATUS" = "degraded" ]; then
    echo "⚠️  Service degraded"
    # Show failed checks
    echo "$HEALTH_RESPONSE" | jq -r '.checks | to_entries[] | select(.value != "ok") | "   ❌ \(.key): \(.value)"' 2>/dev/null || true
else
    echo "❌ Service unhealthy"
fi

# Detailed health check if requested
if [ "$DETAILED" = "--detailed" ]; then
    echo ""
    echo "🔍 Detailed Health Check:"
    DETAILED_RESPONSE=$(curl -s "$URL/health/detailed" || echo "ERROR")
    
    if [ "$DETAILED_RESPONSE" = "ERROR" ]; then
        echo "❌ Detailed health check failed"
    else
        echo "✅ Detailed health data available"
        
        # Extract key information
        UPTIME=$(echo "$DETAILED_RESPONSE" | jq -r '.uptime' 2>/dev/null || echo "unknown")
        MEMORY_USED=$(echo "$DETAILED_RESPONSE" | jq -r '.memory.heapUsed' 2>/dev/null || echo "unknown")
        ENV=$(echo "$DETAILED_RESPONSE" | jq -r '.environment' 2>/dev/null || echo "unknown")
        
        echo "   Uptime: ${UPTIME}s"
        echo "   Memory Used: $MEMORY_USED"
        echo "   Environment: $ENV"
        
        # Show configuration
        echo "   Configuration:"
        echo "$DETAILED_RESPONSE" | jq -r '.config | to_entries[] | "     \(.key): \(.value)"' 2>/dev/null || true
    fi
fi

echo ""
echo "=================================="

# Exit with appropriate code based on health status
if [ "$STATUS" = "ok" ]; then
    echo "🎉 Health check completed successfully"
    exit 0
elif [ "$STATUS" = "degraded" ]; then
    echo "⚠️  Health check completed with warnings"
    exit 1
else
    echo "💥 Health check failed"
    exit 2
fi 