import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BirthdayPerson } from '@/hooks/useMemberBirthdays';
import { Gift, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const monthNames = {
  '1': 'Janeiro',
  '2': 'Fevereiro',
  '3': 'Março',
  '4': 'Abril',
  '5': 'Maio',
  '6': 'Junho',
  '7': 'Julho',
  '8': 'Agosto',
  '9': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
};

interface BirthdayCardProps {
  birthdaysByMonth: Record<string, BirthdayPerson[]>;
  isLoading: boolean;
  currentMonth: number;
}

const BirthdayCard: React.FC<BirthdayCardProps> = ({ 
  birthdaysByMonth, 
  isLoading,
  currentMonth 
}) => {
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonth.toString());
  
  // Get available months with birthdays
  const availableMonths = Object.keys(birthdaysByMonth)
    .filter(month => parseInt(month) >= currentMonth)
    .sort((a, b) => parseInt(a) - parseInt(b));

  const handlePreviousMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const isToday = (day: number, month: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() + 1 === month;
  };

  return (
    <Card className="shadow-md h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-futconnect-600" />
            <div>
              <CardTitle className="text-base md:text-lg">Aniversariantes</CardTitle>
              <CardDescription className="text-xs">do mês</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {monthNames[selectedMonth as keyof typeof monthNames]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Navegação entre meses */}
            <div className="flex items-center justify-between px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousMonth}
                disabled={availableMonths.indexOf(selectedMonth) === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-1">
                {availableMonths.map((month) => (
                  <div
                    key={month}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      month === selectedMonth
                        ? "bg-futconnect-600"
                        : "bg-gray-200 hover:bg-gray-300 cursor-pointer"
                    )}
                    onClick={() => setSelectedMonth(month)}
                  />
                ))}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de aniversariantes */}
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
              {birthdaysByMonth[selectedMonth]?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <Calendar className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm text-center">
                    Nenhum aniversariante<br />em {monthNames[selectedMonth as keyof typeof monthNames]}
                  </p>
                </div>
              ) : (
                birthdaysByMonth[selectedMonth]?.map(person => (
                  <div 
                    key={person.id} 
                    className={cn(
                      "flex items-center p-2 rounded-lg transition-all",
                      isToday(person.day, parseInt(selectedMonth))
                        ? "bg-futconnect-50 border border-futconnect-200"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback className="bg-futconnect-100 text-futconnect-600">
                        {person.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{person.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          Dia {person.day}
                        </p>
                        {isToday(person.day, parseInt(selectedMonth)) && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-futconnect-100 text-futconnect-700">
                            Hoje
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BirthdayCard;
