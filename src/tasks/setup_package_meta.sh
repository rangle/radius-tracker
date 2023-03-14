#!/usr/bin/env sh
cp README.md build
cp package.json build/package.json

# Typescript compiler only handles ts files.
# Other required files need to be manually copied into the build.
for source in src/lib/cli/report/{additional_styles.css,generate_report_template.sh}
do
  for destination in build/{cjs,esm}/cli/report/
  do
    cp "${source}" "${destination}"
  done
done
