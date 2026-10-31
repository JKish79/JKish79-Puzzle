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
    text: '#F2F4E9',
    tint: '#75D8C1',
    background: '#081F25',
    foreground: '#F2F4E9',
    card: '#103238',
    cardForeground: '#F2F4E9',
    primary: '#75D8C1',
    primaryForeground: '#082329',
    secondary: '#174147',
    secondaryForeground: '#E5F3E9',
    muted: '#12383D',
    mutedForeground: '#9BBDB5',
    accent: '#F1A27F',
    accentForeground: '#271A1A',
    destructive: '#E77F72',
    destructiveForeground: '#201314',
    border: '#285157',
    input: '#285157',
    boardCell: '#12373D',
    emptyCell: '#0E2B31',
    pipe: '#527A78',
    success: '#A9E28C',
    moonlit: '#B8A5F2',
  },
  dark: {
    text: '#F2F4E9',
    tint: '#75D8C1',
    background: '#081F25',
    foreground: '#F2F4E9',
    card: '#103238',
    cardForeground: '#F2F4E9',
    primary: '#75D8C1',
    primaryForeground: '#082329',
    secondary: '#174147',
    secondaryForeground: '#E5F3E9',
    muted: '#12383D',
    mutedForeground: '#9BBDB5',
    accent: '#F1A27F',
    accentForeground: '#271A1A',
    destructive: '#E77F72',
    destructiveForeground: '#201314',
    border: '#285157',
    input: '#285157',
    boardCell: '#12373D',
    emptyCell: '#0E2B31',
    pipe: '#527A78',
    success: '#A9E28C',
    moonlit: '#B8A5F2',
  },
  radius: 8,
};

export default colors;
