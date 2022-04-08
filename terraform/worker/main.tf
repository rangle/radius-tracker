locals {
  lambda_code_hash = filebase64sha256(var.worker_zip_path)
}

# -----------------------------------------------------------------------------
# Resources: Lambda
# -----------------------------------------------------------------------------

resource "null_resource" "_" {
  triggers = {
    "source_code_hash" = local.lambda_code_hash
  }
  provisioner "local-exec" {
    command = "aws --profile radius-tracker s3 cp ${var.worker_zip_path} s3://${var.lambda_bucket_id}"
  }
}

resource "aws_iam_role" "_" {
  name               = "${var.namespace}-worker"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow"
    }
  ]
}
EOF

  tags = {
    project = "radiustracker"
  }

}

resource "aws_iam_policy_attachment" "_" {
  name       = "${var.namespace}-worker"
  policy_arn = aws_iam_policy.logs_policy_worker.arn
  roles      = [aws_iam_role._.name]
}

resource "aws_iam_role_policy_attachment" "_" {
  role       = aws_iam_role._.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "_" {
  publish          = true
  function_name    = "${var.namespace}-worker"
  role             = aws_iam_role._.arn
  runtime          = "nodejs14.x"
  timeout          = 30
  memory_size      = 128
  s3_bucket        = var.lambda_bucket_id
  s3_key           = basename(var.worker_zip_path)
  handler          = "index.handler"
  source_code_hash = local.lambda_code_hash

  depends_on = [
    null_resource._
  ]

  tags = {
    project = "radiustracker"
  }
}

resource "aws_iam_policy" "logs_policy_worker" {
  name        = "${var.namespace}-worker"
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

resource "aws_iam_role_policy" "sqs_policy" {
  name   = "AllowSQSPermissions"
  role   = aws_iam_role._.id
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "sqs:ChangeMessageVisibility",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:ReceiveMessage"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_cloudwatch_log_group" "_" {
  name              = "/aws/lambda/${aws_lambda_function._.function_name}"
  retention_in_days = 14
}

resource "aws_lambda_event_source_mapping" "_" {
  event_source_arn = var.sqs_queue_arn
  enabled          = true
  function_name    = aws_lambda_function._.arn
  batch_size       = 1
}
