import React, { useMemo, useRef } from 'react';
import './WordCloud.css';

const WordCloud = ({ 
  data, 
  onWordClick, 
  onWordLongPress,
  selectionMode,
  selectedItems 
}) => {
  const longPressTimer = useRef(null);
  const containerRef = useRef(null);

  const wordLayout = useMemo(() => {
    if (!data || Object.keys(data).length === 0) return [];

    const hasCollision = (x, y, fontSize, existingPositions) => {
      const padding = 10;
      
      for (const pos of existingPositions) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (fontSize + pos.fontSize) / 2 + padding;
        
        if (distance < minDistance) {
          return true;
        }
      }
      
      return false;
    };

    const entries = Object.entries(data);
    const maxCount = Math.max(...entries.map(([_, count]) => count));
    const minCount = Math.min(...entries.map(([_, count]) => count));

    const words = entries.map(([word, count]) => {
      const normalizedCount = (count - minCount) / (maxCount - minCount || 1);
      const fontSize = 20 + (normalizedCount * normalizedCount) * 40;
      
      return {
        text: word,
        count: count,
        fontSize: Math.round(fontSize)
      };
    });

    words.sort((a, b) => b.fontSize - a.fontSize);

    const placed = [];
    const maxWidth = 1200;
    const maxHeight = 600;
    const centerX = maxWidth / 2;
    const centerY = maxHeight / 2 - 50;

    const positions = [];

    words.forEach((word, index) => {
      let x, y;
      let attempts = 0;
      const maxAttempts = 100;

      do {
        if (index === 0) {
          x = centerX;
          y = centerY;
        } else {
          const angle = Math.random() * Math.PI * 2;
          const radiusX = (Math.random() * 0.7 + 0.3) * maxWidth / 2.5;
          const radiusY = (Math.random() * 0.7 + 0.3) * maxHeight / 2.5;
          
          x = centerX + Math.cos(angle) * radiusX;
          y = centerY + Math.sin(angle) * radiusY;
        }

        attempts++;
      } while (
        attempts < maxAttempts &&
        hasCollision(x, y, word.fontSize, positions)
      );

      positions.push({ x, y, fontSize: word.fontSize, width: word.text.length * word.fontSize * 0.6 });
      
      placed.push({
        ...word,
        x,
        y,
        key: word.text
      });
    });

    return placed;
  }, [data]);

  const handleMouseDown = (word) => {
    longPressTimer.current = setTimeout(() => {
      onWordLongPress(word);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleClick = (word, e) => {
    e.stopPropagation();
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    onWordClick(word);
  };

  const handleTouchStart = (word) => {
    longPressTimer.current = setTimeout(() => {
      onWordLongPress(word);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`word-cloud-container ${selectionMode ? 'selection-mode' : ''}`}
    >
      <svg 
        width="1200" 
        height="700" 
        viewBox="0 0 1200 700"
        className="word-cloud-svg"
      >
        {wordLayout.map((word) => (
          <g key={word.key}>
            {selectionMode && (
              <>
                <circle
                  cx={word.x - word.fontSize * 1.2}
                  cy={word.y}
                  r={word.fontSize * 0.4}
                  fill="white"
                  stroke="#333"
                  strokeWidth="2"
                />
                {selectedItems.has(word.text) && (
                  <circle
                    cx={word.x - word.fontSize * 1.2}
                    cy={word.y}
                    r={word.fontSize * 0.25}
                    fill="#333"
                  />
                )}
              </>
            )}
            <text
              x={word.x}
              y={word.y}
              fontSize={word.fontSize}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`cloud-word ${selectedItems.has(word.text) ? 'selected' : ''}`}
              onMouseDown={() => handleMouseDown(word.text)}
              onMouseUp={handleMouseUp}
              onClick={(e) => handleClick(word.text, e)}
              onTouchStart={() => handleTouchStart(word.text)}
              onTouchEnd={handleTouchEnd}
            >
              {word.text}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default WordCloud;