# Email API Setup Guide

## Overview

The 42 POST backend now includes email functionality for:
1. **Forge Success Emails** - Sent to creators when they successfully forge a skill
2. **Certificate Download** - Generated HTML certificate files
3. **Verification Emails** - For account email verification (optional)

---

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install nodemailer
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure email settings:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com          # Your SMTP server
SMTP_PORT=587                      # Usually 587 for TLS, 465 for SSL
SMTP_USER=your-email@gmail.com    # Your email address
SMTP_PASSWORD=app_password        # App-specific password
SMTP_SECURE=false                  # Set to true for port 465, false for 587

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:8000
```

---

## Email Configuration Examples

### Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Google will generate a 16-character password
   
3. **Configure .env**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx
   SMTP_SECURE=false
   ```

### SendGrid (Production)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxx
SMTP_SECURE=false
```

### Other Providers

- **Mailgun**: `smtp.mailgun.org:587`
- **AWS SES**: `email-smtp.region.amazonaws.com:587`
- **Postmark**: `smtp.postmarkapp.com:587`

---

## Development Mode

If `SMTP_HOST` and `SMTP_USER` are not configured, the email service runs in **development mode**:
- ✅ Emails are logged to console
- ✅ No actual emails sent
- ✅ No external services required

Console output:
```
📧 [DEV MODE] Email would be sent to: user@example.com
   Subject: ✨ 恭喜！你的 Skill 已成功铸造 ✨
```

---

## API Endpoints

### 1. POST `/api/email/send-forge-success`

Send forge success email to creator.

**Request Body**:
```json
{
  "recipientEmail": "creator@example.com",
  "recipientName": "Alice Chen",
  "skillTitle": "Understanding Silence in Grief",
  "skillId": "skill-uuid-12345",
  "soulHash": "42p_bc9ca6ef_2026",
  "invitationCode": "42-3X3K-TYKH",
  "createdDate": "2026-04-20T12:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "dev-mode-1713607200000",
  "timestamp": "2026-04-20T12:00:00Z"
}
```

---

### 2. GET `/api/email/certificate/:skill_id`

Download creator certificate as HTML file.

**Query Parameters**: None

**Response**: HTML file download

**Example**:
```
GET /api/email/certificate/skill-uuid-12345
→ Downloads: Creator_Card_42p_bc9ca6ef_2026.html
```

---

### 3. POST `/api/email/send-verification` (Optional)

Send account verification email.

**Request Body**:
```json
{
  "email": "user@example.com",
  "verificationToken": "token-uuid-12345"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification email sent",
  "messageId": "..."
}
```

---

## Email Flow (Complete)

```
User creates skill in frontend
         ↓
Clicks "PUBLISH & FORGE"
         ↓
Front-end calls: POST /api/email/send-forge-success
         ↓
Backend generates email HTML with:
  - Commemorative certificate card
  - Skill details
  - Download links (Markdown, LangChain, MCP)
  - Action buttons
         ↓
Sends email via SMTP
         ↓
Logs email_logs table entry
         ↓
Returns success to frontend
         ↓
User sees completion page with:
  - "All files sent to your email" message
  - Download certificate button
  - Impact Dashboard link
  - Playground link
```

---

## Testing Locally

### 1. Start Backend Server

```bash
npm start
# or with auto-reload:
npm run dev
```

### 2. Check Email Logs

View backend console for email activity:
```
✓ Email sent successfully to alice@example.com
```

### 3. Test Certificate Download

```bash
curl http://localhost:3000/api/email/certificate/skill-123 \
  --output certificate.html
```

---

## Database Logging (Optional)

If you want to log email events, create the `email_logs` table:

```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id),
  recipient_email VARCHAR NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- 'forge_success', 'verification', etc.
  status VARCHAR(20) NOT NULL,      -- 'sent', 'failed', 'bounced'
  message_id VARCHAR,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Troubleshooting

### Problem: "Gmail app password not working"

**Solution**: 
- Ensure 2FA is enabled
- Use the full 16-character password (with spaces)
- Don't use your regular Gmail password

### Problem: "SMTP connection refused"

**Solution**:
- Check SMTP host and port are correct
- Verify firewall allows outbound SMTP
- Test connection: `telnet smtp.gmail.com 587`

### Problem: "SSL/TLS handshake error"

**Solution**:
- Set `SMTP_SECURE=false` for port 587 (TLS)
- Set `SMTP_SECURE=true` for port 465 (SSL)

### Problem: "Email rate limit exceeded"

**Solution**:
- Implement rate limiting (recommended 1 email per second)
- Use SendGrid or AWS SES for higher volume
- Add cooldown between emails

---

## Email Template Customization

Email template is generated in `/backend/utils/certificate.js`:

```javascript
export function generateEmailTemplate(
  skillData,
  soulHash,
  invitationCode,
  createdDate,
  downloadUrls
)
```

To customize:
1. Edit the HTML template in `certificate.js`
2. Adjust colors, layout, messaging
3. Change fonts and styling
4. Modify download link format

---

## Security Considerations

1. **Never commit `.env`** with real credentials
2. **Use app passwords** instead of main account passwords
3. **Validate email addresses** before sending
4. **Implement rate limiting** to prevent abuse
5. **Log all email activity** for audit trails
6. **Use HTTPS** in production
7. **Rotate secrets** regularly

---

## Next Steps

- [ ] Configure SMTP settings in `.env`
- [ ] Test email sending with a test account
- [ ] Set up database logging (optional)
- [ ] Integrate with frontend skill creation flow
- [ ] Monitor email delivery and bounces
- [ ] Customize email template as needed

---

**Status**: ✅ API Implementation Complete | ⏳ Configuration Required
