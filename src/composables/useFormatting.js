/**
 * Composable for common formatting functions
 */
export function useFormatting() {
  /**
   * Format a number as currency (JMD by default)
   */
  const formatCurrency = (amount, currency = 'JMD') => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  /**
   * Format a date string
   */
  const formatDate = (dateString, options = {}) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    const defaultOptions = {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      ...options
    };

    return date.toLocaleDateString('en-US', defaultOptions);
  };

  /**
   * Format a date with time
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  /**
   * Format weight with unit
   */
  const formatWeight = (weight, unit = 'lb') => {
    if (!weight && weight !== 0) return '';
    return `${Number(weight).toFixed(2)} ${unit}`;
  };

  return {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatWeight
  };
}
