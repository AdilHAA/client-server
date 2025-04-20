const theme = {
  colors: {
    primary: '#2c7be5',
    primaryDark: '#1a68d1',
    primaryLight: '#6ea8ff',
    secondary: '#6e84a3',
    success: '#00d97e',
    danger: '#e63757',
    warning: '#f6c343',
    info: '#39afd1',
    light: '#f9fbfd',
    dark: '#12263f',
    textPrimary: '#12263f',
    textSecondary: '#6e84a3',
    textMuted: '#95aac9',
    border: '#e3ebf6',
    background: '#f5f8fa',
    white: '#ffffff',
    black: '#000000',
  },
  shadows: {
    small: '0 2px 5px rgba(18, 38, 63, 0.07)',
    medium: '0 0.75rem 1.5rem rgba(18, 38, 63, 0.03)',
    large: '0 1rem 2rem rgba(18, 38, 63, 0.05)',
  },
  breakpoints: {
    xs: '320px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px
      lg: '1.25rem',    // 20px
      xl: '1.5rem',     // 24px
      xxl: '2rem',      // 32px
      xxxl: '2.5rem',   // 40px
    },
    fontWeights: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeights: {
      none: 1,
      tight: 1.25,
      normal: 1.5,
      loose: 2,
    },
  },
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    xxl: '3rem',      // 48px
  },
  border: {
    radius: {
      sm: '0.25rem',  // 4px
      md: '0.5rem',   // 8px
      lg: '0.75rem',  // 12px
      pill: '50rem',  // Pill shape
      circle: '50%',  // Circle
    },
  },
  transitions: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
  zIndex: {
    negative: -1,
    zero: 0,
    low: 10,
    medium: 100,
    high: 1000,
    highest: 10000,
  },
};

export default theme; 