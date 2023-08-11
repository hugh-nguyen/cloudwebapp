import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class TestwebappStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc');

    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    const userData = ec2.UserData.forLinux({
      shebang: "#!/bin/bash -xe"
    });
    userData.addCommands(
      'sudo apt update',
      'sudo apt install -y nginx',
      `echo '${Buffer.from('build/index.html').toString('base64')}' | base64 --decode > /var/www/html/index.html`
      // ^ Replace '<YOUR REACT PRODUCTION BUILD HTML>' with your React app's built index.html content
      // You can also use S3 to fetch the build instead of embedding it in the UserData
    );

    new ec2.Instance(this, 'MyInstance', {
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Ensure you're launching in a public subnet
      },
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: new ec2.AmazonLinuxImage(), // or any other image you prefer
      role: ec2Role,
      userData: userData
    });
  }
}
