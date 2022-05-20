variable "listener_zip_path" {
  description = "Path to lambda zip file"
  type        = string
}

variable "lambda_bucket_id" {
  description = "Bucket ID to store lambda code"
  type        = string
}
variable "sns_arn" {
  description = "SNS arn"
  type        = string
}

variable "namespace" {
  description = "Infrastructure namespace"
  type        = string
  default     = "radius-tracker"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "bucket_name" {
  description = "S3 bucket name"
  type        = string
}

