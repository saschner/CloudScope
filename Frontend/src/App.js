import React, { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import './App.css';
import WordCloud from './components/WordCloud';

const stopWords = new Set([
  'the','and','for','you','that','with','this','from','are','was','have','but','not','your','can','will','just','its','our','all','any','out','get','got','too','had','her','his','she','him','they','them','their','there','here','who','what','when','where','why','how','been','were','than','then','about','into','over','under','more','most','some','such','only','very','much','many','may','might','should','could','would','also','email','message'
]);

const extraStopWords = new Set([
  'width','height','px','div','span','style','class','css','color','font','fontsize','margin','padding','border','display','flex','grid','absolute','relative','top','left','right','bottom','center','align','text','block','none','auto','button','hover','react','jsx','js','html','code','file','return','const','let','var','function','true','false','null','undefined','import','export','default','app','cloudscope','table','line','sans','mso','size','com','new','day','click','oann'
]);

function decodeBase64Url(data) {
  if (!data) return '';
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  try { return atob(base64); } catch { return ''; }
}

function stripHtml(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, 'and ').replace(/&lt;/gi, ' ').replace(/&gt;/gi, ' ').replace(/&quot;/gi, ' ').replace(/&#39;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function extractBestBody(payload) {
  if (!payload) return '';
  const parts = [];
  const walk = (part) => {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) parts.push(decodeBase64Url(part.body.data));
    if (part.mimeType === 'text/html' && part.body?.data) parts.push(stripHtml(decodeBase64Url(part.body.data)));
    if (Array.isArray(part.parts)) part.parts.forEach(walk);
  };
  walk(payload);
  if (parts.length) return parts.join(' ');
  if (payload.body?.data) return stripHtml(decodeBase64Url(payload.body.data));
  return '';
}

function buildWordCounts(emails) {
  const counts = {};
  const text = emails.map((e) => [e.subject, e.from, e.body].filter(Boolean).join(' ')).join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = text.split(/\s+/).filter((t) => t.length > 2 && !stopWords.has(t) && !extraStopWords.has(t) && /[a-z]/.test(t));
  tokens.forEach((token) => { counts[token] = (counts[token] || 0) + 1; });
  return counts;
}
function buildSenderCounts(emails) {
  const counts = {};

  emails.forEach((email) => {
    let sender = email.from || '';

    const match = sender.match(/^"?([^"<]+)"?\s*</);

    if (match) {
      sender = match[1].trim();
    } else {
      sender = sender.split('@')[0];
    }

    sender = sender.replace(/[^a-zA-Z0-9\s]/g, '').trim();

    if (sender.length > 1) {
      counts[sender] = (counts[sender] || 0) + 1;
    }
  });

  return counts;
}

function filterWordCounts(counts) {
  const minCount = 2;
  const maxCount = 100;
  return Object.fromEntries(Object.entries(counts).filter(([_, count]) => count >= minCount && count <= maxCount));
}

function AppInner() {
const [authenticated, setAuthenticated] = useState(false);
const [realWords, setRealWords] = useState({});
const [emails, setEmails] = useState([]);
const [loading, setLoading] = useState(false);
const [selectedMonth, setSelectedMonth] = useState('');
const availableMonths = [...new Set(
  emails.map((email) => {
    const date = new Date(Number(email.date));
    return date.toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });
  })
)];
  const login = useGoogleLogin({
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    onSuccess: async (tokenResponse) => {
      try {localStorage.setItem('gmail_token', tokenResponse.access_token);

        setLoading(true);
        const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50', { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } });
        const listData = await listRes.json();
        const fetchedEmails = [];

        for (const msg of listData.messages || []) {
          const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } });
          const msgData = await msgRes.json();
          const headers = msgData.payload?.headers || [];
          const subject = headers.find((h) => h.name === 'Subject')?.value || '';
          const from = headers.find((h) => h.name === 'From')?.value || '';
          const body = extractBestBody(msgData.payload) || msgData.snippet || '';
          fetchedEmails.push({
  id: msg.id,
  subject,
  from,
  body,
  snippet: msgData.snippet || '',
  date: msgData.internalDate
});
  }

        const counts = buildSenderCounts(fetchedEmails);





        setEmails(fetchedEmails);
        setRealWords(counts);
        setAuthenticated(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    onError: () => console.log('Login Failed'),
  });

  return (
    <div className="app" style={{ textAlign: 'center', padding: '20px' }}>
      <h1>CloudScope</h1>
      {!authenticated ? (
        <button onClick={() => login()} style={{ padding: '10px 16px', fontSize: '16px' }}>Sign in with Google</button>
      ) : loading ? (
        <div>Loading your inbox...</div>
      ) : (
<>
<div style={{ textAlign: 'center', marginBottom: '20px' }}>
  <select
    value={selectedMonth}
    onChange={(e) => setSelectedMonth(e.target.value)}
    style={{
      padding: '10px',
      fontSize: '16px',
      borderRadius: '8px'
    }}
  >
    <option value=''>All Months</option>

    {availableMonths.map((month) => (
      <option key={month} value={month}>
        {month}
      </option>
    ))}
  </select>
</div>
        <WordCloud words={realWords} emailData={emails} />
</>
      )}
    </div>
  );
}

export default function App() {
  return <GoogleOAuthProvider clientId="613649107764-a62ejns04vkh5lc9sdc412idbpkfrn88.apps.googleusercontent.com"><AppInner /></GoogleOAuthProvider>;
}