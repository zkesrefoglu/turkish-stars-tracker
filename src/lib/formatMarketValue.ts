/**
 * Formats a market value number into a human-readable string with € currency.
 * Consistent formatting across the entire website.
 * 
 * @param value - The market value in euros (can be null)
 * @returns Formatted string like "€90M", "€2.5M", "€500K", or "—" for null
 */
export const formatMarketValue = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  
  if (value >= 1000000) {
    const millions = value / 1000000;
    // Show 1 decimal for values < 10M, no decimals for >= 10M
    return millions >= 10 
      ? `€${Math.round(millions)}M`
      : `€${millions.toFixed(1).replace(/\.0$/, '')}M`;
  }
  
  if (value >= 1000) {
    return `€${Math.round(value / 1000)}K`;
  }
  
  return `€${value}`;
};

/**
 * Formats a market value that's already in millions (for static data like leaderboards)
 * 
 * @param valueInMillions - The market value already expressed in millions
 * @returns Formatted string like "€90M" or "€2.5M"
 */
export const formatMarketValueMillions = (valueInMillions: number): string => {
  return valueInMillions >= 10 
    ? `€${Math.round(valueInMillions)}M`
    : `€${valueInMillions.toFixed(1).replace(/\.0$/, '')}M`;
};
