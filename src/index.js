const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const axios = require('axios');

const config = {
  smtp: {
    port: process.env.SMTP_PORT || 25,
    host: process.env.SMTP_HOST || '0.0.0.0',
    secure: false,
    authOptional: true,
    disabledCommands: ['AUTH']
  },
  webhook: {
    url: process.env.WEBHOOK_URL,
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000
  }
};

async function sendWebhook(emailData) {
  if (!config.webhook.url) {
    console.error('WEBHOOK_URL not configured');
    return;
  }

  try {
    const payload = {
      subject: emailData.subject || '',
      body: emailData.text || emailData.html || '',
      from: emailData.from?.text || '',
      to: emailData.to?.text || '',
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(config.webhook.url, payload, {
      timeout: config.webhook.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Webhook sent successfully: ${response.status}`);
  } catch (error) {
    console.error('Failed to send webhook:', error.message);
  }
}

const server = new SMTPServer({
  ...config.smtp,
  onData(stream, session, callback) {
    let emailData = '';
    
    stream.on('data', (chunk) => {
      emailData += chunk;
    });
    
    stream.on('end', async () => {
      try {
        const parsed = await simpleParser(emailData);
        console.log(`Received email: ${parsed.subject} from ${parsed.from?.text}`);
        
        await sendWebhook(parsed);
        callback();
      } catch (error) {
        console.error('Error processing email:', error);
        callback(error);
      }
    });
  }
});

server.on('error', (err) => {
  console.error('SMTP Server error:', err);
});

server.listen(config.smtp.port, config.smtp.host, () => {
  console.log(`SMTP2Webhook server listening on ${config.smtp.host}:${config.smtp.port}`);
  console.log(`Webhook URL: ${config.webhook.url || 'NOT CONFIGURED'}`);
});