/**
 * Format date to dd/mm/yy format
 * @param dateString - ISO date string (e.g., "2026-04-08T00:00:00")
 * @returns Formatted date string (e.g., "08/04/26")
 */
export const formatDateToDDMMYY = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format date to dd/mm/yyyy format
 * @param dateString - ISO date string (e.g., "2026-04-08T00:00:00")
 * @returns Formatted date string (e.g., "08/04/2026")
 */
export const formatDateToDDMMYYYY = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};
