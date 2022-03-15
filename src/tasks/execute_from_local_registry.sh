#!/usr/bin/env sh

# TODO: Ideally, test the tracker output is sane, instead of using `--help`
NPM_CONFIG_REGISTRY=http://localhost:8080 npx -p radius-tracker@latest radius-tracker . --help
