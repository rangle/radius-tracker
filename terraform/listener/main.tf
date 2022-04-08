locals {
  lambda_code_hash = filebase64sha256(var.listener_zip_path)
}

# -----------------------------------------------------------------------------
# Resources: Lambda
# -----------------------------------------------------------------------------

resource "null_resource" "_" {
  triggers = {
    "source_code_hash" = local.lambda_code_hash
  }
  provisioner "local-exec" {
    command = "aws --profile radius-tracker s3 cp ${var.listener_zip_path} s3://${var.lambda_bucket_id}"
  }
}
resource "null_resource" "outputs" {
  triggers = {
    "invoke_url_changed" = aws_api_gateway_deployment._.id
  }
  provisioner "local-exec" {
    command = "rm -rf ../src/demo/src/api.json && terraform output -json listener_outputs >> ../src/demo/src/api.json"
  }

  depends_on = [
    aws_api_gateway_stage._
  ]
}

resource "aws_iam_role" "_" {
  name               = "${var.namespace}-listener"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

  tags = {
    project = "radiustracker"
  }

}

resource "aws_lambda_function" "_" {
  publish          = true
  function_name    = "${var.namespace}-listener"
  role             = aws_iam_role._.arn
  runtime          = "nodejs14.x"
  timeout          = 30
  memory_size      = 256
  s3_bucket        = var.lambda_bucket_id
  s3_key           = basename(var.listener_zip_path)
  handler          = "index.handler"
  source_code_hash = local.lambda_code_hash

  depends_on = [
    null_resource._
  ]

  environment {
    variables = {
      SNS_ARN = var.sns_arn
      REGION  = var.aws_region
    }
  }

  tags = {
    project = "radiustracker"
  }
}

resource "aws_iam_policy" "listener" {
  name        = "${var.namespace}-listener"
  description = "Lambda Policy"
  policy      = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow"
    }
  ]
}
EOF

  tags = {
    project = "radiustracker"
  }
}

resource "aws_iam_policy_attachment" "_" {
  name       = "${var.namespace}-listener"
  policy_arn = aws_iam_policy.listener.arn
  roles      = [aws_iam_role._.name]
}

resource "aws_iam_role_policy_attachment" "_" {
  role       = aws_iam_role._.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "listener" {
  name              = "/aws/lambda/${aws_lambda_function._.function_name}"
  retention_in_days = 14
}

# -----------------------------------------------------------------------------
# Resources: API Gateway
# -----------------------------------------------------------------------------


resource "aws_lambda_permission" "_" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function._.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_rest_api._.execution_arn}/*/*"
}

resource "aws_api_gateway_rest_api" "_" {
  name        = "${var.namespace}-listener-api"
  description = "Proxy to handle requests to lambda"

  tags = {
    project = "radiustracker"
  }
}

resource "aws_api_gateway_resource" "_" {
  rest_api_id = aws_api_gateway_rest_api._.id
  parent_id   = aws_api_gateway_rest_api._.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "_" {
  rest_api_id   = aws_api_gateway_rest_api._.id
  resource_id   = aws_api_gateway_resource._.id
  http_method   = "POST"
  authorization = "NONE"
  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "_" {
  rest_api_id             = aws_api_gateway_rest_api._.id
  resource_id             = aws_api_gateway_resource._.id
  http_method             = aws_api_gateway_method._.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function._.invoke_arn

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

resource "aws_api_gateway_method_response" "_" {
  rest_api_id = aws_api_gateway_rest_api._.id
  resource_id = aws_api_gateway_resource._.id
  http_method = aws_api_gateway_method._.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
  depends_on = [
    aws_api_gateway_method._
  ]
}

resource "aws_api_gateway_deployment" "_" {
  rest_api_id = aws_api_gateway_rest_api._.id

  depends_on = [
    aws_api_gateway_integration._,
  ]
  variables = {
    deployed_at = "${timestamp()}"
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "_" {
  deployment_id = aws_api_gateway_deployment._.id
  rest_api_id   = aws_api_gateway_rest_api._.id
  stage_name    = "v1"
}

module "cors" {
  source = "../cors"

  api_id          = aws_api_gateway_rest_api._.id
  api_resource_id = aws_api_gateway_resource._.id
}



