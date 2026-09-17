#!/bin/bash
# ==============================================================================
# Script: run-flutter-emulators.sh
# Purpose: Start Android emulator or iOS simulator for mobile test execution
# ==============================================================================

PLATFORM=${1:-android}

echo "🚀 Starting Flutter Emulator for platform: $PLATFORM..."

if [ "$PLATFORM" = "android" ]; then
    EMULATOR_NAME=$(emulator -list-avds | head -n 1)
    if [ -z "$EMULATOR_NAME" ]; then
        echo "❌ No Android AVD found. Please create an AVD using Android Studio or avdmanager."
        exit 1
    fi
    echo "📱 Launching Android AVD: $EMULATOR_NAME..."
    emulator -avd "$EMULATOR_NAME" -no-boot-anim -netdelay none -no-snapshot-save &
    adb wait-for-device
    echo "✅ Android device connected and ready."

elif [ "$PLATFORM" = "ios" ]; then
    echo "📱 Booting iOS Simulator..."
    xcrun simctl boot "iPhone 15" 2>/dev/null || echo "Simulator already booted or unavailable."
    open -a Simulator
    echo "✅ iOS Simulator launched."
else
    echo "❌ Unknown platform: $PLATFORM. Valid values: 'android' or 'ios'."
    exit 1
fi
