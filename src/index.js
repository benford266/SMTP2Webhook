require('dotenv').config();

const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { EmailClient } = require('@azure/communication-email');

const config = {
  smtp: {
    port: process.env.SMTP_PORT || 25,
    host: process.env.SMTP_HOST || '0.0.0.0',
    secure: false,
    authOptional: true,
    disabledCommands: ['AUTH']
  },
  azure: {
    connectionString: process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
    senderAddress: process.env.AZURE_SENDER_ADDRESS
  }
};

// Initialize Azure Communication Email client
let emailClient;
if (config.azure.connectionString) {
  emailClient = new EmailClient(config.azure.connectionString);
} else {
  console.error('AZURE_COMMUNICATION_CONNECTION_STRING not configured');
}

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

async function sendEmail(emailData, envelope) {
  if (!emailClient) {
    console.error('Azure Communication Email client not initialized');
    return;
  }

  if (!config.azure.senderAddress) {
    console.error('AZURE_SENDER_ADDRESS not configured');
    return;
  }

  try {
    // Extract to addresses from envelope or parsed email
    let toAddresses = [];
    if (envelope?.rcptTo && Array.isArray(envelope.rcptTo)) {
      toAddresses = envelope.rcptTo.map(rcpt => ({ address: rcpt.address }));
    } else {
      const toField = extractToField(emailData);
      if (toField) {
        // Split comma-separated addresses and create address objects
        toAddresses = toField.split(',').map(addr => ({ address: addr.trim() }));
      }
    }

    if (toAddresses.length === 0) {
      console.error('No recipient addresses found');
      return;
    }

    const emailMessage = {
      senderAddress: config.azure.senderAddress,
      content: {
        subject: emailData.subject || 'No Subject',
        plainText: emailData.text || '',
        html: emailData.html || emailData.text || ''
      },
      recipients: {
        to: toAddresses
      }
    };

    console.log(`Sending email: "${emailMessage.content.subject}" to ${toAddresses.map(addr => addr.address).join(', ')}`);

    const poller = await emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();

    if (result.status === 'Succeeded') {
      console.log(`Email sent successfully: ${result.id}`);
    } else {
      console.error(`Email failed to send: ${result.status}`);
    }
  } catch (error) {
    console.error('Failed to send email:', error.message);
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
        
        await sendEmail(parsed, session.envelope);
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
  console.log(`SMTP to Azure Communication Services server listening on ${config.smtp.host}:${config.smtp.port}`);
  console.log(`Azure sender address: ${config.azure.senderAddress || 'NOT CONFIGURED'}`);
  console.log(`Azure connection configured: ${config.azure.connectionString ? 'YES' : 'NO'}`);
});