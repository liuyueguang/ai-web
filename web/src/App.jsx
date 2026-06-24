import React, {useState, useRef, useEffect} from 'react';
import {Camera, Upload, Play, Loader2, MessageCircle, X, Send, Moon, Sparkles, Volume2} from 'lucide-react';

// --- API Configurations ---
const apiKey = ""; // API key is injected by the environment
const host = "http://127.0.0.1:13010"
// const host = "http://120.26.44.144:13010"

// Helper: Exponential Backoff for API calls
async function fetchWithRetry(url, options, maxRetries = 5) {
    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

// Helper: Convert PCM Base64 to WAV for TTS playback
function base64PcmToWav(base64, sampleRate = 24000) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = bytes.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    const dataView = new Uint8Array(buffer, 44);
    dataView.set(bytes);

    return buffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// --- Translations ---
const i18n = {
    zh: {
        navTitle: "Murmure STUDIO",
        heroTitle: "Wear your state | 把状态，戴在耳边",
        heroSub: "Calm Your Mind, Heal Your Body. Breathe in the Present, Trust in the Process.",
        ctaHero: "开启今日耳语",
        genTitle: "情绪互动",
        genSub: "请随意将耳贴戴在耳边，拍下一张照片（无需懂得穴位）",
        uploadBtn: "上传照片",
        analyzing: "正在倾听您的身体频率...",
        yourWhisper: "您的专属耳语",
        playAudio: "听见今日耳语",
        infoTitle: "这不是医疗，是身体的情绪语言",
        infoDesc: "我们相信，身体的每一次不适，都是内在情绪的微小呼救。将这些闪烁的珍珠与晶石轻轻贴于耳畔，给自己按下一个温柔的暂停键。",
        shopTitle: "「月影莲华」正念耳饰图鉴",
        shopSub: "The Lunar Lotus Discovery Kit",
        shopPrice: "¥ 199.00",
        addToCart: "加入艺术收藏",
        treeHoleTitle: "情绪树洞",
        treeHoleSub: "今天想对我说什么？",
        chatInputPlace: "分享你的心情...",
        chatInit: "你好，我是 Murmure。今天身体有什么悄悄话想告诉你？",
        auraTitle: "✨ 专属能量星图",
        auraSub: "告诉我们您当下的心愿或困扰，AI 为您推演专属的耳畔疗愈阵列。",
        auraInputPlace: "例如：最近经常失眠，总是感到有些焦虑...",
        auraBtn: "✨ 召唤我的星图",
        auraLoading: "正在星辰与经络间为您寻找指引..."
    },
    en: {
        navTitle: "Murmure STUDIO",
        heroTitle: "Wear your state",
        heroSub: "Calm Your Mind, Heal Your Body. Breathe in the Present, Trust in the Process.",
        ctaHero: "Begin the Journey",
        genTitle: "The Whisper Generator",
        genSub: "Place the sticker on your ear intuitively and snap a photo.",
        uploadBtn: "Upload Photo",
        analyzing: "Sensing your energy...",
        yourWhisper: "Your Whisper Today",
        playAudio: "Listen to the Whisper",
        infoTitle: "An Emotional Translator",
        infoDesc: "Every discomfort is a tiny SOS from your inner emotions. Apply these pearls and crystals, and press a gentle pause button for yourself.",
        shopTitle: "The 'Lunar Lotus' Discovery Kit",
        shopSub: "Curated mindfulness ear jewelry",
        shopPrice: "€ 19.90",
        addToCart: "Add to Cart",
        treeHoleTitle: "Emotional Sanctuary",
        treeHoleSub: "How are you feeling today?",
        chatInputPlace: "Share your thoughts...",
        chatInit: "Hello, I am Murmure. What does your body want to tell you today?",
        auraTitle: "✨ Personalized Aura Constellation",
        auraSub: "Share your current intention or struggle, and let AI craft your unique ear-healing pattern.",
        auraInputPlace: "e.g., I have a big presentation tomorrow and feel anxious...",
        auraBtn: "✨ Generate My Constellation",
        auraLoading: "Seeking guidance among the stars..."
    },
    fr: {
        navTitle: "Murmure STUDIO",
        heroTitle: "Portez votre état",
        heroSub: "Apaisez votre esprit, Guérissez votre corps. Respirez dans le présent.",
        ctaHero: "Commencer le Voyage",
        genTitle: "Générateur de Murmure",
        genSub: "Placez l'autocollant intuitivement et prenez une photo.",
        uploadBtn: "Télécharger la photo",
        analyzing: "Ressentir votre énergie...",
        yourWhisper: "Votre Murmure",
        playAudio: "Écouter le murmure",
        infoTitle: "Un Traducteur Émotionnel",
        infoDesc: "Chaque inconfort est un petit SOS de vos émotions intérieures. Appliquez ces perles et cristaux, et appuyez sur un doux bouton de pause.",
        shopTitle: "Le Kit Découverte 'Lotus Lunaire'",
        shopSub: "Bijoux d'oreilles de pleine conscience",
        shopPrice: "€ 19.90",
        addToCart: "Ajouter au Panier",
        treeHoleTitle: "Sanctuaire Émotionnel",
        treeHoleSub: "Comment vous sentez-vous aujourd'hui?",
        chatInputPlace: "Partagez vos pensées...",
        chatInit: "Bonjour, je suis Murmure. Que veut vous dire votre corps aujourd'hui?",
        auraTitle: "✨ Constellation d'Aura",
        auraSub: "Partagez votre intention, l'IA créera votre motif de guérison auriculaire unique.",
        auraInputPlace: "ex: J'ai du mal à dormir ces derniers temps, je me sens stressé...",
        auraBtn: "✨ Générer ma Constellation",
        auraLoading: "Recherche de conseils parmi les étoiles..."
    }
};

export default function App() {
    const [lang, setLang] = useState('zh');
    const t = i18n[lang];

    // Generator State
    const [imageFile, setImageFile] = useState(null);
    const [imageBase64, setImageBase64] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [whisperResult, setWhisperResult] = useState(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([{role: 'model', text: t.chatInit}]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    // Aura Constellation State
    const [auraInput, setAuraInput] = useState('');
    const [isGeneratingAura, setIsGeneratingAura] = useState(false);
    const [auraResult, setAuraResult] = useState(null);

    const fileInputRef = useRef(null);
    const generatorRef = useRef(null);

    // Scroll to generator
    const scrollToGenerator = () => {
        generatorRef.current?.scrollIntoView({behavior: 'smooth'});
    };

    // Handle Image Upload & Gemini Vision
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(URL.createObjectURL(file));
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                setImageBase64(base64String);
                analyzeImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeImage = async (base64) => {
        setIsAnalyzing(true);
        setWhisperResult(null);
        try {
            const prompt = `You are Murmure, a poetic and healing AI. Analyze this image of an ear with jewelry/stickers. 
      Generate a mindful output in ${lang === 'zh' ? 'Chinese' : lang === 'fr' ? 'French' : 'English'}.
      Focus on aesthetics, emotional state, and healing. DO NOT give medical advice.
      Return ONLY a JSON object with this exact structure, no markdown wrappers: 
      { "tag": "1-2 words representing the vibe (e.g. Calm, Flow)", "quote": "A single beautiful, poetic sentence of healing and mindfulness." }`;


            const response = await fetch(`${host}/api/chat`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    prompt,
                    image: base64
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result) {
                setWhisperResult(result);
            }
        } catch (error) {
            console.error("Vision Error:", error);
            setWhisperResult({tag: "Breathe", quote: lang === 'zh' ? "在当下深呼吸，感受平静。" : "Take a deep breath and feel the calm."});
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Handle Audio Synthesis (TTS)
    const handlePlayAudio = async () => {
        if (!whisperResult?.quote || isPlayingAudio) return;
        setIsPlayingAudio(true);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{parts: [{text: whisperResult.quote}]}],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: lang === 'zh' ? "Aoede" : lang === 'fr' ? "Charon" : "Kore" // Using soft voices
                            }
                        }
                    }
                }
            };

            const result = await fetchWithRetry(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            const audioBase64 = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioBase64) {
                const wavBuffer = base64PcmToWav(audioBase64);
                const blob = new Blob([wavBuffer], {type: 'audio/wav'});
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);
                audio.onended = () => setIsPlayingAudio(false);
                audio.play();
            } else {
                setIsPlayingAudio(false);
            }
        } catch (error) {
            console.error("TTS Error:", error);
            setIsPlayingAudio(false);
        }
    };

    // Handle Chat (Tree Hole)
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatting) return;

        const newMsgs = [...chatMessages, {role: 'user', text: chatInput}];
        setChatMessages(newMsgs);
        setChatInput('');
        setIsChatting(true);

        try {
            const prompt = `You are Murmure, an elegant, poetic, and healing emotional sanctuary listener. 
      The user says: "${chatInput}". 
      Respond with warmth, poetry, and empathy in ${lang === 'zh' ? 'Chinese' : lang === 'fr' ? 'French' : 'English'}. 
      Briefly suggest an aesthetic ear sticker placement (like Shenmen or Endocrine) as an emotional anchor, but strictly in a non-medical, healing way. 
      Keep your response under 3-4 sentences.`;

            const response = await fetch(`${host}/api/chat`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    prompt
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const textRes = await response.text();

            if (textRes) {
                setChatMessages([...newMsgs, {role: 'model', text: textRes}]);
            }
        } catch (error) {
            console.error("Chat Error:", error);
            setChatMessages([...newMsgs, {role: 'model', text: lang === 'zh' ? "我在这里，静静地听。" : "I am here, listening quietly."}]);
        } finally {
            setIsChatting(false);
        }
    };

    // Handle Aura Constellation Generation (LLM Text API)
    const handleGenerateAura = async () => {
        if (!auraInput.trim() || isGeneratingAura) return;
        setIsGeneratingAura(true);
        setAuraResult(null);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            const prompt = `You are Murmure, an elegant and poetic AI that designs healing ear jewelry patterns (Aura Constellations). 
      The user's current situation/intention is: "${auraInput}". 
      Design a custom placement map using our elements: Healing Pearls, Energy Crystals, and Gold Accents. 
      Language to respond in: ${lang === 'zh' ? 'Chinese' : lang === 'fr' ? 'French' : 'English'}.
      Return ONLY a valid JSON object (no markdown, no backticks) with this structure:
      {
        "title": "A poetic name for this constellation (e.g. The Shield of Serenity)",
        "description": "A poetic 2-sentence explanation of why this specific pattern helps their situation.",
        "placements": ["Placement 1: A pearl on the Shenmen to calm the mind.", "Placement 2: ..."]
      }`;


            const response = await fetch(`${host}/api/chat`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    prompt
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result) {
                setAuraResult(result);
            }
        } catch (error) {
            console.error("Aura Error:", error);
            // Fallback
            setAuraResult({
                title: lang === 'zh' ? "星光守护阵" : "The Starlight Guardian",
                description: lang === 'zh' ? "在这段动荡的时光里，这组排列将温柔地守护你的能量。" : "In this turbulent time, this arrangement will gently protect your energy.",
                placements: [lang === 'zh' ? "在耳垂点缀一颗珍珠，稳固心神。" : "A pearl on the earlobe to ground your spirit."]
            });
        } finally {
            setIsGeneratingAura(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCF8] text-[#5C5552] font-sans overflow-x-hidden selection:bg-[#E8DCC4] selection:text-[#5C5552]">

            {/* Navigation */}
            <nav className="fixed w-full top-0 z-50 bg-[#FDFCF8]/80 backdrop-blur-md border-b border-[#E8DCC4]/30">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer">
                        <Moon className="text-[#D4A373]" size={24}/>
                        <span className="font-serif text-2xl tracking-widest text-[#5C5552]">{t.navTitle}</span>
                    </div>
                    <div className="flex gap-4 text-sm font-medium tracking-wide">
                        {['zh', 'en', 'fr'].map((l) => (
                            <button
                                key={l}
                                onClick={() => setLang(l)}
                                className={`uppercase transition-colors ${lang === l ? 'text-[#D4A373]' : 'text-[#8B8580] hover:text-[#5C5552]'}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
                {/* Abstract Background Elements */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4A373]/10 rounded-full blur-3xl"/>
                <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-[#95B8A2]/10 rounded-full blur-3xl"/>

                <div className="relative z-10 text-center flex flex-col items-center max-w-3xl px-6">
                    <div
                        className="mb-12 relative w-64 h-80 rounded-2xl overflow-hidden shadow-2xl shadow-[#8B8580]/10 border border-white/50 backdrop-blur-sm bg-white/20 p-4 transform hover:scale-105 transition-transform duration-700">
                        {/* MVP Card Mockup */}
                        <div
                            className="w-full h-full rounded-xl bg-gradient-to-br from-[#F5E6E8] via-[#E8F0E4] to-[#E3EFF3] flex flex-col items-center justify-center relative overflow-hidden">
                            <Moon size={64} className="text-[#D4A373] absolute top-12 opacity-80" strokeWidth={1}/>
                            <Sparkles size={32} className="text-white absolute top-16 right-16" strokeWidth={1}/>
                            <div className="w-24 h-24 mt-12 bg-pink-200/50 blur-xl rounded-full absolute"></div>
                            <div className="text-[#8B8580] font-serif italic text-sm absolute bottom-8">Lunar Lotus</div>
                        </div>
                    </div>

                    <h1 className="font-serif text-5xl md:text-7xl mb-6 text-[#5C5552] tracking-wide leading-tight">
                        {t.heroTitle.split('|')[0]}
                        <span className="block text-3xl md:text-4xl mt-4 opacity-80">{t.heroTitle.split('|')[1]}</span>
                    </h1>
                    <p className="font-serif italic text-xl text-[#8B8580] mb-12 max-w-xl leading-relaxed">
                        "{t.heroSub}"
                    </p>
                    <button
                        onClick={scrollToGenerator}
                        className="group relative px-8 py-4 bg-[#5C5552] text-[#FDFCF8] rounded-full overflow-hidden transition-transform hover:scale-105 shadow-lg shadow-[#5C5552]/20"
                    >
                        <div className="absolute inset-0 bg-[#D4A373] transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"/>
                        <span className="relative flex items-center gap-2 font-medium tracking-widest text-sm uppercase">
              {t.ctaHero} <Sparkles size={16}/>
            </span>
                    </button>
                </div>
            </section>

            {/* Whisper Generator Section */}
            <section ref={generatorRef} className="py-24 bg-gradient-to-b from-[#FDFCF8] to-[#F5F5F0]">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="font-serif text-4xl text-[#5C5552] mb-4">{t.genTitle}</h2>
                        <p className="text-[#8B8580]">{t.genSub}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Upload Box */}
                        <div
                            className="aspect-[4/5] bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl shadow-[#8B8580]/5 p-2 flex flex-col items-center justify-center relative overflow-hidden group">
                            {imageFile ? (
                                <>
                                    <img src={imageFile} alt="Ear" className="w-full h-full object-cover rounded-2xl opacity-90 transition-opacity"/>
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                                            <div className="relative">
                                                <Moon className="text-[#D4A373] animate-pulse" size={48}/>
                                                <Sparkles className="text-[#95B8A2] absolute -top-4 -right-4 animate-ping" size={24}/>
                                            </div>
                                            <p className="mt-4 font-serif italic text-[#8B8580] animate-pulse">{t.analyzing}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center p-8">
                                    <div className="w-20 h-20 bg-[#F5F5F0] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#E8DCC4] transition-colors">
                                        <Camera className="text-[#8B8580]" size={32}/>
                                    </div>
                                    <p className="text-[#8B8580] text-sm">{t.uploadBtn}</p>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>

                        {/* Output Box */}
                        <div className="flex flex-col justify-center h-full min-h-[400px]">
                            {whisperResult ? (
                                <div className="bg-white/60 backdrop-blur-md border border-white p-10 rounded-3xl shadow-lg shadow-[#8B8580]/5 transform animate-fade-in-up">
                                    <div className="inline-block px-4 py-1 border border-[#D4A373]/30 rounded-full text-[#D4A373] text-sm uppercase tracking-widest mb-8">
                                        {whisperResult.tag}
                                    </div>
                                    <h3 className="font-serif italic text-2xl leading-relaxed text-[#5C5552] mb-12">
                                        "{whisperResult.quote}"
                                    </h3>

                                    {/*<button*/}
                                    {/*    onClick={handlePlayAudio}*/}
                                    {/*    disabled={isPlayingAudio}*/}
                                    {/*    className="flex items-center gap-3 text-[#8B8580] hover:text-[#D4A373] transition-colors font-medium text-sm uppercase tracking-wider disabled:opacity-50"*/}
                                    {/*>*/}
                                    {/*    <div*/}
                                    {/*        className={`w-10 h-10 rounded-full border border-current flex items-center justify-center ${isPlayingAudio ? 'animate-pulse bg-[#D4A373]/10' : ''}`}>*/}
                                    {/*        {isPlayingAudio ? <Volume2 size={16}/> : <Play size={16} className="ml-1"/>}*/}
                                    {/*    </div>*/}
                                    {/*    {isPlayingAudio ? "..." : t.playAudio}*/}
                                    {/*</button>*/}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <Sparkles size={48} className="mb-6"/>
                                    <p className="font-serif italic text-lg">{t.yourWhisper}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Info Section */}
            <section className="py-24 bg-[#FDFCF8]">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <Moon size={40} className="text-[#D4A373] mx-auto mb-8 opacity-50"/>
                    <h2 className="font-serif text-3xl md:text-4xl text-[#5C5552] mb-8">{t.infoTitle}</h2>
                    <p className="text-[#8B8580] leading-loose text-lg font-light max-w-2xl mx-auto">
                        {t.infoDesc}
                    </p>
                </div>
            </section>

            {/* NEW: Aura Constellation Feature powered by Gemini Text API */}
            <section className="py-24 bg-gradient-to-t from-[#F5F5F0] to-[#FDFCF8]">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-white/50 backdrop-blur-md border border-[#E8DCC4]/50 rounded-3xl p-10 md:p-16 shadow-xl shadow-[#D4A373]/5">
                        <div className="text-center mb-10">
                            <h2 className="font-serif text-3xl text-[#5C5552] mb-3 flex items-center justify-center gap-2">
                                {t.auraTitle}
                            </h2>
                            <p className="text-[#8B8580]">{t.auraSub}</p>
                        </div>

                        {!auraResult && !isGeneratingAura ? (
                            <div className="max-w-xl mx-auto flex flex-col gap-4 animate-fade-in-up">
                <textarea
                    className="w-full bg-[#FDFCF8] border border-[#E8DCC4] rounded-2xl p-6 text-[#5C5552] focus:outline-none focus:border-[#D4A373] focus:ring-1 focus:ring-[#D4A373] resize-none h-32 transition-all placeholder:text-[#8B8580]/50"
                    placeholder={t.auraInputPlace}
                    value={auraInput}
                    onChange={(e) => setAuraInput(e.target.value)}
                />
                                <button
                                    onClick={handleGenerateAura}
                                    disabled={!auraInput.trim()}
                                    className="py-4 bg-gradient-to-r from-[#D4A373] to-[#C19160] text-white rounded-full font-medium tracking-widest text-sm uppercase hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#D4A373]/20"
                                >
                                    {t.auraBtn}
                                </button>
                            </div>
                        ) : isGeneratingAura ? (
                            <div className="py-16 flex flex-col items-center justify-center">
                                <div className="relative mb-6">
                                    <Moon className="text-[#D4A373] animate-pulse" size={40}/>
                                    <Sparkles className="text-[#95B8A2] absolute -top-2 -right-2 animate-spin-slow" size={20}/>
                                </div>
                                <p className="font-serif italic text-[#8B8580] animate-pulse">{t.auraLoading}</p>
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto animate-fade-in-up">
                                <div className="text-center mb-10">
                  <span className="inline-block px-4 py-1 border border-[#D4A373]/30 bg-[#D4A373]/5 rounded-full text-[#D4A373] text-sm uppercase tracking-widest mb-4">
                    {auraResult.title}
                  </span>
                                    <p className="font-serif italic text-xl text-[#5C5552] leading-relaxed">
                                        "{auraResult.description}"
                                    </p>
                                </div>

                                <div className="bg-[#FDFCF8] rounded-2xl border border-[#E8DCC4]/50 p-6 space-y-4">
                                    {auraResult.placements.map((placement, idx) => (
                                        <div key={idx} className="flex gap-4 items-start">
                                            <Sparkles className="text-[#D4A373] mt-1 flex-shrink-0" size={18}/>
                                            <p className="text-[#8B8580] leading-relaxed">{placement}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 text-center">
                                    <button
                                        onClick={() => {
                                            setAuraResult(null);
                                            setAuraInput('');
                                        }}
                                        className="text-[#8B8580] hover:text-[#D4A373] transition-colors text-sm underline underline-offset-4"
                                    >
                                        {lang === 'zh' ? '重新定制' : lang === 'fr' ? 'Réinitialiser' : 'Reset'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Shop Section */}
            <section className="py-24 bg-[#F5F5F0]">
                <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                    {/* Visual Container */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-[#D4A373]/5 transform -rotate-3 rounded-3xl transition-transform group-hover:rotate-0 duration-500"></div>
                        <div
                            className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl bg-[#FDFCF8] flex flex-col p-12 items-center justify-center border border-white">
                            <div className="text-center mb-auto pt-8">
                                <h4 className="font-serif italic text-[#95B8A2] text-xl mb-2">Breathe in the Present</h4>
                                <div className="w-12 h-px bg-[#D4A373]/30 mx-auto"></div>
                            </div>

                            {/* Simulated Product Elements */}
                            <div className="relative w-64 h-64 my-8">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#E3EFF3] to-transparent rounded-full opacity-50"></div>
                                <Moon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#D4A373] w-48 h-48 opacity-20"/>
                                {/* Dots representing pearls/crystals */}
                                <div className="absolute top-1/4 right-1/4 w-4 h-4 rounded-full bg-white shadow-md border border-gray-100"></div>
                                <div className="absolute bottom-1/3 left-1/4 w-3 h-3 rounded-full bg-[#95B8A2] shadow-sm"></div>
                                <div className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full bg-[#D4A373]/80 shadow-md"></div>
                                <div className="absolute bottom-1/4 right-1/3 w-5 h-5 rounded-full bg-white/80 backdrop-blur-sm shadow-md border border-white"></div>
                            </div>

                            <div className="text-center mt-auto pb-8">
                                <div className="w-12 h-px bg-[#D4A373]/30 mx-auto mb-2"></div>
                                <h4 className="font-serif italic text-[#8B8580] text-xl">Trust in the Process</h4>
                            </div>
                        </div>
                    </div>

                    {/* Content Container */}
                    <div>
            <span className="text-sm font-medium tracking-widest text-[#D4A373] uppercase mb-4 block">
              {t.shopSub}
            </span>
                        <h2 className="font-serif text-4xl text-[#5C5552] mb-6 leading-tight">
                            {t.shopTitle}
                        </h2>

                        <div className="space-y-6 mb-12">
                            <div className="flex gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#E8DCC4] mt-2 flex-shrink-0"></div>
                                <p className="text-[#8B8580]"><strong className="text-[#5C5552] font-medium font-serif">Healing Pearls:</strong> 如月光般的柔和安抚力量。</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#95B8A2] mt-2 flex-shrink-0"></div>
                                <p className="text-[#8B8580]"><strong className="text-[#5C5552] font-medium font-serif">Energy Crystals:</strong> 净透白水晶与生机绿宝石，对应情绪能量场。
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A373] mt-2 flex-shrink-0"></div>
                                <p className="text-[#8B8580]"><strong className="text-[#5C5552] font-medium font-serif">Gold Accents:</strong> 流金繁星点缀在耳廓之上，如同星光洒落。
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <span className="font-serif text-3xl text-[#5C5552]">{t.shopPrice}</span>
                            <button className="px-8 py-4 bg-[#8B8580] hover:bg-[#5C5552] text-white rounded-full transition-colors font-medium tracking-widest text-sm uppercase">
                                {t.addToCart}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Floating Chat (Tree Hole) */}
            <div className="fixed bottom-6 right-6 z-50">
                {!isChatOpen ? (
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="h-14 px-6 bg-[#FDFCF8] border border-[#E8DCC4] rounded-full flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-transform text-[#5C5552] group animate-fade-in-up"
                    >
                        <MessageCircle size={24} className="text-[#D4A373] group-hover:animate-pulse"/>
                        <span className="font-serif tracking-widest text-sm font-medium">{t.treeHoleTitle}</span>
                    </button>
                ) : (
                    <div className="w-80 h-96 bg-white/90 backdrop-blur-xl border border-[#E8DCC4]/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-4 border-b border-[#E8DCC4]/30 flex justify-between items-center bg-[#FDFCF8]">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-[#D4A373]"/>
                                <span className="font-serif text-[#5C5552]">{t.treeHoleTitle}</span>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="text-[#8B8580] hover:text-[#5C5552]">
                                <X size={18}/>
                            </button>
                        </div>

                        <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-[#E8DCC4]/30 text-[#5C5552] rounded-br-none'
                                            : 'bg-[#F5F5F0] text-[#8B8580] rounded-bl-none font-serif italic'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isChatting && (
                                <div className="flex justify-start">
                                    <div className="bg-[#F5F5F0] text-[#8B8580] p-3 rounded-2xl rounded-bl-none">
                                        <Loader2 size={16} className="animate-spin"/>
                                    </div>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleChatSubmit} className="p-3 bg-[#FDFCF8] border-t border-[#E8DCC4]/30 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder={t.chatInputPlace}
                                className="flex-grow bg-transparent text-sm focus:outline-none text-[#5C5552] px-2"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim() || isChatting}
                                className="p-2 text-[#D4A373] disabled:opacity-50 hover:bg-[#D4A373]/10 rounded-full transition-colors"
                            >
                                <Send size={18}/>
                            </button>
                        </form>
                    </div>
                )}
            </div>

        </div>
    );
}