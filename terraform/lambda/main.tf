locals {
  lambda_code_hash = filebase64sha256(var.lambda_zip_path)
}

# -----------------------------------------------------------------------------
# Resources: Lambda
# -----------------------------------------------------------------------------

resource "null_resource" "_" {
  triggers = {
    "source_code_hash" = local.lambda_code_hash
  }
  provisioner "local-exec" {
    command = "aws --profile radius-tracker s3 cp ${var.lambda_zip_path} s3://${var.lambda_bucket_id}"
  }
}

resource "aws_iam_role" "_" {
  name               = "${var.namespace}-lambda"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_lambda_function" "_" {
  publish          = true
  function_name    = "${var.namespace}-lambda"
  role             = aws_iam_role._.arn
  runtime          = "nodejs14.x"
  timeout          = 120
  memory_size      = 512
  s3_bucket        = var.lambda_bucket_id
  s3_key           = basename(var.lambda_zip_path)
  handler          = "index.handler"
  source_code_hash = local.lambda_code_hash

  depends_on = [
    null_resource._
  ]
}

resource "aws_iam_policy" "_" {
  name        = "${var.namespace}-lambda"
  description = "Lambda Policy"
  policy      = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_policy_attachment" "_" {
  name       = "${var.namespace}-lambda"
  policy_arn = aws_iam_policy._.arn
  roles      = [aws_iam_role._.name]
}

resource "aws_iam_role_policy_attachment" "_" {
  role       = aws_iam_role._.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

