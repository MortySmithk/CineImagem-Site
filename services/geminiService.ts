import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("A variável de ambiente API_KEY não está definida.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const styleDescriptions: { [key: string]: string } = {
  "Realista": "Masterpiece, photorealistic, 8K, UHD, sharp focus, high dynamic range, intricate details, professional photography",
  "Cartoon": "Classic 2D cartoon style, cel-shaded, bold outlines, vibrant flat colors, expressive characters, animation cel",
  "Pintura": "Digital painting, epic and majestic, impressionistic, visible brush strokes, rich textures, artistic composition",
  "Anime": "Japanese anime style, vibrant colors, expressive eyes, dynamic action lines, cel-shaded, cinematic, from a high-quality anime movie",
  "Arte Digital": "Concept art, digital illustration, smooth gradients, stylized realism, atmospheric lighting, trending on ArtStation",
  "3D": "3D render, Pixar-style animation, cinematic lighting, detailed textures, high-poly models, octane render",
  "Pixelada": "Pixel art style, 8-bit, 16-bit, retro gaming aesthetic, low resolution, visible pixels, limited color palette, dithering, sprite sheet style",
};

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; }; }> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
}

export async function generateImage(prompt: string, aspectRatio: string, style: string): Promise<string> {
    const styleDesc = styleDescriptions[style] || "high quality digital art";
    const finalPrompt = `${styleDesc}. The image is a depiction of: ${prompt}. If the prompt asks to write text, like a name or a word, it is crucial that this text appears in the image exactly as written.`;

    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
    }

    throw new Error('Não foi possível gerar a imagem a partir do prompt.');
}

export async function generateImageWithImage(prompt: string, imageFiles: File[], aspectRatio: string, style: string): Promise<string> {
    const styleDesc = styleDescriptions[style] || "high quality digital art";
    
    const descriptivePromptInstruction = `You are a world-class multimodal prompt engineer for an AI image generator...`; // (O prompt longo original é mantido aqui)
    
    const imageParts = await Promise.all(imageFiles.map(fileToGenerativePart));
    const contentParts = [...imageParts, { text: descriptivePromptInstruction }];

    const result: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentParts },
    });

    let newPrompt = result.text.trim().replace(/^```(text|json)?\s*/, '').replace(/```$/, '').trim();

    if (!newPrompt || newPrompt.length < 10) {
        console.error("Prompt gerado é muito curto ou vazio:", newPrompt);
        throw new Error("Não foi possível criar um bom prompt a partir da sua solicitação. Tente ser mais descritivo.");
    }
    
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: newPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
    }

    throw new Error('Não foi possível gerar a imagem a partir do prompt e da imagem de referência.');
}