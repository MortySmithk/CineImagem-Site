const API_KEY = process.env.STABILITY_API_KEY;

if (!API_KEY) {
  throw new Error("A variável de ambiente STABILITY_API_KEY não está definida.");
}

async function translatePrompt(text: string): Promise<string> {
  if (!/[áéíóúâêôãõç]/i.test(text)) {
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
    return text;
  } catch (error) {
    console.error("Erro na tradução, usando o prompt original:", error);
    return text;
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
  const englishPrompt = await translatePrompt(prompt);
  const style_preset = stylePresetMap[style] || 'photographic';

  const formData = new FormData();
  formData.append('prompt', englishPrompt);
  formData.append('aspect_ratio', aspectRatio);
  formData.append('output_format', 'png');
  // Adicionamos o parâmetro de modelo para usar o SD3
  formData.append('model', 'sd3-medium'); 
  // O preset de estilo é passado de outra forma para o SD3
  // Adicionamos o estilo ao final do prompt para mais força
  formData.set('prompt', `${englishPrompt}, ${style_preset} style`);


  const response = await fetch(
    // URL ATUALIZADA para o novo endpoint do Stable Diffusion 3
    `https://api.stability.ai/v2beta/stable-image/generate/sd3`,
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

export async function generateImageWithImage(prompt: string, imageFiles: File[], aspectRatio: string, style:string): Promise<string> {
    console.warn("generateImageWithImage não é suportado por esta implementação, usando apenas o prompt de texto.");
    return generateImage(prompt, aspectRatio, style);
}
