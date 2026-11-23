import React, { useState, useEffect } from 'react';

export default function CountUp({ to, from = 0, duration = 1.2, className = '', style = {} }) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let startTimestamp = null;
    const end = Number(to);
    const start = Number(from);

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (end - start) * easeProgress));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [to, from, duration]);

  return (
    <span className={className} style={style}>
      {count}
    </span>
  );
}
