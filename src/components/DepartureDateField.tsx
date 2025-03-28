import React from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";

const departureDateSchema = z.object({
  departureDate: z.date().nullable()
});

interface DepartureDateFormValues {
  departureDate: Date | null;
}

interface DepartureDateFieldProps {
  form: ReturnType<typeof useForm<DepartureDateFormValues>>;
  isViewOnly?: boolean;
  defaultValue?: Date | null;
  onChange?: (date: Date | null) => void;
}

export function DepartureDateField({
  form,
  isViewOnly = false,
  defaultValue,
  onChange
}: DepartureDateFieldProps) {
  return (
    <FormField
      control={form.control}
      name="departureDate"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Data de Saída</FormLabel>
          {isViewOnly ? (
            <div className="p-2 border rounded-md bg-gray-50">
              {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Não informada"}
            </div>
          ) : (
            <FormControl>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <DateInput
                  value={field.value}
                  onChange={(date) => {
                    field.onChange(date);
                    if (onChange) onChange(date);
                  }}
                  placeholder="DD/MM/AAAA"
                  className="pl-9"
                />
              </div>
            </FormControl>
          )}
          <FormDescription>
            Data em que o sócio saiu do clube
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
