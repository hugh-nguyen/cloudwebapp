# cloudwebapp

# Bastion Ec2 Instance Connect
ssh-keygen -t rsa -f my_key

aws ec2-instance-connect send-ssh-public-key \
    --region ap-southeast-2 \
    --availability-zone ap-southeast-2a \
    --instance-id <bastion-id> \
    --instance-os-user ec2-user \
    --ssh-public-key file://my_key.pub
  
aws ec2-instance-connect send-ssh-public-key \
    --region ap-southeast-2 \
    --availability-zone ap-southeast-2a \
    --instance-id <private-id> \
    --instance-os-user ec2-user \
    --ssh-public-key file://my_key.pub

ssh-add ./my_key

ssh -A -J ec2-user@<bastion-ip> ec2-user@<private-ip>