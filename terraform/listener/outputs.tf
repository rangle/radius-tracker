# -----------------------------------------------------------------------------
# Outputs: API Gateway
# -----------------------------------------------------------------------------

output "api_invoke_url" {
  value = aws_api_gateway_stage._.invoke_url
}
