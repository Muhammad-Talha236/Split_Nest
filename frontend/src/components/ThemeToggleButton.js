import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggleButton = ({ compact = false, style = {} }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        padding: compact ? '7px 12px' : '8px 14px',
        fontSize: compact ? 12 : 13,
        fontWeight: 700,
        ...style,
      }}
    >
      <span className="theme-toggle__swatch" />
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};

export default ThemeToggleButton;
