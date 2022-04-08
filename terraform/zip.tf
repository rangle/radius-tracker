# -----------------------------------------------------------------------------
# Resources: Zip files generation
# -----------------------------------------------------------------------------

data "archive_file" "worker" {
  type        = "zip"
  output_path = "${path.cwd}/../lambda_worker.zip"
  source_dir  = "${path.cwd}/../src/lambda/worker/"
  excludes = [
    "index.ts",
    "tsconfig.json"
  ]
}
data "archive_file" "listener" {
  type        = "zip"
  output_path = "${path.cwd}/../lambda_listener.zip"
  source_dir  = "${path.cwd}/../src/lambda/listener/"
  excludes = [
    "index.ts",
    "tsconfig.json"
  ]
}

module "worker" {
  source           = "./worker"
  lambda_bucket_id = aws_s3_bucket._.id
  worker_zip_path  = "${path.cwd}/../lambda_worker.zip"

  depends_on = [
    data.archive_file.worker
  ]
}

module "listener" {
  source            = "./listener"
  lambda_bucket_id  = aws_s3_bucket._.id
  listener_zip_path = "${path.cwd}/../lambda_listener.zip"

  depends_on = [
    data.archive_file.listener
  ]
}
