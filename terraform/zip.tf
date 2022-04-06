# -----------------------------------------------------------------------------
# Resources: Zip file generation
# -----------------------------------------------------------------------------

data "archive_file" "_" {
  type        = "zip"
  output_path = "${path.cwd}/../lambda.zip"
  source_dir  = "${path.cwd}/../src/lambda/"
  excludes = [
    "index.ts",
    "tsconfig.json"
  ]
}

module "lambda_api" {
  source           = "./lambda"
  lambda_bucket_id = aws_s3_bucket._.id
  lambda_zip_path  = "${path.cwd}/../lambda.zip"

  depends_on = [
    data.archive_file._
  ]
}

