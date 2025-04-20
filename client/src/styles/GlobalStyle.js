import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  :root {
    --primary-color: ${({ theme }) => theme.colors.primary};
    --primary-dark: ${({ theme }) => theme.colors.primaryDark};
    --primary-light: ${({ theme }) => theme.colors.primaryLight};
    --secondary-color: ${({ theme }) => theme.colors.secondary};
    --success-color: ${({ theme }) => theme.colors.success};
    --danger-color: ${({ theme }) => theme.colors.danger};
    --warning-color: ${({ theme }) => theme.colors.warning};
    --info-color: ${({ theme }) => theme.colors.info};
    --light-color: ${({ theme }) => theme.colors.light};
    --dark-color: ${({ theme }) => theme.colors.textPrimary};
    --text-primary: ${({ theme }) => theme.colors.textPrimary};
    --text-secondary: ${({ theme }) => theme.colors.textSecondary};
    --text-muted: ${({ theme }) => theme.colors.textMuted};
    --border-color: ${({ theme }) => theme.colors.border};
    --background-color: ${({ theme }) => theme.colors.background};
    --white-color: ${({ theme }) => theme.colors.white};
    --box-shadow: ${({ theme }) => theme.shadows.small};
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
  }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.typography.fontFamily};
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: ${({ theme }) => theme.typography.lineHeights.normal};
  }

  h1, h2, h3, h4, h5, h6 {
    margin-bottom: ${({ theme }) => theme.spacing.md};
    font-weight: ${({ theme }) => theme.typography.fontWeights.bold};
    line-height: ${({ theme }) => theme.typography.lineHeights.tight};
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.fontSizes.xxxl};
  }

  h2 {
    font-size: ${({ theme }) => theme.typography.fontSizes.xxl};
  }

  h3 {
    font-size: ${({ theme }) => theme.typography.fontSizes.xl};
  }

  h4 {
    font-size: ${({ theme }) => theme.typography.fontSizes.lg};
  }

  h5 {
    font-size: ${({ theme }) => theme.typography.fontSizes.md};
  }

  h6 {
    font-size: ${({ theme }) => theme.typography.fontSizes.sm};
  }

  p {
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.fast};

    &:hover {
      color: ${({ theme }) => theme.colors.primaryDark};
    }
  }

  button, input, select, textarea {
    font-family: inherit;
    font-size: 100%;
  }
  
  button {
    cursor: pointer;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
  }

  /* Remove focus outlines for mouse users, maintain for keyboard users */
  :focus:not(:focus-visible) {
    outline: none;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  ::selection {
    background-color: ${({ theme }) => theme.colors.primaryLight};
    color: ${({ theme }) => theme.colors.white};
  }

  /* Scrollbar styles - modern browsers only */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.colors.secondary} transparent;
  }

  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  *::-webkit-scrollbar-track {
    background: transparent;
  }

  *::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.secondary};
    border-radius: 20px;
  }

  /* Responsive typography */
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    html {
      font-size: 14px;
    }
  }
`;

export default GlobalStyle; 