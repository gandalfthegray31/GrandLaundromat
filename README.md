# Grand Car Wash Self Service Website

A modern, responsive website for Grand Car Wash Self Service located at 4722 E Grand Ave, Dallas, TX 75223.

## Features

- **Business Information**: Complete details about the car wash business
- **Photo Gallery**: Placeholder sections for facility photos (6 placeholders)
- **Contact Information**: Address and phone number display
- **Scheduling System**: Simple form to schedule car detailing services (name, phone, car make/model, drop-off and pickup dates)
- **Email Notifications**: Automatically sends appointment requests to carwash@theghaazi.com
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional design with smooth animations

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and responsive design
- `script.js` - Frontend JavaScript for form handling
- `server.js` - Node.js backend server with email functionality
- `package.json` - Node.js dependencies and scripts
- `env.example` - Example environment variables file

## Quick Start (Local Development)

1. **Install Node.js** (version 14 or higher) if you haven't already

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up email configuration**:
   - Copy `env.example` to `.env`
   - Edit `.env` and add your email credentials:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASS=your-app-password
     ```

4. **For Gmail users**:
   - Enable 2-Factor Authentication on your Google account
   - Generate an App Password: https://support.google.com/accounts/answer/185833
   - Use the App Password in `SMTP_PASS` (not your regular password)

5. **Start the server**:
   ```bash
   npm start
   ```

6. **Open your browser** and visit: `http://localhost:3000`

## 🚀 Where to Host Your Website

Here are the **best hosting options** ranked by ease of use:

### ⭐ **Option 1: Railway (Easiest - Recommended)**

**Why Railway?** Free tier available, automatic deployments, easy setup, no credit card required for free tier.

1. **Sign up** at [railway.app](https://railway.app) (free account)
2. **Create a new project** → "Deploy from GitHub repo"
3. **Connect your GitHub repository** (push your code to GitHub first)
4. **Add environment variables** in Railway dashboard:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASS=your-app-password`
   - `PORT=3000` (optional, Railway sets this automatically)
5. **Deploy** - Railway automatically detects Node.js and deploys
7. **Get your URL** - Railway provides a free `.railway.app` domain

**Cost:** Free tier includes 500 hours/month, $5/month for more resources

---

### ⭐ **Option 2: Render (Great Free Option)**

**Why Render?** Free tier, automatic SSL, easy setup.

1. **Sign up** at [render.com](https://render.com) (free account)
2. **Create a new Web Service** → Connect your GitHub repository
3. **Configure:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Add environment variables** in Render dashboard (same as Railway above)
5. **Deploy** - Render automatically builds and deploys

**Cost:** Free tier available, $7/month for always-on service

---

### ⭐ **Option 3: Fly.io (Good Free Option)**

**Why Fly.io?** Free tier, global edge network, great performance.

1. **Install Fly CLI:** `curl -L https://fly.io/install.sh | sh`
2. **Sign up:** `fly auth signup`
3. **Create app:** `fly launch` (in your project directory)
4. **Set secrets:**
   ```bash
   fly secrets set SMTP_HOST=smtp.gmail.com
   fly secrets set SMTP_PORT=587
   fly secrets set SMTP_USER=your-email@gmail.com
   fly secrets set SMTP_PASS=your-app-password
   ```
5. **Deploy:** `fly deploy`

**Cost:** Free tier includes 3 shared VMs, $1.94/month per VM for dedicated

---

### **Option 4: Heroku (Paid, but reliable)**

**Why Heroku?** Very reliable, but requires credit card for free tier (limited hours).

1. **Install Heroku CLI** and login:
   ```bash
   heroku login
   ```

2. **Create a Heroku app**:
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set SMTP_HOST=smtp.gmail.com
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_USER=your-email@gmail.com
   heroku config:set SMTP_PASS=your-app-password
   ```

4. **Deploy**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

5. **Open your app**:
   ```bash
   heroku open
   ```

**Cost:** $5-7/month for basic dyno

---

### **Option 5: DigitalOcean App Platform**

1. **Sign up** at [digitalocean.com](https://www.digitalocean.com)
2. **Create a new App** → Connect your GitHub repository
3. **Configure:**
   - Build Command: `npm install`
   - Run Command: `npm start`
4. **Add environment variables** in App Platform settings
5. **Deploy**

**Cost:** $5/month minimum

---

### **Option 6: VPS (Most Control, Requires Technical Knowledge)**

For VPS hosting (DigitalOcean Droplet, Linode, AWS EC2, etc.):

1. **SSH into your server**
2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Clone your repository:**
   ```bash
   git clone your-repo-url
   cd carDetailing
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```
5. **Create `.env` file** with your credentials
6. **Install PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   ```
7. **Start the server:**
   ```bash
   pm2 start server.js --name carwash
   pm2 save
   pm2 startup
   ```
8. **Set up Nginx** as reverse proxy (recommended)

**Cost:** $4-12/month depending on provider

---

### ☁️ **Option 7: AWS (Amazon Web Services)**

AWS offers several hosting options. Here are the best ones for this project:

#### **7A: AWS Elastic Beanstalk (Easiest AWS Option - Recommended)**

**Why Elastic Beanstalk?** Managed service, automatic scaling, easy deployment, handles infrastructure for you.

**Prerequisites:**
- AWS account (free tier available)
- AWS CLI installed: https://aws.amazon.com/cli/
- EB CLI installed: `pip install awsebcli`

**Steps:**

1. **Initialize Elastic Beanstalk:**
   ```bash
   eb init
   ```
   - Select your region (e.g., `us-east-1`)
   - Choose "Node.js" as platform
   - Select latest Node.js version
   - Choose "Create new application"

2. **Create environment:**
   ```bash
   eb create carwash-production
   ```

3. **Set environment variables:**
   ```bash
   eb setenv SMTP_HOST=smtp.gmail.com \
            SMTP_PORT=587 \
            SMTP_USER=your-email@gmail.com \
            SMTP_PASS=your-app-password \
            PORT=8080
   ```

4. **Deploy:**
   ```bash
   eb deploy
   ```

5. **Get your URL:**
   ```bash
   eb open
   ```

**Cost:** Free tier includes 750 hours/month for 12 months, then ~$15-30/month

---

#### **7B: AWS App Runner (Simple Container-Based)**

**Why App Runner?** Very simple, automatic scaling, good for containerized apps.

1. **Create a Dockerfile** (if not exists):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Push to GitHub** (App Runner needs a Git repository)

3. **In AWS Console:**
   - Go to App Runner service
   - Click "Create service"
   - Choose "Source code repository" → Connect GitHub
   - Select your repository
   - Configure:
     - Build command: `npm install`
     - Start command: `npm start`
     - Port: `3000`
   - Add environment variables in the console
   - Create service

**Cost:** Pay per use, ~$7-15/month for small apps

---

#### **7C: AWS EC2 (Full Control)**

**Why EC2?** Complete control, can be very cost-effective, good for learning.

1. **Launch EC2 Instance:**
   - Go to EC2 Console → Launch Instance
   - Choose Ubuntu Server 22.04 LTS
   - Select t2.micro (free tier eligible)
   - Configure security group:
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - Allow SSH (port 22)
     - Allow Custom TCP (port 3000) - for testing
   - Launch and download key pair

2. **Connect to instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install Git:**
   ```bash
   sudo apt-get update
   sudo apt-get install -y git
   ```

5. **Clone and setup:**
   ```bash
   git clone your-repo-url
   cd carDetailing
   npm install
   ```

6. **Create `.env` file:**
   ```bash
   nano .env
   # Add your environment variables
   ```

7. **Install PM2:**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name carwash
   pm2 save
   pm2 startup
   ```

8. **Set up Nginx (reverse proxy):**
   ```bash
   sudo apt-get install -y nginx
   sudo nano /etc/nginx/sites-available/default
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. **Set up SSL with Let's Encrypt (optional but recommended):**
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

**Cost:** Free tier includes 750 hours/month for 12 months, then ~$8-15/month for t2.micro

---

#### **7D: AWS Amplify (For Static + Serverless)**

**Why Amplify?** Good for static sites, but requires some modifications for Node.js backend.

**Note:** Amplify is better for static sites. For this Node.js app, use Elastic Beanstalk or App Runner instead.

---

## Deployment Options (Old - Keeping for Reference)

### Option 1: Deploy to Heroku (Recommended)

1. **Install Heroku CLI** and login:
   ```bash
   heroku login
   ```

2. **Create a Heroku app**:
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set SMTP_HOST=smtp.gmail.com
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_USER=your-email@gmail.com
   heroku config:set SMTP_PASS=your-app-password
   ```

4. **Deploy**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

5. **Open your app**:
   ```bash
   heroku open
   ```

### Option 2: Deploy to Railway

1. **Sign up** at [railway.app](https://railway.app)

2. **Create a new project** and connect your GitHub repository

3. **Add environment variables** in Railway dashboard:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASS=your-app-password`

4. **Deploy** - Railway will automatically detect Node.js and deploy

### Option 3: Deploy to Render

1. **Sign up** at [render.com](https://render.com)

2. **Create a new Web Service** and connect your repository

3. **Configure**:
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Add environment variables** in Render dashboard

5. **Deploy**

### Option 4: Deploy to DigitalOcean App Platform

1. **Sign up** at [digitalocean.com](https://www.digitalocean.com)

2. **Create a new App** and connect your repository

3. **Configure**:
   - Build Command: `npm install`
   - Run Command: `npm start`

4. **Add environment variables** in App Platform settings

5. **Deploy**

### Option 5: Deploy to VPS (Ubuntu/Debian)

1. **SSH into your server**

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone your repository**:
   ```bash
   git clone your-repo-url
   cd carDetailing
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Create `.env` file** with your email credentials

6. **Install PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   ```

7. **Start the server**:
   ```bash
   pm2 start server.js --name carwash
   pm2 save
   pm2 startup
   ```

8. **Set up Nginx** as reverse proxy (optional but recommended)

## Email Configuration

The website sends appointment emails to **carwash@theghaazi.com** when customers submit the scheduling form.

### Supported Email Providers

- **Gmail** (recommended for testing)
- **Outlook/Hotmail**
- **Yahoo Mail**
- **Custom SMTP servers**

### Gmail Setup

1. Enable 2-Factor Authentication
2. Go to Google Account settings → Security
3. Generate an App Password
4. Use the App Password in your `.env` file

### Other Email Providers

Update `SMTP_HOST` and `SMTP_PORT` in your `.env` file:
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom**: Use your provider's SMTP settings

## Customization

### Update Phone Number
Edit the phone number in `index.html`:
- Line 51: Contact section phone number
- Line 170: Contact section phone number

### Add Photos
Replace the image placeholders in the gallery section with actual images:
```html
<img src="path/to/your/image.jpg" alt="Description">
```

### Change Email Recipient
Edit `server.js` line 80 to change the recipient email address.

## Form Fields

The scheduling form collects:
- **Name** (required)
- **Cell Phone Number** (required)
- **Car Make & Model** (required)
- **Drop Off Date** (required)
- **Pickup Date** (required)

## Browser Support

Works on all modern browsers including:
- Chrome
- Firefox
- Safari
- Edge

## Troubleshooting

### Email not sending?
- Check your `.env` file has correct credentials
- For Gmail, ensure you're using an App Password, not your regular password
- Check server logs for error messages
- Verify SMTP settings match your email provider

### Form not submitting?
- Check browser console for errors
- Ensure the backend server is running
- Verify the API endpoint URL in `script.js`

## License

ISC

