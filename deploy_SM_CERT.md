# Grand Car Wash - Deployment Guide

This document contains the complete deployment process for the Grand Car Wash website to AWS Elastic Beanstalk, including Secrets Manager setup, SSL certificate configuration, and HTTPS setup.

## Prerequisites

- AWS CLI installed and configured
- EB CLI installed (`pip install awsebcli`)
- AWS account with appropriate permissions
- Domain `eastgrand.net` registered in Route 53

---

## Step 1: Clean Up Previous Configuration

**Note:** If you're starting fresh or having deployment issues, clean up old EB configuration:

```bash
# Remove old Elastic Beanstalk configuration
rm -rf .elasticbeanstalk .ebextensions

# Create .ebignore to prevent problematic configs from being bundled
cat <<'EOF' > .ebignore
# Ignore the auto-generated NodeCommand config
.ebextensions/
EOF
```

---

## Step 2: Initialize Elastic Beanstalk

```bash
eb init
```

**Configuration choices:**
- **Region**: `us-east-1` (or your preferred region)
- **Application**: Select existing `grandcarwash-prod` or create new
- **Platform**: `Node.js 20 running on 64bit Amazon Linux 2023`
- **CodeCommit**: `n` (No)
- **SSH**: `y` (Yes) - for troubleshooting
- **Keypair**: Select existing `aws-eb` or create new

---

## Step 3: Create Elastic Beanstalk Environment

**Important:** Do NOT use `--single` flag if you want HTTPS support (load balancer required).

```bash
# Create environment WITHOUT --single to get a load balancer for HTTPS
eb create grandcarwash-prod --platform "Node.js 20 running on 64bit Amazon Linux 2023" --instance-type t3.small
```

**Wait for environment to be created** (takes 3-5 minutes). You'll see:
- Environment ID
- CNAME URL
- Status: Ready

---

## Step 4: Set Up Secrets Manager for SMTP Credentials

### 4.1: Create the Secret

```bash
aws secretsmanager create-secret \
  --name grandcarwash/smtp-credentials2 \
  --description "SMTP credentials for Grand Car Wash appointment emails" \
  --secret-string '{"SMTP_HOST":"smtp.gmail.com","SMTP_PORT":"587","SMTP_USER":"shaikhcons@gmail.com","SMTP_PASS":"idgwmiqrhdfqwlax"}'
```

**Note:** 
- Replace `shaikhcons@gmail.com` with your actual Gmail address
- Replace `idgwmiqrhdfqwlax` with your Gmail App Password
- For Gmail, generate App Password at: https://support.google.com/accounts/answer/185833

**Output:** Save the ARN from the response (e.g., `arn:aws:secretsmanager:us-east-1:654654343989:secret:grandcarwash/smtp-credentials2-iw4U6G`)

### 4.2: Update Secret (if needed later)

```bash
aws secretsmanager put-secret-value \
  --secret-id grandcarwash/smtp-credentials2 \
  --secret-string '{"SMTP_HOST":"smtp.gmail.com","SMTP_PORT":"587","SMTP_USER":"your-email@gmail.com","SMTP_PASS":"your-app-password"}'
```

### 4.3: Get Secret ARN

```bash
aws secretsmanager describe-secret \
  --secret-id grandcarwash/smtp-credentials2 \
  --query 'ARN' \
  --output text
```

---

## Step 5: Configure Environment Variables

Add the Secrets Manager ARN and AWS region to the EB environment:

```bash
aws elasticbeanstalk update-environment \
  --environment-name grandcarwash-prod \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=SMTP_SECRET_ARN,Value="arn:aws:secretsmanager:us-east-1:654654343989:secret:grandcarwash/smtp-credentials2-iw4U6G" \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_REGION,Value=us-east-1
```

**Replace the ARN** with your actual secret ARN from Step 4.1.

**Wait for update to complete:**
```bash
aws elasticbeanstalk describe-environments \
  --environment-names grandcarwash-prod \
  --query 'Environments[0].Status' \
  --output text
```

Should show `Ready` when complete.

---

## Step 6: Request SSL Certificate from ACM

### 6.1: Request Certificate

```bash
aws acm request-certificate \
  --domain-name cw.eastgrand.net \
  --validation-method DNS \
  --region us-east-1
```

**Output:** Save the Certificate ARN (e.g., `arn:aws:acm:us-east-1:654654343989:certificate/9d13f862-23d5-45e0-9eca-e0e7905d0b9f`)

### 6.2: Get Certificate ARN

```bash
aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" \
  --output text
```

### 6.3: Get DNS Validation Record

```bash
CERT_ARN=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" --output text)

aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json
```

**Example output:**
```json
{
    "Name": "_d23f5ae27bae0c6f64f65d30776c8d21.cw.eastgrand.net.",
    "Type": "CNAME",
    "Value": "_26ccbdfadfd3e7f46e9eb2f86a6aef43.jkddzztszm.acm-validations.aws."
}
```

### 6.4: Add DNS Validation Record to Route 53

```bash
# Get hosted zone ID
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='eastgrand.net.'].Id" \
  --output text
# Output: /hostedzone/Z0437693U203KLCBKJB6

# Extract just the zone ID (remove /hostedzone/ prefix)
ZONE_ID=Z0437693U203KLCBKJB6

# Create validation record (replace with actual values from Step 6.3)
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_d23f5ae27bae0c6f64f65d30776c8d21.cw.eastgrand.net.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_26ccbdfadfd3e7f46e9eb2f86a6aef43.jkddzztszm.acm-validations.aws."}]
      }
    }]
  }'
```

### 6.5: Wait for Certificate Validation

Wait 5-10 minutes, then check certificate status:

```bash
CERT_ARN=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" --output text)

aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Should show `ISSUED` when ready.

---

## Step 7: Configure HTTPS on Elastic Beanstalk

**Prerequisite:** Environment must have a load balancer (not created with `--single` flag).

```bash
# Get certificate ARN
CERT_ARN=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" --output text)

# Configure HTTPS listener
aws elasticbeanstalk update-environment \
  --environment-name grandcarwash-prod \
  --option-settings \
    Namespace=aws:elbv2:listener:443,OptionName=Protocol,Value=HTTPS \
    Namespace=aws:elbv2:listener:443,OptionName=SSLCertificateArns,Value=$CERT_ARN
```

**Wait for update to complete** (check status as in Step 5).

---

## Step 8: Set Up Route53 CNAME Record

Point your domain to the Elastic Beanstalk environment:

```bash
# Get EB environment URL
EB_URL=$(aws elasticbeanstalk describe-environments \
  --environment-names grandcarwash-prod \
  --query 'Environments[0].CNAME' \
  --output text)

# Get hosted zone ID
ZONE_ID=Z0437693U203KLCBKJB6

# Create CNAME record
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

**Wait 5-10 minutes** for DNS propagation.

---

## Step 9: Set Up HTTP→HTTPS Redirect

Configure the Application Load Balancer to redirect HTTP traffic to HTTPS:

```bash
# Get the load balancer ARN
LB_ARN=$(aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?contains(LoadBalancerName, 'awseb')].LoadBalancerArn" \
  --output text \
  --region us-east-1)

echo "Load Balancer ARN: $LB_ARN"

# Get the HTTP listener ARN (port 80)
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $LB_ARN \
  --query "Listeners[?Port==\`80\`].ListenerArn" \
  --output text \
  --region us-east-1)

echo "HTTP Listener ARN: $HTTP_LISTENER_ARN"

# Check existing rules (optional)
aws elbv2 describe-rules \
  --listener-arn $HTTP_LISTENER_ARN \
  --region us-east-1 \
  --query 'Rules[*].{Priority:Priority,Type:Actions[0].Type}' \
  --output table

# Create redirect rule (priority 1) that redirects all HTTP traffic to HTTPS
aws elbv2 create-rule \
  --listener-arn $HTTP_LISTENER_ARN \
  --priority 1 \
  --conditions Field=path-pattern,Values='*' \
  --actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region us-east-1
```

**Note:** If you get an error that priority 1 already exists, the redirect is already configured.

---

## Step 10: Grant EB Instance Permission to Read Secret

The EC2 instances need IAM permissions to read from Secrets Manager:

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

# Get the secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id grandcarwash/smtp-credentials2 \
  --query 'ARN' \
  --output text)

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

# Verify the policy was attached
aws iam get-role-policy \
  --role-name $ROLE_NAME \
  --policy-name SecretsManagerReadSmtpSecret
```

---

## Step 11: Deploy Application

Deploy your application code:

```bash
# Make sure you're in the project root directory
cd /Users/saif/Projects/carDetailing

# Deploy to Elastic Beanstalk
eb deploy grandcarwash-prod
```

**Important Notes:**
- The deployment will create a zip file and upload it to S3
- Wait for deployment to complete (usually 2-5 minutes)
- Check the status: `eb status grandcarwash-prod`

---

## Step 12: Verify Deployment

### 12.1: Check Environment Status

```bash
aws elasticbeanstalk describe-environments \
  --environment-names grandcarwash-prod \
  --region us-east-1 \
  --query 'Environments[0].{Status:Status,Health:Health,CNAME:CNAME}' \
  --output table
```

Should show:
- **Status**: `Ready`
- **Health**: `Green`

### 12.2: Test HTTP Access

```bash
curl -I http://grandcarwash-prod.eba-nhdtrjpg.us-east-1.elasticbeanstalk.com
curl -I http://cw.eastgrand.net
```

Should return `HTTP/1.1 200 OK` or `HTTP/1.1 301 Moved Permanently` (if redirect is working).

### 12.3: Test HTTPS Access

```bash
curl -I https://cw.eastgrand.net
```

Should return `HTTP/2 200` with valid SSL certificate.

### 12.4: Test HTTP→HTTPS Redirect

```bash
curl -I http://cw.eastgrand.net
```

Should return `HTTP/1.1 301 Moved Permanently` with `Location: https://cw.eastgrand.net/...`

---

## Troubleshooting

### Issue: Deployment Fails with "Engine execution has encountered an error"

**Solution:** Check the logs:
```bash
eb logs grandcarwash-prod
```

**Common causes:**
1. **Nginx configuration error**: Remove any `.platform/nginx/conf.d/` files with invalid syntax
2. **Missing dependencies**: Ensure `package.json` has all required dependencies
3. **Server startup failure**: Check `server.js` for syntax errors

### Issue: HTTPS Not Working

**Check:**
1. Environment has a load balancer (not created with `--single`)
2. Certificate is issued: `aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1`
3. HTTPS listener is configured: Check EB environment configuration in AWS Console

### Issue: Secrets Manager Access Denied

**Check:**
1. IAM policy is attached: `aws iam get-role-policy --role-name $ROLE_NAME --policy-name SecretsManagerReadSmtpSecret`
2. Secret ARN is correct in environment variables
3. Instance role has correct permissions

### Issue: HTTP→HTTPS Redirect Not Working

**Check:**
1. Load balancer has HTTP listener (port 80)
2. Redirect rule exists: `aws elbv2 describe-rules --listener-arn $HTTP_LISTENER_ARN --region us-east-1`
3. Rule priority is 1 and action type is `redirect`

---

## Quick Reference Commands

```bash
# Get secret ARN
aws secretsmanager describe-secret --secret-id grandcarwash/smtp-credentials2 --query 'ARN' --output text

# Get certificate ARN
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='cw.eastgrand.net'].CertificateArn" --output text

# Get EB environment URL
aws elasticbeanstalk describe-environments --environment-names grandcarwash-prod --query 'Environments[0].CNAME' --output text

# Get hosted zone ID
aws route53 list-hosted-zones --query "HostedZones[?Name=='eastgrand.net.'].Id" --output text | cut -d'/' -f3

# Check environment status
eb status grandcarwash-prod

# View logs
eb logs grandcarwash-prod

# Deploy new version
eb deploy grandcarwash-prod
```

---

## Environment URLs

- **EB URL**: `grandcarwash-prod.eba-nhdtrjpg.us-east-1.elasticbeanstalk.com`
- **Custom Domain**: `cw.eastgrand.net`
- **HTTPS**: `https://cw.eastgrand.net` ✅
- **HTTP**: `http://cw.eastgrand.net` (redirects to HTTPS) ✅

---

## Important Files

- `server.js` - Node.js backend with Secrets Manager integration
- `package.json` - Dependencies including `@aws-sdk/client-secrets-manager`
- `.ebignore` - Prevents problematic configs from being bundled
- `.elasticbeanstalk/config.yml` - EB configuration (auto-generated)

---

## Notes

1. **Do NOT use `--single` flag** when creating environment if you need HTTPS
2. **Remove `.platform/nginx/conf.d/https_redirect.conf`** - it causes deployment failures. Use ALB redirect instead.
3. **Secrets Manager secret name**: `grandcarwash/smtp-credentials2`
4. **Certificate domain**: `cw.eastgrand.net`
5. **Region**: `us-east-1` (must match for ACM certificates and load balancers)

---

## Deployment Log

### Successful Deployment (2025-11-09)

- Environment created: `grandcarwash-prod` (Environment ID: `e-mczkj6cyrq`)
- Secrets Manager configured: `grandcarwash/smtp-credentials2`
- SSL Certificate issued: `arn:aws:acm:us-east-1:654654343989:certificate/9d13f862-23d5-45e0-9eca-e0e7905d0b9f`
- HTTPS configured on ALB
- Route53 CNAME: `cw.eastgrand.net` → `grandcarwash-prod.eba-nhdtrjpg.us-east-1.elasticbeanstalk.com`
- HTTP→HTTPS redirect configured
- IAM permissions granted for Secrets Manager access
- Application deployed successfully

**Final Status**: ✅ Environment Healthy (Green), Application Running
