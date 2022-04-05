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
  force_destroy = false
}

resource "aws_s3_bucket_acl" "_" {
  bucket = aws_s3_bucket._.id
  acl    = "private"
}

# -----------------------------------------------------------------------------
# Resources: Terraform State Bucket
# -----------------------------------------------------------------------------


resource "aws_s3_bucket" "state_bucket" {
  bucket        = "raduis-tracker-terraform-state"
  force_destroy = false
}

resource "aws_s3_bucket_acl" "state_bucket_acl" {
  bucket = aws_s3_bucket.state_bucket.id
  acl    = "private"
}

resource "aws_s3_bucket_versioning" "state_bucket_versioning" {
  bucket = aws_s3_bucket.state_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}
