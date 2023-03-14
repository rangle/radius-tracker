#!/usr/bin/env sh

set -e

REPORT_DIR=build/report_template

if [ -z "${1}" ]; then
  echo "Missing report url"
  exit;
fi


# Fetch
curl "${1}" --output report.tgz

# Create the dir
rm -rf "${REPORT_DIR}"
mkdir -p "${REPORT_DIR}"

# Extract
tar zxf report.tgz -C "${REPORT_DIR}"
rm report.tgz

# Run transformations
BASEDIR=$(dirname "$0")
npx --package ts-node -- node -r ts-node/register/transpile-only "${BASEDIR}/prepare_report" "${REPORT_DIR}"

# Append additional styles
cat "${BASEDIR}/additional_styles.css" >> "${REPORT_DIR}/inspector.css"

# Cleanup unnecessary files
rm -f "${REPORT_DIR}"/files/* "${REPORT_DIR}"/package.json "${REPORT_DIR}/README.md"
touch "${REPORT_DIR}/files/.empty"
