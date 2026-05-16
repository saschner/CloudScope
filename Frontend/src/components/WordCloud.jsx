import React, { useMemo, useState } from 'react';

function WordCloud({ words, emailData = [] }) {
  const [selectedSender, setSelectedSender] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const containerWidth = 1200;
  const containerHeight = 625;
  const maxWords = 30;

  const placedWords = useMemo(() => {
    const entries = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, maxWords);
    if (!entries.length) return [];

    const counts = entries.map(([, count]) => count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const minSize = 20;
    const maxSize = 65;

    const placed = [];

    return entries.map(([word, count], index) => {
      const t = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
      const fontSize = minSize + t * (maxSize - minSize);
      const estimatedWidth = word.length * (fontSize * 0.55);
      const estimatedHeight = fontSize;

      let left;
      let top;
      let attempts = 0;
      let overlapping = true;

      while (overlapping && attempts < 20) {
        left = 60 + Math.random() * (containerWidth - estimatedWidth - 110);
        top = 32 + Math.random() * (containerHeight - estimatedHeight - 140);
        overlapping = false;

        for (const p of placed) {
          const horizontalOverlap = left < p.left + p.width && left + estimatedWidth > p.left;
          const verticalOverlap = top < p.top + p.height && top + estimatedHeight > p.top;
          if (horizontalOverlap && verticalOverlap) {
            overlapping = true;
            break;
          }
        }
        attempts++;
      }

      placed.push({ left, top, width: estimatedWidth, height: estimatedHeight });

      return {
        word,
        count,
        fontSize,
        left,
        top,
        color: `hsl(${(index * 37) % 360}, 65%, 42%)`
      };
    });
  }, [words]);

  const senderEmails = useMemo(() => {
    if (!selectedSender) return [];
    return emailData.filter((email) => {
      const from = (email.from || '').toLowerCase();
      return from.includes(selectedSender.toLowerCase());
    });
  }, [selectedSender, emailData]);

  const topicCounts = useMemo(() => {
    const counts = {};
    senderEmails.forEach((email) => {
      const text = `${email.subject || ''}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ');
      const words = text.split(/\s+/);
      words.forEach((word) => {
        if (
          word.length > 3 &&
          word.length < 18 &&
          /^[a-z]+$/.test(word) &&
          !['from','subject','with','this','that','have','post','auto','token',
            'your','just','click','view','email','http','https','com','www',
            'gmail','nextdoor','more','like','adjust','alerts','message'].includes(word)
        ) {
          counts[word] = (counts[word] || 0) + 1;
        }
      });
    });
    return counts;
  }, [senderEmails]);

  const drilldownItems = useMemo(() => {
    if (!selectedSender) return [];
    const needle = selectedSender.toLowerCase();
    return emailData.filter((email) => {
      const subject = (email.subject || '').toLowerCase();
      const body = (email.body || '').toLowerCase();
      const from = (email.from || '').toLowerCase();
      return subject.includes(needle) || body.includes(needle) || from.includes(needle);
    });
  }, [selectedSender, emailData]);

  if (selectedSender) {
    return (
      <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center' }}>
          Drill Down: {selectedSender} ({words[selectedSender] ?? 0})
        </h2>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button onClick={() => setSelectedSender(null)}>Back to Cloud</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', marginTop: '30px' }}>
          {Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25)
            .map(([topic, count]) => (
              <div
  key={topic}
  onClick={() => setSelectedTopic(topic)}
  style={{
                  fontSize: `${18 + count * 2}px`,
                  fontWeight: 'bold',
                  color: '#444',
                  cursor: 'pointer'
                }}
              >
                {topic}
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
          onClick={() => setSelectedSender(item.word)}
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