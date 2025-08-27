const API_KEY = process.env.STABILITY_API_KEY;

if (!API_KEY) {
  throw new Error("A variável de ambiente STABILITY_API_KEY não está definida.");
}

/**
 * NOVO: Traduz o prompt de Português para Inglês usando uma API gratuita.
 * @param text O texto em português a ser traduzido.
 * @returns A promise que resolve para o texto traduzido em inglês.
 */
async function translatePrompt(text: string): Promise<string> {
  // Se o texto já parecer inglês, não o traduzimos para economizar tempo.
  if (!/[áéíóúâêôãõç]/i.test(text)) {
    console.log("Prompt parece ser em inglês, pulando tradução.");
    return text;
  }

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|en`
    );
    const data = await response.json();
    if (data.responseData && data.responseData.translatedText) {
      console.log(`Prompt traduzido: "${data.responseData.translatedText}"`);
      return data.responseData.translatedText;
    }
    // Se a tradução falhar, usamos o texto original.
    return text;
  } catch (error) {
    console.error("Erro na tradução, usando o prompt original:", error);
    return text; // Em caso de erro, continua com o prompt original
  }
}


// Mapeia os estilos para os presets que a API entende
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
  // --- A MUDANÇA ESTÁ AQUI ---
  // Primeiro, traduzimos o prompt do usuário para inglês.
  const englishPrompt = await translatePrompt(prompt);
  // -------------------------

  const style_preset = stylePresetMap[style] || 'photographic';

  const formData = new FormData();
  formData.append('prompt', englishPrompt); // Usamos o prompt traduzido
  formData.append('aspect_ratio', aspectRatio);
  formData.append('output_format', 'png');
  formData.append('style_preset', style_preset);

  const response = await fetch(
    `https://api.stability.ai/v2beta/stable-image/generate/core`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    try {
        const errorJson = JSON.parse(errorText);
        if (errorJson && errorJson.errors) {
            throw new Error(`Erro na API da Stability: ${errorJson.errors[0]}`);
        }
    } catch (e) {
        throw new Error(`Erro na API da Stability: ${errorText}`);
    }
  }

  const responseJSON = await response.json();

  if (responseJSON.image) {
    return responseJSON.image;
  }

  throw new Error("Nenhuma imagem foi retornada pela API.");
}

// Mantemos esta função simples
export async function generateImageWithImage(prompt: string, imageFiles: File[], aspectRatio: string, style:string): Promise<string> {
    console.warn("generateImageWithImage não é suportado por esta implementação, usando apenas o prompt de texto.");
    return generateImage(prompt, aspectRatio, style);
}
