#!/bin/bash
# ==============================================================================
# Script: clean-test-artifacts.sh
# Purpose: Clear test results, videos, traces, and temporary cache directories
# ==============================================================================

echo "🧹 Cleaning test artifacts, logs, and cache..."

rm -rf playwright-report
rm -rf test-results
rm -rf allure-results
rm -rf allure-report
rm -rf .auth
rm -f *.log

echo "✅ All test artifacts and cache directories cleaned successfully."
