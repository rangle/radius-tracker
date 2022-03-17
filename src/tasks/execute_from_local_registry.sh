#!/usr/bin/env sh

# See ./publish_to_local_registry.sh for details of publishing the package locally

# TODO: Ideally, test the tracker output is sane, instead of using `--version`

if [ "${CI}" = "true" ]; then
  # In CI need to explicitly install the package.
  # For some reason, npx below doesn't use the registry specified in `NPM_CONFIG_REGISTRY` env.
  # Moreover, installing globally to avoid `ENOSELF` error in npm v6.14.15
  npm i radius-tracker@latest -g --registry=http://localhost:8080
  npx radius-tracker . --version
else
  export NPM_CONFIG_REGISTRY=http://localhost:8080
  export NPM_CONFIG_PREFER_ONLINE=true
  npx -p radius-tracker@latest -- radius-tracker . --version
fi;
