import React, { useState, useEffect } from 'react';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789//<>{}[]*+=#_';

export default function DecryptedText({
  text,
  speed = 40,
  maxIterations = 10,
  className = '',
  style = {},
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '/') return char;
            if (index < iteration) {
              return text[index];
            }
            return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        clearInterval(interval);
      }
      iteration += Math.max(1, text.length / maxIterations);
    }, speed);

    return () => clearInterval(interval);
  }, [text, isHovering, maxIterations, speed]);

  return (
    <span
      className={`decrypted-text ${className}`}
      onMouseEnter={() => setIsHovering(prev => !prev)}
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em',
        cursor: 'default',
        ...style,
      }}
    >
      {displayText}
    </span>
  );
}
