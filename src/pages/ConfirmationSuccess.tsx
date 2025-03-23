
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

const ConfirmationSuccess = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold mt-4">Confirmação Registrada!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Sua resposta foi registrada com sucesso. Obrigado por manter o clube atualizado.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link to="/">
            <Button>Voltar ao Início</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ConfirmationSuccess;
