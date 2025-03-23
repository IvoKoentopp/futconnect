
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BirthdayPerson } from '@/hooks/useMemberBirthdays';
import { Gift, Calendar } from 'lucide-react';
import { parseExactDate, formatDisplayDate } from '@/lib/utils';

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
  // Get first month with birthdays to set as default tab
  const availableMonths = Object.keys(birthdaysByMonth).filter(
    month => birthdaysByMonth[month].length > 0
  );
  
  const defaultTab = availableMonths.length > 0 
    ? availableMonths[0] 
    : currentMonth.toString();

  return (
    <Card className="shadow-md h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg flex items-center">
          <Gift className="mr-2 h-5 w-5 text-futconnect-600" />
          Aniversariantes
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Aniversariantes do clube no ano atual
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-futconnect-600"></div>
          </div>
        ) : (
          <Tabs defaultValue={defaultTab} className="w-full">
            <div className="mb-4">
              <TabsList className="grid grid-cols-3 w-full sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4">
                {Object.keys(birthdaysByMonth)
                  .filter(month => parseInt(month) >= currentMonth)
                  .map(month => (
                    <TabsTrigger 
                      key={month} 
                      value={month}
                      className="text-xs py-1.5 px-2"
                    >
                      {monthNames[month as keyof typeof monthNames]}
                    </TabsTrigger>
                  ))}
              </TabsList>
            </div>
            
            <div className="mt-4 pt-2">
              {Object.keys(birthdaysByMonth)
                .filter(month => parseInt(month) >= currentMonth)
                .map(month => (
                  <TabsContent key={month} value={month} className="min-h-[200px]">
                    {birthdaysByMonth[month].length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                        <Calendar className="h-10 w-10 mb-2 opacity-20" />
                        <p>Nenhum aniversariante em {monthNames[month as keyof typeof monthNames]}</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                        {birthdaysByMonth[month].map(person => (
                          <div key={person.id} className="flex items-center py-2 border-b last:border-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-futconnect-100 flex items-center justify-center text-futconnect-600 font-bold mr-3">
                              {person.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{person.name}</p>
                              <p className="text-xs text-gray-500">
                                Dia {person.day} de {monthNames[month as keyof typeof monthNames]}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default BirthdayCard;
