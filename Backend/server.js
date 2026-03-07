const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'gmail-wordcloud-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/callback'
);

app.get('/auth/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.modify']
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    req.session.tokens = tokens;
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=error`);
  }
});

app.get('/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.tokens });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

const requireAuth = (req, res, next) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  oauth2Client.setCredentials(req.session.tokens);
  next();
};

app.get('/api/emails/years', requireAuth, async (req, res) => {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 500,
      q: 'in:inbox OR in:sent'
    });

    const messages = response.data.messages || [];
    const yearCounts = {};

    for (const message of messages.slice(0, 100)) {
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['Date']
        });

        const dateHeader = detail.data.payload.headers.find(h => h.name === 'Date');
        if (dateHeader) {
          const year = new Date(dateHeader.value).getFullYear();
          if (year && !isNaN(year)) {
            yearCounts[year] = (yearCounts[year] || 0) + 1;
          }
        }
      } catch (err) {
        console.error('Error fetching message:', err);
      }
    }

    res.json({ years: yearCounts });
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/emails/senders/:year', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const startDate = `${year}/01/01`;
    const endDate = `${year}/12/31`;
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 500,
      q: `after:${startDate} before:${endDate}`
    });

    const messages = response.data.messages || [];
    const senderCounts = {};

    for (const message of messages.slice(0, 100)) {
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From']
        });

        const fromHeader = detail.data.payload.headers.find(h => h.name === 'From');
        if (fromHeader) {
          let sender = fromHeader.value;
          const nameMatch = sender.match(/^([^<]+)</);
          if (nameMatch) {
            sender = nameMatch[1].trim();
          } else {
            sender = sender.replace(/<|>/g, '').trim();
          }
          
          senderCounts[sender] = (senderCounts[sender] || 0) + 1;
        }
      } catch (err) {
        console.error('Error fetching sender:', err);
      }
    }

    // Limit to top 30 senders
    const sortedSenders = Object.entries(senderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .reduce((obj, [sender, count]) => {
        obj[sender] = count;
        return obj;
      }, {});

    res.json({ senders: sortedSenders });
  } catch (error) {
    console.error('Error fetching senders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/emails/wordcloud', requireAuth, async (req, res) => {
  try {
    const { year, sender, previousWords } = req.body;
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    let query = '';
    if (year) query += `after:${year}/01/01 before:${year}/12/31 `;
    if (sender) query += `from:"${sender}" `;
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 500,
      q: query.trim()
    });

    const messages = response.data.messages || [];
    const wordCounts = {};
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
      'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
      'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did',
      'am', 're', 've', 'll', 't', 's', 'd', 'm', 'px', 'font', 'style', 'color', 'border', 'padding', 'margin', 'width', 'height',
      'class', 'table', 'body', 'text', 'align', 'left', 'right', 'center', 'block',
      'zone', 'zone2', 'important', 'display', 'line', 'size', 'bottom', 'data',
      'yahoo', 'nbsp', 'quot', 'amp', 'html', 'http', 'https', 'www', 'com', 'net', 'org', '15px', '16px', '20px', '10px', '30px'
    ]);

    const emailIds = [];

    for (const message of messages.slice(0, 50)) {
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        emailIds.push(message.id);

        const subjectHeader = detail.data.payload.headers.find(h => h.name === 'Subject');
        let text = subjectHeader ? subjectHeader.value : '';
let body = '';
        if (detail.data.payload.parts) {
          for (const part of detail.data.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body.data) {
              body += Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }
        }
        
        // If no plain text, try getting from main body
        if (!body && detail.data.payload.body.data) {
          body = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf-8');
        }

        // Strip HTML tags
        body = body.replace(/<[^>]*>/g, ' ');
        // Strip HTML entities
        body = body.replace(/&[a-z]+;/gi, ' ');
        // Strip URLs
        body = body.replace(/https?:\/\/[^\s]+/g, ' ');
        // Strip email addresses
        body = body.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ');

        text += ' ' + body;

        if (previousWords && previousWords.length > 0) {
          const lowerText = text.toLowerCase();
          const hasAllWords = previousWords.every(word => 
            lowerText.includes(word.toLowerCase())
          );
          if (!hasAllWords) continue;
        }

        const words = text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3 && !stopWords.has(word));

        words.forEach(word => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        });

      } catch (err) {
        console.error('Error processing message:', err);
      }
    }

    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .reduce((obj, [word, count]) => {
        obj[word] = count;
        return obj;
      }, {});

    res.json({ 
      words: sortedWords,
      emailIds: emailIds
    });

  } catch (error) {
    console.error('Error generating word cloud:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/emails/delete', requireAuth, async (req, res) => {
  try {
    const { emailIds } = req.body;
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    for (const id of emailIds) {
      await gmail.users.messages.trash({
        userId: 'me',
        id: id
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting emails:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/emails/untrash', requireAuth, async (req, res) => {
  try {
    const { emailIds } = req.body;
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    for (const id of emailIds) {
      await gmail.users.messages.untrash({
        userId: 'me',
        id: id
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error untrashing emails:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});