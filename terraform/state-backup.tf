terraform {
  backend "s3" {
    bucket  = "raduis-tracker-terraform-state"
    key     = "tracker-state"
    profile = "radius-tracker"
    region  = "us-east-2"
  }
}



