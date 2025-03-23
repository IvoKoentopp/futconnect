
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

/**
 * Parses a date string in YYYY-MM-DD format without applying timezone conversions
 * @param dateString Date string in YYYY-MM-DD format from Supabase
 * @returns Date object with the exact day as stored in the database
 */
export function parseExactDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  
  // Split the date string by '-' to get year, month, and day
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a UTC date with noon time to avoid any daylight saving time issues
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Formats a date for display in DD/MM/YYYY format
 * @param date Date object or ISO string
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDisplayDate(date: Date | string | null): string {
  if (!date) return 'Não informada';
  
  if (typeof date === 'string') {
    return formatDisplayDate(parseExactDate(date));
  }
  
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
}

