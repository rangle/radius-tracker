# -----------------------------------------------------------------------------
# Outputs: API Gateway
# -----------------------------------------------------------------------------

output "api_invoke_url" {
  value = aws_api_gateway_stage._.invoke_url
}

output "lambda_arn" {
  value = aws_lambda_function._.arn
}
