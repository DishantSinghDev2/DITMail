# DITMail API Documentation

## Overview
DITMail provides a comprehensive REST API for managing email services, users, domains, and billing. All endpoints require authentication unless specified otherwise.

## Base URL
\`\`\`
http://localhost:3000/api
\`\`\`

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

---

## Authentication Endpoints

### POST /api/auth/signup
Create a new user account.

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "planId": "plan_basic",
  "billingCycle": "monthly"
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "message": "User created successfully",
  "user": {
    "id": "user_123",
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false
  },
  "verificationSent": true
}
\`\`\`

### POST /api/auth/signin
Authenticate user and get access token.

**Request Body:**
\`\`\`json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "user": {
    "id": "user_123",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
\`\`\`

### POST /api/auth/verify-email
Verify user email address.

**Request Body:**
\`\`\`json
{
  "token": "verification_token_here"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Email verified successfully",
  "user": {
    "id": "user_123",
    "emailVerified": true
  }
}
\`\`\`

### POST /api/auth/resend-verification
Resend email verification.

**Request Body:**
\`\`\`json
{
  "email": "john@example.com"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Verification email sent successfully"
}
\`\`\`

---

## Dashboard Endpoints

### GET /api/dashboard/stats
Get dashboard statistics for authenticated user.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "totalEmails": 1250,
  "emailsChange": "+12%",
  "activeUsers": 45,
  "usersChange": "+5%",
  "totalDomains": 3,
  "domainsChange": "+0%",
  "storageUsed": "2.5 GB",
  "storageChange": "+8%",
  "recentActivity": [
    {
      "type": "email_sent",
      "description": "Email sent to client@example.com",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
\`\`\`

---

## Domain Management Endpoints

### GET /api/domains
Get all domains for user/organization.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
[
  {
    "name": "example.com",
    "status": "verified",
    "userCount": 25,
    "aliasCount": 10,
    "created": "2024-01-01T00:00:00Z",
    "verification_results": {
      "mx": true,
      "spf": true,
      "dkim": true,
      "dmarc": true
    }
  }
]
\`\`\`

### POST /api/domains
Add a new domain.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "domain": "newdomain.com",
  "organization": "org_123"
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "message": "Domain added successfully",
  "domain": "newdomain.com",
  "status": "pending_verification",
  "nextSteps": [
    "Generate DKIM keys",
    "Configure DNS records",
    "Verify domain ownership"
  ]
}
\`\`\`

### GET /api/domains/:domain
Get specific domain details.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "name": "example.com",
  "status": "verified",
  "userCount": 25,
  "aliasCount": 10,
  "created": "2024-01-01T00:00:00Z",
  "updated": "2024-01-15T10:30:00Z",
  "dkim_selector": "default",
  "spf_record": "v=spf1 mx a:mail.example.com -all",
  "dmarc_policy": "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
}
\`\`\`

### PUT /api/domains/:domain
Update domain settings.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "dkim_selector": "default",
  "spf_record": "v=spf1 mx a:mail.example.com -all",
  "dmarc_policy": "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com",
  "max_users": 100,
  "quota_default": "5GB"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Domain updated successfully"
}
\`\`\`

### DELETE /api/domains/:domain
Delete a domain.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Domain deleted successfully"
}
\`\`\`

### POST /api/domains/:domain/verify
Verify domain ownership via DNS.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "domain": "example.com",
  "status": "verified",
  "verification": {
    "mx": true,
    "spf": true,
    "dkim": true,
    "dmarc": true
  },
  "message": "Domain fully verified"
}
\`\`\`

### GET /api/domains/:domain/dns-records
Get DNS records for domain setup.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "domain": "example.com",
  "records": {
    "mx": [
      {
        "type": "MX",
        "name": "example.com",
        "value": "10 mail.example.com",
        "ttl": 3600
      }
    ],
    "a": [
      {
        "type": "A",
        "name": "mail.example.com",
        "value": "192.168.1.100",
        "ttl": 3600
      }
    ],
    "txt": [
      {
        "type": "TXT",
        "name": "example.com",
        "value": "v=spf1 mx a:mail.example.com -all",
        "ttl": 3600,
        "purpose": "SPF"
      }
    ]
  }
}
\`\`\`

### POST /api/domains/:domain/dkim/generate
Generate DKIM keys for domain.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "keySize": 2048,
  "selector": "default"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "DKIM keys generated successfully",
  "selector": "default",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
  "dnsRecord": {
    "name": "default._domainkey.example.com",
    "type": "TXT",
    "value": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
  }
}
\`\`\`

---

## User Management Endpoints

### GET /api/users
Get users with filtering and pagination.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Query Parameters:**
- `domain` (string): Filter by domain
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `search` (string): Search term
- `status` (string): active/inactive
- `role` (string): user/admin

**Response (200):**
\`\`\`json
{
  "users": [
    {
      "id": "user_123",
      "email": "john@example.com",
      "name": "John Doe",
      "domain": "example.com",
      "role": "user",
      "enabled": true,
      "quota": "1GB",
      "created": "2024-01-01T00:00:00Z",
      "lastLogin": "2024-01-15T10:30:00Z",
      "twoFactorEnabled": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
\`\`\`

### POST /api/users
Create a new user.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "name": "New User",
  "domain": "example.com",
  "role": "user",
  "quota": "1GB",
  "enabled": true
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "message": "User created successfully",
  "user": {
    "id": "user_456",
    "email": "newuser@example.com",
    "name": "New User",
    "domain": "example.com",
    "role": "user",
    "enabled": true
  }
}
\`\`\`

### GET /api/users/:userId
Get specific user details.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "id": "user_123",
  "email": "john@example.com",
  "name": "John Doe",
  "domain": "example.com",
  "role": "user",
  "enabled": true,
  "quota": "1GB",
  "created": "2024-01-01T00:00:00Z",
  "lastLogin": "2024-01-15T10:30:00Z",
  "twoFactorEnabled": false,
  "timezone": "UTC",
  "language": "en"
}
\`\`\`

### PUT /api/users/:userId
Update user information.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "name": "Updated Name",
  "role": "admin",
  "quota": "5GB",
  "enabled": true,
  "timezone": "America/New_York",
  "language": "en"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "User updated successfully"
}
\`\`\`

### DELETE /api/users/:userId
Delete a user.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "User deleted successfully"
}
\`\`\`

### POST /api/users/:userId/reset-password
Reset user password (admin only).

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "newPassword": "newSecurePassword123",
  "sendEmail": true
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Password reset successfully"
}
\`\`\`

### POST /api/users/bulk
Bulk operations on users.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "operation": "enable",
  "userIds": ["user_123", "user_456"],
  "data": {
    "quota": "2GB"
  }
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "operation": "enable",
  "results": [
    {
      "userId": "user_123",
      "status": "success"
    },
    {
      "userId": "user_456",
      "status": "success"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
\`\`\`

---

## Email Management Endpoints

### GET /api/emails/folders
Get email folders for user.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
[
  {
    "id": "inbox",
    "name": "Inbox",
    "type": "inbox",
    "unreadCount": 5,
    "totalCount": 150
  },
  {
    "id": "sent",
    "name": "Sent",
    "type": "sent",
    "unreadCount": 0,
    "totalCount": 75
  }
]
\`\`\`

### POST /api/emails/folders
Create custom email folder.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "name": "projects",
  "displayName": "Projects"
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "message": "Folder created successfully",
  "folder": {
    "id": "projects",
    "name": "Projects",
    "type": "custom"
  }
}
\`\`\`

### GET /api/emails/folders/:folderId/messages
Get emails in specific folder.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search term
- `unreadOnly` (boolean): Show only unread emails
- `sortBy` (string): Sort field
- `sortOrder` (string): asc/desc

**Response (200):**
\`\`\`json
{
  "messages": [
    {
      "id": "msg_123",
      "subject": "Important Meeting",
      "from": {
        "email": "sender@example.com",
        "name": "Sender Name"
      },
      "to": [
        {
          "email": "recipient@example.com",
          "name": "Recipient Name"
        }
      ],
      "date": "2024-01-15T10:30:00Z",
      "flags": {
        "seen": false,
        "flagged": true,
        "answered": false
      },
      "attachments": [
        {
          "filename": "document.pdf",
          "size": 1024000
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
\`\`\`

### GET /api/emails/messages/:messageId
Get specific email message.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "id": "msg_123",
  "subject": "Important Meeting",
  "from": {
    "email": "sender@example.com",
    "name": "Sender Name"
  },
  "to": [
    {
      "email": "recipient@example.com",
      "name": "Recipient Name"
    }
  ],
  "cc": [],
  "bcc": [],
  "date": "2024-01-15T10:30:00Z",
  "body": {
    "text": "Plain text content",
    "html": "<p>HTML content</p>"
  },
  "attachments": [],
  "headers": {},
  "flags": {
    "seen": false,
    "flagged": false,
    "answered": false
  }
}
\`\`\`

### POST /api/emails/send
Send an email.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "to": [
    {
      "email": "recipient@example.com",
      "name": "Recipient Name"
    }
  ],
  "cc": [],
  "bcc": [],
  "subject": "Test Email",
  "body": {
    "text": "Plain text content",
    "html": "<p>HTML content</p>"
  },
  "attachments": [],
  "priority": "normal",
  "requestReadReceipt": false
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Email sent successfully",
  "messageId": "msg_456",
  "recipients": 1
}
\`\`\`

### POST /api/emails/drafts
Save email draft.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "to": [
    {
      "email": "recipient@example.com"
    }
  ],
  "subject": "Draft Email",
  "body": {
    "text": "Draft content"
  }
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "message": "Draft saved successfully",
  "draftId": "draft_123"
}
\`\`\`

### PATCH /api/emails/messages/mark
Mark messages as read/unread/flagged.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "messageIds": ["msg_123", "msg_456"],
  "action": "read"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "action": "read",
  "results": [
    {
      "messageId": "msg_123",
      "status": "success"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
\`\`\`

### GET /api/emails/search
Search emails.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Query Parameters:**
- `query` (string): Search query
- `folder` (string): Folder to search in
- `from` (string): Filter by sender
- `to` (string): Filter by recipient
- `subject` (string): Filter by subject
- `dateFrom` (string): Start date
- `dateTo` (string): End date
- `hasAttachment` (boolean): Has attachments

**Response (200):**
\`\`\`json
{
  "query": "important meeting",
  "results": [
    {
      "id": "msg_123",
      "subject": "Important Meeting",
      "from": {
        "email": "sender@example.com",
        "name": "Sender Name"
      },
      "date": "2024-01-15T10:30:00Z",
      "snippet": "Meeting scheduled for tomorrow..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "pages": 1
  }
}
\`\`\`

---

## Billing Endpoints

### GET /api/billing/subscription
Get current subscription.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "subscription": {
    "id": "sub_123",
    "planName": "Professional",
    "price": 29.99,
    "currency": "USD",
    "billingCycle": "monthly",
    "status": "active",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-02-01T00:00:00Z",
    "features": {
      "maxUsers": 50,
      "maxDomains": 5,
      "storage": "100GB"
    }
  }
}
\`\`\`

### GET /api/billing/history
Get billing history.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
\`\`\`json
{
  "payments": [
    {
      "id": "pay_123",
      "amount": 29.99,
      "currency": "USD",
      "status": "completed",
      "planName": "Professional",
      "billingCycle": "monthly",
      "createdAt": "2024-01-01T00:00:00Z",
      "provider": "paypal"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
\`\`\`

### POST /api/billing/subscribe/paypal
Create PayPal subscription.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "planId": "plan_professional",
  "billingCycle": "monthly"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "approvalUrl": "https://www.paypal.com/checkoutnow?token=...",
  "paymentId": "PAYID-123456"
}
\`\`\`

### POST /api/billing/subscribe/razorpay
Create Razorpay subscription.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "planId": "plan_professional",
  "billingCycle": "monthly"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "orderId": "order_123456",
  "amount": 2999,
  "currency": "INR",
  "key": "rzp_test_123456"
}
\`\`\`

### POST /api/billing/cancel
Cancel subscription.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Subscription cancelled successfully"
}
\`\`\`

---

## Settings Endpoints

### GET /api/settings/user
Get user settings.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "timezone": "America/New_York",
  "language": "en",
  "settings": {
    "emailNotifications": true,
    "twoFactorAuth": false,
    "theme": "light"
  }
}
\`\`\`

### PUT /api/settings/user
Update user settings.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "name": "John Doe Updated",
  "timezone": "America/Los_Angeles",
  "language": "en",
  "settings": {
    "emailNotifications": false,
    "theme": "dark"
  }
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "User settings updated successfully"
}
\`\`\`

### PUT /api/settings/user/password
Change user password.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Password updated successfully"
}
\`\`\`

### GET /api/settings/organization
Get organization settings (Admin only).

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "companyName": "Acme Corp",
  "domain": "acme.com",
  "maxUsers": 100,
  "features": {
    "calendar": true,
    "fileSharing": true,
    "customBranding": false
  },
  "security": {
    "enforceSSO": false,
    "passwordPolicy": "strong",
    "sessionTimeout": 3600
  }
}
\`\`\`

### GET /api/settings/email
Get email settings for user.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "accounts": [
    {
      "id": "acc_123",
      "email": "john@example.com",
      "domainName": "example.com",
      "isActive": true,
      "quota": "1GB",
      "usedSpace": "256MB"
    }
  ],
  "serverSettings": {
    "smtp_host": "mail.example.com",
    "smtp_port": "587",
    "imap_host": "mail.example.com",
    "imap_port": "993",
    "pop3_host": "mail.example.com",
    "pop3_port": "995"
  }
}
\`\`\`

---

## Contact Endpoint

### POST /api/contact
Send contact form message.

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Support Request",
  "message": "I need help with my account setup.",
  "type": "support"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Message sent successfully",
  "ticketId": "ticket_123"
}
\`\`\`

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
\`\`\`json
{
  "error": "Invalid request data",
  "details": "Email is required"
}
\`\`\`

### 401 Unauthorized
\`\`\`json
{
  "error": "Authentication required",
  "message": "Please provide a valid access token"
}
\`\`\`

### 403 Forbidden
\`\`\`json
{
  "error": "Access denied",
  "message": "Insufficient permissions"
}
\`\`\`

### 404 Not Found
\`\`\`json
{
  "error": "Resource not found",
  "message": "The requested resource does not exist"
}
\`\`\`

### 409 Conflict
\`\`\`json
{
  "error": "Resource already exists",
  "message": "User with this email already exists"
}
\`\`\`

### 429 Too Many Requests
\`\`\`json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests, please try again later"
}
\`\`\`

### 500 Internal Server Error
\`\`\`json
{
  "error": "Internal server error",
  "message": "Something went wrong on our end"
}
\`\`\`

---

## Rate Limiting

API endpoints are rate limited:
- Authentication endpoints: 5 requests per minute per IP
- General endpoints: 1000 requests per hour per user
- Email sending: 100 emails per hour per user

Rate limit headers are included in responses:
\`\`\`
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
\`\`\`

---

## Webhooks

DITMail supports webhooks for real-time notifications:

### Available Events
- `user.created`
- `user.updated`
- `user.deleted`
- `domain.verified`
- `email.sent`
- `email.received`
- `subscription.created`
- `subscription.cancelled`
- `payment.completed`

### Webhook Payload Example
\`\`\`json
{
  "event": "user.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "user": {
      "id": "user_123",
      "email": "john@example.com",
      "name": "John Doe"
    }
  }
}
\`\`\`

---

## SDKs and Libraries

Official SDKs available for:
- JavaScript/Node.js
- Python
- PHP
- Go
- Ruby

Example usage (JavaScript):
\`\`\`javascript
import { DITMailClient } from '@ditmail/sdk'

const client = new DITMailClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.ditmail.com'
})

// Send email
const result = await client.emails.send({
  to: [{ email: 'recipient@example.com' }],
  subject: 'Hello World',
  body: { text: 'Hello from DITMail!' }
})
\`\`\`

---

## Support

For API support:
- Email: api-support@ditmail.com
- Documentation: https://docs.ditmail.com
- Status Page: https://status.ditmail.com
