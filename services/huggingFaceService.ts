const API_KEY = process.env.HUGGINGFACE_API_KEY;
const API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

if (!API_KEY) {
  throw new Error("A variável de ambiente HUGGINGFACE_API_KEY não está definida.");
}

async function translatePrompt(text: string): Promise<string> {
    if (!/[áéíóúâêôãõç]/i.test(text)) { return text; }
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|en`);
      const data = await response.json();
      return data.responseData?.translatedText || text;
    } catch (error) {
      console.error("Erro na tradução, usando o prompt original:", error);
      return text;
    }
}

// A API do Hugging Face retorna a imagem diretamente (blob), não um JSON.
// Esta função converte o blob da imagem para base64, que nosso app precisa.
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function generateImage(prompt: string, aspectRatio: string, style: string): Promise<string> {
    const englishPrompt = await translatePrompt(`${prompt}, ${style} style`);
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: englishPrompt,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        // A API pode retornar um erro de "modelo carregando" que devemos tratar
        if (response.status === 503) {
            throw new Error("O modelo de IA está carregando, por favor, aguarde um minuto e tente novamente.");
        }
        throw new Error(`Erro na API do Hugging Face: ${errorText}`);
    }

    const imageBlob = await response.blob();
    const base64Image = await blobToBase64(imageBlob);
    
    return base64Image;
}

export async function generateImageWithImage(prompt: string, imageFiles: File[], aspectRatio: string, style: string): Promise<string> {
    console.warn("generateImageWithImage não é suportado, usando apenas o prompt de texto.");
    return generateImage(prompt, aspectRatio, style);
}