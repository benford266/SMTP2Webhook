# SMTP2Webhook

A lightweight Docker container that acts as an SMTP relay/postbox, collecting incoming emails and forwarding them to Azure Logic Apps via webhooks.

## Features

- **SMTP Server**: Listens on ports 25 and 587 for incoming emails
- **Email Parsing**: Extracts subject, body, sender, and recipient information
- **Webhook Integration**: Forwards email data as JSON to Azure Logic Apps
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
   WEBHOOK_URL=https://your-logic-app.azurewebsites.net/api/webhook
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
| `WEBHOOK_URL` | *required* | Azure Logic App webhook URL |
| `WEBHOOK_TIMEOUT` | `10000` | Webhook request timeout (ms) |

### Docker Compose

The included `docker-compose.yml` exposes ports 25 and 587 and includes restart policies.

## Webhook Payload

Emails are forwarded as JSON with the following structure:

```json
{
  "subject": "Email Subject",
  "body": "Email body content (text or HTML)",
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Development

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set environment variables**:
   ```bash
   export WEBHOOK_URL=https://your-logic-app.azurewebsites.net/api/webhook
   ```

3. **Run in development mode**:
   ```bash
   npm run dev
   ```

### Building the Container

```bash
docker build -t smtp2webhook .
docker run -p 25:25 -p 587:587 -e WEBHOOK_URL=your-webhook-url smtp2webhook
```

## Security Considerations

- The SMTP server accepts all emails without authentication
- Ensure proper network security (firewall rules, VPC configuration)
- Consider implementing rate limiting for production use
- Validate webhook URLs to prevent SSRF attacks

## Logging

The service logs:
- Incoming email details (subject and sender)
- Webhook delivery status
- Error conditions

## Troubleshooting

### Common Issues

1. **Port binding errors**: Ensure ports 25/587 are not in use by other services
2. **Webhook failures**: Check Azure Logic App URL and network connectivity
3. **Permission errors**: Ensure the container has proper network permissions

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