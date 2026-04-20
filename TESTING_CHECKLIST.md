# 🧪 Testing Checklist - Forge Success Implementation

## Pre-Test Setup

- [ ] Backend dependencies installed: `npm install nodemailer`
- [ ] `.env` file configured (or using dev mode)
- [ ] Backend running: `npm start`
- [ ] Frontend running: `python3 -m http.server 8080`
- [ ] Browser console open (F12)

---

## Phase 1: Frontend UI Testing

### Completion Page Display
- [ ] Navigate to Skill Forge
- [ ] Fill in form (username, email, idea, domain)
- [ ] Generate intuition probe
- [ ] Select probe response (Thesis/Antithesis/Extreme)
- [ ] Proceed through forge steps
- [ ] Click "PUBLISH & FORGE"
- [ ] **✅ Completion page displays**

### Certificate Card Content
- [ ] Card title: "The 42 Post" visible
- [ ] Subtitle: "Creator's Certificate · 创作者证书" visible
- [ ] Star emoji (✨) displays
- [ ] "Community Creator" text visible
- [ ] Skill title displays correctly
- [ ] "Created by: [username]" shows
- [ ] License info: "⊕ Open · Remix: ✓" visible
- [ ] Soul-Hash visible and properly formatted
- [ ] Forged date in correct format (e.g., "Apr 20, 2026")

### Invitation Code Section
- [ ] "INVITATION CODE · 邀请码" label visible
- [ ] Code format: "42-XXXX-XXXX" (random letters/numbers)
- [ ] Share message in both languages visible
- [ ] Code text properly styled (bold, monospace)

### Additional Elements
- [ ] Email confirmation message: "📧 所有文件已发送到你的邮件"
- [ ] Email address displayed correctly
- [ ] "DOWNLOAD CREATOR CARD" button visible (black, bold)
- [ ] "Impact Dashboard" button visible
- [ ] "Playground" button visible

---

## Phase 2: Download Certificate Testing

### Certificate HTML Download
- [ ] Click "DOWNLOAD CREATOR CARD" button
- [ ] **✅ Browser downloads file**
- [ ] Filename format: `Creator_Card_{soul_hash}.html`
- [ ] File size: > 0 bytes

### Certificate Content Verification
- [ ] Open downloaded HTML file in browser
- [ ] Certificate card displays correctly
- [ ] All content matches completion page
- [ ] Styling looks professional
- [ ] Fonts are correct (Playfair Display, Courier New)
- [ ] Colors are correct (monochrome)

### Print Functionality
- [ ] Open certificate in browser
- [ ] Press Ctrl+P (or Cmd+P) to print
- [ ] Print preview shows correctly
- [ ] Print to PDF works
- [ ] Printed document looks professional

---

## Phase 3: Email Service Testing

### Backend Console Output
- [ ] Check backend console (Terminal where `npm start` runs)
- [ ] Look for email confirmation message:
  ```
  ✓ Email sent successfully to user@example.com
  ✨ Forge success email sent: <messageId>
  ```
- [ ] **✅ No error messages**

### Email Arrival (if SMTP configured)
- [ ] Open recipient email account
- [ ] Check inbox for new email
- [ ] **✅ Email from "THE 42 POST"**
- [ ] Subject: "✨ 恭喜！你的 Skill 已成功铸造 ✨"
- [ ] Email arrived within 30 seconds

### Email Content Verification
**Header Section:**
- [ ] Email title and subtitle display
- [ ] Congratulations message in both languages
- [ ] Certificate card renders correctly

**Certificate Card in Email:**
- [ ] All card elements visible
- [ ] Styling matches website version
- [ ] Images/emojis display
- [ ] Text is readable

**Download Section:**
- [ ] "INSTALL YOUR SKILL" title visible
- [ ] Three download buttons present:
  - [ ] 📖 Markdown
  - [ ] 🐍 LangChain
  - [ ] ⚙️ MCP Config
- [ ] Each button has download link

**Action Section:**
- [ ] "📊 Impact Dashboard" button visible
- [ ] "🎮 Playground" button visible
- [ ] Both buttons are clickable

**Footer:**
- [ ] Next steps listed (4 items)
- [ ] THE 42 POST branding
- [ ] Copyright info
- [ ] Contact instructions

---

## Phase 4: API Testing

### Email Endpoint Testing

**Test with cURL:**
```bash
curl -X POST http://localhost:3000/api/email/send-forge-success \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "test@example.com",
    "recipientName": "Test User",
    "skillTitle": "Test Skill",
    "skillId": "test-skill-123",
    "soulHash": "42p_test_001",
    "invitationCode": "42-TEST-CODE",
    "createdDate": "2026-04-20T12:00:00Z"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "...",
  "timestamp": "2026-04-20T..."
}
```

### Certificate Download Endpoint

**Test with cURL:**
```bash
curl -X GET http://localhost:3000/api/email/certificate/test-skill-123 \
  -o test-certificate.html
```

**Verify:**
- [ ] File downloads successfully
- [ ] File size > 0 bytes
- [ ] File can be opened in browser
- [ ] Content displays correctly

---

## Phase 5: Integration Testing

### Complete Flow Test
1. [ ] User fills form with valid data
2. [ ] Click "PUBLISH & FORGE"
3. [ ] Completion page appears
4. [ ] Backend log shows email sent
5. [ ] Email arrives in inbox
6. [ ] Click certificate download in web
7. [ ] File downloads successfully
8. [ ] Click certificate download in email
9. [ ] Same file downloads
10. [ ] Both files are identical

### Data Consistency
- [ ] Skill title in UI = Email = Certificate
- [ ] Creator name in UI = Email = Certificate
- [ ] Soul-Hash in UI = Email = Certificate
- [ ] Invitation code in UI = Email = Certificate
- [ ] Dates match format

### User Experience
- [ ] No error messages in browser console
- [ ] No error messages in backend console
- [ ] Page responds quickly (< 2 seconds)
- [ ] Email arrives quickly (< 1 minute)
- [ ] Downloads complete smoothly

---

## Phase 6: Error Handling Testing

### Test Invalid Data

**Missing email:**
```json
{
  "recipientName": "Test",
  "skillTitle": "Test"
  // Missing: recipientEmail
}
```
- [ ] Returns error 400: "recipientEmail is required"
- [ ] No email sent
- [ ] Graceful error handling

**Invalid skill ID:**
```
GET /api/email/certificate/invalid-skill-xyz
```
- [ ] Returns error 404: "Skill not found"
- [ ] No error in backend logs (expected behavior)

**Missing .env configuration:**
- [ ] Backend still runs
- [ ] Dev mode activated (logs to console)
- [ ] "Email would be sent to..." message appears
- [ ] No SMTP errors

### Test Rate Limiting (Production)
- [ ] Send 10 emails in 1 second
- [ ] Verify no rate limit errors (if not implemented)
- [ ] Plan rate limit implementation

---

## Phase 7: Cross-Browser Testing

Test completion page in:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

For each browser:
- [ ] Completion page displays correctly
- [ ] Certificate card styling is correct
- [ ] Download button works
- [ ] Email sends (check console)

---

## Phase 8: Mobile/Responsive Testing

### Desktop (1920x1080)
- [ ] All elements visible
- [ ] Card proportions correct
- [ ] Buttons clickable

### Tablet (768x1024)
- [ ] Layout adapts
- [ ] No horizontal scroll
- [ ] Text readable

### Mobile (375x812)
- [ ] Stack vertically
- [ ] Buttons touch-friendly
- [ ] Text readable

---

## Phase 9: Performance Testing

### Page Load Time
- [ ] Completion page loads: < 1 second
- [ ] Certificate HTML generates: < 2 seconds
- [ ] Email sends: < 5 seconds (async)

### Email Delivery Time
- [ ] Gmail: usually < 30 seconds
- [ ] Custom SMTP: < 1 minute
- [ ] Dev mode: immediate (console)

### File Size
- [ ] Certificate HTML: 15-25 KB
- [ ] Email HTML: 20-30 KB
- [ ] Download speed: > 1 MB/s

---

## Phase 10: Security Testing

### CORS Headers
- [ ] Frontend can call backend API
- [ ] Third-party sites cannot call API
- [ ] Preflight requests work

### Input Validation
- [ ] Email format validated
- [ ] Long strings handled safely
- [ ] Special characters escaped
- [ ] No SQL injection possible

### Rate Limiting
- [ ] Email spam protection
- [ ] Download limit per user
- [ ] DOS protection

---

## Regression Testing

After any changes, verify:
- [ ] Completion page still shows
- [ ] Certificate card unchanged
- [ ] Email sending works
- [ ] All downloads functional
- [ ] No new console errors

---

## Success Criteria

✅ **All tests pass when:**

1. **UI Tests**: 100% pass rate
2. **Download Tests**: Files generate correctly
3. **Email Tests**: Emails arrive in inbox
4. **API Tests**: All endpoints return correct responses
5. **Integration Tests**: Complete flow works end-to-end
6. **Error Handling**: Graceful errors, no crashes
7. **Cross-Browser**: Same experience on all browsers
8. **Performance**: All operations under 5 seconds
9. **Security**: No vulnerabilities found
10. **Regression**: Previous functionality intact

---

## Known Issues (Track Here)

```
Issue #1: [Description]
- Impact: [Severity]
- Workaround: [If any]
- Status: [Open/In Progress/Closed]

Issue #2: ...
```

---

## Sign-Off

- [ ] All tests completed
- [ ] No critical issues found
- [ ] Ready for production
- [ ] Documentation complete
- [ ] Team reviewed and approved

**Tested By**: _______________  
**Date**: _______________  
**Status**: 🟢 Ready / 🟡 In Progress / 🔴 Issues Found

---

**Last Updated**: 2026-04-20
