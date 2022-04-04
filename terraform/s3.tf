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
}

# -----------------------------------------------------------------------------
# Resources: Bucket
# -----------------------------------------------------------------------------


resource "aws_s3_bucket" "_" {
  bucket        = "radius-tracker"
  force_destroy = false
}

resource "aws_s3_bucket_acl" "_" {
  bucket = aws_s3_bucket._.id
  acl    = "private"
}
