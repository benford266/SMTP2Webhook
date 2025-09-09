# SMTP2Webhook

A lightweight Docker container that acts as an SMTP relay/postbox, collecting incoming emails and forwarding them using Azure Communication Services.

## Features

- **SMTP Server**: Listens on ports 25 and 587 for incoming emails
- **Email Parsing**: Extracts subject, body, sender, and recipient information
- **Azure Communication Services**: Forwards emails using Azure Communication Services
- **Docker Ready**: Containerized for easy deployment
- **Environment Configuration**: Configurable via environment variables
- **Error Handling**: Robust error handling with logging

## Quick Start

1. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd SMTP2Webhook
   cp .env.example .env
   ```

2. **Edit `.env` file**:
   ```env
   ACS_CONNECTION_STRING=endpoint=https://your-acs-resource.communication.azure.com/;accesskey=your-access-key
   FORWARD_TO_EMAIL=destination@example.com
   FROM_EMAIL=sender@your-domain.com
   ```

3. **Deploy with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

4. **Test the SMTP server** by sending an email to the container's IP on port 25.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_PORT` | `25` | SMTP server port |
| `SMTP_HOST` | `0.0.0.0` | SMTP server bind address |
| `ACS_CONNECTION_STRING` | *required* | Azure Communication Services connection string |
| `FORWARD_TO_EMAIL` | *required* | Email address to forward messages to |
| `FROM_EMAIL` | *required* | From email address for forwarded messages |

### Docker Compose

The included `docker-compose.yml` exposes ports 25 and 587 and includes restart policies.

## Email Forwarding

Emails are forwarded using Azure Communication Services with the following behavior:

- **Subject**: Original subject is preserved with optional prefix
- **Body**: Original email content (text or HTML) is forwarded
- **From**: Uses the configured `FROM_EMAIL` address
- **To**: Uses the configured `FORWARD_TO_EMAIL` address
- **Original Sender**: Included in the forwarded email body for reference

## Development

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set environment variables**:
   ```bash
   export ACS_CONNECTION_STRING=endpoint=https://your-acs-resource.communication.azure.com/;accesskey=your-access-key
   export FORWARD_TO_EMAIL=destination@example.com
   export FROM_EMAIL=sender@your-domain.com
   ```

3. **Run in development mode**:
   ```bash
   npm run dev
   ```

### Building the Container

```bash
docker build -t smtp2webhook .
docker run -p 25:25 -p 587:587 \
  -e ACS_CONNECTION_STRING=your-acs-connection-string \
  -e FORWARD_TO_EMAIL=destination@example.com \
  -e FROM_EMAIL=sender@your-domain.com \
  smtp2webhook
```

## Security Considerations

- The SMTP server accepts all emails without authentication
- Ensure proper network security (firewall rules, VPC configuration)
- Consider implementing rate limiting for production use
- Secure your Azure Communication Services connection string
- Configure proper sender authentication (SPF/DKIM) for your domain

## Logging

The service logs:
- Incoming email details (subject and sender)
- Email forwarding status via Azure Communication Services
- Error conditions

## Troubleshooting

### Common Issues

1. **Port binding errors**: Ensure ports 25/587 are not in use by other services
2. **Email forwarding failures**: Check Azure Communication Services connection string and permissions
3. **Permission errors**: Ensure the container has proper network permissions
4. **Authentication errors**: Verify your Azure Communication Services credentials and domain configuration

### Testing SMTP

Use telnet to test the SMTP server:

```bash
telnet localhost 25
HELO example.com
MAIL FROM: test@example.com
RCPT TO: recipient@example.com
DATA
Subject: Test Email

This is a test email.
.
QUIT
```

## License

MIT License