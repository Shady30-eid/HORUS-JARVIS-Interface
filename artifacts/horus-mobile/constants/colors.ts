/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#e2fbff',
    tint: '#4cecff',
    background: '#020b10',
    foreground: '#e2fbff',
    card: '#03171f',
    cardForeground: '#d8f6fa',
    primary: '#4cecff',
    primaryForeground: '#020b10',
    secondary: '#0a252e',
    secondaryForeground: '#b2e8ef',
    muted: '#0c222b',
    mutedForeground: '#83aeb8',
    accent: '#153b46',
    accentForeground: '#b6f8ff',
    destructive: '#ff7277',
    destructiveForeground: '#020b10',
    border: '#174957',
    input: '#123a45',
    holo: '#37dff8',
    online: '#36dbad',
    warning: '#f2bf68',
    glass: 'rgba(3, 23, 31, 0.9)',
    glassBorder: 'rgba(76, 236, 255, 0.24)',
    glassStrongBorder: 'rgba(76, 236, 255, 0.5)',
    backdrop: 'rgba(2, 11, 16, 0.48)',
    shadow: 'rgba(21, 198, 222, 0.14)',
  },

  radius: 8,
};

export default colors;
