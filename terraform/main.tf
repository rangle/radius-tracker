terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.8.0"
    }
  }

  required_version = ">= 0.14.9"
}

provider "aws" {
  region = "us-east-2"
}

# -----------------------------------------------------------------------------
# Resources: Lambda Bucket
# -----------------------------------------------------------------------------


resource "aws_s3_bucket" "_" {
  bucket        = "radius-tracker-resources"
  force_destroy = false

  tags = {
    project = "radiustracker"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "_" {
  bucket = aws_s3_bucket._.id

  rule {
    id = "rule-1"

    expiration {
      days = 30
    }

    filter {
      prefix = "reports/"
    }

    status = "Enabled"
  }
}

resource "aws_s3_bucket_acl" "_" {
  bucket = aws_s3_bucket._.id
  acl    = "private"
}

resource "aws_s3_bucket_policy" "reports" {
  bucket = aws_s3_bucket._.id
  policy = <<EOF
  {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "${aws_s3_bucket._.arn}/reports/*"
        }
    ]
  }
  EOF
}

resource "aws_s3_bucket_cors_configuration" "_" {
  bucket = aws_s3_bucket._.bucket
  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["https://rangle.github.io"]
  }
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

resource "aws_sns_topic_policy" "_" {
  arn = aws_sns_topic._.arn

  policy = <<EOF
  {
  "Version": "2012-10-17",
    "Id": "snspolicy",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": "*",
        "Action": "SNS:Publish",
        "Resource": "${aws_sns_topic._.arn}"
      }
    ]
  }
  EOF
}

resource "aws_sns_topic_subscription" "_" {
  topic_arn = aws_sns_topic._.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue._.arn
}

resource "aws_sqs_queue" "_" {
  name                       = "${var.namespace}-listener-queue"
  redrive_policy             = "{\"deadLetterTargetArn\":\"${aws_sqs_queue.dl_queue.arn}\",\"maxReceiveCount\":5}"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 300

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

resource "aws_sqs_queue_policy" "_" {
  queue_url = aws_sqs_queue._.id

  policy = <<EOF
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
EOF
}


module "worker" {
  source           = "./worker"
  lambda_bucket_id = aws_s3_bucket._.id
  worker_zip_path  = "${path.cwd}/lambda_worker.zip"
  sqs_queue_arn    = aws_sqs_queue._.arn
  bucket_name      = aws_s3_bucket._.bucket
  bucket_arn       = aws_s3_bucket._.arn

  depends_on = [
    data.archive_file.worker
  ]
}

module "listener" {
  source            = "./listener"
  lambda_bucket_id  = aws_s3_bucket._.id
  listener_zip_path = "${path.cwd}/lambda_listener.zip"
  sns_arn           = aws_sns_topic._.arn
  bucket_name       = aws_s3_bucket._.bucket

  depends_on = [
    data.archive_file.listener
  ]
}
