# Security Setup Guide

## Environment Variables

This application uses environment variables for sensitive configuration. **Never commit the `.env` file to version control.**

### Initial Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your actual credentials

### Required Environment Variables

#### Database
- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://username:password@host:port/database_name?schema=public`

#### Server
- `PORT`: Server port (default: 3000)

#### JWT (Authentication)
- `JWT_ACCESS_SECRET`: Secret key for access tokens (should be a long random string)
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens (should be a long random string)
- `JWT_ACCESS_EXPIRES`: Access token expiration time (e.g., "1d", "24h")
- `JWT_REFRESH_EXPIRES`: Refresh token expiration time (e.g., "30d")

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Telegram Bot (Optional)
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from [@BotFather](https://t.me/botfather)

#### SMTP (Email)
- `SMTP_HOST`: SMTP server host (e.g., smtp.gmail.com)
- `SMTP_PORT`: SMTP server port (e.g., 587)
- `SMTP_SECURE`: Use TLS (true/false)
- `SMTP_USER`: Email address for sending emails
- `SMTP_PASS`: Email password or app-specific password

**For Gmail:**
- Enable 2-factor authentication
- Generate an [App Password](https://myaccount.google.com/apppasswords)
- Use the app password in `SMTP_PASS`

#### Application
- `APP_URL`: Base URL of your application (used in email links)

## Security Checklist

- [ ] `.env` file is listed in `.gitignore`
- [ ] Use strong, unique JWT secrets (64+ characters)
- [ ] Never share your `.env` file
- [ ] Use app-specific passwords for email (not your main password)
- [ ] Change default secrets in production
- [ ] Use environment-specific `.env` files for different deployments
- [ ] Regularly rotate JWT secrets
- [ ] Use HTTPS in production

## Production Considerations

1. **Never use development secrets in production**
2. **Use environment-specific configuration management**:
   - For Heroku: Use Config Vars
   - For Vercel/Netlify: Use Environment Variables in dashboard
   - For Docker: Use secrets or environment files
3. **Rotate secrets periodically**
4. **Use secure random generators for all secrets**
5. **Enable SMTP_SECURE=true in production**
6. **Update APP_URL to your production domain**
