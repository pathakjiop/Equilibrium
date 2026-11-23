import React from 'react';

export default function ShinyText({ text, disabled = false, speed = 4, className = '', style = {} }) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`shiny-text ${className}`}
      style={{
        display: 'inline-block',
        color: '#8f8f8f',
        backgroundImage: 'linear-gradient(120deg, rgba(23, 23, 23, 0.4) 0%, rgba(23, 23, 23, 0.9) 45%, rgba(0, 112, 243, 0.9) 50%, rgba(23, 23, 23, 0.9) 55%, rgba(23, 23, 23, 0.4) 100%)',
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        animation: disabled ? 'none' : `shine ${animationDuration} linear infinite`,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
