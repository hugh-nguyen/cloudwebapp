import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc');

    // Bastion host
    const bastionRole = new iam.Role(this, 'BastionRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    

    const sshKeySecret = secretsmanager.Secret.fromSecretNameV2(this, 'internalcloudkeypair', 'internalcloudkeypair');
    
    sshKeySecret.grantRead(bastionRole);

    const bastionUserData = ec2.UserData.forLinux();
    bastionUserData.addCommands(
      'yum install -y aws-cli',
      'aws secretsmanager get-secret-value --secret-id internalcloudkeypair --query SecretString --output text  --region ap-southeast-2 > /home/ec2-user/internalcloudkeypair.pem',
      'chmod 400 /home/ec2-user/internalcloudkeypair.pem'
    );

    const bastionSG = new ec2.SecurityGroup(this, 'BastionSG', {
      vpc: vpc,
      description: 'Allow ssh access to bastion host',
    });
    bastionSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH from anywhere');

    new ec2.Instance(this, 'BastionHost', {
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
      }),
      securityGroup: bastionSG,
      role: bastionRole,
      userData: bastionUserData,
      keyName: 'cloudkeypair'
    });

    // Webserver instance
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    ec2Role.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: ['arn:aws:s3:::hn-testcloud-build-store/build.zip']
    }));

    const userData = ec2.UserData.forLinux({
      shebang: "#!/bin/bash -xe"
    });
    userData.addCommands(
      'yum install -y aws-cli',
      'aws s3 cp s3://hn-testcloud-build-store/build.zip /tmp/',
      'unzip /tmp/build.zip -d /tmp/',
      'yum install -y nginx',
      'service nginx start',
      'rm -rf /usr/share/nginx/html/*',
      'cp -R /tmp/build/* /usr/share/nginx/html/',
      'service nginx restart'
    );

    const sg = new ec2.SecurityGroup(this, 'InstanceSG', {
      vpc: vpc,
      allowAllOutbound: true,
      description: 'Allow ssh and http(s) access',
    });
    
    sg.addIngressRule(bastionSG, ec2.Port.tcp(22), 'Allow SSH from Bastion');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');

    new ec2.Instance(this, 'MyInstance', {
      vpc: vpc,
      // vpcSubnets: {
      //   subnetType: ec2.SubnetType.PUBLIC, // Ensure you're launching in a public subnet
      // },
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
      }),
      role: ec2Role,
      userData: userData,
      securityGroup: sg,
      keyName: 'cloudkeypair'
    });
  }
}
