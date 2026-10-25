# Paper design for the AWS shape of the local cluster.
# terraform validate checks this file. Do not run plan or apply.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "RDS master password. Supplied at apply time, never written here."
}

# The image you tagged graphorg-web:local and loaded into kind.
resource "aws_ecr_repository" "web" {
  name = "graphorg-web"
}

# Compose Postgres on port 5433. Postgres 16, same major version as the local container.
resource "aws_db_instance" "postgres" {
  identifier        = "graphorg"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  username          = "graphorg"
  password          = var.db_password
  db_name           = "graphorg"

  storage_encrypted   = true
  skip_final_snapshot = true
  publicly_accessible = false
}

# Compose Redis 7.
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "graphorg"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}