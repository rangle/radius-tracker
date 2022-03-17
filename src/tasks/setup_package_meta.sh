#!/usr/bin/env sh
cp README.md build
sed '/postinstall/d' package.json > build/package.json
