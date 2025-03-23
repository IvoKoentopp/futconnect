
import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  format?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  className,
  format: dateFormat = "dd/MM/yyyy",
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(() => 
    value ? format(value, dateFormat, { locale: ptBR }) : ""
  );

  // Update input value when the prop value changes
  React.useEffect(() => {
    if (value) {
      const dateString = format(value, dateFormat, { locale: ptBR });
      setInputValue(dateString);
    } else {
      setInputValue("");
    }
  }, [value, dateFormat]);

  // Function to automatically format the input value
  const formatInput = (value: string): string => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    
    // Apply formatting based on the number of digits
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.substring(0, 2)}/${digits.substring(2)}`;
    } else {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4, 8)}`;
    }
  };

  // Handler for manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Apply automatic formatting
    const formattedValue = formatInput(rawValue);
    setInputValue(formattedValue);
    
    // Try to convert to date if the format is complete
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    
    if (datePattern.test(formattedValue)) {
      try {
        const [day, month, year] = formattedValue.split('/').map(Number);
        
        // Important: DO NOT use new Date() constructor directly as it applies timezone offset
        // Instead, use UTC date constructor and force the time to noon UTC
        // This ensures the date is treated as-is without timezone conversion
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        
        // Now we have a UTC date object that will maintain the exact day regardless of timezone
        onChange(date);
      } catch (error) {
        console.log("Invalid date:", formattedValue);
      }
    } else if (formattedValue === "") {
      onChange(undefined);
    }
  };

  // Function to handle losing focus on the input
  const handleBlur = () => {
    if (inputValue && inputValue.length < 10) {
      setInputValue("");
      onChange(undefined);
    }
  };

  // Handler for calendar selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      // Create a UTC date at noon to avoid any timezone issues
      // This ensures the day component is preserved exactly as selected
      const selectedDate = new Date(
        Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          12, 0, 0, 0
        )
      );
      
      onChange(selectedDate);
    } else {
      onChange(undefined);
    }
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 rounded-r-none"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="rounded-l-none border-l-0"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto z-50" align="end">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleCalendarSelect}
              initialFocus
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
