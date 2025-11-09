# Deployment Guide: cw.eastgrand.net

This guide will help you deploy your car wash website to AWS and set up the subdomain `cw.eastgrand.net`.

## Important Note

**This is NOT a WordPress site** - it's a custom Node.js application. You cannot deploy it directly to WordPress. You need to host it as a Node.js application.

## Cost Breakdown

### Option 1: AWS Elastic Beanstalk (Recommended)
- **EC2 Instance**: Free tier (750 hours/month for 12 months), then ~$8-15/month
- **Load Balancer**: ~$16/month (after free tier)
- **Route 53**: $0.50/month per hosted zone (you already have this)
- **SSL Certificate**: Free (via AWS Certificate Manager)
- **Total**: ~$0-16/month (first year), then ~$24-31/month

### Option 2: AWS EC2 (Most Cost-Effective)
- **EC2 t2.micro**: Free tier (750 hours/month for 12 months), then ~$8-10/month
- **Route 53**: $0.50/month (you already have this)
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$0.50/month (first year), then ~$8.50-10.50/month

### Option 3: AWS App Runner
- **App Runner**: ~$7-15/month (pay per use)
- **Route 53**: $0.50/month
- **Total**: ~$7.50-15.50/month

## Step-by-Step Deployment

### Prerequisites

1. **AWS Account** (you already have this)
2. **Domain**: `eastgrand.com` in Route 53 (you already have this)
3. **GitHub Account** (to store your code)
4. **AWS CLI** installed (optional, for command line deployment)

---

## Option 1: AWS Elastic Beanstalk (Easiest)

### Step 1: Push Code to GitHub

```bash
cd /Users/saif/Projects/carDetailing
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/carwash-website.git
git push -u origin main
```

### Step 2: Install EB CLI

```bash
pip install awsebcli
```

### Step 3: Initialize Elastic Beanstalk

```bash
cd /Users/saif/Projects/carDetailing
eb init
```

**Follow the prompts:**
- Select region: `us-east-1` (or your preferred region)
- Choose platform: `Node.js`
- Select Node.js version: Latest (18.x or 20.x)
- Create new application: `Yes`
- Application name: `carwash-website`

### Step 4: Create Environment

```bash
eb create carwash-production
```

This will:
- Create an EC2 instance
- Set up a load balancer
- Configure security groups
- Deploy your application

### Step 5: Set Environment Variables

```bash
eb setenv SMTP_HOST=smtp.gmail.com \
          SMTP_PORT=587 \
          SMTP_USER=your-email@gmail.com \
          SMTP_PASS=your-app-password \
          PORT=8080
```

### Step 6: Deploy

```bash
eb deploy
```

### Step 7: Get Your Application URL

```bash
eb status
```

You'll get a URL like: `carwash-production.us-east-1.elasticbeanstalk.com`

---

## Step 8: Set Up Subdomain in Route 53

### In AWS Console:

1. **Go to Route 53** → Hosted zones
2. **Select** `eastgrand.com`
3. **Click** "Create record"
4. **Configure:**
   - **Record name**: `cw`
   - **Record type**: `CNAME`
   - **Value**: `carwash-production.us-east-1.elasticbeanstalk.com` (your EB URL)
   - **TTL**: `300` (or leave default)
5. **Click** "Create records"

**Wait 5-10 minutes** for DNS propagation.

### Step 9: Configure Custom Domain in Elastic Beanstalk

1. **Go to Elastic Beanstalk** → Your environment
2. **Click** "Configuration"
3. **Click** "Edit" on "Load balancer"
4. **Add listener:**
   - **Port**: `443` (HTTPS)
   - **Protocol**: `HTTPS`
   - **SSL certificate**: Request a new certificate for `cw.eastgrand.net`
5. **Save**

### Step 10: Request SSL Certificate

1. **Go to AWS Certificate Manager**
2. **Request a certificate**
3. **Domain name**: `cw.eastgrand.net`
4. **Validation**: DNS validation (Route 53 will auto-validate)
5. **Request certificate**

Once validated, go back to Elastic Beanstalk and select this certificate.

---

## Option 2: AWS EC2 (More Control, Lower Cost)

### Step 1: Launch EC2 Instance

1. **Go to EC2 Console** → Launch Instance
2. **Name**: `carwash-website`
3. **AMI**: Ubuntu Server 22.04 LTS
4. **Instance type**: `t2.micro` (free tier eligible)
5. **Key pair**: Create new or use existing
6. **Network settings**: 
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)
   - Allow SSH (port 22)
7. **Launch instance**

### Step 2: Connect to Instance

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### Step 3: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v20.x
```

### Step 4: Install Git and Clone Repository

```bash
sudo apt-get update
sudo apt-get install -y git
git clone https://github.com/YOUR_USERNAME/carwash-website.git
cd carwash-website
npm install
```

### Step 5: Create .env File

```bash
nano .env
```

Add:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
PORT=3000
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
pm2 start server.js --name carwash
pm2 save
pm2 startup
# Copy and run the command it gives you
```

### Step 7: Install and Configure Nginx

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/carwash
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name cw.eastgrand.net;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/carwash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Set Up DNS in Route 53

1. **Go to Route 53** → Hosted zones → `eastgrand.com`
2. **Create record:**
   - **Name**: `cw`
   - **Type**: `A`
   - **Alias**: `Yes`
   - **Route traffic to**: Alias to EC2 instance
   - **Select your EC2 instance**
   - **Create**

### Step 9: Set Up SSL with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cw.eastgrand.net
```

Follow the prompts. Certbot will automatically configure Nginx for HTTPS.

---

## Option 3: AWS App Runner (Simplest)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/carwash-website.git
git push -u origin main
```

### Step 2: Create App Runner Service

1. **Go to AWS App Runner** → Create service
2. **Source**: GitHub
3. **Connect GitHub** (authorize AWS)
4. **Repository**: Select your repository
5. **Branch**: `main`
6. **Deployment trigger**: Automatic
7. **Build settings:**
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Port**: `3000`
8. **Environment variables:**
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASS=your-app-password`
9. **Create service**

### Step 3: Set Up Custom Domain

1. **In App Runner service** → Custom domains
2. **Add domain**: `cw.eastgrand.net`
3. **Follow instructions** to add CNAME record in Route 53

---

## Testing Your Deployment

Once deployed, test:

1. **Visit** `http://cw.eastgrand.net` (should redirect to HTTPS)
2. **Fill out the form** and submit
3. **Check email** at `carwash@theghaazi.com`

## Troubleshooting

### DNS Not Working?
- Wait 5-10 minutes for DNS propagation
- Check Route 53 record is correct
- Use `nslookup cw.eastgrand.net` to verify

### SSL Certificate Issues?
- Make sure DNS is pointing correctly first
- Wait for certificate validation (can take 30 minutes)
- Check certificate status in Certificate Manager

### Application Not Loading?
- Check EC2 security groups allow HTTP/HTTPS
- Check PM2 is running: `pm2 status`
- Check Nginx is running: `sudo systemctl status nginx`
- Check application logs: `pm2 logs carwash`

## Recommended: Option 2 (EC2)

For your use case, **Option 2 (EC2)** is recommended because:
- ✅ Lowest cost (~$8-10/month after free tier)
- ✅ Full control
- ✅ Easy to maintain
- ✅ Can handle your traffic easily

## Next Steps

1. Choose your deployment option
2. Follow the steps above
3. Test the website
4. Update any hardcoded URLs if needed

Need help with any step? Let me know!

