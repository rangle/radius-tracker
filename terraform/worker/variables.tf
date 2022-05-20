variable "worker_zip_path" {
  description = "Path to lambda zip file"
  type        = string
}

variable "lambda_bucket_id" {
  description = "Bucket ID to store lambda code"
  type        = string
}

variable "namespace" {
  description = "Infrastructure namespace"
  type        = string
  default     = "radius-tracker"
}

variable "sqs_queue_arn" {
  description = "SQS queue arn"
  type        = string
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
variable "bucket_arn" {
  description = "S3 bucket arn"
  type        = string
}
