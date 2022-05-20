terraform {
  backend "s3" {
    bucket = "radius-tracker-tf-state"
    key    = "tracker-state"
    region = "us-east-2"
  }
}



