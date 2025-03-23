
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Calendar, Users, LogOut, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

const MemberPortal = () => {
  const { user, logout } = useAuth();
  
  if (!user || !user.isMember) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso não autorizado</CardTitle>
            <CardDescription>
              Você não está autorizado a acessar esta página ou não está logado como sócio.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => logout()} className="w-full">
              Voltar para Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
              {user?.activeClub?.logo ? (
                <AvatarImage src={user.activeClub.logo} alt={user.activeClub.name} />
              ) : (
                <AvatarFallback className="bg-futconnect-600 text-white text-lg">
                  {user.activeClub?.name.charAt(0) || "C"}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Olá, {user.name}!</h1>
              <p className="text-slate-500">Bem-vindo ao portal do sócio</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" className="gap-2" asChild>
              <Link to="/club">
                <Building className="h-4 w-4" />
                Acessar Clube
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-futconnect-600" />
                Meus Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-medium">Nome:</span> {user.name}</p>
                <p><span className="font-medium">Email:</span> {user.email}</p>
                <p><span className="font-medium">Clube:</span> {user.activeClub?.name}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Ver perfil completo</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-futconnect-600" />
                Próximos Jogos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500">Não há jogos agendados no momento.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Ver calendário completo</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-futconnect-600" />
                Comunidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500">Conecte-se com outros membros do clube.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Ver comunidade</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MemberPortal;
