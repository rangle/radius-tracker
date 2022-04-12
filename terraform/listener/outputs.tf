# -----------------------------------------------------------------------------
# Outputs: API Gateway
# -----------------------------------------------------------------------------

output "api_invoke_url" {
  value = aws_api_gateway_stage._.invoke_url

  depends_on = [
    aws_api_gateway_stage._
  ]
}

output "bucket_name" {
  value = var.bucket_name
  depends_on = [
    var.lambda_bucket_id
  ]
}
