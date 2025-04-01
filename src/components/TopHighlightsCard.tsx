import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Loader2 } from 'lucide-react';
import { TopHighlight } from '@/hooks/useTopHighlights';

interface TopHighlightsCardProps {
  topHighlights: TopHighlight[];
  isLoading: boolean;
  error: Error | null;
}

const TopHighlightsCard: React.FC<TopHighlightsCardProps> = ({ topHighlights, isLoading, error }) => {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-base md:text-lg flex items-center">
          <Star className="mr-2 h-5 w-5 text-futconnect-600" />
          Top Destaques
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Jogadores mais votados como destaque
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-sm text-red-500">Erro ao carregar destaques</div>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-futconnect-600" />
          </div>
        ) : topHighlights.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            Nenhum destaque encontrado
          </div>
        ) : (
          <div className="space-y-4">
            {topHighlights.map((highlight, index) => (
              <div
                key={highlight.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 relative">
                    {index < 3 && (
                      <div className={`w-5 h-5 flex items-center justify-center rounded-full text-white text-xs
                        ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'}`}>
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {highlight.nickname || highlight.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-semibold text-futconnect-600">
                    {highlight.highlightCount}
                  </span>
                  <Star className="h-4 w-4 text-futconnect-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopHighlightsCard;
