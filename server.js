const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Cache for SMTP credentials
let smtpConfig = null;
let transporter = null;

// Function to load SMTP credentials from Secrets Manager
async function loadSmtpConfig() {
    if (smtpConfig) {
        return smtpConfig; // Return cached config
    }

    try {
        // Try to get secret ARN from environment (set by CDK)
        const secretArn = process.env.SMTP_SECRET_ARN;
        
        if (!secretArn) {
            // Fallback to environment variables for local development
            console.log('SMTP_SECRET_ARN not set, using environment variables');
            smtpConfig = {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            };
        } else {
            // Fetch from Secrets Manager
            const command = new GetSecretValueCommand({ SecretId: secretArn });
            const response = await secretsClient.send(command);
            const secret = JSON.parse(response.SecretString);
            
            smtpConfig = {
                host: secret.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(secret.SMTP_PORT || '587'),
                user: secret.SMTP_USER,
                pass: secret.SMTP_PASS
            };
            
            console.log('SMTP credentials loaded from Secrets Manager');
        }
        
        // Create transporter with loaded config
        transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.port === 465,
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass
            }
        });
        
        // Verify email configuration
        transporter.verify(function (error, success) {
            if (error) {
                console.log('Email configuration error:', error);
            } else {
                console.log('Email server is ready to send messages');
            }
        });
        
        return smtpConfig;
    } catch (error) {
        console.error('Error loading SMTP config from Secrets Manager:', error);
        // Fallback to environment variables
        smtpConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        };
        
        transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.port === 465,
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass
            }
        });
        
        return smtpConfig;
    }
}

// Initialize SMTP config on startup
loadSmtpConfig().catch(err => {
    console.error('Failed to load SMTP config on startup:', err);
});

// API endpoint for appointment submission
app.post('/api/appointment', async (req, res) => {
    try {
        // Ensure SMTP config is loaded
        if (!transporter) {
            await loadSmtpConfig();
        }
        
        if (!transporter) {
            return res.status(500).json({ 
                error: 'Email service is not configured. Please check SMTP credentials.' 
            });
        }

        const { name, phone, serviceType, loadSize, pickupAddress, dropOffDate, pickupDate, specialInstructions } = req.body;

        // Validate required fields
        if (!name || !phone || !serviceType || !dropOffDate) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }
        
        // Validate service-specific fields
        if ((serviceType === 'commercial' || serviceType === 'pickup') && !loadSize) {
            return res.status(400).json({ error: 'Load size is required for commercial and pickup services' });
        }
        
        if (serviceType === 'pickup' && !pickupAddress) {
            return res.status(400).json({ error: 'Pickup address is required for pickup service' });
        }
        
        if (serviceType !== 'self-service' && !pickupDate) {
            return res.status(400).json({ error: 'Pickup date is required for commercial and pickup services' });
        }

        // Format dates for display
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        };

        // Map service types to display names
        const serviceTypeNames = {
            'self-service': 'Self-Service Laundromat',
            'commercial': 'Commercial Wash & Fold',
            'pickup': 'Pickup & Drop-Off Service'
        };
        
        const serviceDisplayName = serviceTypeNames[serviceType] || serviceType;
        
        // Create email content
        const emailSubject = `New Laundry Service Request - ${name}`;
        const emailBody = `
New service request received:

Customer Information:
- Name: ${name}
- Phone: ${phone}
- Service Type: ${serviceDisplayName}
${loadSize ? `- Load Size: ${loadSize}` : ''}
${pickupAddress ? `- Pickup Address: ${pickupAddress}` : ''}

Service Details:
- Service Date: ${formatDate(dropOffDate)}
${pickupDate ? `- Pickup Date: ${formatDate(pickupDate)}` : '- Self-service (customer will pick up)'}
${specialInstructions ? `- Special Instructions: ${specialInstructions}` : ''}

Please contact the customer at ${phone} to confirm the service.

---
This email was sent from the Self Service Laundromat website.
Address: 4722 E Grand Ave, Dallas, TX 75223
        `;

        // Send email
        const mailOptions = {
            from: smtpConfig.user,
            to: process.env.EMAIL_TO || 'carwash@theghaazi.com',
            subject: emailSubject,
            text: emailBody,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background: linear-gradient(135deg, #1877F2 0%, #166FE5 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">New Laundry Service Request</h2>
                    </div>
                    <div style="padding: 30px;">
                        <div style="background-color: #f0f2f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #dadde1;">
                            <h3 style="color: #1c1e21; margin-top: 0; font-size: 18px; font-weight: 600;">Customer Information</h3>
                            <p style="color: #1c1e21; margin: 8px 0;"><strong>Name:</strong> ${name}</p>
                            <p style="color: #1c1e21; margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${phone}" style="color: #1877F2; text-decoration: none;">${phone}</a></p>
                            <p style="color: #1c1e21; margin: 8px 0;"><strong>Service Type:</strong> ${serviceDisplayName}</p>
                            ${loadSize ? `<p style="color: #1c1e21; margin: 8px 0;"><strong>Load Size:</strong> ${loadSize}</p>` : ''}
                            ${pickupAddress ? `<p style="color: #1c1e21; margin: 8px 0;"><strong>Pickup Address:</strong> ${pickupAddress}</p>` : ''}
                        </div>
                        <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #1877F2;">
                            <h3 style="color: #1c1e21; margin-top: 0; font-size: 18px; font-weight: 600;">Service Details</h3>
                            <p style="color: #1c1e21; margin: 8px 0;"><strong>Service Date:</strong> ${formatDate(dropOffDate)}</p>
                            ${pickupDate ? `<p style="color: #1c1e21; margin: 8px 0;"><strong>Pickup Date:</strong> ${formatDate(pickupDate)}</p>` : '<p style="color: #1c1e21; margin: 8px 0;"><strong>Pickup:</strong> Self-service (customer will pick up)</p>'}
                            ${specialInstructions ? `<p style="color: #1c1e21; margin: 8px 0;"><strong>Special Instructions:</strong> ${specialInstructions}</p>` : ''}
                        </div>
                        <div style="background-color: #f0f2f5; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dadde1;">
                            <p style="color: #65676b; font-size: 14px; margin: 0;">
                                Please contact the customer at <a href="tel:${phone}" style="color: #1877F2; text-decoration: none; font-weight: 600;">${phone}</a> to confirm the service.
                            </p>
                        </div>
                        <hr style="border: none; border-top: 1px solid #dadde1; margin: 30px 0;">
                        <p style="color: #65676b; font-size: 12px; text-align: center; margin: 0;">
                            This email was sent from the Self Service Laundromat website.<br>
                            Address: 4722 E Grand Ave, Dallas, TX 75223
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        console.log(`Service request email sent for ${name} - ${phone} - ${serviceDisplayName}`);

        res.json({ 
            success: true, 
            message: 'Service request received successfully' 
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            error: 'Failed to send service request. Please try again later.' 
        });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the website`);
    
    // Check if SMTP is configured
    loadSmtpConfig().then(config => {
        if (!config.user) {
            console.warn('⚠️  WARNING: SMTP_USER is not configured in Secrets Manager or environment variables!');
        }
    }).catch(err => {
        console.warn('⚠️  WARNING: Could not load SMTP configuration:', err.message);
    });
});

