# DITMail - Enterprise Email Platform

DITMail is a comprehensive email hosting platform that provides professional email services with custom domains, advanced security, and seamless integration capabilities. Built with Next.js, Prisma, MySQL, and Redis.

## 🚀 Features

### Core Email Features
- **Custom Domain Email**: Professional email addresses with your own domain
- **IMAP/POP3 Access**: Full email client compatibility
- **SMTP Integration**: Reliable email sending and receiving
- **Real-time Sync**: Live email synchronization across devices
- **Rich Email Composer**: Advanced email composition with attachments
- **Email Organization**: Folders, labels, and advanced filtering

### Business Features
- **Multi-tenant Architecture**: Support for multiple organizations
- **User Management**: Role-based access control and team management
- **Domain Management**: Easy domain setup and verification
- **Contact Management**: Comprehensive address book functionality
- **Calendar Integration**: Built-in calendar and scheduling
- **File Management**: Secure file storage and sharing

### Security & Compliance
- **Enterprise Security**: Advanced encryption and security features
- **Spam Protection**: Intelligent spam filtering and protection
- **SSL/TLS Encryption**: End-to-end encryption for all communications
- **Two-Factor Authentication**: Enhanced account security
- **Audit Logging**: Comprehensive activity tracking
- **GDPR Compliance**: Privacy-focused design and data protection

### Payment & Billing
- **Multiple Payment Methods**: PayPal and Razorpay integration
- **Subscription Management**: Automated billing and renewals
- **Free Trial**: 7-day free trial for all plans
- **Yearly Discounts**: 17% discount on annual subscriptions
- **Indian Payment Support**: Razorpay for Indian customers

## 📋 Plans & Pricing

### Basic Plan - $3/month ($30/year)
- 5 email accounts
- 1 custom domain
- 5GB storage per account
- IMAP/POP3 access
- Mobile apps
- Basic support

### Professional Plan - $6/month ($60/year)
- 25 email accounts
- 5 custom domains
- 50GB storage per account
- Calendar integration
- Contact management
- Priority support

### Enterprise Plan - $12/month ($120/year)
- Unlimited email accounts
- Unlimited domains
- 1TB storage per account
- Advanced admin controls
- API access
- 24/7 phone support

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **NextAuth.js**: Authentication and session management
- **React Hook Form**: Form handling and validation
- **Framer Motion**: Smooth animations and transitions

### Backend
- **Prisma**: Type-safe database ORM
- **MySQL**: Relational database
- **Redis**: Caching and session storage
- **Node.js**: Server-side runtime
- **Zod**: Schema validation

### Email Infrastructure
- **IMAP Client**: Real-time email synchronization
- **SMTP Client**: Reliable email sending
- **Mailparser**: Email parsing and processing
- **Nodemailer**: Email composition and delivery

### Payment Processing
- **PayPal SDK**: International payment processing
- **Razorpay**: Indian payment gateway
- **Stripe**: Additional payment option
- **Webhook Handling**: Automated subscription management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+
- Redis 6.0+
- Email server (SMTP/IMAP/POP3)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd ditmail/web
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment setup**
   \`\`\`bash
   cp .env.example .env
   # Configure your environment variables
   \`\`\`

4. **Database setup**
   \`\`\`bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   \`\`\`

5. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Access the application**
   - Open http://localhost:3000 in your browser
   - Create your first account and organization
   - Configure your email domains

### Environment Variables

Key environment variables you need to configure:

\`\`\`env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/ditmail"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Email Server
SMTP_HOST="your-smtp-server"
IMAP_HOST="your-imap-server"
POP3_HOST="your-pop3-server"

# Payment Gateways
PAYPAL_CLIENT_ID="your-paypal-client-id"
RAZORPAY_KEY_ID="your-razorpay-key-id"
\`\`\`

## 📁 Project Structure

\`\`\`
web/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── dashboard/         # Dashboard components
│   ├── landing/           # Landing page components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── email/             # Email handling (IMAP/SMTP)
│   ├── payments/          # Payment processing
│   ├── auth.ts            # Authentication config
│   ├── prisma.ts          # Database client
│   └── redis.ts           # Redis client
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
└── public/                # Static assets
\`\`\`

## 🔧 Configuration

### Email Server Setup

1. **Configure your email server** (Haraka, Postfix, etc.)
2. **Set up DNS records** (MX, SPF, DKIM, DMARC)
3. **Configure SSL certificates** for secure connections
4. **Update environment variables** with server details

### Payment Gateway Setup

#### PayPal Configuration
1. Create a PayPal Developer account
2. Create a new application
3. Get Client ID and Client Secret
4. Configure webhook endpoints

#### Razorpay Configuration (for Indian customers)
1. Create a Razorpay account
2. Get API keys from dashboard
3. Configure webhook URLs
4. Set up payment methods

### Domain Management

1. **Add domains** through the dashboard
2. **Verify ownership** using DNS records
3. **Configure email routing** for custom domains
4. **Set up SSL certificates** for secure email

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Session management with Redis
- Two-factor authentication support

### Email Security
- End-to-end encryption
- DKIM signing
- SPF validation
- DMARC compliance
- Spam filtering

### Data Protection
- GDPR compliance
- Data encryption at rest
- Secure file uploads
- Audit logging

## 📊 Monitoring & Analytics

### Built-in Analytics
- Email delivery statistics
- User activity tracking
- Storage usage monitoring
- Performance metrics

### Health Monitoring
- Server uptime tracking
- Email queue monitoring
- Database performance
- Redis cache statistics

## 🔌 API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `POST /api/auth/forgot-password` - Password reset

### Email Management
- `GET /api/emails` - List emails
- `POST /api/emails` - Send email
- `GET /api/emails/:id` - Get email details
- `DELETE /api/emails/:id` - Delete email

### Domain Management
- `GET /api/domains` - List domains
- `POST /api/domains` - Add domain
- `POST /api/domains/:id/verify` - Verify domain
- `DELETE /api/domains/:id` - Remove domain

### User Management
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🚀 Deployment

### Production Deployment

1. **Build the application**
   \`\`\`bash
   npm run build
   \`\`\`

2. **Set up production database**
   \`\`\`bash
   npx prisma migrate deploy
   \`\`\`

3. **Configure environment variables** for production

4. **Deploy to your preferred platform**
   - Vercel (recommended)
   - AWS
   - Google Cloud
   - DigitalOcean

### Docker Deployment

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: [docs.freecustom.email](https://docs.freecustom.email)
- **Help Center**: [help.freecustom.email](https://help.freecustom.email)
- **Email Support**: support@freecustom.email
- **Community**: [Discord](https://discord.gg/ditmail)

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core email functionality
- ✅ User management
- ✅ Payment integration
- ✅ Domain management

### Phase 2 (Q2 2024)
- 📧 Advanced email features
- 📱 Mobile applications
- 🔗 Third-party integrations
- 📈 Advanced analytics

### Phase 3 (Q3 2024)
- 🤖 AI-powered features
- 📞 VoIP integration
- 🌐 Multi-language support
- 🔒 Advanced security features

---

**DITMail** - Professional email hosting made simple and secure.
