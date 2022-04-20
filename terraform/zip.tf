# -----------------------------------------------------------------------------
# Resources: Zip files generation
# -----------------------------------------------------------------------------

data "archive_file" "worker" {
  type        = "zip"
  output_path = "${path.cwd}/../lambda_worker.zip"
  source_dir  = "${path.cwd}/../src/lambda/build/worker/"
}
data "archive_file" "listener" {
  type        = "zip"
  output_path = "${path.cwd}/../lambda_listener.zip"
  source_dir  = "${path.cwd}/../src/lambda/build/listener/"
}
