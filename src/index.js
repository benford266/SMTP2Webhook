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

function extractToField(emailData) {
  if (!emailData.to) return '';
  if (typeof emailData.to === 'string') {
    return emailData.to;
  }
  if (emailData.to.text) {
    return emailData.to.text;
  }
  if (Array.isArray(emailData.to.value)) {
    return emailData.to.value.map(addr => addr.address).join(', ');
  }
  if (Array.isArray(emailData.to)) {
    return emailData.to.map(addr => addr.address || addr).join(', ');
  }
  return '';
}

async function sendWebhook(emailData, envelope) {
  if (!config.webhook.url) {
    console.error('WEBHOOK_URL not configured');
    return;
  }

  try {
    // Extract from address from envelope or parsed email
    let fromAddress = '';
    if (envelope?.mailFrom?.address) {
      fromAddress = envelope.mailFrom.address;
    } else if (emailData.from?.text) {
      fromAddress = emailData.from.text;
    } else if (emailData.from?.value?.[0]?.address) {
      fromAddress = emailData.from.value[0].address;
    } else if (typeof emailData.from === 'string') {
      fromAddress = emailData.from;
    }

    // Extract to addresses from envelope or parsed email
    let toAddresses = '';
    if (envelope?.rcptTo && Array.isArray(envelope.rcptTo)) {
      toAddresses = envelope.rcptTo.map(rcpt => rcpt.address).join(', ');
    } else {
      toAddresses = extractToField(emailData);
    }


    const payload = {
      subject: emailData.subject || '',
      body: emailData.text || emailData.html || '',
      from: fromAddress,
      to: toAddresses,
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
        // Get sender from parsed email or envelope
        let sender = 'unknown';
        if (parsed.from?.text) {
          sender = parsed.from.text;
        } else if (parsed.from?.value?.[0]?.address) {
          sender = parsed.from.value[0].address;
        } else if (session.envelope?.mailFrom?.address) {
          sender = session.envelope.mailFrom.address;
        }
        console.log(`Received email: ${parsed.subject} from ${sender}`);
        
        await sendWebhook(parsed, session.envelope);
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