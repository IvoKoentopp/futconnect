import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { 
  Award, 
  Calendar, 
  PlusCircle, 
  PenLine, 
  Trash2, 
  Search,
  Loader2,
  Shuffle,
  ListPlus,
  Filter,
  Printer
} from 'lucide-react';
import { DateInput } from '@/components/ui/date-input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseExactDate, formatDisplayDate } from '@/lib/utils';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, addMonths, format, getDay, setDate, parseISO, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Define types
interface SponsorEvent {
  id: string;
  date: string; // Use string format YYYY-MM-DD
  event_type: string;
  sponsor_id: string;
  sponsor_name: string;
  description: string | null;
  status: 'Agendado' | 'Realizado';
  created_at: string;
}

interface Member {
  id: string;
  name: string;
  nickname: string | null;
}

interface EventType {
  id: string;
  name: string;
}

// Schema for form validation
const eventSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  event_type: z.string().min(1, 'Tipo de evento é obrigatório'),
  sponsor_id: z.string().uuid('Selecione um patrocinador'),
  description: z.string().optional(),
  status: z.enum(['Agendado', 'Realizado'])
});

type EventFormData = z.infer<typeof eventSchema>;

// Days of the week in Portuguese for selection
const DAYS_OF_WEEK = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' }
];

// Week of month options
const WEEK_OF_MONTH = [
  { value: '1', label: 'Primeira' },
  { value: '2', label: 'Segunda' },
  { value: '3', label: 'Terceira' },
  { value: '4', label: 'Quarta' },
  { value: '5', label: 'Última' }
];

// Periodicity options
const PERIODICITY_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'specific_week', label: 'Semana específica do mês' }
];

// Number of events to generate
const NUMBER_OF_EVENTS_OPTIONS = [
  { value: '3', label: '3 eventos' },
  { value: '6', label: '6 eventos' },
  { value: '12', label: '12 eventos' }
];

// Meses em português
const MONTHS = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
  { value: 'all', label: 'Todos' }
];

const Sponsors = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewEventType, setIsNewEventType] = useState(false);
  const [newEventTypeName, setNewEventTypeName] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SponsorEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRandomEventDialogOpen, setIsRandomEventDialogOpen] = useState(false);
  const [randomEventType, setRandomEventType] = useState('');
  const [randomSponsorId, setRandomSponsorId] = useState('');
  const [isBatchEventDialogOpen, setIsBatchEventDialogOpen] = useState(false);
  const [batchEventType, setBatchEventType] = useState('');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  
  // Novos estados para filtros de ano e mês
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  // New state variables for advanced batch event generation
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [dayOfWeek, setDayOfWeek] = useState<string>('1'); // Default to Monday
  const [periodicity, setPeriodicity] = useState<string>('monthly');
  const [weekOfMonth, setWeekOfMonth] = useState<string>('1'); // Default to first week
  const [numberOfEvents, setNumberOfEvents] = useState<string>('6'); // Default to 6 events
  
  // Reference to the events table for printing
  const eventsTableRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clubId = user?.activeClub?.id || '';

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors }
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      status: 'Agendado'
    }
  });
  
  // Fetch sponsor events
  const { 
    data: eventsData = [], 
    isLoading: isLoadingEvents,
    isError: isEventsError
  } = useQuery({
    queryKey: ['sponsorEvents', clubId],
    queryFn: async () => {
      // First get the sponsor events
      const { data: eventsData, error: eventsError } = await supabase
        .from('sponsor_events')
        .select(`
          id,
          date,
          event_type,
          sponsor_id,
          description,
          status,
          created_at
        `)
        .eq('club_id', clubId)
        .order('date', { ascending: false });
        
      if (eventsError) throw eventsError;
      
      // Now fetch the member data for each sponsor_id
      const events = await Promise.all(
        eventsData.map(async (event) => {
          const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select('name, nickname')
            .eq('id', event.sponsor_id)
            .single();
          
          if (memberError) {
            console.error("Error fetching member data:", memberError);
            return {
              ...event,
              sponsor_name: 'Não informado'
            };
          }
          
          return {
            ...event,
            sponsor_name: memberData?.nickname || memberData?.name || 'Não informado'
          };
        })
      );
      
      return events as SponsorEvent[];
    },
    enabled: !!clubId
  });
  
  // Determinar os anos disponíveis para filtro com base nos eventos
  useEffect(() => {
    if (eventsData.length > 0) {
      const years = eventsData.map(event => getYear(parseISO(event.date)));
      const uniqueYears = Array.from(new Set(years)).sort();
      setAvailableYears(uniqueYears);
      
      // Se não houver ano selecionado, usar 'all'
      if (selectedYear === 'all') {
        setSelectedYear('all');
      }
    }
  }, [eventsData]);
  
  // Fetch event types
  const { 
    data: eventTypes = [], 
    isLoading: isLoadingEventTypes 
  } = useQuery({
    queryKey: ['eventTypes', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_types')
        .select('id, name')
        .eq('club_id', clubId);
        
      if (error) throw error;
      return data;
    },
    enabled: !!clubId
  });
  
  // Fetch active members for sponsor dropdown
  const { 
    data: activeMembers = [], 
    isLoading: isLoadingMembers 
  } = useQuery({
    queryKey: ['activeMembers', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, nickname')
        .eq('club_id', clubId)
        .eq('status', 'Ativo')
        .order('name');
        
      if (error) throw error;
      return data;
    },
    enabled: !!clubId
  });

  // Create event type mutation
  const createEventTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('event_types')
        .insert([{ name, club_id: clubId }])
        .select()
        .single();
        
      if (error) throw error;
      return data as EventType;
    },
    onSuccess: (newEventType) => {
      queryClient.setQueryData(['eventTypes', clubId], 
        (oldData: EventType[] | undefined) => [...(oldData || []), newEventType]);
      
      setNewEventTypeName('');
      setIsNewEventType(false);
      
      // Set the form value to the new event type
      setValue('event_type', newEventType.name);
      
      toast({
        title: 'Tipo de evento criado',
        description: 'O novo tipo de evento foi criado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error creating event type:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o tipo de evento.',
        variant: 'destructive',
      });
    }
  });
  
  // Create sponsor event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventFormData) => {
      const { data, error } = await supabase
        .from('sponsor_events')
        .insert([{
          club_id: clubId,
          date: eventData.date,
          event_type: eventData.event_type,
          sponsor_id: eventData.sponsor_id,
          description: eventData.description || null,
          status: eventData.status
        }])
        .select();
        
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsorEvents'] });
      
      toast({
        title: 'Evento criado',
        description: 'O evento foi criado com sucesso.',
      });
      
      setIsDialogOpen(false);
      reset();
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o evento.',
        variant: 'destructive',
      });
    }
  });
  
  // Function to calculate dates based on the configuration
  const calculateEventDates = () => {
    if (!startDate) return [];
    
    let dates: Date[] = [];
    const dayOfWeekNumber = parseInt(dayOfWeek, 10);
    const numberOfEventsNumber = parseInt(numberOfEvents, 10);
    
    // Calculate dates based on periodicity
    switch (periodicity) {
      case 'weekly':
        // Weekly events on the specified day of the week
        let currentDate = new Date(startDate);
        
        // Adjust to the correct day of the week if needed
        const currentDay = getDay(currentDate);
        if (currentDay !== dayOfWeekNumber) {
          // Calculate days to add to reach the target day of week
          const daysToAdd = (7 + dayOfWeekNumber - currentDay) % 7;
          currentDate = addDays(currentDate, daysToAdd);
        }
        
        // Generate dates for each week
        for (let i = 0; i < numberOfEventsNumber; i++) {
          const eventDate = new Date(currentDate);
          dates.push(addDays(eventDate, i * 7));
        }
        break;
        
      case 'biweekly':
        // Bi-weekly events on the specified day of the week
        let biWeeklyDate = new Date(startDate);
        
        // Adjust to the correct day of the week if needed
        const biWeeklyCurrentDay = getDay(biWeeklyDate);
        if (biWeeklyCurrentDay !== dayOfWeekNumber) {
          // Calculate days to add to reach the target day of week
          const daysToAdd = (7 + dayOfWeekNumber - biWeeklyCurrentDay) % 7;
          biWeeklyDate = addDays(biWeeklyDate, daysToAdd);
        }
        
        // Generate dates for each bi-weekly interval
        for (let i = 0; i < numberOfEventsNumber; i++) {
          const eventDate = new Date(biWeeklyDate);
          dates.push(addDays(eventDate, i * 14));
        }
        break;
        
      case 'monthly':
        // Monthly events on the specified day of week (e.g., first Monday of each month)
        for (let i = 0; i < numberOfEventsNumber; i++) {
          // Start with the first day of the month
          let monthStart = new Date(startDate);
          monthStart = addMonths(monthStart, i);
          monthStart.setDate(1);
          
          // Find the first occurrence of the target day in the month
          let firstDayOfMonth = getDay(monthStart);
          let daysUntilFirstOccurrence = (7 + dayOfWeekNumber - firstDayOfMonth) % 7;
          let firstOccurrence = addDays(monthStart, daysUntilFirstOccurrence);
          
          dates.push(firstOccurrence);
        }
        break;
        
      case 'specific_week':
        // Events on a specific week of the month (e.g., 2nd Monday of the month)
        for (let i = 0; i < numberOfEventsNumber; i++) {
          // Start with first day of the month
          let monthStart = new Date(startDate);
          monthStart = addMonths(monthStart, i);
          monthStart.setDate(1);
          
          // Find the first occurrence of the target day in the month
          let firstDayOfMonth = getDay(monthStart);
          let daysUntilFirstOccurrence = (7 + dayOfWeekNumber - firstDayOfMonth) % 7;
          let firstOccurrence = addDays(monthStart, daysUntilFirstOccurrence);
          
          // Calculate the target week of the month
          const weekOfMonthNumber = parseInt(weekOfMonth, 10);
          
          // For the last week, we need a different approach
          if (weekOfMonthNumber === 5) {
            // Start from the end of the month and work backwards
            const nextMonth = addMonths(monthStart, 1);
            const lastDayOfMonth = addDays(nextMonth, -1);
            
            // Find the last occurrence of the target day in the month
            let lastDayOfWeek = getDay(lastDayOfMonth);
            let daysFromLastOccurrence = (lastDayOfWeek - dayOfWeekNumber + 7) % 7;
            
            // Last occurrence of the day in the month
            let lastOccurrence = addDays(lastDayOfMonth, -daysFromLastOccurrence);
            dates.push(lastOccurrence);
          } else {
            // Add the required number of weeks (subtract 1 because firstOccurrence is already the 1st week)
            dates.push(addDays(firstOccurrence, (weekOfMonthNumber - 1) * 7));
          }
        }
        break;
    }
    
    return dates;
  };
  
  // Enhanced batch event creation with scheduled dates
  const createBatchEventsMutation = useMutation({
    mutationFn: async ({ eventType, dates }: { eventType: string, dates: Date[] }) => {
      // 1. Get all members who don't have any events yet
      const { data: existingEvents } = await supabase
        .from('sponsor_events')
        .select('sponsor_id')
        .eq('club_id', clubId);
      
      // Extract sponsor IDs
      const sponsorsWithEvents = existingEvents?.map(event => event.sponsor_id) || [];
      
      // Filter active members to find those without events
      const membersWithoutEvents = activeMembers.filter(
        member => !sponsorsWithEvents.includes(member.id)
      );
      
      if (membersWithoutEvents.length === 0) {
        return { message: "Todos os sócios já possuem eventos", count: 0 };
      }
      
      // 2. Create events for members, one event per date
      const eventsToCreate = [];
      const numberOfEventsToCreate = Math.min(dates.length, parseInt(numberOfEvents, 10));
      
      // Shuffle the members to randomly select them
      const shuffledMembers = [...membersWithoutEvents].sort(() => Math.random() - 0.5);
      
      // For each date, select a random member who doesn't have events yet
      for (let i = 0; i < numberOfEventsToCreate; i++) {
        // If we've run out of members without events, break the loop
        if (shuffledMembers.length === 0) break;
        
        // Get the next date from our calculated dates
        const currentDate = dates[i];
        
        // Select a random member from our shuffled list
        const selectedMember = shuffledMembers.shift();
        
        if (selectedMember) {
          eventsToCreate.push({
            club_id: clubId,
            date: format(currentDate, 'yyyy-MM-dd'),
            event_type: eventType,
            sponsor_id: selectedMember.id,
            status: 'Agendado' as const,
            description: null
          });
        }
      }
      
      // No events to create
      if (eventsToCreate.length === 0) {
        return { message: "Não foi possível criar eventos", count: 0 };
      }
      
      // Insert the events
      const { data, error } = await supabase
        .from('sponsor_events')
        .insert(eventsToCreate)
        .select();
        
      if (error) throw error;
      
      return { 
        message: `${eventsToCreate.length} eventos criados com sucesso`, 
        count: eventsToCreate.length 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sponsorEvents'] });
      
      toast({
        title: 'Eventos em lote criados',
        description: result.message,
      });
      
      setIsBatchEventDialogOpen(false);
      setBatchEventType('');
      setIsGeneratingBatch(false);
      setStartDate(undefined);
      setDayOfWeek('1');
      setPeriodicity('monthly');
      setWeekOfMonth('1');
      setNumberOfEvents('6');
    },
    onError: (error) => {
      console.error('Error creating batch events:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar os eventos em lote.',
        variant: 'destructive',
      });
      setIsGeneratingBatch(false);
    }
  });
  
  // Update sponsor event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, eventData }: { id: string; eventData: EventFormData }) => {
      const { data, error } = await supabase
        .from('sponsor_events')
        .update({
          date: eventData.date,
          event_type: eventData.event_type,
          sponsor_id: eventData.sponsor_id,
          description: eventData.description || null,
          status: eventData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsorEvents'] });
      
      toast({
        title: 'Evento atualizado',
        description: 'O evento foi atualizado com sucesso.',
      });
      
      setIsDialogOpen(false);
      setSelectedEvent(null);
      reset();
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o evento.',
        variant: 'destructive',
      });
    }
  });
  
  // Delete sponsor event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sponsor_events')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsorEvents'] });
      
      toast({
        title: 'Evento excluído',
        description: 'O evento foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o evento.',
        variant: 'destructive',
      });
    }
  });
  
  // Handle opening the dialog for a new event
  const handleNewEvent = () => {
    setSelectedEvent(null);
    reset({
      date: '',
      event_type: '',
      sponsor_id: '',
      description: '',
      status: 'Agendado'
    });
    setIsDialogOpen(true);
  };
  
  // Handle opening the dialog for editing an event
  const handleEditEvent = (event: SponsorEvent) => {
    setSelectedEvent(event);
    reset({
      date: event.date,
      event_type: event.event_type,
      sponsor_id: event.sponsor_id,
      description: event.description || '',
      status: event.status
    });
    setIsDialogOpen(true);
  };
  
  // Handle deleting an event
  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      deleteEventMutation.mutate(id);
    }
  };
  
  // Handle form submission
  const onSubmit = (data: EventFormData) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, eventData: data });
    } else {
      createEventMutation.mutate(data);
    }
  };
  
  // Handle creating a new event type
  const handleNewEventTypeSubmit = () => {
    if (newEventTypeName.trim()) {
      createEventTypeMutation.mutate(newEventTypeName.trim());
    }
  };
  
  // Open batch event dialog with new settings
  const handleOpenBatchEventDialog = async () => {
    setIsBatchEventDialogOpen(true);
    setBatchEventType('');
    setStartDate(new Date());
    setDayOfWeek('1'); // Default to Monday
    setPeriodicity('monthly');
    setWeekOfMonth('1');
    setNumberOfEvents('6');
  };
  
  // Generate batch events with calculated dates
  const handleGenerateBatchEvents = async () => {
    if (!batchEventType) {
      toast({
        title: 'Erro',
        description: 'Selecione um tipo de evento.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!startDate) {
      toast({
        title: 'Erro',
        description: 'Selecione uma data inicial.',
        variant: 'destructive',
      });
      return;
    }
    
    const calculatedDates = calculateEventDates();
    
    if (calculatedDates.length === 0) {
      toast({
        title: 'Erro',
        description: 'Não foi possível calcular as datas dos eventos.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsGeneratingBatch(true);
    createBatchEventsMutation.mutate({ 
      eventType: batchEventType, 
      dates: calculatedDates 
    });
  };
  
  // Open random event dialog
  const handleOpenRandomEventDialog = async () => {
    setIsRandomEventDialogOpen(true);
    setRandomEventType('');
    setRandomSponsorId('');
  };
  
  // Select random sponsor without events
  const handleSelectRandomSponsor = async () => {
    if (!randomEventType) {
      toast({
        title: 'Erro',
        description: 'Selecione um tipo de evento.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Get all existing sponsor IDs that have events
      const { data: existingEvents } = await supabase
        .from('sponsor_events')
        .select('sponsor_id')
        .eq('club_id', clubId);
      
      // Extract sponsor IDs
      const sponsorsWithEvents = existingEvents?.map(event => event.sponsor_id) || [];
      
      // Filter active members to find those without events
      const eligibleSponsors = activeMembers.filter(
        member => !sponsorsWithEvents.includes(member.id)
      );
      
      if (eligibleSponsors.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Todos os sócios ativos já possuem eventos agendados ou realizados.',
        });
        return;
      }
      
      // Select a random sponsor
      const randomIndex = Math.floor(Math.random() * eligibleSponsors.length);
      const randomSponsor = eligibleSponsors[randomIndex];
      
      setRandomSponsorId(randomSponsor.id);
      
      // Show success message
      toast({
        title: 'Patrocinador sorteado',
        description: `${randomSponsor.nickname || randomSponsor.name} foi selecionado para o evento.`,
      });
      
    } catch (error) {
      console.error('Error selecting random sponsor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sortear um patrocinador.',
        variant: 'destructive',
      });
    }
  };
  
  // Create event for random sponsor
  const handleCreateRandomEvent = () => {
    if (!randomEventType || !randomSponsorId) {
      toast({
        title: 'Erro',
        description: 'Selecione um tipo de evento e sorteie um patrocinador.',
        variant: 'destructive',
      });
      return;
    }
    
    // Setup data for the new event form
    reset({
      date: '',
      event_type: randomEventType,
      sponsor_id: randomSponsorId,
      description: '',
      status: 'Agendado'
    });
    
    // Close random event dialog and open regular event dialog
    setIsRandomEventDialogOpen(false);
    setIsDialogOpen(true);
  };
  
  // Filtrar eventos com base nos filtros de ano, mês e termo de busca
  const filteredEvents = eventsData.filter(event => {
    const searchTermLower = searchTerm.toLowerCase();
    const eventDate = parseISO(event.date);
    const eventYear = getYear(eventDate);
    const eventMonth = getMonth(eventDate);
    
    // Filtro por texto - agora buscando em todos os campos de texto
    const matchesSearch = 
      event.event_type.toLowerCase().includes(searchTermLower) ||
      event.sponsor_name.toLowerCase().includes(searchTermLower) ||
      event.status.toLowerCase().includes(searchTermLower) ||
      (event.description && event.description.toLowerCase().includes(searchTermLower)) ||
      formatDisplayDate(event.date).toLowerCase().includes(searchTermLower);
    
    // Filtro por ano
    const matchesYear = selectedYear === 'all' || eventYear.toString() === selectedYear;
    
    // Filtro por mês
    const matchesMonth = selectedMonth === 'all' || eventMonth.toString() === selectedMonth;
    
    return matchesSearch && matchesYear && matchesMonth;
  });
  
  // Format date for display in the UI for preview
  const formatDatePreview = (date: Date) => {
    return format(date, "dd/MM/yyyy (EEEE)", { locale: ptBR });
  };
  
  // Function to print the events list
  const handlePrintEvents = () => {
    // Save current body style
    const originalBodyStyle = document.body.style.cssText;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão permitidos.',
        variant: 'destructive',
      });
      return;
    }
    
    // Get the current date and time for the report header
    const currentDate = new Date();
    const formattedDate = format(currentDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    
    // Get table content
    const tableContent = eventsTableRef.current?.innerHTML || '';
    
    // Write the print-friendly HTML to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Listagem de Eventos - FutConnect</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            
            .report-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #ddd;
            }
            
            .report-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #333;
            }
            
            .report-subtitle {
              font-size: 14px;
              color: #666;
            }
            
            .club-name {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 5px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            
            th {
              background-color: #f4f4f4;
              padding: 8px;
              text-align: left;
              font-weight: bold;
              border-bottom: 2px solid #ddd;
            }
            
            td {
              padding: 8px;
              border-bottom: 1px solid #ddd;
            }
            
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            .report-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 15px;
              }
              
              .no-print {
                display: none !important;
              }
            }
            
            .status-badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
            }
            
            .status-agendado {
              background-color: #e6f0fd;
              color: #1e60c9;
            }
            
            .status-realizado {
              background-color: #e6f9f0;
              color: #0d7741;
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="report-title">Listagem de Eventos de Patrocinadores</div>
            <div class="report-subtitle">Relatório gerado em ${formattedDate}</div>
            <div class="club-name">${user?.activeClub?.name || 'FutConnect'}</div>
          </div>
          
          ${tableContent}
          
          <div class="report-footer">
            <p>© ${new Date().getFullYear()} FutConnect - Todos os direitos reservados</p>
            <p>Relatório gerado automaticamente pelo sistema</p>
          </div>
          
          <script>
            // Auto print and close if needed
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    
    // Finish writing and focus the print window
    printWindow.document.close();
    printWindow.focus();
    
    // Restore original body style
    document.body.style.cssText = originalBodyStyle;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patrocinadores</h1>
          <p className="text-gray-500">
            Gerencie eventos e patrocinadores do clube
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="print"
            onClick={handlePrintEvents}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir listagem de eventos
          </Button>
          <Button 
            variant="outline"
            onClick={handleOpenBatchEventDialog}
            className="bg-white hover:bg-gray-100"
          >
            <ListPlus className="mr-2 h-4 w-4" />
            Gerar Lista
          </Button>
          <Button 
            variant="outline"
            onClick={handleOpenRandomEventDialog}
            className="bg-white hover:bg-gray-100"
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Sortear
          </Button>
          <Button 
            className="bg-futconnect-600 hover:bg-futconnect-700"
            onClick={handleNewEvent}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Evento
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Eventos</CardTitle>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Filtros de Ano e Mês */}
              <div className="flex gap-2 w-full md:w-auto">
                <div className="w-full md:w-40">
                  <Select
                    value={selectedYear}
                    onValueChange={setSelectedYear}
                  >
                    <SelectTrigger className="h-9">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Anos</SelectItem>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-40">
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger className="h-9">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(month => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Campo de busca */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar eventos..."
                  className="pl-9 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-500">Carregando eventos...</span>
            </div>
          ) : isEventsError ? (
            <div className="py-8 text-center text-red-500">
              <p>Erro ao carregar eventos.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['sponsorEvents'] })}
              >
                Tentar novamente
              </Button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Award className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">Nenhum evento encontrado.</p>
              <p className="mt-1">Comece adicionando um novo evento para seus patrocinadores.</p>
            </div>
          ) : (
            <div className="overflow-x-auto" id="events-table" ref={eventsTableRef}>
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo de Evento</TableHead>
                    <TableHead>Patrocinador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right no-print">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} className="hover:bg-gray-50">
                      <TableCell>
                        {formatDisplayDate(event.date)}
                      </TableCell>
                      <TableCell>{event.event_type}</TableCell>
                      <TableCell>{event.sponsor_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.status === 'Realizado' 
                            ? 'bg-green-100 text-green-800 status-realizado' 
                            : 'bg-blue-100 text-blue-800 status-agendado'
                        }`}>
                          {event.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right no-print">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEvent(event)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          >
                            <PenLine className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-100"
                            disabled={deleteEventMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog for adding/editing events */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Editar Evento' : 'Novo Evento'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event_type">Tipo de Evento</Label>
              {isNewEventType ? (
                <div className="flex space-x-2">
                  <Input
                    id="new_event_type"
                    value={newEventTypeName}
                    onChange={(e) => setNewEventTypeName(e.target.value)}
                    placeholder="Digite o novo tipo de evento"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleNewEventTypeSubmit}
                    disabled={!newEventTypeName.trim() || createEventTypeMutation.isPending}
                  >
                    {createEventTypeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Adicionar'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Select
                    onValueChange={(value) => setValue('event_type', value)}
                    value={watch('event_type')}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione o tipo de evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingEventTypes ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          <span className="ml-2 text-gray-500">Carregando...</span>
                        </div>
                      ) : eventTypes.length === 0 ? (
                        <div className="py-2 text-center text-gray-500">
                          <p>Nenhum tipo de evento encontrado.</p>
                        </div>
                      ) : (
                        eventTypes.map((eventType) => (
                          <SelectItem key={eventType.id} value={eventType.name}>
                            {eventType.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewEventType(true)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {errors.event_type && (
                <p className="text-sm text-red-500">{errors.event_type.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sponsor_id">Patrocinador</Label>
              <Select
                onValueChange={(value) => setValue('sponsor_id', value)}
                value={watch('sponsor_id')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o patrocinador" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingMembers ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="ml-2 text-gray-500">Carregando...</span>
                    </div>
                  ) : activeMembers.length === 0 ? (
                    <div className="py-2 text-center text-gray-500">
                      <p>Nenhum membro ativo encontrado.</p>
                    </div>
                  ) : (
                    activeMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.nickname || member.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.sponsor_id && (
                <p className="text-sm text-red-500">{errors.sponsor_id.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descrição do evento"
                {...register('description')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(value) => setValue('status', value as 'Agendado' | 'Realizado')}
                value={watch('status')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendado">Agendado</SelectItem>
                  <SelectItem value="Realizado">Realizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-futconnect-600 hover:bg-futconnect-700"
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
              >
                {createEventMutation.isPending || updateEventMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {selectedEvent ? 'Atualizar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for random event */}
      <Dialog open={isRandomEventDialogOpen} onOpenChange={setIsRandomEventDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Sortear Patrocinador</DialogTitle>
            <DialogDescription>
              Selecione um tipo de evento e sorteie um patrocinador para ele.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="random_event_type">Tipo de Evento</Label>
              <Select
                onValueChange={setRandomEventType}
                value={randomEventType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingEventTypes ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="ml-2 text-gray-500">Carregando...</span>
                    </div>
                  ) : eventTypes.length === 0 ? (
                    <div className="py-2 text-center text-gray-500">
                      <p>Nenhum tipo de evento encontrado.</p>
                    </div>
                  ) : (
                    eventTypes.map((eventType) => (
                      <SelectItem key={eventType.id} value={eventType.name}>
                        {eventType.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Patrocinador Sorteado</Label>
              <div className="p-4 border rounded-md bg-gray-50">
                {randomSponsorId ? (
                  <div className="text-center">
                    <p className="font-medium">
                      {activeMembers.find(m => m.id === randomSponsorId)?.nickname || 
                       activeMembers.find(m => m.id === randomSponsorId)?.name || 
                       'Patrocinador não encontrado'}
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">
                    Nenhum patrocinador sorteado. Clique no botão abaixo para sortear.
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRandomEventDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSelectRandomSponsor}
                className="w-full sm:w-auto"
                disabled={!randomEventType}
              >
                <Shuffle className="mr-2 h-4 w-4" />
                Sortear Patrocinador
              </Button>
              <Button
                type="button"
                className="bg-futconnect-600 hover:bg-futconnect-700 w-full sm:w-auto"
                onClick={handleCreateRandomEvent}
                disabled={!randomEventType || !randomSponsorId}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Evento
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for batch event generation */}
      <Dialog open={isBatchEventDialogOpen} onOpenChange={setIsBatchEventDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Gerar Eventos em Lote</DialogTitle>
            <DialogDescription>
              Crie eventos automaticamente para patrocinadores sem eventos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch_event_type">Tipo de Evento</Label>
              <Select
                onValueChange={setBatchEventType}
                value={batchEventType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingEventTypes ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="ml-2 text-gray-500">Carregando...</span>
                    </div>
                  ) : eventTypes.length === 0 ? (
                    <div className="py-2 text-center text-gray-500">
                      <p>Nenhum tipo de evento encontrado.</p>
                    </div>
                  ) : (
                    eventTypes.map((eventType) => (
                      <SelectItem key={eventType.id} value={eventType.name}>
                        {eventType.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Inicial</Label>
              <DateInput 
                value={startDate} 
                onChange={setStartDate} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="day_of_week">Dia da Semana</Label>
              <Select
                onValueChange={setDayOfWeek}
                value={dayOfWeek}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o dia da semana" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="periodicity">Periodicidade</Label>
              <Select
                onValueChange={setPeriodicity}
                value={periodicity}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a periodicidade" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {periodicity === 'specific_week' && (
              <div className="space-y-2">
                <Label htmlFor="week_of_month">Semana do Mês</Label>
                <Select
                  onValueChange={setWeekOfMonth}
                  value={weekOfMonth}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a semana do mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEK_OF_MONTH.map((week) => (
                      <SelectItem key={week.value} value={week.value}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="number_of_events">Número de Eventos</Label>
              <Select
                onValueChange={setNumberOfEvents}
                value={numberOfEvents}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o número de eventos" />
                </SelectTrigger>
                <SelectContent>
                  {NUMBER_OF_EVENTS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {startDate && (
              <div className="p-4 border rounded-md bg-gray-50">
                <h4 className="font-medium mb-2">Prévia das datas</h4>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {calculateEventDates().map((date, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      {formatDatePreview(date)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsBatchEventDialogOpen(false)}
                disabled={isGeneratingBatch}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-futconnect-600 hover:bg-futconnect-700"
                onClick={handleGenerateBatchEvents}
                disabled={isGeneratingBatch || !batchEventType || !startDate}
              >
                {isGeneratingBatch ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <ListPlus className="mr-2 h-4 w-4" />
                    Gerar Eventos
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sponsors;
