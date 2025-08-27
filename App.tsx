import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateImage, generateImageWithImage } from './services/stabilityService';
import { Spinner } from './components/Spinner';
import { UploadIcon, DownloadIcon, SparklesIcon, XCircleIcon, PhotoIcon } from './components/icons';
import { auth, handleLogin, handleLogout } from './services/firebase'; // Importa do firebase
import { onAuthStateChanged, User } from 'firebase/auth'; // Importa do firebase

const loadingMessages = [
  "Consultando a musa digital...",
  "Pintando pixels com pura imaginação...",
  "Dando os retoques finais na sua obra-prima...",
  "Traduzindo seus sonhos em imagens...",
  "Aguarde, a mágica está acontecendo...",
];

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const imageStyles = ["Realista", "Cartoon", "Pintura", "Anime", "Arte Digital", "3D", "Pixelada"];
const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 4;

const addWatermark = (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const watermarkSrc = 'https://i.ibb.co/5X8G9Kn1/cineveo-logo-r.png';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return reject(new Error('Não foi possível obter o contexto do canvas'));
    }

    const mainImage = new Image();
    mainImage.crossOrigin = "anonymous";
    mainImage.onload = () => {
      canvas.width = mainImage.width;
      canvas.height = mainImage.height;
      ctx.drawImage(mainImage, 0, 0);

      const watermark = new Image();
      watermark.crossOrigin = "anonymous";
      watermark.onload = () => {
        const margin = 20;
        const watermarkHeight = Math.max(24, canvas.height * 0.03);
        const watermarkWidth = watermark.width * (watermarkHeight / watermark.height);

        const x = canvas.width - watermarkWidth - margin;
        const y = canvas.height - watermarkHeight - margin;
        
        ctx.globalAlpha = 0.4;
        ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);
        
        resolve(canvas.toDataURL('image/png'));
      };
      watermark.onerror = (err) => reject(new Error(`Falha ao carregar a marca d'água: ${err}`));
      watermark.src = watermarkSrc;
    };
    mainImage.onerror = (err) => reject(new Error(`Falha ao carregar a imagem gerada: ${err}`));
    mainImage.src = `data:image/png;base64,${base64Image}`;
  });
};


export default function App(): React.ReactNode {
  const [prompt, setPrompt] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string>(loadingMessages[0]);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [style, setStyle] = useState<string>('Realista');
  const [user, setUser] = useState<User | null>(null); // Estado para o usuário
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Efeito para observar o estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe;
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setCurrentLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    
    if (imageFiles.length + newFiles.length > MAX_FILES) {
      setError(`Você pode enviar no máximo ${MAX_FILES} imagens.`);
      return;
    }

    const validFiles = newFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`O arquivo "${file.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB.`);
        return false;
      }
      return true;
    });

    if(validFiles.length === 0) return;

    setImageFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
    });

    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };
  
  const removeImage = (indexToRemove: number) => {
    setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };


  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Por favor, insira um prompt para gerar a imagem.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setCurrentLoadingMessage(loadingMessages[0]);

    try {
      let imageData: string;
      if (imageFiles.length > 0) {
        imageData = await generateImageWithImage(prompt, imageFiles, aspectRatio, style);
      } else {
        imageData = await generateImage(prompt, aspectRatio, style);
      }
      const watermarkedImage = await addWatermark(imageData);
      setGeneratedImage(watermarkedImage);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao gerar a imagem.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, imageFiles, aspectRatio, style]);
  
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    const fileName = prompt.substring(0, 30).replace(/\s+/g, '_') || 'imagem_gerada';
    link.download = `${fileName}_watermarked.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
    
  const dropzoneEvents = {
    onDragEnter: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); },
    onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); },
    onDragOver: (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); },
    onDrop: (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      processFiles(e.dataTransfer.files);
    },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 relative">
       {/* Botão de Login/Logout */}
      <div className="absolute top-4 right-4 z-10">
        {user ? (
          <div className="flex items-center gap-4">
            <img src={user.photoURL ?? ''} alt={user.displayName ?? ''} className="w-10 h-10 rounded-full" />
            <button onClick={handleLogout} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-500 transition-colors">
              Sair
            </button>
          </div>
        ) : (
          <button onClick={handleLogin} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors">
            Login com Google
          </button>
        )}
      </div>

      <header className="w-full max-w-6xl text-center mb-8 mt-16 sm:mt-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          Gerador de Imagens AI
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Dê vida às suas ideias. Descreva, envie imagens ou combine ambos.
        </p>
      </header>
      
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="flex flex-col gap-6 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg">
          <div>
            <label htmlFor="prompt" className="block text-lg font-semibold mb-2 text-purple-300">
              1. Descreva sua imagem
            </label>
            <textarea
              id="prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Combine o personagem da imagem 1 com o cenário da imagem 2..."
              className="w-full p-3 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-300"
            />
          </div>

          <div>
            <span className="block text-lg font-semibold mb-2 text-purple-300">
              2. (Opcional) Envie até {MAX_FILES} imagens de referência
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              id="file-upload"
              multiple
            />
            <label
              htmlFor="file-upload"
              {...dropzoneEvents}
              className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
              ${isDragOver ? 'border-purple-500 bg-slate-700/50' : 'border-slate-600 hover:border-purple-400 hover:bg-slate-800'}`}
            >
              {imagePreviews.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full rounded-md object-cover" />
                      <button onClick={(e) => { e.preventDefault(); removeImage(index); }} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 text-white hover:bg-red-500 transition-colors">
                        <XCircleIcon className="w-5 h-5"/>
                      </button>
                    </div>
                  ))}
                  {imageFiles.length < MAX_FILES && (
                    <div className="flex items-center justify-center bg-slate-700/50 rounded-md aspect-square text-slate-400 hover:bg-slate-700">
                      <UploadIcon className="w-8 h-8"/>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-4">
                  <UploadIcon className="w-10 h-10 mx-auto mb-2"/>
                  <p className="font-semibold">Arraste e solte ou clique para enviar</p>
                  <p className="text-sm">PNG, JPG, WEBP (Máx {MAX_FILE_SIZE_MB}MB cada)</p>
                </div>
              )}
            </label>
          </div>
          
          <div>
            <label className="block text-lg font-semibold mb-2 text-purple-300">
              3. Escolha o formato
            </label>
            <div className="grid grid-cols-5 gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 px-3 rounded-md text-sm font-semibold transition-colors duration-200 ${
                    aspectRatio === ratio
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-lg font-semibold mb-2 text-purple-300">
              4. Escolha o estilo
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {imageStyles.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`py-2 px-3 rounded-md text-sm font-semibold transition-colors duration-200 ${
                    style === s
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-3 text-lg font-bold py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100 mt-4"
          >
            <SparklesIcon className="w-6 h-6" />
            Gerar Imagem
          </button>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-center gap-3">
              <XCircleIcon className="w-6 h-6"/>
              <span>{error}</span>
            </div>
          )}
        </div>
        
        {/* Output Panel */}
        <div className="flex flex-col gap-4 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg min-h-[400px] lg:min-h-0">
          <div className="flex-grow flex items-center justify-center bg-slate-900/70 rounded-lg overflow-hidden relative">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Spinner />
                    <p className="text-lg mt-4 text-slate-300 animate-pulse">{currentLoadingMessage}</p>
                </div>
            ) : generatedImage ? (
              <img src={generatedImage} alt="Imagem gerada por IA" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-center text-slate-500 p-8">
                <PhotoIcon className="w-24 h-24 mx-auto mb-4"/>
                <h3 className="text-xl font-semibold">Sua imagem aparecerá aqui</h3>
                <p>Quando a geração estiver concluída.</p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
             <button
                onClick={handleDownload}
                disabled={!generatedImage || isLoading}
                className="w-full flex items-center justify-center gap-3 text-lg font-bold py-3 px-6 rounded-lg text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500"
             >
                <DownloadIcon className="w-6 h-6" />
                Baixar Imagem
             </button>
          </div>
        </div>
      </main>
    </div>
  );
}