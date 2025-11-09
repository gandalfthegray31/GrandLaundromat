# AWS CLI Setup Guide

This guide uses AWS CLI commands to:
1. Set up Secrets Manager for SMTP credentials
2. Configure HTTPS/SSL for your website
3. Set up HTTP→HTTPS redirect

## Prerequisites

- AWS CLI installed and configured
- Your Elastic Beanstalk environment is running: `grandcarwash-prod`
- Your domain: `eastgrand.com` (or `eastgrand.net`)

---

## Step 1: Create Secrets Manager Secret for SMTP

### Create the secret:

```bash
aws secretsmanager create-secret \
  --name grandcarwash/smtp-credentials \
  --description "SMTP credentials for Grand Car Wash appointment emails" \
  --secret-string '{"SMTP_HOST":"smtp.gmail.com","SMTP_PORT":"587","SMTP_USER":"your-email@gmail.com","SMTP_PASS":"your-app-password"}'
```

**Replace:**
- `your-email@gmail.com` with your actual Gmail address
- `your-app-password` with your Gmail App Password (generate at: https://support.google.com/accounts/answer/185833)

### Update the secret later (if needed):

```bash
aws secretsmanager put-secret-value \
  --secret-id grandcarwash/smtp-credentials \
  --secret-string '{"SMTP_HOST":"smtp.gmail.com","SMTP_PORT":"587","SMTP_USER":"your-email@gmail.com","SMTP_PASS":"your-app-password"}'
```

**Note:** Use `put-secret-value` (not `update-secret`) to update the secret value. The `--secret-id` parameter accepts either the secret name or ARN.

### Get the secret ARN (you'll need this):

```bash
aws secretsmanager describe-secret --secret-id grandcarwash/smtp-credentials --query 'ARN' --output text
```

Save this ARN - you'll need it in Step 2.

---

## Step 2: Update Elastic Beanstalk Environment Variables

### Get your current environment configuration:

```bash
aws elasticbeanstalk describe-environments \
  --environment-names grandcarwash-prod \
  --query 'Environments[0].EnvironmentId' \
  --output text
```

### Update environment to include SMTP_SECRET_ARN:

```bash
aws elasticbeanstalk update-environment \
  --environment-name grandcarwash-prod \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=SMTP_SECRET_ARN,Value=YOUR_SECRET_ARN_HERE \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_REGION,Value=us-east-1
```

**Replace `YOUR_SECRET_ARN_HERE`** with the ARN from Step 1.

---

## Step 3: Request SSL Certificate from ACM

### Request certificate for your domain:

```bash
aws acm request-certificate \
  --domain-name cw.eastgrand.net \
  --validation-method DNS \
  --region us-east-1
```

**Note:** If your domain is `eastgrand.net`, use `cw.eastgrand.net` instead.

### Get certificate ARN (save this):

```bash
aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" \
  --output text
```

### Get DNS validation records:

```bash
CERT_ARN=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" --output text)

aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json
```

This will show you the DNS validation record you need to add to Route 53.

### Add DNS validation record to Route 53:

First, get your hosted zone ID:

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='eastgrand.net.'].Id" --output text
```

Then create the validation record (replace `YOUR_ZONE_ID` and use the values from the previous command):

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id "/hostedzone/Z0437693U203KLCBKJB6" \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "VALIDATION_RECORD_NAME_FROM_ABOVE",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "VALIDATION_RECORD_VALUE_FROM_ABOVE"}]
      }
    }]
  }'
```

Wait 5-10 minutes for validation to complete, then check:

```bash
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Should show `ISSUED` when ready.

---

## Step 4: Configure HTTPS on Elastic Beanstalk

### First, check if your environment has a load balancer:

```bash
# Check if load balancer exists
aws elasticbeanstalk describe-environment-resources \
  --environment-name grandcarwash-prod \
  --region us-east-1 \
  --query 'EnvironmentResources.LoadBalancers[*].Name' \
  --output text
```

**If this returns empty/blank**, your environment was created with `--single` flag and has NO load balancer. **HTTPS will NOT work** without a load balancer.

**Solution:** You must recreate the environment WITHOUT the `--single` flag:

```bash
# Terminate current environment
eb terminate grandcarwash-prod --force

# Wait for termination to complete, then create new environment WITH load balancer
eb create grandcarwash-prod --platform "Node.js 20 running on 64bit Amazon Linux 2023" --instance-type t3.small
# DO NOT use --single flag!
```

### Check what type of load balancer your environment uses (if load balancer exists):

```bash
aws elasticbeanstalk describe-configuration-settings \
  --application-name grandcarwash-prod \
  --environment-name grandcarwash-prod \
  --query 'ConfigurationSettings[0].OptionSettings[?Namespace==`aws:elasticbeanstalk:environment` && OptionName==`LoadBalancerType`].Value' \
  --output text
```

This will show either:
- `classic` = Classic Load Balancer (CLB) - use `aws:elb` namespace
- `application` = Application Load Balancer (ALB) - use `aws:elbv2` namespace
- **Empty/None** = No load balancer (created with `--single`) - HTTPS not possible

### Option A: If using Application Load Balancer (ALB):

**Prerequisite:** Your environment MUST have a load balancer. If the check above shows no load balancer, recreate the environment without `--single` flag.

For ALB, configure HTTPS with these options:

```bash
# Get certificate ARN
CERT_ARN=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" --output text)

echo $CERT_ARN
# Configure HTTPS listener
aws elasticbeanstalk update-environment \
  --environment-name grandcarwash-prod \
  --option-settings \
    Namespace=aws:elbv2:listener:443,OptionName=Protocol,Value=HTTPS \
    Namespace=aws:elbv2:listener:443,OptionName=SSLCertificateArns,Value=$CERT_ARN \
  --region us-east-1
```

**Wait for update to complete** (check status as shown in Step 2).

**Note:** If you get an error about invalid state, wait for the environment to be `Ready` before trying again.

### Option B: If using Classic Load Balancer (CLB):

```bash
CERT_ARN=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" --output text)

aws elasticbeanstalk update-environment \
  --environment-name grandcarwash-prod \
  --option-settings \
    Namespace=aws:elb:listener:443,OptionName=ListenerProtocol,Value=HTTPS \
    Namespace=aws:elb:listener:443,OptionName=InstancePort,Value=80 \
    Namespace=aws:elb:listener:443,OptionName=SSLCertificateId,Value=$CERT_ARN
```

**Note:** For Classic Load Balancer, the certificate must be in the same region as the load balancer (us-east-1), and you use `SSLCertificateId` instead of `SSLCertificateArns`.

---

## Step 5: Set Up Route53 CNAME Record

### Get your EB environment URL:

```bash
aws elasticbeanstalk describe-environments \
  --environment-names grandcarwash-prod \
  --query 'Environments[0].CNAME' \
  --output text
```

### Create CNAME record in Route 53:

```bash
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='eastgrand.net.'].Id" --output text | cut -d'/' -f3)
EB_URL=$(aws elasticbeanstalk describe-environments --environment-names grandcarwash-prod --query 'Environments[0].CNAME' --output text)

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"cw.eastgrand.net\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"$EB_URL\"}]
      }
    }]
  }"
```


---

## Step 6: Set Up HTTP→HTTPS Redirect

**Prerequisite:** Your environment MUST have a load balancer. If you don't have one, HTTPS redirect is not possible.

For Application Load Balancer (ALB), configure the HTTP listener (port 80) to redirect to HTTPS.

### Get the Load Balancer and Listener ARNs:

**First, verify you have a load balancer:**

```bash
# Check if load balancer exists
aws elasticbeanstalk describe-environment-resources \
  --environment-name grandcarwash-prod \
  --region us-east-1 \
  --query 'EnvironmentResources.LoadBalancers[*].Name' \
  --output text
```

If this returns empty, you don't have a load balancer and cannot set up HTTPS redirect. Recreate the environment without `--single` flag.

```bash
# Get the load balancer ARN # Get the HTTP listener ARN (port 80)
LB_ARN=$(aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?contains(LoadBalancerName, 'awseb')].LoadBalancerArn" \
  --output text \
  --region us-east-1)

HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $LB_ARN \
  --query "Listeners[?Port==\`80\`].ListenerArn" \
  --output text \
  --region us-east-1)

echo "Load Balancer ARN: $LB_ARN"
echo "HTTP Listener ARN: $HTTP_LISTENER_ARN"
```

### Check existing rules on the HTTP listener:

```bash
aws elbv2 describe-rules \
  --listener-arn $HTTP_LISTENER_ARN \
  --region us-east-1 \
  --query 'Rules[*].{Priority:Priority,Type:Actions[0].Type}' \
  --output table
```

### Add redirect rule to HTTP listener:

```bash
# Create a redirect rule (priority 1) that redirects all HTTP traffic to HTTPS
aws elbv2 create-rule \
  --listener-arn $HTTP_LISTENER_ARN \
  --priority 1 \
  --conditions Field=path-pattern,Values='*' \
  --actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region us-east-1
```

**Note:** If you get an error that a rule with priority 1 already exists, you may need to modify the existing default rule instead. Check the existing rules first.

### Alternative: Modify the default action (if redirect rule creation fails):

If the above doesn't work, you can modify the default action of the HTTP listener:

```bash
# First, get the default rule ARN
DEFAULT_RULE_ARN=$(aws elbv2 describe-rules \
  --listener-arn $HTTP_LISTENER_ARN \
  --query "Rules[?Priority==\`default\`].RuleArn" \
  --output text \
  --region us-east-1)

# Modify the default rule to redirect
aws elbv2 modify-rule \
  --rule-arn $DEFAULT_RULE_ARN \
  --actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region us-east-1
```

### Test the redirect:

```bash
# This should return a 301 redirect
curl -I http://cw.eastgrand.net

# Should show:
# HTTP/1.1 301 Moved Permanently
# Location: https://cw.eastgrand.net/...
```

---

## Step 7: Grant EB Instance Permission to Read Secret

### Get your EB instance role name:

```bash
aws elasticbeanstalk describe-environment-resources \
  --environment-name grandcarwash-prod \
  --query 'EnvironmentResources.IamInstanceProfile' \
  --output text
```

### Get the role name (alternative method if instance profile is None):

If the instance profile shows as `None`, get the role name from the EC2 instances directly:

```bash
# Get instance IDs from the environment
INSTANCE_IDS=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name grandcarwash-prod \
  --query 'EnvironmentResources.Instances[*].Id' \
  --output text)

echo "Instance IDs: $INSTANCE_IDS"

# Get the IAM instance profile ARN from the first instance
INSTANCE_PROFILE_ARN=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_IDS \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
  --output text)

echo "Instance Profile ARN: $INSTANCE_PROFILE_ARN"

# Extract the profile name from ARN (format: arn:aws:iam::ACCOUNT:instance-profile/NAME)
PROFILE_NAME=$(echo $INSTANCE_PROFILE_ARN | cut -d'/' -f2)
echo "Profile Name: $PROFILE_NAME"

# Get the role name from the instance profile
ROLE_NAME=$(aws iam get-instance-profile \
  --instance-profile-name $PROFILE_NAME \
  --query 'InstanceProfile.Roles[0].RoleName' \
  --output text)

echo "Role Name: $ROLE_NAME"
```

### Attach the Secrets Manager read policy to the role:

Once you have the `ROLE_NAME`, attach the policy (use the correct secret name - you created `smtp-credentials2`):

```bash
# Get the secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret --secret-id grandcarwash/smtp-credentials2 --query 'ARN' --output text)

echo "Secret ARN: $SECRET_ARN"

# Attach the policy to the role
aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name SecretsManagerReadSmtpSecret \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [
        \"secretsmanager:GetSecretValue\",
        \"secretsmanager:DescribeSecret\"
      ],
      \"Resource\": \"$SECRET_ARN\"
    }]
  }"

echo "Policy attached successfully!"
```

### Verify the policy was attached:

```bash
aws iam get-role-policy \
  --role-name $ROLE_NAME \
  --policy-name SecretsManagerReadSmtpSecret
```

---

## Step 7: Redeploy Application with Updated Code

The `server.js` already has Secrets Manager support. Redeploy:

```bash
cd /Users/saif/Projects/carDetailing
eb deploy grandcarwash-prod
```

---

## Step 8: Verify Everything Works

1. **Check HTTPS is working:**
   ```bash
   curl -I https://cw.eastgrand.net
   ```

2. **Check HTTP redirects to HTTPS:**
   ```bash
   curl -I http://cw.eastgrand.net
   ```
   Should return `301` redirect to HTTPS.

3. **Test the form** on your website - it should send emails using credentials from Secrets Manager.

---

## Troubleshooting

### Certificate not validating?
- Wait 10-15 minutes after adding DNS record
- Check DNS record is correct: `dig CNAME validation-record-name`
- Verify certificate status: `aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1`

### SMTP not working?
- Check CloudWatch logs: `eb logs grandcarwash-prod`
- Verify secret exists: `aws secretsmanager describe-secret --secret-id grandcarwash/smtp-credentials`
- Check IAM permissions: `aws iam get-role-policy --role-name $ROLE_NAME --policy-name SecretsManagerReadSmtpSecret`

### HTTPS not working?
- Verify certificate is attached: Check EB environment configuration in AWS Console
- Check listener 443 is enabled
- Wait a few minutes for changes to propagate

---

## Quick Reference Commands

```bash
# Get secret ARN
aws secretsmanager describe-secret --secret-id grandcarwash/smtp-credentials --query 'ARN' --output text

# Get certificate ARN
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" --output text

# Get EB environment URL
aws elasticbeanstalk describe-environments --environment-names grandcarwash-prod --query 'Environments[0].CNAME' --output text

# Get hosted zone ID
aws route53 list-hosted-zones --query "HostedZones[?Name=='eastgrand.com.'].Id" --output text | cut -d'/' -f3
```

