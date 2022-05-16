terraform {
  backend "s3" {
    bucket = "radius-tracker-state"
    key    = "tracker-state"
    region = "us-east-2"
  }
}



