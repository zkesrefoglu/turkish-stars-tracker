/**
 * Add cache-busting timestamp to image URLs to force fresh loads
 * Prevents browser from serving stale cached images
 */
export const bustImageCache = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // If URL already has cache-busting parameter, update it
  // Handle ?t= and &t= separately to preserve the correct separator
  if (url.includes('?t=')) {
    return url.replace(/\?t=\d+/, `?t=${Date.now()}`);
  }
  if (url.includes('&t=')) {
    return url.replace(/&t=\d+/, `&t=${Date.now()}`);
  }
  
  // Add cache-busting parameter
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

// Placeholder image for broken/missing news images
export const NEWS_PLACEHOLDER = '/placeholder.svg';

// Default fallback handler for images
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc?: string
) => {
  const target = e.currentTarget;
  
  // Prevent infinite loop if fallback also fails
  if (target.dataset.fallbackApplied === 'true') {
    target.style.display = 'none';
    return;
  }
  
  target.dataset.fallbackApplied = 'true';
  
  if (fallbackSrc) {
    target.src = fallbackSrc;
  } else {
    // Hide the image completely if no fallback
    target.style.display = 'none';
  }
};

// Check if an image URL is likely valid (basic validation)
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  
  // Check for common broken image indicators
  if (url.includes('undefined') || url.includes('null')) return false;
  
  // Check for minimum URL length
  if (url.length < 10) return false;
  
  return true;
};
