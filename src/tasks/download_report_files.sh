#!/usr/bin/env sh

curl https://api.observablehq.com/@smoogly/design-system-metrics@206.tgz?v=3 --output tmp.tgz
mkdir build/report
tar zxvf tmp.tgz -C build/report
rm -f tmp.tgz
rm -rf build/report/files build/report/package.json build/report/README.md
