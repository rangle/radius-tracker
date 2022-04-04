module "lambda_api" {
  source           = "./lambda"
  lambda_bucket_id = aws_s3_bucket._.id
  lambda_zip_path  = "${path.module}/../lambda.zip"
}
