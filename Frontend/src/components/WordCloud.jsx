import React, { useState } from 'react';

function WordCloud({ words }) {
  const [selectedWord, setSelectedWord] = useState(null);

  const containerWidth = 700;
  const containerHeight = 350;
  
  // A helper to check if a new word overlaps with existing ones
  const isOverlapping = (newRect, placedRects) => {
    return placedRects.some(rect => 
      !(newRect.right < rect.left || newRect.left > rect.right || 
        newRect.bottom < rect.top || newRect.top > rect.bottom)
    );
  };

  const placedWords = [];
  const placedRects = [];

  // Sort words by count so big ones get placed first (more important!)
  const sortedWords = Object.entries(words).sort((a, b) => b[1] - a[1]);

  sortedWords.forEach(([word, count]) => {
    const fontSize = Math.min(count * 6 + 18, 55);
    const width = word.length * (fontSize * 0.6);
    const height = fontSize;

    let left, top, attempts = 0;
    let overlapping = true;

    // Try to find a spot that doesn't overlap
    while (overlapping && attempts < 100) {
      left = 50 + Math.random() * (containerWidth - width - 100);
      top = 50 + Math.random() * (containerHeight - height - 100);
      
      const newRect = { left, top, right: left + width, bottom: top + height };
      overlapping = isOverlapping(newRect, placedRects);
      
      if (!overlapping) {
        placedRects.push(newRect);
        placedWords.push({ word, fontSize, left, top, color: `hsl(${Math.random() * 360}, 70%, 40%)` });
      }
      attempts++;
    }
  });

  if (selectedWord) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Drill Down: {selectedWord}</h2>
        <button onClick={() => setSelectedWord(null)}>Back to Cloud</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: `${containerWidth}px`, height: `${containerHeight}px`, margin: '40px auto' }}>
      {placedWords.map((item) => (
        <span key={item.word} onClick={() => setSelectedWord(item.word)} 
          style={{ position: 'absolute', left: `${item.left}px`, top: `${item.top}px`, 
            fontSize: `${item.fontSize}px`, color: item.color, cursor: 'pointer', fontWeight: 'bold' }}>
          {item.word}
        </span>
      ))}
    </div>
  );
}

export default WordCloud;