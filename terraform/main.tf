provider "aws" {
  region = "us-east-1"  
}


resource "aws_vpc" "ttt_vpc" {
  cidr_block = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "ttt_vpc"
  }
}


resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.ttt_vpc.id

  tags = {
    Name = "ttt_gate"
  }
}


resource "aws_subnet" "ttt_sub" {
  vpc_id            = aws_vpc.ttt_vpc.id
  cidr_block        = "10.0.1.0/24"
  map_public_ip_on_launch = true

  tags = {
    Name = "ttt_sub"
    Terraform   = "true"
    Environment = "dev"
  }
}


resource "aws_route_table" "tictactoe_rt" {
  vpc_id = aws_vpc.ttt_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "ttt_route"
  }
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.ttt_sub.id
  route_table_id = aws_route_table.tictactoe_rt.id
}






resource "aws_security_group" "allow_ssh_http" {
  name        = "allow_ssh_http"
  description = "Allow SSH, HTTP, and backend traffic"
  vpc_id      = aws_vpc.ttt_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
  from_port   = 8080
  to_port     = 8081
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "allow-ssh-http"
  }
}


resource "aws_instance" "ttt_inst" {
  ami = "ami-080e1f13689e07408"
  instance_type = "t2.micro"
  key_name = "vockey"
  subnet_id = aws_subnet.ttt_sub.id
  associate_public_ip_address = "true"
  vpc_security_group_ids = [aws_security_group.allow_ssh_http.id]

  user_data = <<-EOF
    #!/bin/bash
              apt-get update
              apt-get install docker.io -y
            
              
              
              systemctl start docker
              systemctl enable docker
              
              curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose
              
              usermod -a -G docker $(whoami)
              usermod -aG docker ubuntu
              newgrp docker
             
            
              
              cd /home/ubuntu
    
              git clone https://github.com/pwr-cloudprogramming/a10-mertkodzhaaslan.git
              
              cd /home/ubuntu
    
              cd a10-mertkodzhaaslan
    
              docker-compose up -d
  EOF
  
  user_data_replace_on_change = true

  tags = {
    Name = "TicTacToeInst"
  }
  


}
output "public_ip" {
  value = aws_instance.ttt_inst.public_ip
}
