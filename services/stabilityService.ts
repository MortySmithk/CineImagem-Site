const API_KEY = process.env.STABILITY_API_KEY;

if (!API_KEY) {
  throw new Error("A variável de ambiente STABILITY_API_KEY não está definida.");
}

// Mapeia os estilos para os presets que a nova API entende
const stylePresetMap: { [key: string]: string } = {
  "Realista": "photographic",
  "Cartoon": "comic-book",
  "Pintura": "digital-art",
  "Anime": "anime",
  "Arte Digital": "fantasy-art",
  "3D": "3d-model",
  "Pixelada": "pixel-art",
};

export async function generateImage(prompt: string, aspectRatio: string, style: string): Promise<string> {
  const style_preset = stylePresetMap[style] || 'photographic';

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('aspect_ratio', aspectRatio);
  formData.append('output_format', 'png'); // Pedimos PNG como formato de saída
  formData.append('style_preset', style_preset);

  const response = await fetch(
    // URL ATUALIZADA para o novo modelo "Stable Image Core"
    `https://api.stability.ai/v2beta/stable-image/generate/core`, 
    {
      method: 'POST',
      headers: {
        // O cabeçalho 'Content-Type' não é necessário com FormData
        Accept: 'application/json', // Pedimos a resposta em JSON
        Authorization: `Bearer ${API_KEY}`,
      },
      body: formData, // Usamos FormData para a nova API
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    // Tenta extrair uma mensagem de erro mais clara do JSON, se possível
    try {
        const errorJson = JSON.parse(errorText);
        if (errorJson && errorJson.errors) {
            throw new Error(`Erro na API da Stability: ${errorJson.errors[0]}`);
        }
    } catch (e) {
        // Se não for JSON, joga o erro bruto
        throw new Error(`Erro na API da Stability: ${errorText}`);
    }
  }

  const responseJSON = await response.json();

  // A resposta da nova API tem uma estrutura diferente
  if (responseJSON.image) {
    // A imagem já vem em base64
    return responseJSON.image;
  }

  throw new Error("Nenhuma imagem foi retornada pela API.");
}

// Mantemos esta função simples
export async function generateImageWithImage(prompt: string, imageFiles: File[], aspectRatio: string, style: string): Promise<string> {
    console.warn("generateImageWithImage não é suportado por esta implementação da Stability, usando apenas o prompt de texto.");
    return generateImage(prompt, aspectRatio, style);
}
