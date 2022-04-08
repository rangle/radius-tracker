locals {
  lambda_code_hash = filebase64sha256(var.listener_zip_path)
}

# -----------------------------------------------------------------------------
# Resources: Lambda
# -----------------------------------------------------------------------------

resource "null_resource" "_" {
  triggers = {
    "source_code_hash" = local.lambda_code_hash
  }
  provisioner "local-exec" {
    command = "aws --profile radius-tracker s3 cp ${var.listener_zip_path} s3://${var.lambda_bucket_id}"
  }
}

resource "aws_iam_role" "_" {
  name               = "${var.namespace}-listener"
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
  name       = "${var.namespace}-listener"
  policy_arn = aws_iam_policy.logs_policy.arn
  roles      = [aws_iam_role._.name]
}

resource "aws_iam_role_policy_attachment" "_" {
  role       = aws_iam_role._.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "_" {
  publish          = true
  function_name    = "${var.namespace}-listener"
  role             = aws_iam_role._.arn
  runtime          = "nodejs14.x"
  timeout          = 30
  memory_size      = 128
  s3_bucket        = var.lambda_bucket_id
  s3_key           = basename(var.listener_zip_path)
  handler          = "index.handler"
  source_code_hash = local.lambda_code_hash

  depends_on = [
    null_resource._
  ]

  tags = {
    project = "radiustracker"
  }
}

resource "aws_iam_policy" "logs_policy" {
  name        = "${var.namespace}-listener"
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


# -----------------------------------------------------------------------------
# Resources: SNS & SQS
# -----------------------------------------------------------------------------


resource "aws_sns_topic" "_" {
  name = "${var.namespace}-listener-topic"

  tags = {
    project = "radiustracker"
  }
}

resource "aws_sqs_queue" "_" {
  name                       = "${var.namespace}-listener-queue"
  redrive_policy             = "{\"deadLetterTargetArn\":\"${aws_sqs_queue.dl_queue.arn}\",\"maxReceiveCount\":5}"
  visibility_timeout_seconds = 300

  tags = {
    project = "radiustracker"
  }
}

resource "aws_sqs_queue" "dl_queue" {
  name = "${var.namespace}-listener-dl-queue"

  tags = {
    project = "radiustracker"
  }
}

resource "aws_sns_topic_subscription" "_" {
  topic_arn = aws_sns_topic._.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue._.arn
}

resource "aws_sqs_queue_policy" "_" {
  queue_url = aws_sqs_queue._.id

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "sqspolicy",
  "Statement": [
    {
      "Sid": "First",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "sqs:SendMessage",
      "Resource": "${aws_sqs_queue._.arn}",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "${aws_sns_topic._.arn}"
        }
      }
    }
  ]
}
POLICY
}

resource "aws_lambda_event_source_mapping" "_" {
  event_source_arn = aws_sqs_queue._.arn
  enabled          = true
  function_name    = aws_lambda_function._.arn
  batch_size       = 1
}

