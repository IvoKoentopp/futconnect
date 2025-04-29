/**
 * Utilitário para redimensionar imagens antes do upload
 * Reduz o tamanho do arquivo e melhora o desempenho da aplicação
 */

/**
 * Redimensiona uma imagem para as dimensões máximas especificadas
 * mantendo a proporção original
 * 
 * @param file Arquivo de imagem original
 * @param maxWidth Largura máxima da imagem redimensionada
 * @param maxHeight Altura máxima da imagem redimensionada
 * @param quality Qualidade da imagem (0-1), padrão 0.85 (85%)
 * @returns Promise com o arquivo redimensionado
 */
export async function resizeImage(
  file: File, 
  maxWidth: number = 150, 
  maxHeight: number = 150, 
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo é uma imagem
    if (!file.type.startsWith('image/')) {
      return resolve(file); // Retorna o arquivo original se não for imagem
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Verificar se a imagem já é menor que as dimensões máximas
        if (img.width <= maxWidth && img.height <= maxHeight) {
          return resolve(file); // Retorna o arquivo original se já for pequeno o suficiente
        }
        
        // Calcular as novas dimensões mantendo a proporção
        let width = img.width;
        let height = img.height;
        
        // Redimensionar com base na largura
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        // Verificar se ainda precisa redimensionar com base na altura
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        // Criar canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Não foi possível obter o contexto 2D do canvas'));
        }
        
        // Desenhar a imagem redimensionada no canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Determinar o tipo de saída (manter o mesmo tipo da imagem original)
        const outputType = file.type;
        
        // Converter para blob
        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Falha ao converter canvas para blob'));
          }
          
          // Criar novo arquivo com o mesmo nome, mas redimensionado
          const resizedFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
          });
          
          // Log para debug
          console.log(`Imagem redimensionada: ${file.name}`);
          console.log(`- Original: ${Math.round(file.size / 1024)}KB (${img.width}x${img.height})`);
          console.log(`- Redimensionada: ${Math.round(resizedFile.size / 1024)}KB (${width}x${height})`);
          
          resolve(resizedFile);
        }, outputType, quality);
      };
      
      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };
    
    reader.readAsDataURL(file);
  });
}
