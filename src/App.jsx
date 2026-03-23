import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Settings, MessageSquare, Plus, Trash2, Send, 
  RefreshCw, Volume2, VolumeX, Menu, X, Save,
  Image as ImageIcon, Sparkles, BookOpen,
  AlertCircle, CheckCircle, Info, ServerCrash, ChevronDown, Music, Edit3,
  Download, Upload, UserPlus, Smile, Archive, Database, Copy, Play, Type,
  Monitor, Mic, FileText, ArrowLeft, LogOut, Eye, User, Calendar, CheckSquare, Clock
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  openaiBaseUrl: '',
  openaiApiKey: '123',
  aiModel: 'gpt-3.5-turbo',
  customSystemPrompt: '你是一个可爱的虚拟助手，请用简短、生动、带有一点二次元风格的语言回答我的问题。',
  userName: '我',             
  aiName: '对象',             
  characterList: [],          
  ttsEnabled: false,
  ttsUrlTemplate: 'http://127.0.0.1:9880/tts?text={text}&text_lang={lang}&ref_audio_path={ref_audio}&prompt_text={ref_text}&prompt_lang={ref_lang}',
  ttsLanguage: 'zh',
  ttsVolume: 1.0,             
  bgmVolume: 0.3,             
  bgmMode: 'sequential',      
  enableBgmToast: false,      
  live2dScale: 0.2, 
  live2dX: 0,
  live2dY: 0,
  titleLive2dScale: 0.2,
  titleLive2dX: 0,
  titleLive2dY: 0,
  corsProxyType: 'none', 
  customCorsProxyUrl: 'https://corsproxy.io/?',
  enablePlotOptions: false,   
  enableStreaming: true,      
  typingSpeed: 40,            
  vnLinesPerPage: 4,          
  dialogOpacity: 0.6,
  settingsOpacity: 0.95,
  currentBgId: null,
  currentBgmId: null,         
  currentExpressionId: null,
  currentModelId: null,       
  dialogFontFamily: '"Microsoft YaHei", sans-serif',
  dialogTextColor: '#ffffff',
  dialogThemeColor: '#000000',
  dialogPositionY: 0,
  enableClickExpression: true,
  enableNoLive2DMode: false,
  hideLive2dModel: false,     
  mainTitleText: 'GWC',
  mainTitleColor: '#e0f2fe',
  mainTitleFont: 'serif',
  mainTitleX: 0,
  mainTitleY: 0,
  subTitleText: '- GalGame Web Chat -',
  subTitleColor: '#dbeafe',
  subTitleFont: 'sans-serif',
  subTitleX: 0,
  subTitleY: 0,
  plotApiMode: 'shared',      
  plotBaseUrl: '',
  plotApiKey: '',
  plotModel: 'gpt-3.5-turbo',
  hideTitleLive2d: false,
  ttsRefAudio: '',
  ttsRefText: '',
  ttsRefLang: 'zh',
  enableTranslation: false,
  displayLanguage: 'zh',
  ttsSentencePause: 0,
  ttsPlaybackRate: 1.0,
  workMode: false,
  modelConfigs: {},
  enableMemory: false,
  memoryInterval: 150,
  enableAutoSave: false,
  autoSaveInterval: 5
};

const hexToRgba = (hex, alpha) => {
  let r = 0, g = 0, b = 0;
  if (hex && hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex && hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const DB_NAME = 'Live2D_Local_Storage';
const STORE_NAME = 'model_files'; 
const SETTINGS_STORE = 'app_settings';
const BGM_STORE = 'bgm_files'; 
const BG_STORE = 'bg_images'; 
const MODELS_STORE = 'live2d_models'; 

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 5); 
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
      if (!db.objectStoreNames.contains(BGM_STORE)) db.createObjectStore(BGM_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(BG_STORE)) db.createObjectStore(BG_STORE, { keyPath: 'id' }); 
      if (!db.objectStoreNames.contains(MODELS_STORE)) db.createObjectStore(MODELS_STORE, { keyPath: 'id' }); 
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveMultiModelToDB = async (modelItem) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MODELS_STORE, 'readwrite');
    tx.objectStore(MODELS_STORE).put(modelItem);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadModelsListFromDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MODELS_STORE, 'readonly');
    const store = tx.objectStore(MODELS_STORE);
    const request = store.openCursor();
    const list = [];
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        list.push({ id: cursor.value.id, name: cursor.value.name });
        cursor.continue();
      } else {
        resolve(list);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

const getMultiModelFromDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MODELS_STORE, 'readonly');
    const request = tx.objectStore(MODELS_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteMultiModelFromDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MODELS_STORE, 'readwrite');
    tx.objectStore(MODELS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadModelFilesFromDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    const keysRequest = store.getAllKeys();
    request.onsuccess = () => {
      keysRequest.onsuccess = () => {
        if (!request.result || request.result.length === 0) return resolve(null);
        const files = request.result.map((file, index) => {
          const path = keysRequest.result[index];
          Object.defineProperty(file, 'webkitRelativePath', { value: path, writable: false });
          return file;
        });
        resolve(files);
      };
    };
    request.onerror = () => reject(request.error);
  });
};

const saveBGMToDB = async (bgmItem) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BGM_STORE, 'readwrite');
    tx.objectStore(BGM_STORE).put(bgmItem);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadBGMFromDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BGM_STORE, 'readonly');
    const request = tx.objectStore(BGM_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteBGMFromDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BGM_STORE, 'readwrite');
    tx.objectStore(BGM_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const saveImageToDB = async (key, dataUrl) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    if (dataUrl) store.put(dataUrl, key);
    else store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadImageFromDB = async (key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, 'readonly');
    const store = tx.objectStore(SETTINGS_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveBgItemToDB = async (bgItem) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BG_STORE, 'readwrite');
    tx.objectStore(BG_STORE).put(bgItem);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadBgListFromDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BG_STORE, 'readonly');
    const request = tx.objectStore(BG_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteBgItemFromDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BG_STORE, 'readwrite');
    tx.objectStore(BG_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
  reader.readAsDataURL(blob);
});

const SettingToggle = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[#ba3f42] font-bold flex items-center gap-1"><span className="text-sm">✱</span> {label}</label>
    <div className="flex bg-[#e8decb] rounded-full p-1 w-max shadow-inner">
      <button onClick={() => onChange(true)} className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${value ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}`}>ON</button>
      <button onClick={() => onChange(false)} className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${!value ? 'bg-[#ba3f42] text-white shadow-md' : 'text-[#7a6b5d] hover:bg-white/50'}`}>OFF</button>
    </div>
  </div>
);

const SettingSlider = ({ label, value, min, max, step, suffix = '', onChange }) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-[#ba3f42] font-bold flex items-center gap-1"><span className="text-sm">✱</span> {label}</label>
    <div className="flex items-center gap-4">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="flex-1 accent-[#ba3f42] h-2 bg-[#e8decb] rounded-full appearance-none outline-none" />
      <span className="bg-white px-3 py-1 rounded-full text-sm font-bold text-[#7a6b5d] border border-[#e8decb] min-w-[60px] text-center shadow-sm">{value}{suffix}</span>
    </div>
  </div>
);

const SettingSectionTitle = ({ title, extra }) => (
  <div className="flex items-center gap-4 mb-6">
    <h3 className="text-lg font-black text-[#ba3f42] tracking-widest whitespace-nowrap">{title}</h3>
    <div className="flex-1 border-b-2 border-dashed border-[#e6d5b8]"></div>
    {extra && <div className="shrink-0">{extra}</div>}
  </div>
);

export default function App() {
  
  const [appMode, setAppMode] = useState('title');
  const [localTitleBgImage, setLocalTitleBgImage] = useState('');

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('live2d_settings_v32') || localStorage.getItem('live2d_settings_v31') || localStorage.getItem('live2d_settings_v30');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.currentModelId === undefined) parsed.currentModelId = null;
      if (parsed.hideLive2dModel === undefined) parsed.hideLive2dModel = false;
      if (parsed.ttsRefAudio === undefined) parsed.ttsRefAudio = DEFAULT_SETTINGS.ttsRefAudio;
      if (parsed.ttsRefText === undefined) parsed.ttsRefText = DEFAULT_SETTINGS.ttsRefText;
      if (parsed.ttsRefLang === undefined) parsed.ttsRefLang = DEFAULT_SETTINGS.ttsRefLang;
      if (parsed.enableTranslation === undefined) parsed.enableTranslation = DEFAULT_SETTINGS.enableTranslation;
      if (parsed.displayLanguage === undefined) parsed.displayLanguage = DEFAULT_SETTINGS.displayLanguage;
      if (parsed.ttsSentencePause === undefined) parsed.ttsSentencePause = DEFAULT_SETTINGS.ttsSentencePause;
      if (parsed.ttsPlaybackRate === undefined) parsed.ttsPlaybackRate = DEFAULT_SETTINGS.ttsPlaybackRate;
      if (parsed.workMode === undefined) parsed.workMode = DEFAULT_SETTINGS.workMode;
      if (parsed.modelConfigs === undefined) parsed.modelConfigs = {};
      if (parsed.enableMemory === undefined) parsed.enableMemory = DEFAULT_SETTINGS.enableMemory;
      if (parsed.memoryInterval === undefined) parsed.memoryInterval = DEFAULT_SETTINGS.memoryInterval;
      if (parsed.enableAutoSave === undefined) parsed.enableAutoSave = DEFAULT_SETTINGS.enableAutoSave;
      if (parsed.autoSaveInterval === undefined) parsed.autoSaveInterval = DEFAULT_SETTINGS.autoSaveInterval;

      if (parsed.ttsUrlTemplate && parsed.ttsUrlTemplate.includes('text_language')) {
        parsed.ttsUrlTemplate = parsed.ttsUrlTemplate.replace('text_language=', 'text_lang=').replace('prompt_language=', 'prompt_lang=');
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return DEFAULT_SETTINGS;
  });

  const [memos, setMemos] = useState(() => {
    const saved = localStorage.getItem('live2d_memos_v32') || localStorage.getItem('live2d_memos_v31');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [newMemoText, setNewMemoText] = useState('');
  const [newMemoDate, setNewMemoDate] = useState('');

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('live2d_sessions_v32') || localStorage.getItem('live2d_sessions_v31');
    return saved ? JSON.parse(saved) : [{ id: Date.now().toString(), title: '新剧情', messages: [], memorySummary: '' }];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    const saved = localStorage.getItem('live2d_active_session_v32') || localStorage.getItem('live2d_active_session_v31');
    return saved || null;
  });

  const [saveSlots, setSaveSlots] = useState(() => {
    const saved = localStorage.getItem('live2d_saves_v32') || localStorage.getItem('live2d_saves_v31');
    return saved ? JSON.parse(saved) : {};
  });

  const [quickSaveData, setQuickSaveData] = useState(() => {
    const saved = localStorage.getItem('live2d_quicksave_v32') || localStorage.getItem('live2d_quicksave_v31');
    return saved ? JSON.parse(saved) : null;
  });

  const [autoSaveData, setAutoSaveData] = useState(() => {
    const saved = localStorage.getItem('live2d_autosave_v32') || localStorage.getItem('live2d_autosave_v31');
    return saved ? JSON.parse(saved) : null;
  });

  const [inputValue, setInputValue] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('visual'); 
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressingMemory, setIsCompressingMemory] = useState(false); 
  
  const [selectedImage, setSelectedImage] = useState(null);

  const [availableModels, setAvailableModels] = useState(['gpt-3.5-turbo', 'gpt-4o', 'gemini-pro', 'claude-3-opus']);
  const [live2dStatus, setLive2dStatus] = useState('初始化中...');
  const [modelReloadTrigger, setModelReloadTrigger] = useState(0);

  const [suggestedReplies, setSuggestedReplies] = useState([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [storySummary, setStorySummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false); 

  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [vnPage, setVnPage] = useState(0); 

  const [bgmList, setBgmList] = useState([]);
  const [currentBgmIndex, setCurrentBgmIndex] = useState(-1);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [bgmToast, setBgmToast] = useState({ visible: false, name: '' });

  const [bgList, setBgList] = useState([]);
  const [isBgMenuOpen, setIsBgMenuOpen] = useState(false);

  const [modelsList, setModelsList] = useState([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const [expressions, setExpressions] = useState([]);
  const [isExpressionMenuOpen, setIsExpressionMenuOpen] = useState(false);

  const [isSaveLoadUIOpen, setIsSaveLoadUIOpen] = useState(false);
  const [slMode, setSlMode] = useState('save'); 
  const [slPage, setSlPage] = useState(1); 
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editSaveName, setEditSaveName] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, text: '', onConfirm: null, onCancel: null, confirmText: '', cancelText: '', thirdButton: null });

  const [visualAdjustMode, setVisualAdjustMode] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const activeAudioRef = useRef(null);
  const bgmAudioRef = useRef(new Audio()); 
  const vnTextContainerRef = useRef(null);
  const logEndRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const bgmToastTimeoutRef = useRef(null); 
  const editInputRef = useRef(null); 
  const fileInputRef = useRef(null); 
  
  const wheelTimeoutRef = useRef(null);
  const ttsTimeoutRef = useRef(null); 
  const audioQueueRef = useRef([]);    
  const isPlayingTTSRef = useRef(false);

  const currentModelConfig = settings.currentModelId && settings.modelConfigs?.[settings.currentModelId] 
      ? settings.modelConfigs[settings.currentModelId] 
      : { 
          scale: settings.live2dScale ?? 0.2, x: settings.live2dX ?? 0, y: settings.live2dY ?? 0, 
          titleScale: settings.titleLive2dScale ?? 0.2, titleX: settings.titleLive2dX ?? 0, titleY: settings.titleLive2dY ?? 0 
        };

  const updateModelConfig = (key, value) => {
      if (settings.currentModelId) {
          setSettings(s => ({
              ...s,
              modelConfigs: { ...s.modelConfigs, [s.currentModelId]: { ...(s.modelConfigs[s.currentModelId] || { scale: s.live2dScale ?? 0.2, x: s.live2dX ?? 0, y: s.live2dY ?? 0, titleScale: s.titleLive2dScale ?? 0.2, titleX: s.titleLive2dX ?? 0, titleY: s.titleLive2dY ?? 0 }), [key]: value } }
          }));
      } else {
          const fallbackKeyMap = { scale: 'live2dScale', x: 'live2dX', y: 'live2dY', titleScale: 'titleLive2dScale', titleX: 'titleLive2dX', titleY: 'titleLive2dY' };
          setSettings(s => ({ ...s, [fallbackKeyMap[key]]: value }));
      }
  };

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    setToast({ visible: true, message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => { setToast(prev => ({ ...prev, visible: false })); }, duration); 
  }, []);

  const handleCopyMessage = (text) => {
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); showToast('已复制对话文本', 'success', 2000); } 
    catch (err) { showToast('复制失败，请手动选择复制', 'error'); }
    document.body.removeChild(textArea);
  };

  useEffect(() => {
    loadImageFromDB('titleBgImage').then(img => { if (img) setLocalTitleBgImage(img); }).catch(console.error);
    loadModelsListFromDB().then(list => { if (list) setModelsList(list); }).catch(console.error);
    loadBgListFromDB().then(list => { if (list) setBgList(list); }).catch(console.error);
    loadBGMFromDB().then(list => {
      if (list && list.length > 0) {
        setBgmList(list);
        if (settings.currentBgmId) {
          const idx = list.findIndex(b => b.id === settings.currentBgmId); setCurrentBgmIndex(idx !== -1 ? idx : 0);
        } else { setCurrentBgmIndex(0); }
      }
    }).catch(console.error);
    if (!activeSessionId && sessions.length > 0) setActiveSessionId(sessions[0].id);
  }, []);

  useEffect(() => { localStorage.setItem('live2d_settings_v32', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('live2d_sessions_v32', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('live2d_saves_v32', JSON.stringify(saveSlots)); }, [saveSlots]);
  useEffect(() => { localStorage.setItem('live2d_quicksave_v32', JSON.stringify(quickSaveData)); }, [quickSaveData]);
  useEffect(() => { localStorage.setItem('live2d_autosave_v32', JSON.stringify(autoSaveData)); }, [autoSaveData]);
  useEffect(() => { localStorage.setItem('live2d_memos_v32', JSON.stringify(memos)); }, [memos]);
  
  useEffect(() => { if (activeSessionId) { localStorage.setItem('live2d_active_session_v32', activeSessionId); setStorySummary(''); } }, [activeSessionId]);
  useEffect(() => { if (isLogOpen && logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [sessions, activeSessionId, isLogOpen]);

  useEffect(() => { 
    if (activeAudioRef.current) { activeAudioRef.current.volume = settings.ttsVolume; activeAudioRef.current.playbackRate = settings.ttsPlaybackRate || 1.0; }
  }, [settings.ttsVolume, settings.ttsPlaybackRate]);

  useEffect(() => { bgmAudioRef.current.volume = settings.bgmVolume; }, [settings.bgmVolume]);

  useEffect(() => {
    if (currentBgmIndex >= 0 && bgmList[currentBgmIndex]) {
      const bgmItem = bgmList[currentBgmIndex]; const url = URL.createObjectURL(bgmItem.blob);
      bgmAudioRef.current.src = url; bgmAudioRef.current.loop = settings.bgmMode === 'loop'; setSettings(s => ({ ...s, currentBgmId: bgmItem.id }));
      if (isBgmPlaying) bgmAudioRef.current.play().catch(e => console.error("BGM播放失败", e));
      if (settings.enableBgmToast) {
        setBgmToast({ visible: true, name: bgmItem.name });
        if (bgmToastTimeoutRef.current) clearTimeout(bgmToastTimeoutRef.current);
        bgmToastTimeoutRef.current = setTimeout(() => { setBgmToast(prev => ({ ...prev, visible: false })); }, 3000);
      }
    }
  }, [currentBgmIndex, settings.bgmMode, bgmList]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    const handleEnded = () => {
      if (settings.bgmMode === 'loop') return; 
      if (settings.bgmMode === 'random') {
        let next = Math.floor(Math.random() * bgmList.length); if (bgmList.length > 1 && next === currentBgmIndex) next = (next + 1) % bgmList.length; setCurrentBgmIndex(next);
      } else if (settings.bgmMode === 'sequential') { setCurrentBgmIndex((currentBgmIndex + 1) % bgmList.length); }
    };
    audio.addEventListener('ended', handleEnded); return () => audio.removeEventListener('ended', handleEnded);
  }, [bgmList, currentBgmIndex, settings.bgmMode]);

  const toggleBgm = () => {
    if (bgmList.length === 0) return showToast("暂无音乐，请先在设置中上传 BGM", "info");
    if (isBgmPlaying) { bgmAudioRef.current.pause(); setIsBgmPlaying(false); } 
    else { bgmAudioRef.current.play().catch(e => showToast("播放失败:"+e.message, "error")); setIsBgmPlaying(true); }
  };

  const handleBgmUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return; showToast(`正在导入 ${files.length} 首音乐...`); let added = 0;
    for (let file of files) {
      const bgmItem = { id: Date.now() + Math.random(), name: file.name, blob: file };
      try { await saveBGMToDB(bgmItem); setBgmList(prev => [...prev, bgmItem]); added++; } catch (err) {}
    }
    if (currentBgmIndex === -1 && added > 0) setCurrentBgmIndex(0); showToast(`成功导入 ${added} 首音乐`, "success"); e.target.value = ''; 
  };

  const removeBgm = async (id) => {
    await deleteBGMFromDB(id); const updated = bgmList.filter(b => b.id !== id); setBgmList(updated);
    if (updated.length === 0) { bgmAudioRef.current.pause(); setIsBgmPlaying(false); setCurrentBgmIndex(-1); setSettings(s => ({...s, currentBgmId: null})); } 
    else if (bgmList[currentBgmIndex]?.id === id) setCurrentBgmIndex(0);
  };

  const handleBgUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return; showToast(`正在处理 ${files.length} 张背景...`); let added = 0;
    for (let file of files) {
      try {
        const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = ev => resolve(ev.target.result); reader.onerror = err => reject(err); reader.readAsDataURL(file); });
        const bgItem = { id: Date.now() + Math.random(), name: file.name, dataUrl }; await saveBgItemToDB(bgItem); setBgList(prev => [...prev, bgItem]); added++;
      } catch (err) {}
    }
    if (!settings.currentBgId && added > 0) setSettings(prev => ({ ...prev, currentBgId: bgList.length > 0 ? bgList[0].id : null })); showToast(`成功导入 ${added} 张背景图`, "success"); e.target.value = '';
  };

  const removeBg = async (id) => {
    await deleteBgItemFromDB(id); const updated = bgList.filter(b => b.id !== id); setBgList(updated);
    if (settings.currentBgId === id) setSettings(prev => ({ ...prev, currentBgId: updated.length > 0 ? updated[0].id : null }));
  };

  const handleTitleBgUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = async (event) => { const dataUrl = event.target.result; try { await saveImageToDB('titleBgImage', dataUrl); setLocalTitleBgImage(dataUrl); showToast("主标题背景保存成功", "success"); } catch (err) { showToast("保存失败：" + err.message, "error"); } };
    reader.readAsDataURL(file); e.target.value = '';
  };

  const clearTitleBgImage = async () => { await saveImageToDB('titleBgImage', null); setLocalTitleBgImage(''); showToast("已清除主标题背景", "info"); };

  const handleAddMemo = () => {
    if (!newMemoText.trim()) return; const newMemo = { id: Date.now().toString(), text: newMemoText.trim(), date: newMemoDate, isDone: false, hasReminded: false };
    setMemos([newMemo, ...memos]); setNewMemoText(''); setNewMemoDate(''); showToast("已添加日程！AI将在系统时钟到达时主动提示。", "success");
  };
  const toggleMemoDone = (id) => setMemos(memos.map(m => m.id === id ? { ...m, isDone: !m.isDone } : m));
  const deleteMemo = (id) => setMemos(memos.filter(m => m.id !== id));

  // ✨ --- 核心升级：后台隐式时钟引擎，实现大模型主动开口 ---
  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        setMemos(prevMemos => {
            let changed = false;
            const newMemos = prevMemos.map(m => {
                if (!m.isDone && !m.hasReminded && m.date) {
                    const mDate = new Date(m.date);
                    // 时间到达，并在5分钟内检测到
                    if (now >= mDate && (now.getTime() - mDate.getTime()) < 5 * 60 * 1000) {
                        changed = true;
                        window.dispatchEvent(new CustomEvent('trigger-reminder', { detail: m.text }));
                        return { ...m, hasReminded: true };
                    }
                }
                return m;
            });
            return changed ? newMemos : prevMemos;
        });
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleReminder = (e) => {
        const memoText = e.detail;
        if (appMode === 'game' && !isLoading && activeSessionId) {
            triggerSendMessage(`【系统自动触发：内部指令】现在时间到了！玩家设定的日程：“${memoText}”已生效。请立刻主动开口提醒玩家，用符合你人设的自然语气，绝对不要复述这条系统指令或提及“系统自动触发”，直接进入角色表现出是你自己记住并提醒的。`, true);
        } else {
            showToast(`⏰ 日程提醒: ${memoText}\n(因处于系统菜单或AI正忙，未能触发语音互动)`, 'success', 8000);
        }
    };
    window.addEventListener('trigger-reminder', handleReminder);
    return () => window.removeEventListener('trigger-reminder', handleReminder);
  }); 

  // --- 角色卡管理 ---
  const saveCurrentAsCharCard = () => {
    const newCard = { id: Date.now().toString(), userName: settings.userName, aiName: settings.aiName, prompt: settings.customSystemPrompt };
    setSettings(prev => ({ ...prev, characterList: [...(prev.characterList || []), newCard] })); showToast(`已将【${settings.aiName}】存入角色卡库`, "success");
  };

  const exportCharCard = (card) => {
    const content = `【玩家名称】\n${card.userName}\n【角色名称】\n${card.aiName}\n【系统设定】\n${card.prompt}`; const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${card.aiName}_角色卡.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast(`导出成功: ${card.aiName}_角色卡.txt`, "success");
  };

  const importCharCard = (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result; const playerMatch = text.match(/【玩家名称】\n([\s\S]*?)(?=\n【|$)/); const charMatch = text.match(/【角色名称】\n([\s\S]*?)(?=\n【|$)/); const promptMatch = text.match(/【系统设定】\n([\s\S]*?)(?=\n【|$)/);
      if (!charMatch && !promptMatch) { showToast("解析失败，请确保txt文件包含【角色名称】和【系统设定】等标准标签", "error"); return; }
      const newCard = { id: Date.now().toString(), userName: playerMatch ? playerMatch[1].trim() : '我', aiName: charMatch ? charMatch[1].trim() : '对象', prompt: promptMatch ? promptMatch[1].trim() : '' };
      setSettings(prev => ({ ...prev, characterList: [...(prev.characterList || []), newCard] })); showToast(`成功导入角色卡：${newCard.aiName}`, "success");
    }; reader.readAsText(file); e.target.value = '';
  };

  const deleteCharCard = (id) => { setSettings(prev => ({ ...prev, characterList: prev.characterList.filter(c => c.id !== id) })); };

  const switchCharacter = (card) => {
    if (activeSession?.messages?.length > 0) {
      let targetId = 1; while (saveSlots[targetId] && targetId <= 100) targetId++;
      if (targetId <= 100) {
        const newSave = { id: targetId, title: `[${settings.aiName}] 自动存档`, date: new Date().toLocaleString(), messages: activeSession.messages || [] };
        setSaveSlots(prev => ({ ...prev, [targetId]: newSave })); showToast(`前段对话已自动存至 No.${String(targetId).padStart(3, '0')}`, 'info');
      }
    }
    setSettings(prev => ({ ...prev, userName: card.userName, aiName: card.aiName, customSystemPrompt: card.prompt }));
    createNewSession(); setIsSettingsOpen(false); showToast(`✅ 已切换至角色: ${card.aiName}，全新剧情已就绪`, 'success');
  };

  const handleExportBackup = async () => {
    showToast("正在打包系统数据，请稍候...", "info", 5000);
    try {
      const bgListDB = await loadBgListFromDB() || []; const bgmListDB = await loadBGMFromDB() || [];
      const bgmFiles = await Promise.all(bgmListDB.map(async (bgm) => ({ id: bgm.id, name: bgm.name, base64: await blobToBase64(bgm.blob) })));
      const titleBg = await loadImageFromDB('titleBgImage');
      const safeSettings = { ...settings }; delete safeSettings.openaiBaseUrl; delete safeSettings.openaiApiKey;
      const backupData = { version: "1.0", timestamp: new Date().toISOString(), settings: safeSettings, sessions, activeSessionId, saveSlots, quickSaveData, autoSaveData, bgImages: bgListDB, bgmFiles, titleBgImage: titleBg };
      const blob = new Blob([JSON.stringify(backupData)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); a.download = `VNChat_全量备份_${dateStr}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast("✅ 备份导出成功！", "success");
    } catch (err) { showToast(`导出失败: ${err.message}`, "error"); }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0]; if (!file) return; showToast("正在恢复系统数据，切勿关闭页面...", "info", 8000);
    try {
      const text = await file.text(); const backupData = JSON.parse(text); if (!backupData.version) throw new Error("无效的备份文件格式");
      const currentUrl = settings.openaiBaseUrl; const currentKey = settings.openaiApiKey;
      const newSettings = { ...DEFAULT_SETTINGS, ...backupData.settings, openaiBaseUrl: currentUrl, openaiApiKey: currentKey };
      setSettings(newSettings);
      if (backupData.sessions) setSessions(backupData.sessions); if (backupData.activeSessionId) setActiveSessionId(backupData.activeSessionId);
      if (backupData.saveSlots) setSaveSlots(backupData.saveSlots); if (backupData.quickSaveData !== undefined) setQuickSaveData(backupData.quickSaveData);
      if (backupData.autoSaveData !== undefined) setAutoSaveData(backupData.autoSaveData);
      if (backupData.bgImages && backupData.bgImages.length > 0) { for (const bg of backupData.bgImages) await saveBgItemToDB(bg); setBgList(await loadBgListFromDB()); }
      if (backupData.bgmFiles && backupData.bgmFiles.length > 0) { for (const bgm of backupData.bgmFiles) { const res = await fetch(bgm.base64); const blob = await res.blob(); await saveBGMToDB({ id: bgm.id, name: bgm.name, blob }); } setBgmList(await loadBGMFromDB()); }
      if (backupData.titleBgImage !== undefined) { await saveImageToDB('titleBgImage', backupData.titleBgImage); setLocalTitleBgImage(backupData.titleBgImage || ''); }
      showToast("🎉 全量数据恢复成功！Live2D模型由于安全限制需手动重新导入。", "success", 6000);
    } catch (err) { showToast(`恢复失败: ${err.message}`, "error"); } e.target.value = '';
  };

  const handleFactoryReset = () => { setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); try { indexedDB.deleteDatabase(DB_NAME); } catch (e) {} localStorage.clear(); window.location.reload(); };
  const handleSecondResetClick = () => { setConfirmDialog({ isOpen: true, text: '【最终确认】\n此操作绝对不可逆！\n\n您的所有模型、剧情、音乐和背景即将灰飞烟灭！真的要恢复出厂设置吗？', onConfirm: handleFactoryReset }); };
  const handleFirstResetClick = () => { setConfirmDialog({ isOpen: true, text: '警告：您即将清空所有系统数据！\n（包含所有存档、模型缓存、背景图、BGM、角色卡和系统设置）\n\n确定要继续吗？', onConfirm: handleSecondResetClick }); };

  const currentBgItem = bgList.find(b => b.id === settings.currentBgId);
  const activeBgUrl = appMode === 'title' ? (localTitleBgImage || '') : (currentBgItem ? currentBgItem.dataUrl : '');
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const latestMessage = activeSession?.messages?.[activeSession.messages.length - 1];

  const handleEnterVisualAdjust = (mode) => {
    if (mode === 'model' || mode === 'dialog') { if (appMode === 'title') { setAppMode('game'); showToast('已自动切换至游戏界面以进行排版预览', 'info'); } } 
    else if (mode === 'title_model') { if (appMode === 'game') { setAppMode('title'); showToast('已自动切换至主标题界面以进行排版预览', 'info'); } }
    setVisualAdjustMode(mode);
  };

  useEffect(() => {
    if (!settings.enableAutoSave || appMode !== 'game' || !activeSession || activeSession.messages.length === 0) return;
    const intervalId = setInterval(() => {
      const data = { date: new Date().toLocaleString(), messages: activeSession.messages, title: `[${settings.aiName}] 自动存档 (Auto Save)` };
      setAutoSaveData(data); showToast('🔄 已自动保存游戏进度至 AUTO 槽位', 'info', 2000);
    }, settings.autoSaveInterval * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [settings.enableAutoSave, settings.autoSaveInterval, appMode, activeSession, showToast, settings.aiName]);

  const handleAutoSaveSButton = () => {
    let targetId = 1; while (saveSlots[targetId] && targetId <= 100) targetId++;
    if (targetId > 100) { showToast('存档已满，请手动覆盖历史存档。', 'error'); setSlMode('save'); setIsSaveLoadUIOpen(true); return; }
    let defaultTitle = `[${settings.aiName}] 存档`; const newSave = { id: targetId, title: defaultTitle, date: new Date().toLocaleString(), messages: activeSession.messages || [] };
    setSaveSlots(prev => ({ ...prev, [targetId]: newSave })); setSlPage(Math.ceil(targetId / 10)); setSlMode('save'); setIsSaveLoadUIOpen(true); setEditingSlotId(targetId); setEditSaveName(defaultTitle);
  };

  const handleQuickSave = () => { const data = { date: new Date().toLocaleString(), messages: activeSession?.messages || [], title: `[${settings.aiName}] 快捷系统存档 (Quick Save)` }; setQuickSaveData(data); showToast('✨ 已完成快捷保存 (Quick Save)', 'success'); };

  const handleQuickLoad = () => {
    if (!quickSaveData) { showToast('当前没有快捷存档数据！', 'error'); return; }
    setConfirmDialog({ isOpen: true, text: '确定要读取快捷存档吗？\n当前未保存的对话进度将会丢失！', onConfirm: () => { updateSessionMessages(activeSessionId, quickSaveData.messages, '读取的剧情'); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); setIsSaveLoadUIOpen(false); setAppMode('game'); showToast('已成功加载快捷存档', 'success'); } });
  };

  const handleAutoLoad = () => {
    if (!autoSaveData) { showToast('当前没有自动存档数据！', 'error'); return; }
    setConfirmDialog({ isOpen: true, text: '确定要读取自动存档吗？\n当前未保存的对话进度将会丢失！', onConfirm: () => { updateSessionMessages(activeSessionId, autoSaveData.messages, '读取的剧情'); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); setIsSaveLoadUIOpen(false); setAppMode('game'); showToast('已成功恢复自动存档进度', 'success'); } });
  };

  const handleSlotClick = (slotId) => {
    if (editingSlotId === slotId) return; 
    if (slMode === 'save') {
      let defaultTitle = `[${settings.aiName}] 存档`;
      if (saveSlots[slotId]) {
        setConfirmDialog({ isOpen: true, text: `确定要覆盖 No.${String(slotId).padStart(3, '0')} 存档吗？`, onConfirm: () => { const newSave = { id: slotId, title: defaultTitle, date: new Date().toLocaleString(), messages: activeSession.messages || [] }; setSaveSlots(prev => ({ ...prev, [slotId]: newSave })); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); setEditingSlotId(slotId); setEditSaveName(defaultTitle); } });
      } else {
        const newSave = { id: slotId, title: defaultTitle, date: new Date().toLocaleString(), messages: activeSession.messages || [] }; setSaveSlots(prev => ({ ...prev, [slotId]: newSave })); setEditingSlotId(slotId); setEditSaveName(defaultTitle);
      }
    } else {
      const data = saveSlots[slotId]; if (!data) return; 
      setConfirmDialog({ isOpen: true, text: `确定要读取 No.${String(slotId).padStart(3, '0')} 的进度吗？\n当前未保存的对话将会丢失！`, onConfirm: () => { updateSessionMessages(activeSessionId, data.messages, data.title); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); setIsSaveLoadUIOpen(false); setAppMode('game'); showToast('已成功加载进度', 'success'); } });
    }
  };

  const handleSaveNameConfirm = () => { if (editingSlotId !== null && saveSlots[editingSlotId]) { setSaveSlots(prev => ({ ...prev, [editingSlotId]: { ...prev[editingSlotId], title: editSaveName.trim() || `[${settings.aiName}] 存档` } })); } setEditingSlotId(null); };

  useEffect(() => { if (editingSlotId && editInputRef.current) { editInputRef.current.focus(); editInputRef.current.select(); } }, [editingSlotId]);

  const getPages = useCallback((text) => {
    if (!text) return [""];
    const paragraphs = text.split('\n'); const pages = []; let currentPage = ""; let currentLines = 0; const charsPerLine = 35; 
    for (const p of paragraphs) {
      const pLines = Math.max(1, Math.ceil(p.length / charsPerLine));
      if (currentLines > 0 && currentLines + pLines > settings.vnLinesPerPage) { pages.push(currentPage); currentPage = p; currentLines = pLines; } 
      else { currentPage += (currentPage ? '\n' : '') + p; currentLines += pLines; }
    }
    if (currentPage) pages.push(currentPage); return pages;
  }, [settings.vnLinesPerPage]);

  const pages = latestMessage ? getPages(latestMessage.content) : [""];
  const currentDisplay = pages[vnPage] || pages[pages.length - 1] || "";
  const hasNextPage = vnPage < pages.length - 1;

  const handleDialogClick = () => { if (hasNextPage) setVnPage(prev => prev + 1); };

  const handleWheel = useCallback((e) => {
    if (wheelTimeoutRef.current) return;
    const isScrollingDown = e.deltaY > 0; const isScrollingUp = e.deltaY < 0;
    if (isScrollingDown && hasNextPage) { setVnPage(p => p + 1); } else if (isScrollingUp && vnPage > 0) { setVnPage(p => p - 1); }
    wheelTimeoutRef.current = setTimeout(() => { wheelTimeoutRef.current = null; }, 250); 
  }, [hasNextPage, vnPage]);

  const handleSkip = useCallback((e) => { e.stopPropagation(); if (pages.length > 0) { setVnPage(pages.length - 1); } }, [pages.length]);

  useEffect(() => { if (vnTextContainerRef.current) vnTextContainerRef.current.scrollTop = vnTextContainerRef.current.scrollHeight; }, [currentDisplay]);

  const loadScripts = async () => {
    if (window.PIXI && window.PIXI.live2d) return true;
    const loadScript = (src) => new Promise((resolve, reject) => { if (document.querySelector(`script[src="${src}"]`)) return resolve(); const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
    const backupModule = window.module; const backupExports = window.exports; window.module = undefined; window.exports = undefined;
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.5.10/browser/pixi.min.js');
      await loadScript('https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js');
      await loadScript('https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js');
      return true;
    } catch (error) { setLive2dStatus('引擎库加载失败'); return false; } finally { if (backupModule !== undefined) window.module = backupModule; if (backupExports !== undefined) window.exports = backupExports; }
  };

  useEffect(() => {
    let isMounted = true;
    const initLive2D = async () => {
      setLive2dStatus('检查本地模型...'); let files = [];
      if (settings.currentModelId) {
         const multiModel = await getMultiModelFromDB(settings.currentModelId);
         if (multiModel && multiModel.files) {
           files = multiModel.files.map(item => {
             if (item.blob && item.path) { const fileName = item.path.split('/').pop(); const f = new File([item.blob], fileName, { type: item.blob.type || 'application/octet-stream' }); Object.defineProperty(f, 'webkitRelativePath', { value: item.path, writable: false }); return f; }
             return item; 
           });
         }
      }
      if (!files || files.length === 0) files = await loadModelFilesFromDB() || [];
      if (!files || files.length === 0) return setLive2dStatus('未检测到模型，请在系统设置(⚙)中导入模型');

      setLive2dStatus('加载引擎中...'); const scriptsLoaded = await loadScripts(); if (!scriptsLoaded || !isMounted) return;
      if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) return setLive2dStatus('Live2D 插件未就绪，环境可能被拦截');
      setLive2dStatus('读取本地模型文件中...');

      if (!appRef.current) { appRef.current = new window.PIXI.Application({ view: canvasRef.current, transparent: true, autoDensity: true, resizeTo: containerRef.current, backgroundAlpha: 0 }); }
      const app = appRef.current;
      if (modelRef.current) { app.stage.removeChild(modelRef.current); modelRef.current.destroy({ children: true, texture: true, baseTexture: true }); modelRef.current = null; }

      try {
        let patchedFiles = [...files]; const expFiles = patchedFiles.filter(f => f.name && f.name.match(/\.exp3?\.json$/i)); const modelFileIndex = patchedFiles.findIndex(f => f.name && f.name.match(/\.model3?\.json$/i));
        if (expFiles.length > 0 && modelFileIndex !== -1) {
          try {
            const modelFile = patchedFiles[modelFileIndex]; const text = await modelFile.text(); const json = JSON.parse(text);
            if (json.Version >= 3 || json.FileReferences) {
              if (!json.FileReferences) json.FileReferences = {};
              if (!json.FileReferences.Expressions || json.FileReferences.Expressions.length === 0) {
                const modelPath = modelFile.webkitRelativePath || modelFile.name; const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/') + 1);
                json.FileReferences.Expressions = expFiles.map(f => { const expPath = f.webkitRelativePath || f.name; let relPath = expPath; if (modelDir && expPath.startsWith(modelDir)) relPath = expPath.substring(modelDir.length); return { Name: f.name.replace(/\.exp3?\.json$/i, ''), File: relPath }; });
                const newBlob = new Blob([JSON.stringify(json)], { type: 'application/json' }); const newFile = new File([newBlob], modelFile.name, { type: modelFile.type || 'application/json' }); Object.defineProperty(newFile, 'webkitRelativePath', { value: modelPath, writable: false }); patchedFiles[modelFileIndex] = newFile;
              }
            }
          } catch (e) {}
        }
        const Live2DModel = window.PIXI.live2d.Live2DModel; const model = await Live2DModel.from(patchedFiles); if (!isMounted) { model.destroy(); return; }
        app.stage.addChild(model); modelRef.current = model; updateModelTransform(); setLive2dStatus(''); 
        const rawExps = model.internalModel?.settings?.expressions || model.internalModel?.settings?.FileReferences?.Expressions || [];
        const expList = rawExps.map((e, idx) => { let cleanName = e.Name || e.name || e.File || e.file || `表情 ${idx + 1}`; cleanName = cleanName.split('/').pop().replace(/\.exp3?\.json$/i, ''); return { id: e.Name || e.name || idx, name: cleanName }; });
        setExpressions(expList);
        if (settings.currentExpressionId !== null && settings.currentExpressionId !== undefined) { try { model.expression(settings.currentExpressionId); } catch(e) {} }
        const handleMouseMove = (event) => { if (!modelRef.current) return; modelRef.current.focus(event.clientX, event.clientY); }; window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
      } catch (error) { setLive2dStatus(`本地模型加载失败: ${error.message}`); }
    };
    initLive2D(); return () => { isMounted = false; };
  }, [modelReloadTrigger]);

  const updateModelTransform = useCallback(() => {
    if (modelRef.current && containerRef.current) {
      const model = modelRef.current; const containerWidth = containerRef.current.clientWidth; const containerHeight = containerRef.current.clientHeight;
      const isTitle = appMode === 'title'; const scale = isTitle ? currentModelConfig.titleScale : currentModelConfig.scale; const x = isTitle ? currentModelConfig.titleX : currentModelConfig.x; const y = isTitle ? currentModelConfig.titleY : currentModelConfig.y;
      model.scale.set(scale); model.x = (containerWidth / 2) - (model.width / 2) + parseFloat(x); model.y = (containerHeight / 2) - (model.height / 2) + parseFloat(y);
      model.visible = isTitle ? !settings.hideTitleLive2d : !settings.hideLive2dModel;
    }
  }, [appMode, currentModelConfig, settings.hideTitleLive2d, settings.hideLive2dModel]);

  useEffect(() => { updateModelTransform(); }, [updateModelTransform]);
  useEffect(() => { const handleResize = () => updateModelTransform(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, [updateModelTransform]);

  const handleModelContainerClick = useCallback(() => {
    if (appMode === 'title' || visualAdjustMode) return; 
    if (settings.enableClickExpression && expressions.length > 0 && modelRef.current) { const randomExp = expressions[Math.floor(Math.random() * expressions.length)]; try { modelRef.current.expression(randomExp.id); setSettings(s => ({...s, currentExpressionId: randomExp.id})); } catch(e) {} }
  }, [settings.enableClickExpression, expressions, appMode, visualAdjustMode]);

  const handleModelUpload = async (e) => {
    const fileList = Array.from(e.target.files); if (!fileList.length) return;
    const hasJson = fileList.some(f => f.name.match(/\.model3?\.json$/i)); if (!hasJson) return showToast("错误：所选文件夹中不包含 model.json 或 model3.json 模型配置文件！", "error");
    const folderName = fileList[0].webkitRelativePath.split('/')[0] || '未命名模型';
    if (/[\u4e00-\u9fa5]/.test(folderName)) { showToast("⚠️ 警告：模型文件夹包含中文！\n由于浏览器本地数据库限制，含有中文的路径会导致引擎抛出 'File doesn't exist' 的错误并导致花屏或无法加载。\n👉 请先将电脑上的文件夹重命名为【纯英文】，然后重新拖入！", "error", 8000); e.target.value = ''; return; }
    showToast("正在导入模型，请稍候...", "info"); const modelId = Date.now().toString();
    const processedFiles = fileList.map(f => ({ blob: f, path: f.webkitRelativePath || f.name }));
    const newModel = { id: modelId, name: folderName, files: processedFiles };
    try {
      await saveMultiModelToDB(newModel); setModelsList(prev => [...prev, { id: modelId, name: folderName }]); showToast(`模型 [${folderName}] 导入成功！`, "success");
      if (!settings.currentModelId) { setSettings(s => ({ ...s, currentModelId: modelId })); setModelReloadTrigger(prev => prev + 1); }
    } catch(err) { showToast(`模型保存失败: ${err.message}`, "error"); } e.target.value = '';
  };

  const switchModel = (id) => { setSettings(s => ({...s, currentModelId: id})); setModelReloadTrigger(prev => prev + 1); setIsModelMenuOpen(false); showToast("正在切换模型...", "info"); };
  const removeModel = async (id) => { await deleteMultiModelFromDB(id); const updated = modelsList.filter(m => m.id !== id); setModelsList(updated); if (settings.currentModelId === id) { setSettings(s => ({...s, currentModelId: updated.length > 0 ? updated[0].id : null})); setModelReloadTrigger(prev => prev + 1); } };
  const createNewSession = () => { const newSession = { id: Date.now().toString(), title: '新剧情', messages: [], memorySummary: '' }; setSessions(prev => [newSession, ...prev]); setActiveSessionId(newSession.id); };
  const deleteSession = (e, id) => { e.stopPropagation(); const updated = sessions.filter(s => s.id !== id); setSessions(updated); if (activeSessionId === id) setActiveSessionId(updated.length > 0 ? updated[0].id : null); if (updated.length === 0) createNewSession(); };

  const triggerMemoryCompression = async (sessionId, sessionMessages, currentSummary) => {
    if (isCompressingMemory) return; setIsCompressingMemory(true); showToast("🧠 上下文已达上限，正在后台提取记忆档案...", "info", 5000);
    const keepCount = Math.min(sessionMessages.length - 1, 20); const messagesToCompress = sessionMessages.slice(0, sessionMessages.length - keepCount);
    try {
        let rawBaseUrl = settings.openaiBaseUrl.trim(); if (rawBaseUrl && !/^https?:\/\//i.test(rawBaseUrl)) rawBaseUrl = 'https://' + rawBaseUrl; rawBaseUrl = rawBaseUrl.replace(/\/$/, ''); if (rawBaseUrl.endsWith('/v1')) rawBaseUrl = rawBaseUrl.slice(0, -3);
        const fetchUrl = buildProxyUrl(`${rawBaseUrl}/v1/chat/completions`);
        const historyText = messagesToCompress.map(m => `${m.role === 'user' ? settings.userName : settings.aiName}: ${m.content}`).join('\n');
        const prompt = `你是一个记忆提取助手。请根据以下历史对话，提取并更新我们之间的【关键人物关系、已发生的重要事件、双方设定的细节】。如果之前已有记忆总结，请将其与新的对话内容完美融合，生成一份最新的、连贯的、结构清晰的长期记忆档案。\n\n【旧的记忆档案】\n${currentSummary || '无'}\n\n【近期新增对话】\n${historyText}\n\n请直接输出最新的记忆总结内容文本（尽量控制在500字以内），不要输出任何前缀、寒暄或Markdown代码块标签。`;
        const headers = { 'Content-Type': 'application/json' }; if (settings.openaiApiKey) headers['Authorization'] = `Bearer ${settings.openaiApiKey}`;
        const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify({ model: settings.aiModel, messages: [{ role: 'user', content: prompt }], stream: false }) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json(); let newSummary = data.choices?.[0]?.message?.content || data.message || ""; newSummary = newSummary.trim();
        if (newSummary) {
            setSessions(prev => prev.map(s => { if (s.id === sessionId) { const remainingMessages = s.messages.filter(m => !messagesToCompress.includes(m)); return { ...s, memorySummary: newSummary, messages: remainingMessages }; } return s; }));
            showToast("✨ 记忆归档完成！长文本上下文已无缝替换为高浓度长期记忆。", "success");
        }
    } catch (err) { console.error("记忆压缩失败:", err); showToast("⚠️ 记忆压缩失败，将暂不清理上下文。", "error"); } finally { setIsCompressingMemory(false); }
  };

  const generatePlotOptions = async (messages) => {
    if (!messages || messages.length === 0) return; setIsGeneratingReplies(true); setSuggestedReplies([]);
    try {
      const isIndependent = settings.plotApiMode === 'independent'; let rawBaseUrl = isIndependent ? settings.plotBaseUrl.trim() : settings.openaiBaseUrl.trim(); let apiKey = isIndependent ? settings.plotApiKey.trim() : settings.openaiApiKey.trim(); let aiModel = isIndependent ? settings.plotModel.trim() : settings.aiModel.trim();
      if (!rawBaseUrl) throw new Error("API 地址未配置，无法生成选项"); if (rawBaseUrl && !/^https?:\/\//i.test(rawBaseUrl)) rawBaseUrl = 'https://' + rawBaseUrl; rawBaseUrl = rawBaseUrl.replace(/\/$/, ''); if (rawBaseUrl.endsWith('/v1')) rawBaseUrl = rawBaseUrl.slice(0, -3);
      const fetchUrl = buildProxyUrl(`${rawBaseUrl}/v1/chat/completions`); const historyText = messages.slice(-6).map(m => `${m.role === 'user' ? settings.userName : settings.aiName}: ${m.content}`).join('\n');
      const systemPrompt = "你是一个视觉小说(VN)游戏的选项生成器。请根据给定的对话历史，严格输出一个包含3个回复选项的JSON数组（仅包含字符串，不要任何其他解释，不要Markdown标记）。";
      const userPrompt = `为玩家（“${settings.userName}”）生成3个简短、符合语境且能够引导不同剧情走向的回复选项（比如包含温柔、吐槽、疑问等不同情绪）。\n\n对话历史：\n${historyText}\n\n请严格输出JSON数组格式，例如：["选项1", "选项2", "选项3"]`;
      const headers = { 'Content-Type': 'application/json' }; if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify({ model: aiModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], stream: false }) });
      if (!response.ok) throw new Error(`HTTP ${response.status} 错误`);
      const data = await response.json(); let textContent = data.choices?.[0]?.message?.content || data.message || ""; textContent = textContent.replace(/```json\n?/ig, '').replace(/```\n?/g, '').trim();
      const replies = JSON.parse(textContent); if (Array.isArray(replies)) setSuggestedReplies(replies.slice(0, 3));
    } catch (e) {} finally { setIsGeneratingReplies(false); }
  };

  const generateSummaryWithGemini = async () => {
    if (!activeSession?.messages || activeSession.messages.length === 0) return; setIsGeneratingSummary(true);
    try {
      const apiKey = ""; const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const historyText = activeSession.messages.map(m => `${m.role === 'user' ? settings.userName : settings.aiName}: ${m.content}`).join('\n');
      const prompt = `请用一段富有画面感和文学性的文字（约100字左右），总结以下这段视觉小说风格的剧情发展：\n\n${historyText}`;
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await response.json(); setStorySummary(data.candidates?.[0]?.content?.parts?.[0]?.text || "无法生成摘要。");
    } catch (e) { setStorySummary("摘要生成失败：" + e.message); } finally { setIsGeneratingSummary(false); }
  };

  const getFormatBaseUrl = () => { let baseUrl = settings.openaiBaseUrl.trim(); if (baseUrl && !/^https?:\/\//i.test(baseUrl)) baseUrl = 'https://' + baseUrl; baseUrl = baseUrl.replace(/\/$/, ''); if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3); return baseUrl; };
  const buildProxyUrl = (targetUrl) => { if (settings.corsProxyType === 'corsproxy') return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`; if (settings.corsProxyType === 'codetabs') return `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`; if (settings.corsProxyType === 'fringezone') return `https://cors-proxy.fringe.zone/${targetUrl}`; if (settings.corsProxyType === 'custom' && settings.customCorsProxyUrl) return `${settings.customCorsProxyUrl}${encodeURIComponent(targetUrl)}`; return targetUrl; };

  const fetchOpenAIModels = async () => {
    if (!settings.openaiBaseUrl) return showToast("请先输入接口地址 (Base URL)", "error"); setIsFetchingModels(true);
    try {
      const fetchUrl = buildProxyUrl(`${getFormatBaseUrl()}/v1/models`); const headers = { 'Content-Type': 'application/json' }; if (settings.openaiApiKey) headers['Authorization'] = `Bearer ${settings.openaiApiKey}`;
      const response = await fetch(fetchUrl, { headers }); if (!response.ok) throw new Error(`HTTP 错误 ${response.status}`); const responseText = await response.text(); let data;
      try { data = JSON.parse(responseText); } catch (parseError) { throw new Error('此接口未提供合法的模型列表。\n👉 无需强制刷新！请直接在"模型名称"框内手动输入即可聊天。'); }
      if (data && data.data && Array.isArray(data.data)) { const models = data.data.map(m => m.id).sort(); setAvailableModels(models); if (models.length > 0 && !models.includes(settings.aiModel)) setSettings(prev => ({ ...prev, aiModel: models[0] })); showToast(`成功获取 ${models.length} 个模型！`, 'success'); } else { throw new Error('格式异常'); }
    } catch (error) { showToast(`获取失败, 请确认服务畅通。\n${error.message}`, 'error', 8000); } finally { setIsFetchingModels(false); }
  };

  const processAudioQueue = useCallback(() => {
    if (isPlayingTTSRef.current || audioQueueRef.current.length === 0) return; isPlayingTTSRef.current = true;
    const nextUrl = audioQueueRef.current.shift(); activeAudioRef.current = new window.Audio(nextUrl);
    activeAudioRef.current.volume = settings.ttsVolume; activeAudioRef.current.playbackRate = settings.ttsPlaybackRate || 1.0; 
    activeAudioRef.current.onended = () => { URL.revokeObjectURL(nextUrl); if (ttsPauseRef.current > 0) { ttsTimeoutRef.current = setTimeout(() => { isPlayingTTSRef.current = false; processAudioQueue(); }, ttsPauseRef.current); } else { isPlayingTTSRef.current = false; processAudioQueue(); } };
    activeAudioRef.current.play().catch(e => { console.warn("TTS 播放失败:", e); isPlayingTTSRef.current = false; processAudioQueue(); });
  }, [settings.ttsPlaybackRate, settings.ttsVolume]);

  const ttsPauseRef = useRef(settings.ttsSentencePause);
  useEffect(() => { ttsPauseRef.current = settings.ttsSentencePause; }, [settings.ttsSentencePause]);

  const enqueueTTS = useCallback((text) => {
    if (!settings.ttsEnabled || !settings.ttsUrlTemplate || !text.trim() || settings.workMode) return;
    try {
      const url = settings.ttsUrlTemplate.replace('{text}', encodeURIComponent(text.trim())).replace('{lang}', settings.ttsLanguage).replace('{ref_audio}', encodeURIComponent(settings.ttsRefAudio)).replace('{ref_text}', encodeURIComponent(settings.ttsRefText)).replace('{ref_lang}', settings.ttsRefLang);
      const preloader = new window.Audio(); preloader.preload = 'auto'; preloader.src = url; audioQueueRef.current.push(url); preloader.load(); processAudioQueue();
    } catch (error) {}
  }, [settings, processAudioQueue]);

  const clearTTSQueue = useCallback(() => {
    audioQueueRef.current = []; if (activeAudioRef.current) { activeAudioRef.current.pause(); activeAudioRef.current.src = ''; activeAudioRef.current = null; }
    isPlayingTTSRef.current = false; if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current); 
  }, []);

  const handleImageSelect = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => setSelectedImage(ev.target.result); reader.readAsDataURL(file); e.target.value = ''; };

  // ✨ 终极版 triggerSendMessage：支持隐藏指令、无感注入和自然语言工具调用
  const triggerSendMessage = async (overrideText = null, isHidden = false) => {
    const targetText = overrideText !== null ? overrideText : (inputValue.trim() || '请查看此图片');
    if (!targetText && !selectedImage) return; 
    if (!activeSessionId || isLoading) return;
    
    const userMessage = { role: 'user', content: targetText, image: isHidden ? null : selectedImage };
    if (overrideText === null) { setInputValue(''); setSelectedImage(null); setSuggestedReplies([]); setVnPage(0); }
    clearTTSQueue();

    const currentHistory = activeSession?.messages || [];
    const uiMessages = isHidden ? [...currentHistory] : [...currentHistory, userMessage];
    const apiRequestHistory = isHidden ? [...currentHistory, userMessage] : [...currentHistory, userMessage];

    updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: '', isStreaming: settings.enableStreaming }], (uiMessages.length === 0 && overrideText === null) ? userMessage.content.slice(0, 15) : undefined);
    setIsLoading(true);

    try {
      const fetchUrl = buildProxyUrl(`${getFormatBaseUrl()}/v1/chat/completions`);
      const langMap = { 'zh': '中文', 'ja': '日文', 'en': '英文', 'ko': '韩文' }; const dispLangStr = langMap[settings.displayLanguage] || settings.displayLanguage; const voiceLangStr = langMap[settings.ttsLanguage] || settings.ttsLanguage;
      
      let finalSystemPrompt = settings.customSystemPrompt;
      const now = new Date(); 
      // 构建安全的时间字符串供模型参考
      const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0'); const min = String(now.getMinutes()).padStart(2, '0'); const ss = String(now.getSeconds()).padStart(2, '0');
      const timeString = `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;

      let systemStatusInjection = `\n\n【系统实时状态】\n当前现实时间：${timeString}\n`;
      const activeMemos = memos.filter(m => !m.isDone);
      if (activeMemos.length > 0) { systemStatusInjection += `玩家当前的备忘录/日程安排如下：\n${activeMemos.map(m => `- ${m.date ? '['+new Date(m.date).toLocaleString()+'] ' : ''}${m.text}`).join('\n')}\n(请作为智能助手在对话中适时提醒，或者结合这些日程进行合理互动。)\n`; }
      if (activeSession?.memorySummary) { systemStatusInjection += `\n【长期记忆档案(重要前情提要)】\n${activeSession.memorySummary}\n(请牢记以上你们之前对话总结的设定与重要事件)\n`; }
      
      // ✨ 注入基于自然语言的备忘录写入工具 (NL-Function-Calling)
      systemStatusInjection += `\n【自动日程管理指令 (最高优先级)】\n如果玩家在对话中明确要求你“几分钟/几小时后提醒我”或安排未来某个时间的日程，你必须用自然的语气答应下来。并且，**必须在你回复内容的最末尾，另起一行输出以下隐藏 JSON 标签格式**，系统会拦截它为你定闹钟：\n<ADD_MEMO>{"time": "YYYY/MM/DD HH:mm:ss", "text": "要提醒的简短事项"}</ADD_MEMO>\n注意：请根据当前时间(${timeString})精准计算出目标时间。绝不要向玩家透露这个标签和这套机制！`;

      finalSystemPrompt += systemStatusInjection;
      
      if (settings.workMode) { finalSystemPrompt += `\n\n【系统最高指令：工作/编程模式已开启】\n请你完全无视前文中关于“简短回答”、“字数限制”、“二次元口癖”等娱乐性要求。请以极其专业、详尽的态度解答问题。如果涉及代码编写，请务必输出完整且包含注释的完整代码块，绝对不要因为长度而截断或省略！`; }
      if (settings.enableTranslation) { finalSystemPrompt += `\n\n【重要强制指令】已开启同声传译模式！你必须严格输出两种语言版本，格式必须为：\n<VOICE>此处填写${voiceLangStr}版本的回复，用于语音合成</VOICE>\n<TEXT>此处填写${dispLangStr}版本的回复，用于屏幕显示</TEXT>\n绝不要输出任何多余的字符或Markdown。`; }
      
      const apiMessages = [{ role: 'system', content: finalSystemPrompt }, ...apiRequestHistory.map(m => { if (m.image && m.role === 'user') { return { role: m.role, content: [ { type: 'text', text: m.content }, { type: 'image_url', image_url: { url: m.image } } ] }; } return { role: m.role, content: m.content }; })];
      const headers = { 'Content-Type': 'application/json' }; if (settings.openaiApiKey) headers['Authorization'] = `Bearer ${settings.openaiApiKey}`;

      const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify({ model: settings.aiModel, messages: apiMessages, stream: settings.enableStreaming }) });
      if (!response.ok) throw new Error(`HTTP ${response.status} 错误`);

      if (settings.enableStreaming) {
        let networkDone = false, networkError = null, fullContentBuffer = "", displayedContent = ""; let ttsBuffer = ""; let processedVoiceLength = 0; 
        const effectiveSpeed = settings.workMode ? Math.max(5, settings.typingSpeed / 3) : settings.typingSpeed;

        const typeInterval = setInterval(() => {
          // ✨ 流式预处理：一旦发现 <ADD_MEMO 标记，截断后续显示以实现无痕隐藏
          let effectiveBuffer = fullContentBuffer;
          const memoIdx = effectiveBuffer.indexOf('<ADD_MEMO');
          if (memoIdx !== -1) {
              effectiveBuffer = effectiveBuffer.substring(0, memoIdx);
          }

          let targetDisplayText = effectiveBuffer;
          if (settings.enableTranslation) {
             const match = effectiveBuffer.match(/<TEXT>([\s\S]*?)(?:<\/TEXT>|$)/i);
             if (match) targetDisplayText = match[1]; else if (effectiveBuffer.length > 30 && !/<VOICE>/i.test(effectiveBuffer) && !/<TEXT>/i.test(effectiveBuffer)) { targetDisplayText = effectiveBuffer; } else { targetDisplayText = ""; }
          }
          if (displayedContent.length < targetDisplayText.length) {
            displayedContent += targetDisplayText[displayedContent.length]; updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: displayedContent, isStreaming: true }]);
          } else if (networkDone) {
            clearInterval(typeInterval); setIsLoading(false);
            if (networkError) { showToast(`流式中断: ${networkError.message}`, "error"); updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: displayedContent + `\n[连接中断]`, isError: true }]); } 
            else {
              const finalMessages = [...uiMessages, { role: 'assistant', content: targetDisplayText.trim() || displayedContent }]; updateSessionMessages(activeSessionId, finalMessages); if (settings.enablePlotOptions) generatePlotOptions(finalMessages); 
              if (settings.enableMemory && finalMessages.length >= settings.memoryInterval) { triggerMemoryCompression(activeSessionId, finalMessages, activeSession?.memorySummary); }
            }
          }
        }, effectiveSpeed);

        try {
          const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8'); let done = false, tempBuffer = "";
          while (!done) {
            const { value, done: readerDone } = await reader.read(); done = readerDone;
            if (value) {
              tempBuffer += decoder.decode(value, { stream: true }); const lines = tempBuffer.split('\n'); tempBuffer = lines.pop();
              for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                  try { 
                    const data = JSON.parse(trimmedLine.slice(6)); 
                    if (data.choices?.[0]?.delta?.content) {
                       const deltaText = data.choices[0].delta.content; fullContentBuffer += deltaText; 
                       
                       // ✨ 如果没开始写备忘标签，才处理 TTS
                       if (fullContentBuffer.indexOf('<ADD_MEMO') === -1) {
                           if (settings.enableTranslation) {
                               const match = fullContentBuffer.match(/<VOICE>([\s\S]*?)(?:<\/VOICE>|$)/i);
                               if (match) { const currentVoiceText = match[1]; const newVoiceChunk = currentVoiceText.slice(processedVoiceLength); ttsBuffer += newVoiceChunk; processedVoiceLength = currentVoiceText.length; } else if (fullContentBuffer.length > 30 && !/<VOICE>/i.test(fullContentBuffer) && !/<TEXT>/i.test(fullContentBuffer)) { ttsBuffer += deltaText; }
                           } else { ttsBuffer += deltaText; }
                           let matchPunc;
                           while ((matchPunc = ttsBuffer.match(/^([\s\S]*?[。！？\.\!\?\n，,、]+)/))) {
                               const chunk = matchPunc[1]; if (chunk.trim()) enqueueTTS(chunk.trim()); ttsBuffer = ttsBuffer.slice(chunk.length);
                           }
                       }
                    }
                  } catch (e) {}
                }
              }
            }
          }
        } catch (err) { networkError = err; } finally { 
          networkDone = true; 
          if (ttsBuffer.trim()) enqueueTTS(ttsBuffer.trim()); 
          // ✨ 网络完全接收完毕后，解析潜伏的自动备忘录
          const memoMatch = fullContentBuffer.match(/<ADD_MEMO>([\s\S]*?)(?:<\/ADD_MEMO>|$)/i);
          if (memoMatch) {
             try {
                 const memoData = JSON.parse(memoMatch[1].trim());
                 if (memoData.time && memoData.text) {
                     const memoDate = new Date(memoData.time);
                     if (!isNaN(memoDate.getTime())) {
                         setMemos(prev => [{ id: Date.now().toString(), text: memoData.text, date: memoData.time, isDone: false, hasReminded: false }, ...prev]);
                         showToast(`已自动为您添加日程: ${memoData.text}`, "success");
                     }
                 }
             } catch(e) { console.log("解析自动备忘录JSON失败", e); }
          }
        }

      } else {
        const data = await response.json(); if (data.error) throw new Error(data.error.message || 'API 返回错误');
        let assistantContent = data.choices?.[0]?.message?.content || data.message || "";
        
        // ✨ 非流式处理自动备忘录提取
        const memoMatch = assistantContent.match(/<ADD_MEMO>([\s\S]*?)(?:<\/ADD_MEMO>|$)/i);
        if (memoMatch) {
             try {
                 const memoData = JSON.parse(memoMatch[1].trim());
                 if (memoData.time && memoData.text) {
                     const memoDate = new Date(memoData.time);
                     if (!isNaN(memoDate.getTime())) {
                         setMemos(prev => [{ id: Date.now().toString(), text: memoData.text, date: memoData.time, isDone: false, hasReminded: false }, ...prev]);
                         showToast(`已自动为您添加日程: ${memoData.text}`, "success");
                     }
                 }
             } catch(e) { console.log("解析自动备忘录JSON失败", e); }
        }
        
        assistantContent = assistantContent.replace(/<ADD_MEMO>[\s\S]*?(?:<\/ADD_MEMO>|$)/gi, '').trim();

        let displayContent = assistantContent; let voiceContent = assistantContent;
        if (settings.enableTranslation) { displayContent = (assistantContent.match(/<TEXT>([\s\S]*?)(?:<\/TEXT>|$)/i)?.[1] || assistantContent).trim(); voiceContent = (assistantContent.match(/<VOICE>([\s\S]*?)(?:<\/VOICE>|$)/i)?.[1] || assistantContent).trim(); }
        const finalMessages = [...uiMessages, { role: 'assistant', content: displayContent }]; updateSessionMessages(activeSessionId, finalMessages); enqueueTTS(voiceContent); 
        if (settings.enablePlotOptions) generatePlotOptions(finalMessages); setIsLoading(false);
        if (settings.enableMemory && finalMessages.length >= settings.memoryInterval) { triggerMemoryCompression(activeSessionId, finalMessages, activeSession?.memorySummary); }
      }
    } catch (error) { showToast(`发送失败: ${error.message}`, "error"); updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: `[系统错误]: ${error.message}`, isError: true }]); setIsLoading(false); }
  };

  const handleSendMessage = () => triggerSendMessage();

  const updateSessionMessages = (id, newMessages, newTitle) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, messages: newMessages, title: newTitle || s.title } : s));
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  const handleStartGame = () => { 
    if (autoSaveData && autoSaveData.messages && autoSaveData.messages.length > 0) {
      setConfirmDialog({
        isOpen: true, text: '检测到存在【自动存档】记录！\n开始新剧情将会覆盖该记录。\n是否需要将其迁移至常规存档位进行备份？', confirmText: '迁移备份并开始', cancelText: '取消',
        thirdButton: { text: '直接覆盖开始', onClick: () => { setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); createNewSession(); setAppMode('game'); } },
        onConfirm: () => {
          let targetId = 1; while (saveSlots[targetId] && targetId <= 100) targetId++;
          if (targetId <= 100) { const newSave = { id: targetId, title: `[${settings.aiName}自动保存迁移]`, date: autoSaveData.date || new Date().toLocaleString(), messages: autoSaveData.messages }; setSaveSlots(prev => ({ ...prev, [targetId]: newSave })); showToast(`已成功迁移至 No.${String(targetId).padStart(3, '0')} 存档`, 'success'); } else { showToast('常规存档位已满，备份失败！将直接开始新剧情。', 'error'); }
          setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); createNewSession(); setAppMode('game');
        }
      });
    } else { createNewSession(); setAppMode('game'); }
  };

  const handleContinueGame = () => { setAppMode('game'); };

  const handleExitGame = () => {
    setConfirmDialog({ isOpen: true, text: '确定要退出游戏吗？\n当前未保存的进度将会丢失！', onConfirm: () => { setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); window.close(); showToast("已下达退出指令，若窗口未关闭请手动关闭浏览器页签。", "info"); } });
  };

  const handleReturnToTitle = () => {
    if (appMode === 'title') { setIsSettingsOpen(false); return; }
    setConfirmDialog({ isOpen: true, text: '确定要返回标题画面吗？\n当前未保存的对话进度将会丢失！', onConfirm: () => { setAppMode('title'); setIsSettingsOpen(false); setIsSaveLoadUIOpen(false); setIsMemoOpen(false); setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); clearTTSQueue(); } });
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmDialog.isOpen) { if (confirmDialog.onCancel) confirmDialog.onCancel(); else setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); return; }
        if (editingSlotId !== null) { setEditingSlotId(null); return; }
        if (isBgMenuOpen || isExpressionMenuOpen || isModelMenuOpen) { setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); return; }
        if (visualAdjustMode) { setVisualAdjustMode(null); return; }
        if (isMemoOpen) { setIsMemoOpen(false); return; }
        if (isSettingsOpen) { setIsSettingsOpen(false); return; }
        if (isSaveLoadUIOpen) { setIsSaveLoadUIOpen(false); return; }
        if (isLogOpen) { setIsLogOpen(false); return; }
        if (appMode === 'game') { handleReturnToTitle(); return; }
        if (appMode === 'title') { handleExitGame(); return; }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown); return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [confirmDialog, editingSlotId, isBgMenuOpen, isExpressionMenuOpen, isModelMenuOpen, visualAdjustMode, isMemoOpen, isSettingsOpen, isSaveLoadUIOpen, isLogOpen, appMode]);

  return (
    <div className="relative h-screen w-full bg-slate-900 overflow-hidden font-sans select-none" onClick={() => { setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); }}>
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .text-outline-blue { text-shadow: -1px -1px 0 #1e3a8a, 1px -1px 0 #1e3a8a, -1px 1px 0 #1e3a8a, 1px 1px 0 #1e3a8a; } .light-scrollbar::-webkit-scrollbar { width: 8px; } .light-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 4px;} .light-scrollbar::-webkit-scrollbar-thumb { background: #d9c5b2; border-radius: 4px; } .light-scrollbar::-webkit-scrollbar-thumb:hover { background: #ba3f42; } .clip-polygon { clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%); }`}} />
      {toast.visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] transition-all duration-300 pointer-events-auto">
          <div className={`px-6 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-start gap-3 backdrop-blur-md max-w-lg w-max ${toast.type === 'error' ? 'bg-red-950/90 border border-red-500/50 text-red-50' : toast.type === 'success' ? 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-50' : 'bg-indigo-950/90 border border-indigo-500/50 text-indigo-50'}`}>
            {toast.type === 'error' ? <AlertCircle className="shrink-0 mt-0.5" size={18}/> : toast.type === 'success' ? <CheckCircle className="shrink-0 mt-0.5" size={18}/> : <Info className="shrink-0 mt-0.5" size={18}/>}
            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{toast.message}</p>
            <button onClick={() => setToast(prev => ({...prev, visible: false}))} className="ml-2 text-white/50 hover:text-white"><X size={16} /></button>
          </div>
        </div>
      )}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/60 flex items-center justify-center backdrop-blur-sm pointer-events-auto">
           <div className="bg-[#fdfaf5] text-[#4a4036] p-8 rounded-xl border-2 border-[#d9c5b2] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-sm w-full transform transition-all">
              <div className="flex items-center gap-3 mb-6 text-[#ba3f42]"><AlertCircle size={28} /><h3 className="font-bold text-xl tracking-widest">系统确认</h3></div>
              <p className="mb-10 text-[#7a6b5d] font-bold whitespace-pre-wrap leading-relaxed text-sm">{confirmDialog.text}</p>
              <div className="flex justify-end gap-3">
                 <button className="px-6 py-2.5 bg-[#e8decb] hover:bg-[#d9c5b2] text-[#4a4036] rounded-full text-sm font-bold transition-colors" onClick={() => { if(confirmDialog.onCancel) confirmDialog.onCancel(); else setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); }}>{confirmDialog.cancelText || '取消'}</button>
                 {confirmDialog.thirdButton && (<button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-full text-sm font-bold transition-colors shadow-lg" onClick={confirmDialog.thirdButton.onClick}>{confirmDialog.thirdButton.text}</button>)}
                 {confirmDialog.onConfirm && <button className="px-6 py-2.5 bg-[#ba3f42] hover:bg-[#d64b4f] text-white rounded-full text-sm font-bold transition-colors shadow-lg" onClick={confirmDialog.onConfirm}>{confirmDialog.confirmText || '确定执行'}</button>}
              </div>
           </div>
        </div>
      )}
      {isMemoOpen && !visualAdjustMode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex flex-col font-sans transition-opacity pointer-events-auto items-center justify-center">
           <div className="bg-[#fdfaf5] w-[90%] max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-2 border-[#d9c5b2]">
              <div className="flex justify-between items-center p-4 border-b-2 border-dashed border-[#e6d5b8] bg-[#efe6d5] shrink-0">
                 <h3 className="font-black text-[#ba3f42] text-lg flex items-center gap-2"><FileText size={20}/> 备忘录与日程设定</h3>
                 <button onClick={() => setIsMemoOpen(false)} className="text-[#7a6b5d] hover:text-[#ba3f42] transition-colors"><X size={24}/></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto light-scrollbar">
                 <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-4 rounded-xl border border-[#e6d5b8] shadow-sm">
                    <input type="datetime-local" value={newMemoDate} onChange={e=>setNewMemoDate(e.target.value)} className="bg-[#fdfaf5] border border-[#d9c5b2] rounded-lg px-3 py-2 outline-none text-sm text-[#4a4036] focus:border-[#ba3f42] shrink-0"/>
                    <input type="text" value={newMemoText} onChange={e=>setNewMemoText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMemo()} placeholder="输入新的备忘或日程安排..." className="flex-1 bg-[#fdfaf5] border border-[#d9c5b2] rounded-lg px-3 py-2 outline-none text-sm text-[#4a4036] focus:border-[#ba3f42]"/>
                    <button onClick={handleAddMemo} className="bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white px-5 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center"><Plus size={18}/></button>
                 </div>
                 <div className="space-y-3">
                    {memos.length === 0 ? <p className="text-center text-[#a89578] py-12 font-bold opacity-60">暂无任何备忘事项</p> : memos.map(m => (
                       <div key={m.id} className={`flex justify-between items-center p-4 rounded-xl border transition-all ${m.isDone ? 'bg-black/5 border-transparent opacity-60' : 'bg-white border-[#e6d5b8] shadow-sm'}`}>
                          <div className="flex flex-col"><span className={`text-sm font-bold ${m.isDone ? 'line-through text-[#a89578]' : 'text-[#4a4036]'}`}>{m.text}</span>{m.date && <span className="text-xs text-[#ba3f42] mt-1.5 flex items-center gap-1"><Clock size={12}/> {new Date(m.date).toLocaleString()}</span>}</div>
                          <div className="flex gap-2 shrink-0">
                             <button onClick={() => toggleMemoDone(m.id)} className={`p-2 rounded-lg transition-colors ${m.isDone ? 'text-blue-500 hover:bg-blue-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={m.isDone ? "标记为未完成" : "标记为已完成"}><CheckCircle size={20}/></button>
                             <button onClick={() => deleteMemo(m.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除记录"><Trash2 size={20}/></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className={`absolute top-4 right-6 z-[9000] transition-opacity duration-1000 ${bgmToast.visible ? 'opacity-100' : 'opacity-0'} pointer-events-none`}><span className="text-[10px] text-white/40 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm tracking-wider">♪ {bgmToast.name}</span></div>

      <div className="absolute inset-0 bg-cover bg-center z-0 transition-all duration-1000" style={{ backgroundImage: activeBgUrl ? `url(${activeBgUrl})` : 'none', backgroundColor: activeBgUrl ? 'transparent' : '#1e1b4b' }}>
        {!activeBgUrl && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.1),_transparent_70%)]" />}
      </div>

      <div ref={containerRef} className="absolute inset-0 z-10 overflow-hidden pointer-events-auto" onClick={handleModelContainerClick}>
        {live2dStatus && !settings.enableNoLive2DMode && (<div className="absolute bottom-8 left-8 flex items-center justify-center text-white/70 pointer-events-none drop-shadow-md z-30"><span className="bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm text-xs tracking-widest border border-white/10">{live2dStatus}</span></div>)}
        <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
      </div>

      {isSettingsOpen && visualAdjustMode && (
        <div className="fixed top-8 right-8 z-[99999] w-80 bg-[#fdfaf5]/95 backdrop-blur-xl border-2 border-[#d9c5b2] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-5 text-[#4a4036] pointer-events-auto animate-fade-in">
           <div className="flex justify-between items-center border-b-2 border-dashed border-[#e6d5b8] pb-3 mb-4">
              <h3 className="font-black text-[#ba3f42] text-sm flex items-center gap-2"><Eye size={16} /> {visualAdjustMode === 'model' && '聊天模型实时调整'} {visualAdjustMode === 'title_model' && '主标题模型实时调整'} {visualAdjustMode === 'dialog' && '对话框排版实时调整'}</h3>
              <button onClick={() => setVisualAdjustMode(null)} className="px-4 py-1.5 bg-[#ba3f42] hover:bg-[#d64b4f] text-white rounded-full text-xs font-bold transition-colors shadow-sm">返回设置</button>
           </div>
           {visualAdjustMode === 'model' && (
              <div className="space-y-5">
                <SettingSlider label="模型独立缩放" value={currentModelConfig.scale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('scale', v)} />
                <SettingSlider label="水平独立位置 (X)" value={currentModelConfig.x} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('x', v)} />
                <SettingSlider label="垂直独立位置 (Y)" value={currentModelConfig.y} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('y', v)} />
              </div>
           )}
           {visualAdjustMode === 'title_model' && (
              <div className="space-y-5">
                <SettingSlider label="主标题模型独立缩放" value={currentModelConfig.titleScale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('titleScale', v)} />
                <SettingSlider label="水平独立位置 (X)" value={currentModelConfig.titleX} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('titleX', v)} />
                <SettingSlider label="垂直独立位置 (Y)" value={currentModelConfig.titleY} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('titleY', v)} />
              </div>
           )}
           {visualAdjustMode === 'dialog' && (
              <div className="space-y-5">
                <SettingSlider label="对话框垂直偏移" value={settings.dialogPositionY} min={0} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, dialogPositionY: v})} />
                <SettingSlider label="对话框不透明度" value={settings.dialogOpacity} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, dialogOpacity: v})} />
                <div className="flex flex-col gap-2 w-full pt-2 border-t border-dashed border-[#e6d5b8]"><label className="text-[#ba3f42] font-bold flex items-center gap-1"><span className="text-sm">✱</span> 窗口背景主题色</label><div className="flex items-center gap-3"><input type="color" value={settings.dialogThemeColor} onChange={e => setSettings({...settings, dialogThemeColor: e.target.value})} className="h-10 w-full rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner" /></div></div>
              </div>
           )}
        </div>
      )}

      {appMode === 'title' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex">
          <div className="flex-1 flex flex-col justify-center px-12 md:px-32 relative w-full h-full">
            <div className="pointer-events-auto">
              <h1 className="font-black drop-shadow-[0_5px_5px_rgba(30,58,138,0.8)] tracking-widest leading-none inline-block transition-transform duration-300" style={{ fontSize: 'clamp(5rem, 8vw, 8rem)', color: settings.mainTitleColor, fontFamily: settings.mainTitleFont, transform: `translate(${settings.mainTitleX}px, ${settings.mainTitleY}px)` }}>{settings.mainTitleText}</h1><br/>
              <p className="text-xl md:text-2xl font-bold tracking-[0.4em] mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ml-2 inline-block transition-transform duration-300" style={{ color: settings.subTitleColor, fontFamily: settings.subTitleFont, transform: `translate(${settings.subTitleX}px, ${settings.subTitleY}px)` }}>{settings.subTitleText}</p>
              <div className="mt-16 md:mt-24 flex flex-col gap-6 w-48 ml-4">
                {[ { label: 'START', action: handleStartGame }, { label: 'CONTINUE', action: handleContinueGame }, { label: 'LOAD', action: () => { setSlMode('load'); setIsSaveLoadUIOpen(true); } }, { label: 'SYSTEM', action: () => setIsSettingsOpen(true) }, { label: 'EXIT', action: handleExitGame } ].map((item, idx) => (
                  <button key={idx} onClick={item.action} className="text-left text-2xl font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md">{item.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-white/60 font-bold text-sm drop-shadow-md pointer-events-none">v2.0</div>
        </div>
      )}

      {appMode === 'game' && !visualAdjustMode && (
        <>
          <div className="absolute top-16 right-6 z-[8000] flex flex-col items-end gap-3 pointer-events-none max-w-[300px] md:max-w-sm">
            {isGeneratingReplies && (<div className="pointer-events-auto"><span className="bg-black/60 text-indigo-300 text-xs px-4 py-1.5 rounded-full animate-pulse border border-indigo-500/30 backdrop-blur-md shadow-lg flex items-center"><Sparkles size={12} className="mr-1" /> 正在推演选项...</span></div>)}
            {!isGeneratingReplies && suggestedReplies.length > 0 && (
              <div className="flex flex-col gap-2.5 items-end pointer-events-auto w-full">
                {suggestedReplies.map((reply, idx) => (
                  <button key={idx} onClick={() => { setInputValue(reply); setSuggestedReplies([]); }} className="group bg-black/70 hover:bg-indigo-900/90 border border-indigo-500/50 text-indigo-50 px-4 py-3 rounded-xl text-sm tracking-widest backdrop-blur-md transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_20px_rgba(79,70,229,0.6)] hover:-translate-x-1 text-left break-words w-full border-r-4 border-r-pink-500"><span className="text-pink-400 mr-1.5 opacity-80 text-xs transition-transform group-hover:translate-x-1 inline-block">▶</span> {reply}</button>
                ))}
              </div>
            )}
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 w-[94%] max-w-5xl z-20 pointer-events-none flex flex-col transition-all duration-300" style={{ bottom: `calc(1.5rem - ${settings.dialogPositionY}px)` }}>
            <div className={`transition-opacity duration-300 ${latestMessage ? 'opacity-100' : 'opacity-0'}`}>
              <div className={`px-8 py-1 rounded-t-lg w-fit text-xl font-bold tracking-widest text-white backdrop-blur-md pointer-events-auto transition-colors duration-300`} style={{ backgroundColor: latestMessage?.role === 'user' ? hexToRgba('#064e3b', settings.dialogOpacity) : hexToRgba('#312e81', settings.dialogOpacity), borderLeft: `4px solid rgba(${latestMessage?.role === 'user' ? '52, 211, 153' : '129, 140, 248'}, ${settings.dialogOpacity > 0 ? 1 : 0})` }}>
                {latestMessage?.role === 'user' ? settings.userName : settings.aiName}
              </div>
            </div>

            <div className={`rounded-b-xl rounded-tr-xl backdrop-blur-sm relative flex flex-col pointer-events-auto transition-all duration-300 ${hasNextPage ? 'cursor-pointer' : ''}`} style={{ backgroundColor: hexToRgba(settings.dialogThemeColor, settings.dialogOpacity), borderColor: `rgba(255, 255, 255, ${settings.dialogOpacity * 0.2})`, borderWidth: settings.dialogOpacity > 0 ? '1px' : '0px', boxShadow: settings.dialogOpacity > 0.1 ? `0 8px 32px rgba(0,0,0,${settings.dialogOpacity * 0.5})` : 'none' }} onClick={(e) => { e.stopPropagation(); handleDialogClick(); }} onWheel={handleWheel}>
              <div ref={vnTextContainerRef} style={{ color: settings.dialogTextColor, fontFamily: settings.dialogFontFamily }} className="p-8 pb-4 text-xl md:text-2xl tracking-widest leading-relaxed min-h-[140px] max-h-[30vh] overflow-y-auto scroll-smooth relative pointer-events-auto select-text cursor-text">
                {latestMessage 
                  ? <span className={`${latestMessage.isError ? 'text-red-400' : ''}`}>
                      <div className="whitespace-pre-wrap">{currentDisplay}</div>
                      {latestMessage.isStreaming && !hasNextPage && <span className="inline-block w-2.5 h-6 ml-1 bg-white/70 animate-pulse align-middle rounded-sm"></span>}
                      {hasNextPage && <span className="inline-block ml-3 animate-bounce text-indigo-300 pointer-events-none select-none"><ChevronDown size={24} /></span>}
                    </span>
                  : <span className="italic pointer-events-none select-none" style={{ opacity: settings.dialogOpacity > 0 ? 0.4 : 0.8, color: '#ffffff' }}>（环境极其安静，试着在下方输入框说点什么打破沉寂吧...）</span>
                }
              </div>

              <div className="px-6 py-4 border-t border-white/10 flex flex-col relative pointer-events-auto" onClick={e => e.stopPropagation()}>
                {selectedImage && (<div className="mb-3 relative w-16 h-16 rounded-md border border-white/20 overflow-hidden shadow-lg"><img src={selectedImage} className="w-full h-full object-cover" alt="preview" /><button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 bg-black/60 p-1 rounded-bl-md hover:bg-red-500 text-white transition-colors" title="取消图片"><X size={10} /></button></div>)}
                <div className="flex items-center gap-3 w-full">
                  <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageSelect} />
                  <button onClick={() => fileInputRef.current.click()} className="p-2 text-white/50 hover:text-white transition-colors shrink-0 bg-white/5 hover:bg-white/10 rounded-md" title="上传图片交由 AI 识别"><ImageIcon size={20} /></button>
                  <div className="flex-1 relative">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={settings.workMode ? "工作/编程模式已开启，无字数限制..." : "输入你想说的话 (Enter 发送)..."} disabled={isLoading} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 focus:bg-black/40 transition-all font-sans disabled:opacity-50" />
                    <button onClick={handleSendMessage} disabled={(!inputValue.trim() && !selectedImage) || isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-500/80 hover:bg-indigo-400 disabled:bg-white/10 text-white rounded-md transition-colors"><Send size={18} /></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full flex justify-end mt-2 pointer-events-none">
              <div className="flex flex-wrap justify-end items-center backdrop-blur-md rounded-xl px-4 py-2 gap-x-5 gap-y-2.5 text-indigo-200 text-sm font-bold shadow-lg transition-colors duration-300 pointer-events-auto" style={{ backgroundColor: hexToRgba(settings.dialogThemeColor, settings.dialogOpacity), border: settings.dialogOpacity > 0 ? `1px solid rgba(255, 255, 255, ${settings.dialogOpacity * 0.2})` : 'none' }} onClick={e => e.stopPropagation()}>
                <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={handleAutoSaveSButton} title="一键保存当前进度并命名">S</span>
                <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={() => { setSlMode('load'); setIsSaveLoadUIOpen(true); }} title="打开存档/读档页面">L</span>
                <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={handleQuickSave} title="记录临时快捷存档 (不占常规栏位)">QS</span>
                <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={handleQuickLoad} title="瞬间加载快捷存档">QL</span>
                <span className="cursor-pointer text-blue-300 hover:text-white transition-colors shrink-0 whitespace-nowrap font-bold" onClick={handleSkip} title="跳过当前对话，直接翻到最后一页">SKIP</span>
                <span className="hidden sm:inline-block w-px h-4 bg-white/20 mx-1 shrink-0"></span>
                <div className="relative flex items-center shrink-0">
                  <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setIsBgMenuOpen(!isBgMenuOpen); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); }} title="切换背景"><ImageIcon size={14} /> 背景</span>
                  {isBgMenuOpen && (
                    <div className="absolute bottom-full mb-3 right-0 bg-black/85 backdrop-blur-xl border border-white/20 rounded-xl p-2 w-48 max-h-64 overflow-y-auto flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50">
                      {bgList.length === 0 ? (<span className="text-xs text-white/50 px-3 py-2 text-center">暂无背景，请在设置中导入</span>) : (
                        <>
                          <button onClick={() => { setSettings(s => ({...s, currentBgId: null})); setIsBgMenuOpen(false); }} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentBgId === null ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>默认背景 (无)</button>
                          {bgList.map(bg => <button key={bg.id} onClick={() => { setSettings(s => ({...s, currentBgId: bg.id})); setIsBgMenuOpen(false); }} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentBgId === bg.id ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>{bg.name}</button>)}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative flex items-center shrink-0">
                  <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setIsModelMenuOpen(!isModelMenuOpen); setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); }} title="切换Live2D模型"><User size={14} /> 模型</span>
                  {isModelMenuOpen && (
                    <div className="absolute bottom-full mb-3 right-0 bg-black/85 backdrop-blur-xl border border-white/20 rounded-xl p-2 w-48 max-h-64 overflow-y-auto flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50">
                      {modelsList.length === 0 ? (<span className="text-xs text-white/50 px-3 py-2 text-center">暂无模型，请在设置中导入</span>) : (
                        <>{modelsList.map(m => (<button key={m.id} onClick={() => switchModel(m.id)} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentModelId === m.id ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>{m.name}</button>))}</>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative flex items-center shrink-0">
                  <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setIsExpressionMenuOpen(!isExpressionMenuOpen); setIsBgMenuOpen(false); setIsModelMenuOpen(false); }} title="切换模型预设表情"><Smile size={14} /> 表情</span>
                  {isExpressionMenuOpen && (
                    <div className="absolute bottom-full mb-3 right-0 bg-black/85 backdrop-blur-xl border border-white/20 rounded-xl p-2 w-48 max-h-64 overflow-y-auto flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50">
                      {expressions.length === 0 ? (<span className="text-xs text-white/50 px-3 py-2 text-center">当前模型无预设表情</span>) : (
                        <>
                          <button onClick={() => { if(modelRef.current?.internalModel?.motionManager?.expressionManager) modelRef.current.internalModel.motionManager.expressionManager.restoreExpression(); setSettings(s => ({...s, currentExpressionId: null})); setIsExpressionMenuOpen(false); }} className="shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight hover:bg-white/10 text-white/80 border-b border-white/10">恢复默认</button>
                          {expressions.map(exp => (<button key={exp.id} onClick={() => { modelRef.current?.expression(exp.id); setSettings(s => ({...s, currentExpressionId: exp.id})); setIsExpressionMenuOpen(false); }} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentExpressionId === exp.id ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>{exp.name}</button>))}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap hover:text-white`} onClick={(e) => { e.stopPropagation(); setIsMemoOpen(true); }} title="记录备忘录或日程安排"><FileText size={14} /> 备忘</span>
                <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.workMode ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'hover:text-white'}`} onClick={(e) => { e.stopPropagation(); const newMode = !settings.workMode; setSettings({...settings, workMode: newMode, ttsEnabled: newMode ? false : settings.ttsEnabled}); if (newMode) showToast("💻 编程模式开启！自动闭麦，解除字数限制，请在此挥洒代码~", "success", 5000); else showToast("🌸 娱乐模式开启！", "info"); }} title="开启/关闭工作编程模式 (解除AI字数限制)"><Monitor size={14} /> {settings.workMode ? '工作:开' : '工作:关'}</span>
                <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.hideLive2dModel ? 'text-white/50 hover:text-white' : 'hover:text-white'}`} onClick={(e) => { e.stopPropagation(); setSettings({...settings, hideLive2dModel: !settings.hideLive2dModel}); }} title="开启/关闭看板娘显示"><Eye size={14} /> {settings.hideLive2dModel ? '模型:隐' : '模型:显'}</span>
                <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${isBgmPlaying ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'hover:text-white'}`} onClick={toggleBgm} title="播放/暂停背景音乐"><Music size={14} className={isBgmPlaying ? 'animate-pulse' : ''}/> BGM</span>
                <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.enablePlotOptions ? 'text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]' : 'hover:text-white'}`} onClick={() => setSettings({...settings, enablePlotOptions: !settings.enablePlotOptions})} title="开启/关闭剧情选项推演"><Sparkles size={14} className={settings.enablePlotOptions ? 'animate-pulse' : ''}/> 选项</span>
                <span className={`cursor-pointer transition-colors shrink-0 whitespace-nowrap ${settings.ttsEnabled ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'hover:text-white'}`} onClick={() => setSettings({...settings, ttsEnabled: !settings.ttsEnabled})}>Auto(TTS)</span>
                <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={() => setIsLogOpen(true)}>Log</span>
                <Settings className="w-4 h-4 cursor-pointer hover:text-white transition-colors shrink-0" onClick={() => setIsSettingsOpen(true)} title="系统设置" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* SAVE / LOAD UI */}
      {isSaveLoadUIOpen && !visualAdjustMode && (
        <div className="fixed inset-0 z-[100] flex flex-col font-sans select-none pointer-events-auto bg-gradient-to-b from-[#87CEEB] to-[#E0F6FF]">
          <div className="flex justify-between items-end px-12 pt-8 pb-4">
             <h1 className="text-7xl font-bold text-white tracking-widest drop-shadow-md">{slMode === 'save' ? 'SAVE' : 'LOAD'}</h1>
             <div className="flex items-end">
                <div className="text-xs text-white/80 bg-black/20 px-3 py-1 rounded-t-md mb-0.5 mr-6 backdrop-blur-sm">SYSTEM Window</div>
                <button onClick={() => setSlMode('save')} className={`px-10 py-3 rounded-tl-xl font-bold tracking-wider text-sm transition-all shadow-md ${slMode === 'save' ? 'bg-white text-[#4fa0d8] h-12' : 'bg-[#4fa0d8] text-white hover:bg-[#5db4f0] h-10 border-t border-l border-white/40'}`}>SAVE</button>
                <button onClick={() => setSlMode('load')} className={`px-10 py-3 font-bold tracking-wider text-sm transition-all shadow-md ${slMode === 'load' ? 'bg-white text-[#4fa0d8] h-12' : 'bg-[#4fa0d8] text-white hover:bg-[#5db4f0] h-10 border-t border-l border-white/40'}`}>LOAD</button>
                <button onClick={handleQuickLoad} className="px-10 py-3 font-bold tracking-wider text-sm transition-all shadow-md bg-[#4fa0d8] text-white hover:bg-[#5db4f0] h-10 border-t border-l border-white/40">Q.LOAD</button>
                <button onClick={() => showToast("语音回放库暂未实现", "info")} className="px-10 py-3 rounded-tr-xl font-bold tracking-wider text-sm transition-all shadow-md bg-[#4fa0d8] text-white hover:bg-[#5db4f0] h-10 border-t border-l border-r border-white/40">VOICE</button>
             </div>
          </div>
          
          <div className="flex-1 px-12 py-4 flex flex-col w-full max-w-7xl mx-auto">
             {slPage === 1 && (
               <div className="mb-4 flex flex-col md:flex-row gap-4">
                 <div onClick={() => slMode === 'load' ? handleQuickLoad() : handleQuickSave()} className="flex-1 group relative w-full h-16 bg-gradient-to-r from-amber-500/90 to-orange-400/90 border-2 border-white/80 rounded-sm p-3 cursor-pointer hover:border-white shadow-lg transition-all overflow-hidden flex items-center justify-between px-6">
                   <div className="flex items-center gap-4"><span className="text-white font-black text-lg drop-shadow-md italic">No.000</span><span className="text-white font-bold text-lg drop-shadow-md">{quickSaveData ? quickSaveData.title : 'No Data (快捷栏位)'}</span></div>
                   <div className="text-white/80 text-sm font-bold tracking-wider">{quickSaveData ? quickSaveData.date : ''}</div>
                   <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors"></div>
                 </div>
                 <div onClick={() => slMode === 'load' ? handleAutoLoad() : showToast('自动存档位仅供读取，系统会在后台自动覆盖。', 'info')} className="flex-1 group relative w-full h-16 bg-gradient-to-r from-cyan-600/90 to-blue-500/90 border-2 border-white/80 rounded-sm p-3 cursor-pointer hover:border-white shadow-lg transition-all overflow-hidden flex items-center justify-between px-6">
                   <div className="flex items-center gap-4"><span className="text-white font-black text-lg drop-shadow-md italic">AUTO</span><span className="text-white font-bold text-lg drop-shadow-md">{autoSaveData ? autoSaveData.title : 'No Data (自动存档)'}</span></div>
                   <div className="text-white/80 text-sm font-bold tracking-wider">{autoSaveData ? autoSaveData.date : ''}</div>
                   <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors"></div>
                 </div>
               </div>
             )}

             <div className="grid grid-cols-2 gap-x-8 gap-y-4 flex-1">
                {Array.from({length: 10}).map((_, i) => {
                   const slotId = (slPage - 1) * 10 + i + 1; const data = saveSlots[slotId]; const isEditing = editingSlotId === slotId;
                   return (
                     <div key={slotId} onClick={() => handleSlotClick(slotId)} className="group relative bg-[#8fbf8f] border-[3px] border-white/80 rounded-sm p-3 cursor-pointer hover:border-white hover:bg-[#7ebd7e] shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all overflow-hidden flex flex-col justify-between">
                       <div className="flex justify-between items-start">
                         <span className="text-white font-black text-sm drop-shadow-md">No.{String(slotId).padStart(3, '0')}</span>
                         {data && !isEditing && slMode === 'save' && (<button onClick={(e) => { e.stopPropagation(); setEditingSlotId(slotId); setEditSaveName(data.title); }} className="opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition-opacity p-1 z-10" title="修改存档名称"><Edit3 size={16} /></button>)}
                       </div>
                       <div className="flex-1 flex items-center justify-center relative z-10">
                         {isEditing ? (<input ref={editInputRef} type="text" value={editSaveName} onChange={(e) => setEditSaveName(e.target.value)} onBlur={handleSaveNameConfirm} onKeyDown={(e) => e.key === 'Enter' && handleSaveNameConfirm()} onClick={(e) => e.stopPropagation()} className="w-3/4 bg-white/20 border-b-2 border-white text-white text-center text-xl font-bold outline-none placeholder-white/50 px-2" placeholder="输入存档名..."/>) : data ? (<span className="text-white text-2xl font-bold drop-shadow-md tracking-wider truncate px-4">{data.title}</span>) : (<span className="text-white/80 text-3xl font-bold tracking-widest drop-shadow-sm opacity-60">No Data</span>)}
                       </div>
                       <div className="text-right text-white/80 text-xs font-bold tracking-wider h-4">{!isEditing && data ? data.date : ''}</div>
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                     </div>
                   );
                })}
             </div>
          </div>
          
          <div className="flex justify-between items-center px-12 py-5 bg-white/30 backdrop-blur-md border-t-2 border-white/50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
             <button onClick={() => { if (window.confirm("确定要清空所有常规存档吗？(不可恢复)")) { setSaveSlots({}); } }} className="px-6 py-2 bg-[#8fbf8f] text-white font-bold tracking-widest rounded-sm border border-white hover:bg-red-400 transition-colors">ALL Delete</button>
             <div className="flex gap-1.5 items-end">
               {Array.from({length: 10}).map((_, i) => {
                 const p = i + 1; const isActive = slPage === p;
                 return (
                   <div key={p} onClick={() => setSlPage(p)} className={`cursor-pointer flex flex-col items-center group transition-all`}>
                     <span className={`text-[10px] font-bold ${isActive ? 'text-amber-500' : 'text-emerald-600 group-hover:text-emerald-500'}`}>Page</span>
                     <div className={`w-8 h-8 flex items-center justify-center clip-diamond font-black text-lg ${isActive ? 'bg-amber-400 text-white scale-110 shadow-lg' : 'bg-emerald-400/80 text-white group-hover:bg-emerald-400'}`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>{p}</div>
                   </div>
                 );
               })}
             </div>
             <div className="flex gap-2">
               <button className="px-6 py-2 bg-[#4fa0d8] text-white font-bold tracking-widest rounded-sm border border-white hover:bg-[#5db4f0] transition-colors" onClick={handleReturnToTitle}>返回到标题</button>
               <button className="px-6 py-2 bg-[#4fa0d8] text-white font-bold tracking-widest rounded-sm border border-white hover:bg-[#5db4f0] transition-colors" onClick={() => setIsSaveLoadUIOpen(false)}>返回到游戏</button>
               <button className="px-6 py-2 bg-[#4fa0d8] text-white font-bold tracking-widest rounded-sm border border-white hover:bg-red-400 transition-colors" onClick={handleExitGame}>退出游戏</button>
             </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: ` @keyframes shimmer { 100% { transform: translateX(150%); } } `}} />
        </div>
      )}

      {/* Log 历史记录遮罩层 */}
      {isLogOpen && !visualAdjustMode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 flex flex-col font-sans transition-opacity pointer-events-auto">
          <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-4">
              <h2 className="text-white text-2xl font-bold tracking-widest">历史剧情 (Log)</h2>
              <select value={activeSessionId || ''} onChange={(e) => setActiveSessionId(e.target.value)} className="bg-white/10 border border-white/20 text-white text-sm rounded px-3 py-1 outline-none">
                {sessions.map(s => <option key={s.id} value={s.id} className="bg-slate-800">{s.title}</option>)}
              </select>
              <button onClick={createNewSession} className="text-indigo-300 hover:text-white text-sm flex items-center"><Plus size={14} className="mr-1"/>新剧情</button>
            </div>
            <button onClick={() => setIsLogOpen(false)} className="text-white/50 hover:text-white p-2"><X size={28} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 lg:px-32 space-y-6">
            {activeSession?.messages?.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-950/60 to-purple-900/40 border border-indigo-500/30 p-5 rounded-2xl mb-8 shadow-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-indigo-200 font-bold flex items-center tracking-widest text-lg"><BookOpen size={18} className="mr-2 text-indigo-400"/> ✨ 剧情回溯与总结</h3>
                  <button onClick={generateSummaryWithGemini} disabled={isGeneratingSummary} className="text-xs bg-indigo-600/80 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full disabled:opacity-50 transition-colors border border-indigo-400/50 shadow-[0_0_10px_rgba(79,70,229,0.4)] flex items-center">
                    {isGeneratingSummary ? <><RefreshCw size={12} className="animate-spin mr-1"/> 提炼中...</> : '生成摘要'}
                  </button>
                </div>
                {storySummary ? <p className="text-indigo-50 text-sm leading-loose font-serif indent-8 text-justify opacity-90">{storySummary}</p> : <p className="text-indigo-300/50 text-sm italic">点击右上角按钮，使用 Gemini AI 为您提炼当前剧情发展脉络...</p>}
              </div>
            )}

            {activeSession?.messages?.map((msg, idx) => (
              <div key={idx} className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-xs text-white/40">{msg.role === 'user' ? settings.userName : settings.aiName}</span>
                   <button onClick={() => handleCopyMessage(msg.content)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white transition-all cursor-pointer" title="复制此段对话"><Copy size={12}/></button>
                </div>
                <div className={`max-w-[80%] rounded-xl px-5 py-3 text-lg leading-relaxed select-text cursor-text ${msg.role === 'user' ? 'bg-emerald-900/60 text-emerald-50 border border-emerald-500/30 rounded-tr-sm' : `bg-indigo-900/40 text-indigo-50 border border-indigo-500/30 rounded-tl-sm ${msg.isError ? 'border-red-500 text-red-300' : ''}`}`}>
                  {msg.image && <img src={msg.image} className="max-w-sm rounded-lg mb-3 border border-white/20 shadow-md" alt="upload" />}
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* GalGame风味系统设置面板 */}
      {isSettingsOpen && !visualAdjustMode && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="w-[95%] max-w-5xl h-[85vh] bg-[#fdfaf5] rounded-xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.4)] border-2 border-[#d9c5b2] relative" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 2px, transparent 2px, transparent 4px)' }}>
            <div className="flex h-16 bg-[#efe6d5] border-b border-[#d9c5b2] shrink-0 overflow-hidden">
               <div className="bg-[#c44a4a] text-white flex flex-col justify-center px-8 shrink-0 clip-polygon relative z-10 shadow-md">
                  <span className="text-xl font-black tracking-widest text-shadow-sm">系统设定</span>
                  <span className="text-[10px] tracking-widest opacity-80 uppercase font-bold">System Config</span>
               </div>
               <div className="flex-1 flex overflow-x-auto hide-scrollbar bg-[#fdfaf5]/50 items-end px-4 gap-2">
                  {[ { id: 'visual', icon: <ImageIcon size={18}/>, label: '视觉设定' }, { id: 'text', icon: <Type size={18}/>, label: '文本互动' }, { id: 'sound', icon: <Volume2 size={18}/>, label: '声音设定' }, { id: 'character', icon: <MessageSquare size={18}/>, label: '剧本角色' }, { id: 'api', icon: <ServerCrash size={18}/>, label: '模型接口' }, { id: 'data', icon: <Database size={18}/>, label: '数据管理' }, { id: 'about', icon: <Info size={18}/>, label: '关于' } ].map(tab => (
                    <button key={tab.id} onClick={() => setSettingsTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 font-bold text-sm transition-all border-b-4 rounded-t-lg ${settingsTab === tab.id ? 'bg-white border-[#c44a4a] text-[#c44a4a] shadow-[0_-4px_10px_rgba(0,0,0,0.05)]' : 'border-transparent text-[#7a6b5d] hover:bg-[#e8decb]'}`}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
               </div>
               <button onClick={() => setIsSettingsOpen(false)} className="px-6 hover:bg-black/5 transition-colors shrink-0 border-l border-[#d9c5b2]"><X size={24} className="text-[#888] hover:text-[#c44a4a] transition-colors"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 light-scrollbar text-[#4a4036]">
              {settingsTab === 'visual' && (
                <div className="space-y-8 animate-fade-in">
                  <SettingSectionTitle title="Live2D 模型管理" extra={<button onClick={() => handleEnterVisualAdjust('model')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整</button>} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
                      <label className="block font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> Live2D 模型库管理 (支持多模型)</label>
                      <p className="text-xs text-[#7a6b5d] mb-4 leading-relaxed">选择包含 <code>.model3.json</code> 的模型文件夹。导入后可在底栏快速切换。</p>
                      <input type="file" webkitdirectory="true" directory="true" multiple onChange={handleModelUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#c44a4a] file:text-white hover:file:bg-[#a63d3d] cursor-pointer mb-4"/>
                      {modelsList.length > 0 && (
                        <div className="max-h-32 overflow-y-auto light-scrollbar bg-white rounded-lg p-2 border border-[#e6d5b8] space-y-1">
                          {modelsList.map(m => (
                            <div key={m.id} className={`flex justify-between items-center px-3 py-2 rounded text-xs group transition-colors ${settings.currentModelId === m.id ? 'bg-[#c44a4a]/10 font-bold text-[#c44a4a]' : 'hover:bg-black/5 text-[#7a6b5d]'}`}>
                              <span className="truncate pr-4 flex-1 cursor-pointer" onClick={() => switchModel(m.id)}>{settings.currentModelId === m.id ? '✨ ' : ''}{m.name}</span>
                              <button onClick={() => removeModel(m.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 px-2 shrink-0"><Trash2 size={14}/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm flex flex-col justify-center gap-4">
                      <div>
                        <SettingToggle label="隐藏游戏内的 Live2D 模型" value={settings.hideLive2dModel} onChange={v => setSettings({...settings, hideLive2dModel: v})} />
                        <p className="text-xs text-[#7a6b5d] mt-2">开启后将隐藏游戏主界面中的人物模型，仅保留背景与对话框。</p>
                      </div>
                      <div className="border-t border-dashed border-[#e6d5b8] pt-4">
                        <SettingToggle label="无 Live2D 模式 (隐藏左下角提示)" value={settings.enableNoLive2DMode} onChange={v => setSettings({...settings, enableNoLive2DMode: v})} />
                        <p className="text-xs text-[#7a6b5d] mt-2">开启后彻底隐藏屏幕左下角的状态提示语。</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SettingSlider label="独立模型缩放" value={currentModelConfig.scale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('scale', v)} />
                    <SettingSlider label="独立水平位置 (X)" value={currentModelConfig.x} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('x', v)} />
                    <SettingSlider label="独立垂直位置 (Y)" value={currentModelConfig.y} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('y', v)} />
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>
                  <SettingSectionTitle title="背景图管理" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
                      <label className="block font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 导入游戏内背景图</label>
                      <p className="text-xs text-[#7a6b5d] mb-4">导入后可在游戏界面的【背景】菜单中快速无缝切换。</p>
                      <input type="file" accept="image/*" multiple onChange={handleBgUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#8fbf8f] file:text-white hover:file:bg-[#7ebd7e] cursor-pointer mb-4"/>
                      {bgList.length > 0 && (
                        <div className="max-h-32 overflow-y-auto light-scrollbar bg-white rounded-lg p-2 border border-[#e6d5b8] space-y-1">
                          {bgList.map(bg => (
                            <div key={bg.id} className={`flex justify-between items-center px-3 py-2 rounded text-xs group transition-colors ${settings.currentBgId === bg.id ? 'bg-[#8fbf8f]/20 font-bold text-[#4a4036]' : 'hover:bg-black/5 text-[#7a6b5d]'}`}>
                              <span className="truncate pr-4 flex-1 cursor-pointer" onClick={() => setSettings({...settings, currentBgId: bg.id})}>{settings.currentBgId === bg.id ? '🖼️ ' : ''}{bg.name}</span>
                              <button onClick={() => removeBg(bg.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 px-2 shrink-0"><Trash2 size={14}/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
                      <label className="block font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 主标题界面背景图</label>
                      <p className="text-xs text-[#7a6b5d] mb-4">设置启动软件时，主标题画面的专属背景图。</p>
                      <div className="flex flex-col gap-3">
                        <input type="file" accept="image/*" onChange={handleTitleBgUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#4fa0d8] file:text-white hover:file:bg-[#5db4f0] cursor-pointer"/>
                        {localTitleBgImage && <button onClick={clearTitleBgImage} className="w-max px-4 py-1.5 bg-[#f5e6e6] hover:bg-[#eabfbf] text-[#ba3f42] rounded-full text-xs font-bold transition-colors shadow-sm">清除标题背景</button>}
                      </div>
                    </div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>
                  
                  <SettingSectionTitle title="主标题 Live2D 模型排版" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="text-sm font-bold text-[#4a4036]">主标题 Live2D 模型位置调整</h4>
                         <button onClick={() => handleEnterVisualAdjust('title_model')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div className="flex flex-col justify-center">
                          <SettingToggle label="隐藏主标题界面的 Live2D 模型" value={settings.hideTitleLive2d} onChange={v => setSettings({...settings, hideTitleLive2d: v})} />
                          <p className="text-xs text-[#7a6b5d] mt-2">如果您上传的主标题背景图自带人物，可以开启此项隐藏 Live2D 看板娘。</p>
                        </div>
                        <div className="flex flex-col gap-4">
                           <SettingSlider label="独立标题模型缩放" value={currentModelConfig.titleScale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('titleScale', v)} />
                           <SettingSlider label="独立水平位置 (X)" value={currentModelConfig.titleX} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('titleX', v)} />
                           <SettingSlider label="独立垂直位置 (Y)" value={currentModelConfig.titleY} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('titleY', v)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. 文本互动 Tab */}
              {settingsTab === 'text' && (
                <div className="space-y-8 animate-fade-in">
                  <SettingSectionTitle title="文字显示与排版" extra={<button onClick={() => handleEnterVisualAdjust('dialog')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整</button>} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
                    <div>
                      <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 对话框排版字体</label>
                      <select value={settings.dialogFontFamily} onChange={e => setSettings({...settings, dialogFontFamily: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner focus:border-[#ba3f42]">
                        <option value='"Microsoft YaHei", sans-serif'>默认黑体 (YaHei)</option><option value='"SimSun", "Songti SC", serif'>经典宋体 (SimSun)</option><option value='"KaiTi", "Kaiti SC", serif'>优雅楷体 (KaiTi)</option><option value='"FangSong", serif'>仿宋 (FangSong)</option><option value='sans-serif'>现代无衬线 (Sans)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 对话文字颜色</label>
                      <div className="flex items-center gap-3"><input type="color" value={settings.dialogTextColor} onChange={e => setSettings({...settings, dialogTextColor: e.target.value})} className="h-10 w-16 rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner" /><span className="text-sm font-bold text-[#7a6b5d] uppercase">{settings.dialogTextColor}</span></div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 窗口背景主题色</label>
                      <div className="flex items-center gap-3"><input type="color" value={settings.dialogThemeColor} onChange={e => setSettings({...settings, dialogThemeColor: e.target.value})} className="h-10 w-16 rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner" /><span className="text-sm font-bold text-[#7a6b5d] uppercase">{settings.dialogThemeColor}</span></div>
                    </div>
                  </div>

                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingSlider label="主对话框不透明度" value={settings.dialogOpacity} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, dialogOpacity: v})} />
                    <SettingSlider label="系统面板不透明度" value={settings.settingsOpacity} min={0.2} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, settingsOpacity: v})} />
                    <div className="md:col-span-2 pt-2 border-t border-dashed border-[#e6d5b8]">
                      <SettingSlider label="对话框/快捷栏 垂直位置偏移" value={settings.dialogPositionY} min={0} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, dialogPositionY: v})} />
                      <p className="text-xs text-[#7a6b5d] mt-2">调整高度可避免文本框遮挡Live2D模型的重要部位。</p>
                    </div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

                  <SettingSectionTitle title="行为互动设定" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex flex-col gap-3">
                        <SettingToggle label="启用剧情选项推演" value={settings.enablePlotOptions} onChange={v => setSettings({...settings, enablePlotOptions: v})} />
                        {settings.enablePlotOptions && (
                          <div className="bg-[#fdfaf5] border border-[#e6d5b8] p-4 rounded-lg shadow-inner mt-1 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#ba3f42]"></div>
                            <label className="block text-xs font-bold text-[#ba3f42] mb-2">推演 API 来源配置</label>
                            <select value={settings.plotApiMode} onChange={e => setSettings({...settings, plotApiMode: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm focus:border-[#ba3f42] outline-none mb-3">
                              <option value="shared">直接使用主聊天大模型 API</option><option value="independent">独立配置专用推演 API</option>
                            </select>
                            {settings.plotApiMode === 'independent' && (
                              <div className="space-y-3 pt-3 border-t border-dashed border-[#e6d5b8]">
                                <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">推演专用 Base URL</label><input type="text" value={settings.plotBaseUrl} onChange={e => setSettings({...settings, plotBaseUrl: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-1.5 text-xs focus:border-[#ba3f42] outline-none" /></div>
                                <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">推演专用 API Key</label><input type="password" value={settings.plotApiKey} onChange={e => setSettings({...settings, plotApiKey: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-1.5 text-xs focus:border-[#ba3f42] outline-none" /></div>
                                <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">推演专用模型名称</label><input type="text" value={settings.plotModel} onChange={e => setSettings({...settings, plotModel: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-1.5 text-xs focus:border-[#ba3f42] outline-none" /></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <SettingToggle label="启用 Live2D 鼠标点击交互" value={settings.enableClickExpression} onChange={v => setSettings({...settings, enableClickExpression: v})} />
                      <div className="md:col-span-2 flex justify-between gap-4 border-t border-dashed border-[#e6d5b8] pt-6">
                        <SettingToggle label="文字流式打字机效果" value={settings.enableStreaming} onChange={v => setSettings({...settings, enableStreaming: v})} />
                        {settings.enableStreaming && <div className="flex-1 max-w-sm"><SettingSlider label="打字速度" value={settings.typingSpeed} min={10} max={150} step={10} suffix="ms" onChange={v => setSettings({...settings, typingSpeed: v})} /></div>}
                      </div>
                      <div className="md:col-span-2 pt-2"><SettingSlider label="长段落文本截断分页 (每次显示行数)" value={settings.vnLinesPerPage} min={2} max={12} step={1} suffix="行" onChange={v => setSettings({...settings, vnLinesPerPage: v})} /></div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. 声音设定 Tab */}
              {settingsTab === 'sound' && (
                <div className="space-y-8 animate-fade-in">
                  <SettingSectionTitle title="音量与播放控制" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
                    <SettingSlider label="背景音乐音量 (BGM)" value={settings.bgmVolume} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, bgmVolume: v})} />
                    <SettingSlider label="语音合成音量 (TTS)" value={settings.ttsVolume} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, ttsVolume: v})} />
                    <SettingSlider label="语音播放倍速 (Rate)" value={settings.ttsPlaybackRate} min={0.5} max={2.0} step={0.1} suffix="x" onChange={v => setSettings({...settings, ttsPlaybackRate: v})} />
                  </div>
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
                    <label className="block text-sm font-bold text-[#ba3f42] mb-3"><span className="text-sm">✱</span> 导入本地背景音乐 (支持多首)</label>
                    <div className="flex gap-4 items-center mb-4">
                      <input type="file" accept="audio/*" multiple onChange={handleBgmUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#8fbf8f] file:text-white hover:file:bg-[#7ebd7e] cursor-pointer"/>
                      <select value={settings.bgmMode} onChange={e => setSettings({...settings, bgmMode: e.target.value})} className="bg-white border border-[#d9c5b2] text-[#4a4036] font-bold text-sm rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]">
                        <option value="sequential">顺序播放</option><option value="random">随机播放</option><option value="loop">单曲循环</option>
                      </select>
                    </div>
                    {bgmList.length > 0 && (
                      <div className="max-h-40 overflow-y-auto light-scrollbar bg-white rounded-lg p-2 border border-[#e6d5b8] space-y-1 mb-6">
                        {bgmList.map((bgm, idx) => (
                          <div key={bgm.id} className={`flex justify-between items-center px-4 py-2 rounded text-sm group transition-colors ${currentBgmIndex === idx ? 'bg-[#8fbf8f]/20 font-bold text-[#4a4036]' : 'hover:bg-black/5 text-[#7a6b5d]'}`}>
                            <span className="truncate pr-4 flex-1 cursor-pointer" onClick={() => { setCurrentBgmIndex(idx); if(!isBgmPlaying) toggleBgm(); }}>{currentBgmIndex === idx && isBgmPlaying ? '🎶 ' : ''}{bgm.name}</span>
                            <button onClick={() => removeBgm(bgm.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 px-2 shrink-0"><Trash2 size={16}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <SettingToggle label="切歌时在右上角显示歌曲名称" value={settings.enableBgmToast} onChange={v => setSettings({...settings, enableBgmToast: v})} />
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

                  <SettingSectionTitle title="语音合成 (TTS) 接口" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <SettingToggle label="开启全局 TTS 自动朗读" value={settings.ttsEnabled} onChange={v => setSettings({...settings, ttsEnabled: v})} />
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity ${!settings.ttsEnabled && 'opacity-50 pointer-events-none'}`}>
                      <div>
                        <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 发音语言选择</label>
                        <select value={settings.ttsLanguage} onChange={e => setSettings({...settings, ttsLanguage: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner focus:border-[#ba3f42]">
                          <option value="zh">中文 (zh)</option><option value="ja">日文 (ja)</option><option value="en">英文 (en)</option><option value="ko">韩文 (ko)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> API URL 模板 (已支持分句流式排队输出)</label>
                        <input type="text" value={settings.ttsUrlTemplate} onChange={e => setSettings({...settings, ttsUrlTemplate: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner focus:border-[#ba3f42]" />
                        <div className="bg-[#fdfaf5] p-3 mt-2 rounded border border-[#e6d5b8] shadow-inner">
                          <p className="text-[11px] text-[#7a6b5d] font-bold mb-1"><AlertCircle size={12} className="inline mr-1 text-[#ba3f42]"/> 若报错 404 或 500 (text_lang为空)，请确保模板如下：</p>
                          <code className="text-[10px] text-blue-600 break-all select-all block bg-white p-1.5 rounded border border-[#d9c5b2] cursor-text">http://127.0.0.1:9880/tts?text={'{text}'}&text_lang={'{lang}'}&ref_audio_path={'{ref_audio}'}&prompt_text={'{ref_text}'}&prompt_lang={'{ref_lang}'}</code>
                        </div>
                      </div>
                      <div className="md:col-span-3 border-t border-dashed border-[#e6d5b8] pt-4">
                        <SettingSlider label="流式分句停顿时间 (句与句之间的间隔)" value={settings.ttsSentencePause} min={0} max={3000} step={10} suffix="ms" onChange={v => setSettings({...settings, ttsSentencePause: v})} />
                      </div>
                      <div className="md:col-span-3 border-t border-dashed border-[#e6d5b8] pt-6">
                         <h4 className="text-sm font-bold text-[#4a4036] mb-4 flex items-center gap-2"><Mic size={16} className="text-[#ba3f42]"/> 参考音频配置 (克隆/指定音色必填)</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="md:col-span-2"><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频路径/URL</label><input type="text" value={settings.ttsRefAudio} onChange={e => setSettings({...settings, ttsRefAudio: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner focus:border-[#ba3f42]" placeholder="如: D:\audio\ref.wav" /></div>
                             <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频语种</label><select value={settings.ttsRefLang} onChange={e => setSettings({...settings, ttsRefLang: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner focus:border-[#ba3f42]"><option value="zh">中文 (zh)</option><option value="ja">日文 (ja)</option><option value="en">英文 (en)</option><option value="ko">韩文 (ko)</option></select></div>
                             <div className="md:col-span-3"><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频文本</label><input type="text" value={settings.ttsRefText} onChange={e => setSettings({...settings, ttsRefText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner focus:border-[#ba3f42]" placeholder="参考音频里说的话..." /></div>
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

                  <SettingSectionTitle title="同声传译设定 (独立双语种)" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div className="flex flex-col gap-4">
                      <div>
                         <SettingToggle label="启用同声传译模式" value={settings.enableTranslation} onChange={v => setSettings({...settings, enableTranslation: v})} />
                         <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed">开启后，AI 将分别生成指定语种的语音与文本。大模型将优先生成音频外文供TTS朗读，然后再生成母语在对话框中流式显示。</p>
                      </div>
                      {settings.enableTranslation && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed border-[#e6d5b8]">
                           <div><label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 屏幕显示语种</label><select value={settings.displayLanguage} onChange={e => setSettings({...settings, displayLanguage: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner focus:border-[#ba3f42]"><option value="zh">中文 (zh)</option><option value="ja">日文 (ja)</option><option value="en">英文 (en)</option><option value="ko">韩文 (ko)</option></select></div>
                           <div><label className="block text-sm font-bold text-[#ba3f42] mb-2">语音合成语种</label><select disabled value={settings.ttsLanguage} className="w-full bg-[#fdfaf5] border border-[#e6d5b8] text-[#a89578] font-bold rounded-md px-3 py-2 outline-none shadow-inner cursor-not-allowed"><option value="zh">中文 (zh)</option><option value="ja">日文 (ja)</option><option value="en">英文 (en)</option><option value="ko">韩文 (ko)</option></select></div>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. 剧本角色 Tab */}
              {settingsTab === 'character' && (
                <div className="space-y-8 animate-fade-in">
                  <SettingSectionTitle title="当前角色设定" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div><label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 玩家名称 (我)</label><input type="text" value={settings.userName} onChange={e => setSettings({...settings, userName: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]"/></div>
                      <div><label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 对话角色名称 (对象)</label><input type="text" value={settings.aiName} onChange={e => setSettings({...settings, aiName: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]"/></div>
                    </div>
                    <div><label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 人设 / 系统提示词</label><textarea value={settings.customSystemPrompt} onChange={e => setSettings({...settings, customSystemPrompt: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] leading-relaxed rounded-md px-4 py-3 outline-none shadow-inner focus:border-[#ba3f42] min-h-[120px]" /></div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

                  <SettingSectionTitle title="角色卡库管理" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-sm text-[#7a6b5d] font-bold">在此导入TXT角色卡，或将上方设定另存为新角色卡。</p>
                      <div className="flex gap-3">
                        <button onClick={saveCurrentAsCharCard} className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md"><UserPlus size={16} className="mr-1.5" /> 存为新角色</button>
                        <label className="px-4 py-2 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md"><Upload size={16} className="mr-1.5" /> 导入TXT<input type="file" accept=".txt" hidden onChange={importCharCard} /></label>
                      </div>
                    </div>
                    {settings.characterList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto light-scrollbar pr-2">
                        {settings.characterList.map(card => (
                          <div key={card.id} className="flex flex-col p-4 bg-white border-2 border-[#e6d5b8] rounded-xl hover:border-[#c44a4a] transition-colors shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-base font-black text-[#c44a4a] truncate">{card.aiName}</span>
                              <div className="flex gap-1.5 shrink-0"><button onClick={() => switchCharacter(card)} className="px-3 py-1 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-xs rounded-full transition-colors shadow-sm">切换加载</button><button onClick={() => exportCharCard(card)} className="p-1 text-[#4fa0d8] hover:bg-[#e0f2fe] rounded transition-colors"><Download size={18}/></button><button onClick={() => deleteCharCard(card.id)} className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"><Trash2 size={18}/></button></div>
                            </div>
                            <span className="text-xs text-[#7a6b5d] font-bold truncate">玩家: {card.userName}</span><span className="text-[10px] text-[#a89578] truncate mt-1">{card.prompt}</span>
                          </div>
                        ))}
                      </div>
                    ) : (<div className="text-center text-[#a89578] text-sm py-8 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">暂无保存的角色，请导入或新建。</div>)}
                  </div>
                </div>
              )}

              {/* 5. 模型接口 Tab */}
              {settingsTab === 'api' && (
                <div className="space-y-8 animate-fade-in">
                  <SettingSectionTitle title="大语言模型 (LLM) 接口配置" />
                  <div className="bg-[#e0f2fe]/50 border-2 border-[#4fa0d8]/30 p-5 rounded-xl text-[#1e3a8a] text-sm leading-relaxed shadow-sm mb-6">
                    <div className="flex items-center font-bold text-[#1e40af] mb-2"><Info size={18} className="mr-2"/> 代理环境接入说明</div>
                    <ul className="list-disc pl-6 space-y-1 font-medium"><li>若使用云托管服务，请在服务端环境变量中添加：<code className="bg-white/80 px-1.5 py-0.5 rounded text-blue-800 border border-blue-200">ALLOWED_ORIGINS=*</code> 和 <code className="bg-white/80 px-1.5 py-0.5 rounded text-blue-800 border border-blue-200">RANDOM_STRING=false</code>。</li><li>如果是免密公益站，API Key 留空即可。</li></ul>
                  </div>
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div><label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 接口地址 (Base URL)</label><input type="text" value={settings.openaiBaseUrl} onChange={e => setSettings({...settings, openaiBaseUrl: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" /></div>
                    <div><label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> API Key</label><input type="password" value={settings.openaiApiKey} onChange={e => setSettings({...settings, openaiApiKey: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" /></div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 relative">
                        <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 模型名称 (支持手动输入)</label>
                        <input type="text" list="model-suggestions" value={settings.aiModel} onChange={e => setSettings({...settings, aiModel: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
                        <datalist id="model-suggestions">{availableModels.map(m => <option key={m} value={m} />)}</datalist>
                      </div>
                      <button onClick={fetchOpenAIModels} disabled={isFetchingModels} className="bg-[#4fa0d8] hover:bg-[#5db4f0] disabled:opacity-50 text-white px-5 py-2 rounded-lg font-bold transition-colors flex items-center shadow-md h-[40px]"><RefreshCw size={16} className={`mr-2 ${isFetchingModels ? "animate-spin" : ""}`} /> 探测模型</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. 数据管理 Tab */}
              {settingsTab === 'data' && (
                <div className="space-y-8 animate-fade-in">
                  <SettingSectionTitle title="自动存档设定 (Auto Save)" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm mb-8">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <SettingToggle label="开启后台自动存档" value={settings.enableAutoSave} onChange={v => setSettings({...settings, enableAutoSave: v})} />
                        <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed">开启后，系统将在后台按照设定时间自动把当前进度写入专用的“AUTO”位，可有效防止浏览器意外崩溃造成的进度丢失。</p>
                      </div>
                      {settings.enableAutoSave && (
                        <div className="flex-1 flex flex-col justify-center border-t-2 md:border-t-0 md:border-l-2 border-dashed border-[#e6d5b8] pt-6 md:pt-0 md:pl-6"><SettingSlider label="自动保存间隔" value={settings.autoSaveInterval} min={1} max={60} step={1} suffix="分钟" onChange={v => setSettings({...settings, autoSaveInterval: v})} /></div>
                      )}
                    </div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

                  <SettingSectionTitle title="记忆增强机制 (防遗忘架构)" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                      <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1">
                              <SettingToggle label="开启自动记忆归档" value={settings.enableMemory} onChange={v => setSettings({...settings, enableMemory: v})} />
                              <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed">当单次剧情聊天轮数达到设定阈值时，AI 引擎会在后台静默将旧对话压缩提炼为“长期记忆”并释放上下文。可永久防止上下文超限及早期设定遗忘。</p>
                          </div>
                          {settings.enableMemory && (
                              <div className="flex-1 flex flex-col justify-center border-t-2 md:border-t-0 md:border-l-2 border-dashed border-[#e6d5b8] pt-6 md:pt-0 md:pl-6"><SettingSlider label="触发总结的对话轮数阈值" value={settings.memoryInterval} min={20} max={500} step={10} suffix="条" onChange={v => setSettings({...settings, memoryInterval: v})} /></div>
                          )}
                      </div>
                      {settings.enableMemory && activeSession?.memorySummary && (
                          <div className="border-t border-dashed border-[#e6d5b8] pt-5 mt-4 relative">
                              {isCompressingMemory && (<div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><span className="text-[#ba3f42] text-sm font-bold flex items-center animate-pulse"><RefreshCw size={16} className="animate-spin mr-2"/> 正在提取记忆...</span></div>)}
                              <label className="block text-sm font-bold text-[#ba3f42] mb-2 flex items-center gap-2"><BookOpen size={16}/>当前剧情的核心记忆档案 (可手动洗脑)</label>
                              <textarea value={activeSession.memorySummary} onChange={e => { setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, memorySummary: e.target.value } : s)); }} className="w-full bg-[#fdfaf5] border border-[#d9c5b2] text-[#4a4036] font-bold leading-relaxed rounded-lg px-4 py-3 outline-none shadow-inner focus:border-[#ba3f42] min-h-[140px] text-sm resize-y" />
                          </div>
                      )}
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

                  <SettingSectionTitle title="全量数据备份与恢复" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
                    <p className="text-sm text-[#7a6b5d] font-bold mb-6 leading-relaxed">打包导出为一个 JSON 文件。安全起见，API 接口和密钥不会被包含在内。<br/><span className="text-xs text-amber-600">注：由于浏览器限制，Live2D 模型原文件无法自动导出，恢复数据后需重新导入一次模型。</span></p>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <button onClick={handleExportBackup} className="flex-1 py-4 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-lg rounded-xl flex justify-center items-center transition-colors shadow-lg border-2 border-white/50"><Archive size={24} className="mr-2" /> 导出全量备份 (.json)</button>
                      <label className="flex-1 py-4 bg-white hover:bg-[#f4ebdc] border-2 border-[#d9c5b2] text-[#4a4036] font-bold text-lg rounded-xl flex justify-center items-center cursor-pointer transition-colors shadow-md"><Upload size={24} className="mr-2 text-[#ba3f42]" /> 导入备份并恢复<input type="file" accept=".json" hidden onChange={handleImportBackup} /></label>
                    </div>
                  </div>

                  <div className="bg-red-950/5 p-6 rounded-xl border border-red-500/30 shadow-sm mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div><h4 className="text-sm font-bold text-[#ba3f42] mb-1 flex items-center"><AlertCircle size={16} className="mr-1"/> 危险区域 (Danger Zone)</h4><p className="text-xs text-[#7a6b5d] font-bold">一键清空所有本地数据库和设置，恢复到初始出厂状态。此操作不可逆转。</p></div>
                      <button onClick={handleFirstResetClick} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-full transition-colors shadow-md border border-red-400 shrink-0">恢复出厂设置</button>
                    </div>
                  </div>
                </div>
              )}


              {/* 7. 关于 Tab */}
              {settingsTab === 'about' && (
                <div className="space-y-8 animate-fade-in">
                  <SettingSectionTitle title="关于 GWC" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
                        <User size={16}/> 开发者名单
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="text-xs text-[#7a6b5d] uppercase bg-[#e8decb]/50 border-b border-[#d9c5b2]">
                            <tr>
                              <th className="px-4 py-3 font-bold w-16">序号</th>
                              <th className="px-4 py-3 font-bold">开发者名称</th>
                              <th className="px-4 py-3 font-bold">负责项目</th>
                            </tr>
                          </thead>
                          <tbody className="text-[#4a4036]">
                            <tr className="border-b border-dashed border-[#e6d5b8] hover:bg-white/40 transition-colors">
                              <td className="px-4 py-3 font-bold text-[#ba3f42]">01</td>
                              <td className="px-4 py-3 font-bold">Qys</td>
                              <td className="px-4 py-3">核心代码编写、架构设计</td>
                            </tr>
                            <tr className="border-b border-dashed border-[#e6d5b8] hover:bg-white/40 transition-colors">
                              <td className="px-4 py-3 font-bold text-[#ba3f42]">02</td>
                              <td className="px-4 py-3 font-bold">Qys</td>
                              <td className="px-4 py-3">视觉打磨</td>
                            </tr>
                            <tr className="hover:bg-white/40 transition-colors">
                              <td className="px-4 py-3 font-bold text-[#ba3f42]">03</td>
                              <td className="px-4 py-3 font-bold">Qys</td>
                              <td className="px-4 py-3">Live2D 引擎适配与调试</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-[#e6d5b8] pt-6">
                      <h4 className="text-sm font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
                        <Sparkles size={16}/> 特别鸣谢
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        <span className="px-4 py-2 bg-[#fdfaf5] border border-[#d9c5b2] rounded-lg text-sm text-[#7a6b5d] font-bold shadow-sm hover:border-[#ba3f42] transition-colors cursor-default">Gemini提供的强力辅助</span>
                        <span className="px-4 py-2 bg-[#fdfaf5] border border-[#d9c5b2] rounded-lg text-sm text-[#7a6b5d] font-bold shadow-sm hover:border-[#ba3f42] transition-colors cursor-default">ATRI提供的灵感</span>
                        <span className="px-4 py-2 bg-[#fdfaf5] border border-[#d9c5b2] rounded-lg text-sm text-[#7a6b5d] font-bold shadow-sm hover:border-[#ba3f42] transition-colors cursor-default">GPT-SoVITS项目提供的TTS支持</span>
                        <span className="px-4 py-2 bg-[#fdfaf5] border border-[#d9c5b2] rounded-lg text-sm text-[#7a6b5d] font-bold shadow-sm hover:border-[#ba3f42] transition-colors cursor-default">所有使用者</span>
                      </div>
                      <p className="mt-5 text-xs text-[#a89578] leading-relaxed">
                        本项目完全免费，如果你是付费获取的说明你被骗了！【作者主页：https://space.bilibili.com/1764510273?spm_id_from=333.1007.0.0】
                      </p>
                    </div>
                  </div>
                </div>
              )}


            </div>
            {/* Footer 区域 */}
            <div className="h-16 bg-[#2c2b29] shrink-0 flex justify-between items-center px-8 border-t-[3px] border-[#ba3f42]">
              <div className="text-white/30 text-[10px] font-black tracking-widest uppercase">GalGame Web Chat Settings By Qys</div>
              <div className="flex gap-4">
                <button onClick={handleReturnToTitle} className="bg-transparent hover:bg-white/10 text-white/80 border border-white/20 px-6 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2"><ArrowLeft size={16}/> 返回标题画面</button>
                <button onClick={handleExitGame} className="bg-transparent hover:bg-red-500/20 text-red-300 border border-red-500/30 px-6 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2 mr-4"><LogOut size={16}/> 退出游戏</button>
                <button onClick={() => setIsSettingsOpen(false)} className="bg-[#ba3f42] hover:bg-[#d64b4f] text-white px-10 py-2 rounded-full font-bold tracking-widest text-sm transition-all shadow-lg border border-[#e86b6e] hover:scale-105">保存并关闭</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}