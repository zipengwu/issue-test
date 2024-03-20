import { aws_rds as rds } from 'aws-cdk-lib';

new rds.CfnDBCluster(this, 'example', {
  storageEncrypted: false, // Sensitive
});