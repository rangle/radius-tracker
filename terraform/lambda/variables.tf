variable "lambda_zip_path" {
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
