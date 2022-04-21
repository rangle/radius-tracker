# -----------------------------------------------------------------------------
# Resources: API Gateway
# -----------------------------------------------------------------------------

resource "aws_api_gateway_method" "_" {
  rest_api_id   = var.api_id
  resource_id   = var.api_resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "_" {
  rest_api_id      = var.api_id
  resource_id      = var.api_resource_id
  http_method      = aws_api_gateway_method._.http_method
  content_handling = "CONVERT_TO_TEXT"

  type = "MOCK"

  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_integration_response" "_" {
  rest_api_id = var.api_id
  resource_id = var.api_resource_id
  http_method = aws_api_gateway_method._.http_method
  status_code = 200

  # The headers using `context` are mirroring the request.
  # This allows any requests during OPTIONS call.
  # Requests are further restricted when hitting the API.
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "context.requestOverride.header.access-control-request-headers"
    "method.response.header.Access-Control-Allow-Methods" = "context.requestOverride.header.access-control-request-method"
    "method.response.header.Access-Control-Allow-Origin"  = "context.requestOverride.header.origin"
    "method.response.header.Access-Control-Max-Age"       = "'86400'"
    "method.response.header.Vary"                         = "'Origin,Access-Control-Request-Headers,Access-Control-Request-Method'"
  }

  depends_on = [
    aws_api_gateway_integration._,
    aws_api_gateway_method_response._,
  ]
}

resource "aws_api_gateway_method_response" "_" {
  rest_api_id = var.api_id
  resource_id = var.api_resource_id
  http_method = aws_api_gateway_method._.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Max-Age"       = true
    "method.response.header.Vary"                         = true
  }

  response_models = {
    "application/json" = "Empty"
  }

  depends_on = [
    aws_api_gateway_method._,
  ]
}
