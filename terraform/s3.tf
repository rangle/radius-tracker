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
  profile = "radius-tracker"
  // shared_credentials_file = "~/.aws/credentials" To implement later
}

# -----------------------------------------------------------------------------
# Resources: Lambda Bucket
# -----------------------------------------------------------------------------


resource "aws_s3_bucket" "_" {
  bucket        = "radius-tracker"
  force_destroy = true

  tags = {
    project = "radiustracker"
  }
}

resource "aws_s3_bucket_acl" "_" {
  bucket = aws_s3_bucket._.id
  acl    = "private"
}

resource "aws_s3_bucket_versioning" "_" {
  bucket = aws_s3_bucket._.id
  versioning_configuration {
    status = "Enabled"
  }
}

