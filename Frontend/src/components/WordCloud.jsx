import React, { useMemo, useState } from 'react';

function WordCloud({ words, emailData = [] }) {
  const [selectedWord, setSelectedWord] = useState(null);
  const containerWidth = 1100;
  const containerHeight = 650;
  const maxWords = 25;

  const placedWords = useMemo(() => {
    const entries = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, maxWords);
    if (!entries.length) return [];

    const counts = entries.map(([, count]) => count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const minSize = 20;
    const maxSize = 110;

    return entries.map(([word, count], index) => {
      const t = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
      const fontSize = minSize + t * (maxSize - minSize);
      const left = 20 + Math.random() * (containerWidth - 360);
      const top = 60 + Math.random() * (containerHeight - 200);
      return { word, count, fontSize, left, top, color: `hsl(${(index * 37) % 360}, 65%, 42%)` };
    });
  }, [words]);

  const drilldownItems = useMemo(() => {
    if (!selectedWord) return [];
    const needle = selectedWord.toLowerCase();
    return emailData.filter((email) => {
      const subject = (email.subject || '').toLowerCase();
      const body = (email.body || '').toLowerCase();
      const from = (email.from || '').toLowerCase();
      return subject.includes(needle) || body.includes(needle) || from.includes(needle);
    });
  }, [selectedWord, emailData]);

  if (selectedWord) {
    return (
      <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center' }}>Drill Down: {selectedWord} ({words[selectedWord] ?? 0})</h2>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button onClick={() => setSelectedWord(null)}>Back to Cloud</button>
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {drilldownItems.map((email, idx) => (
            <div key={email.id || idx} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontWeight: 'bold' }}>{email.subject || '(No subject)'}</div>
              {email.from && <div style={{ fontSize: '0.9rem', color: '#555' }}>From: {email.from}</div>}
              {email.snippet && <div style={{ marginTop: '6px' }}>{email.snippet}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: `${containerWidth}px`, height: `${containerHeight}px`, margin: '20px auto', overflow: 'hidden' }}>
      {placedWords.map((item) => (
        <span
          key={`${item.word}-${item.count}-${item.left}-${item.top}`}
          onClick={() => setSelectedWord(item.word)}
          style={{
            position: 'absolute',
            left: `${item.left}px`,
            top: `${item.top}px`,
            fontSize: `${item.fontSize}px`,
            color: item.color,
            cursor: 'pointer',
            fontWeight: 'bold',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            opacity: 0.95
          }}
        >
          {item.word} <span style={{ fontSize: '0.5em', fontWeight: 600, opacity: 0.85 }}>({item.count})</span>
        </span>
      ))}
    </div>
  );
}

export default WordCloud;