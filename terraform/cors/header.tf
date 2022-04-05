# -----------------------------------------------------------------------------
# Locals
# -----------------------------------------------------------------------------

# local.*
locals {
  headers = {
    "Access-Control-Allow-Headers"     = "'${join(",", var.allow_headers)}'"
    "Access-Control-Allow-Methods"     = "'${join(",", var.allow_methods)}'"
    "Access-Control-Allow-Origin"      = "'${var.allow_origin}'"
    "Access-Control-Max-Age"           = "'${var.allow_max_age}'"
    "Access-Control-Allow-Credentials" = var.allow_credentials ? "'true'" : ""
  }

  # Pick non-empty header values
  header_values = compact(values(local.headers))

  # Pick names that from non-empty header values
  header_names = matchkeys(
    keys(local.headers),
    values(local.headers),
    local.header_values
  )

  # Parameter names for method and integration responses
  parameter_names = formatlist("method.response.header.%s", local.header_names)

  # Map parameter list to "true" values
  true_list = split("|",
    replace(join("|", local.parameter_names), "/[^|]+/", "true")
  )

  # Integration response parameters
  integration_response_parameters = zipmap(
    local.parameter_names,
    local.header_values
  )

  # Method response parameters
  method_response_parameters = zipmap(
    local.parameter_names,
    local.true_list
  )
}
