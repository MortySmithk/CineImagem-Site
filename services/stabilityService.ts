const API_KEY = process.env.STABILITY_API_KEY;
const API_HOST = 'https://api.stability.ai';

if (!API_KEY) {
  throw new Error("A variável de ambiente STABILITY_API_KEY não está definida.");
}

// Mapeia os estilos para os estilos que a Stability AI entende
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

  const response = await fetch(
    `${API_HOST}/v1/generation/stable-diffusion-v1-6`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: prompt,
          },
        ],
        cfg_scale: 7,
        aspect_ratio: aspectRatio,
        height: undefined, // Deixe a API decidir a melhor resolução com base no aspect ratio
        width: undefined,
        samples: 1,
        steps: 30,
        style_preset: style_preset,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro na API da Stability: ${await response.text()}`);
  }

  const responseJSON = await response.json();

  if (responseJSON.artifacts && responseJSON.artifacts.length > 0) {
    return responseJSON.artifacts[0].base64;
  }

  throw new Error("Nenhuma imagem foi retornada pela API.");
}


// A geração com imagem de referência é um recurso mais avançado.
// Vamos manter a simplicidade para garantir que funcione.
export async function generateImageWithImage(prompt: string, imageFiles: File[], aspectRatio: string, style: string): Promise<string> {
    console.warn("generateImageWithImage não é suportado por esta implementação da Stability, usando apenas o prompt de texto.");
    return generateImage(prompt, aspectRatio, style);
}