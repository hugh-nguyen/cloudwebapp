# cloudwebapp

ssh -i ./cloudkeypair.pem ec2-user@XXXXXX
ssh -i ./cloudkeypair.pem -J ec2-user@XXXXXX ec2-user@XXXXX

ssh-add ./cloudkeypair.pem 
ssh-add ./internalcloudkeypair.pem 
ssh -A -J ec2-user@XXXXX ec2-user@XXXXXXX
