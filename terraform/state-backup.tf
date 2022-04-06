terraform {
  backend "s3" {
    bucket  = "radius-tracker"
    key     = "tracker-state"
    profile = "radius-tracker"
    region  = "us-east-2"
  }
}



