import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Settings, MessageSquare, Plus, Trash2, Send, 
  RefreshCw, Volume2, VolumeX, Menu, X, Save,
  Image as ImageIcon, Sparkles, BookOpen,
  AlertCircle, CheckCircle, Info, ServerCrash, ChevronDown, Music, Edit3,
  Download, Upload, UserPlus, Smile, Archive, Database, Copy, Play, Type,
  Monitor, Mic, FileText, ArrowLeft, LogOut, Eye, User, Calendar, CheckSquare, Clock, Video, Camera,
  SkipBack, SkipForward, Pause, Repeat, Shuffle, Repeat1, GripHorizontal, Puzzle, Shield
} from 'lucide-react';

// ==========================================
// 🛡️ 兼容性补丁：自动劫持并升级所有旧插件的数据库版本请求
// ==========================================
(function() {
  const _open = indexedDB.open;
  indexedDB.open = function(name, version) {
    if (name === 'Live2D_Local_Storage' && version && version < 10) {
      console.log(`[Compatibility Patch] 已拦截旧插件请求(v${version})，自动升级至 v10 以匹配系统内核。`);
      return _open.call(indexedDB, name, 10);
    }
    return _open.apply(indexedDB, arguments);
  };
})();

// ==========================================
// 🛡️ 原生级融合：全局防爆存与自动降级清理拦截器
// ==========================================
(function() {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        try {
            originalSetItem.call(this, key, value);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.message.includes('quota') || e.message.includes('exceeded')) {
                console.warn(`[Core Protection] 写入 [${key}] 时触发 5MB 物理极限！执行紧急剥离...`);
                try {
                    const obj = JSON.parse(value);
                    const prune = (o) => {
                        if (typeof o === 'string' && o.startsWith('data:')) return '[媒体过大，为防爆存断档已在本地截断]';
                        if (typeof o === 'string' && o.length > 200 * 1024) return o.substring(0, 1024) + '...[超长文本截断]';
                        if (Array.isArray(o)) return o.map(prune);
                        if (typeof o === 'object' && o !== null) { const newObj = {}; for (const k in o) newObj[k] = prune(o[k]); return newObj; }
                        return o;
                    };
                    originalSetItem.call(this, key, JSON.stringify(prune(obj)));
                    if (window.$GWC && window.$GWC.showToast) window.$GWC.showToast("⚠️ 内存已达物理上限！系统已自动剥离超大图片防丢档。", "error", 6000);
                } catch (parseErr) {}
            } else { throw e; }
        }
    };
})();

// --- 全局脚本加载工具 ---
const injectScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve(); 
  const script = document.createElement('script'); 
  script.src = src; script.onload = resolve; script.onerror = reject; 
  document.head.appendChild(script); 
});

// ✨ 数据库初始化逻辑：强制版本 10
const DB_NAME = 'Live2D_Local_Storage';
const REQUIRED_STORES = ['core_data', 'model_files', 'app_settings', 'bgm_files', 'bg_images', 'live2d_models', 'app_mods'];

const coreDBPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 10); 
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        console.log("[DB] 正在物理检测并补齐缺失的数据表...");
        REQUIRED_STORES.forEach(store => {
            if (!db.objectStoreNames.contains(store)) {
                if (['bgm_files', 'bg_images', 'live2d_models', 'app_mods'].includes(store)) {
                    db.createObjectStore(store, { keyPath: 'id' });
                } else {
                    db.createObjectStore(store);
                }
            }
        });
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
});

const initDB = () => coreDBPromise;
const getActiveMirrorId = () => localStorage.getItem('GWC_MIRROR_SYS_ACTIVE_ID') || 'mirror_default';

const saveCoreData = async (key, data) => { try { const db = await coreDBPromise; const tx = db.transaction('core_data', 'readwrite'); const realKey = `${getActiveMirrorId()}_${key}`; tx.objectStore('core_data').put(data, realKey); } catch(e) { console.error("IDB写入失败", e); } };
const loadCoreData = async (key) => { try { const db = await coreDBPromise; return new Promise(resolve => { const tx = db.transaction('core_data', 'readonly'); const realKey = `${getActiveMirrorId()}_${key}`; const req = tx.objectStore('core_data').get(realKey); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); } catch(e) { return null; } };

// --- 数据库常量定义 ---
const STORE_NAME = 'model_files'; 
const SETTINGS_STORE = 'app_settings';
const BGM_STORE = 'bgm_files'; 
const BG_STORE = 'bg_images'; 
const MODELS_STORE = 'live2d_models'; 
const MODS_STORE = 'app_mods';

const filterByMirror = (result) => {
    const mirrorId = getActiveMirrorId();
    if (!result || !Array.isArray(result)) return [];
    return result.filter(item => {
        if (!item || item.id === undefined) return false;
        const idStr = String(item.id);
        if (mirrorId === 'mirror_default') {
            return !idStr.startsWith('mirror_') || idStr.startsWith('mirror_default_');
        }
        return idStr.startsWith(`${mirrorId}_`);
    });
};

const saveMultiModelToDB = async (modelItem) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(MODELS_STORE, 'readwrite'); tx.objectStore(MODELS_STORE).put(modelItem); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const loadModelsListFromDB = async () => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(MODELS_STORE, 'readonly'); const request = tx.objectStore(MODELS_STORE).getAll(); request.onsuccess = (e) => { const list = filterByMirror(e.target.result).map(item => ({ id: item.id, name: item.name })); resolve(list); }; request.onerror = () => reject(request.error); }); };
const getMultiModelFromDB = async (id) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(MODELS_STORE, 'readonly'); const request = tx.objectStore(MODELS_STORE).get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); };
const deleteMultiModelFromDB = async (id) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(MODELS_STORE, 'readwrite'); tx.objectStore(MODELS_STORE).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const loadModelFilesFromDB = async () => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readonly'); const store = tx.objectStore(STORE_NAME); const request = store.getAll(); const keysRequest = store.getAllKeys(); request.onsuccess = () => { keysRequest.onsuccess = () => { if (!request.result || request.result.length === 0) return resolve(null); const files = request.result.map((file, index) => { Object.defineProperty(file, 'webkitRelativePath', { value: keysRequest.result[index], writable: false }); return file; }); resolve(files); }; }; request.onerror = () => reject(request.error); }); };
const saveBGMToDB = async (bgmItem) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(BGM_STORE, 'readwrite'); tx.objectStore(BGM_STORE).put(bgmItem); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const loadBGMFromDB = async () => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(BGM_STORE, 'readonly'); const request = tx.objectStore(BGM_STORE).getAll(); request.onsuccess = () => resolve(filterByMirror(request.result)); request.onerror = () => reject(request.error); }); };
const deleteBGMFromDB = async (id) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(BGM_STORE, 'readwrite'); tx.objectStore(BGM_STORE).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const saveImageToDB = async (key, dataUrl) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(SETTINGS_STORE, 'readwrite'); const store = tx.objectStore(SETTINGS_STORE); const realKey = `${getActiveMirrorId()}_${key}`; if (dataUrl) store.put(dataUrl, realKey); else store.delete(realKey); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const loadImageFromDB = async (key) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(SETTINGS_STORE, 'readonly'); const realKey = `${getActiveMirrorId()}_${key}`; const request = tx.objectStore(SETTINGS_STORE).get(realKey); request.onsuccess = () => { if (request.result) resolve(request.result); else if (getActiveMirrorId() === 'mirror_default') { const fb = tx.objectStore(SETTINGS_STORE).get(key); fb.onsuccess = () => resolve(fb.result); fb.onerror = () => resolve(null); } else resolve(null); }; request.onerror = () => reject(request.error); }); };
const saveBgItemToDB = async (bgItem) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(BG_STORE, 'readwrite'); tx.objectStore(BG_STORE).put(bgItem); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const loadBgListFromDB = async () => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(BG_STORE, 'readonly'); const request = tx.objectStore(BG_STORE).getAll(); request.onsuccess = () => resolve(filterByMirror(request.result)); request.onerror = () => reject(request.error); }); };
const deleteBgItemFromDB = async (id) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(BG_STORE, 'readwrite'); tx.objectStore(BG_STORE).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const saveModToDB = async (modItem) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(MODS_STORE, 'readwrite'); tx.objectStore(MODS_STORE).put(modItem); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };
const loadModsFromDB = async () => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(MODS_STORE, 'readonly'); const request = tx.objectStore(MODS_STORE).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => resolve(request.error); }); };
const deleteModFromDB = async (id) => { const db = await initDB(); return new Promise((resolve, reject) => { const tx = db.transaction(MODS_STORE, 'readwrite'); tx.objectStore(MODS_STORE).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); };

const blobToBase64 = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); reader.readAsDataURL(blob); });

// --- 默认设置 ---
const DEFAULT_SETTINGS = {
  openaiBaseUrl: '', openaiApiKey: '123', aiModel: 'gpt-3.5-turbo', aiTemperature: 0.7, apiProfiles: [],
  customSystemPrompt: '你是一个可爱的虚拟助手，请用简短、生动、带有一点二次元风格的语言回答我的问题。',
  worldviewText: '', worldviewProfiles: [],
  userName: '我', aiName: '对象', characterList: [], ttsEnabled: false,
  ttsUrlTemplate: 'http://127.0.0.1:9880/tts?text={text}&text_lang={lang}&ref_audio_path={ref_audio}&prompt_text={ref_text}&prompt_lang={ref_lang}',
  ttsLanguage: 'zh', ttsVolume: 1.0, bgmVolume: 0.3, bgmMode: 'sequential', enableBgmToast: false,
  // ✨ 新增手机端模式开关状态与缩放比例
  ttsMobileMode: false, enableMobileUI: false, mobileUIScale: 1.0,
  storySpriteScale: 1.0, storySpriteX: 0, storySpriteY: 0,
  live2dScale: 0.2, live2dX: 0, live2dY: 0, titleLive2dScale: 0.2, titleLive2dX: 0, titleLive2dY: 0,
  live2dResolution: window.devicePixelRatio || 1, // ✨ 新增：模型渲染分辨率精度
  corsProxyType: 'none', customCorsProxyUrl: 'https://corsproxy.io/?', enablePlotOptions: false, enableStreaming: true, typingSpeed: 40, vnLinesPerPage: 4, dialogOpacity: 0.6, settingsOpacity: 0.95, currentBgId: null, currentBgmId: null, currentExpressionId: null, currentModelId: null,
  dialogFontFamily: '"Microsoft YaHei", sans-serif', dialogTextColor: '#ffffff', dialogThemeColor: '#000000', dialogPositionY: 0, dialogLineHeight: 1.8,
  enableClickExpression: true, enableNoLive2DMode: false, mainTitleText: 'GWC', mainTitleColor: '#e0f2fe', mainTitleFont: 'serif', mainTitleX: 0, mainTitleY: 0, subTitleText: '- GalGame Web Chat -', subTitleColor: '#dbeafe', subTitleFont: 'sans-serif', subTitleX: 0, subTitleY: 0, titleBgOffsetX: 0, titleBgOffsetY: 0, plotApiMode: 'shared', plotBaseUrl: '', plotApiKey: '', plotModel: 'gpt-3.5-turbo', hideTitleLive2d: false, ttsRefAudio: '', ttsRefText: '', ttsRefLang: 'zh', enableTranslation: false, displayLanguage: 'zh', ttsSentencePause: 0, ttsPlaybackRate: 1.0, workMode: false, modelConfigs: {}, enableMemory: false, memoryInterval: 150, enableAutoSave: false, autoSaveInterval: 5, enableProactiveChat: false, proactiveMinInterval: 3, proactiveMaxInterval: 10, enableFaceTracking: false, enableCameraPreview: false, faceTrackingMode: 'full', ttsFastMode: true, showTitleBgmPlayer: true,
  shortcuts: { save: true, load: true, quickSave: true, quickLoad: true, skip: true, bg: true, model: true, expression: true, memo: true, workMode: true, faceTracking: true, hideModel: true, bgm: true, plot: true, tts: true, log: true }
};

const SHORTCUT_DEFS = [
  { id: 'save', label: '保存 (S)' }, { id: 'load', label: '读取 (L)' },
  { id: 'quickSave', label: '快存 (QS)' }, { id: 'quickLoad', label: '快读 (QL)' },
  { id: 'skip', label: '跳过 (SKIP)' }, { id: 'bg', label: '背景切换' },
  { id: 'model', label: '模型切换' }, { id: 'expression', label: '表情切换' },
  { id: 'memo', label: '备忘/日程' }, { id: 'workMode', label: '工作模式' },
  { id: 'faceTracking', label: '实时面捕' }, { id: 'hideModel', label: '模型显隐' },
  { id: 'bgm', label: 'BGM 控制' }, { id: 'plot', label: '推演选项' },
  { id: 'tts', label: 'Auto(TTS)' }, { id: 'log', label: 'Log 记录' }
];

const hexToRgba = (hex, alpha) => {
  let r = 0, g = 0, b = 0;
  if (hex && hex.length === 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
  else if (hex && hex.length === 7) { r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16); }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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
    <div className="flex justify-between text-[#ba3f42] font-bold">
      <label className="flex items-center gap-1"><span className="text-sm">✱</span> {label}</label>
      <span className="text-[#4a4036] bg-[#e8decb] px-2 py-0.5 rounded text-sm">{value}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-2 bg-[#d9c5b2] rounded-lg appearance-none cursor-pointer accent-[#ba3f42]" />
  </div>
);

const SettingSectionTitle = ({ title, extra }) => (
  <div className="flex flex-wrap items-center gap-4 mb-6">
    <h3 className="text-lg font-black text-[#ba3f42] tracking-widest whitespace-nowrap">{title}</h3>
    <div className="hidden sm:block flex-1 border-b-2 border-dashed border-[#e6d5b8] min-w-[20px]"></div>
    {extra && <div className="shrink-0 flex items-center gap-2">{extra}</div>}
  </div>
);

const TypewriterPreview = ({ speed, text, textStyle }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed(''); let i = 0;
    const timer = setInterval(() => { setDisplayed(text.slice(0, i + 1)); i++; if (i >= text.length) clearInterval(timer); }, speed);
    return () => clearInterval(timer);
  }, [speed, text]);
  return (
    <div style={textStyle} className="whitespace-pre-wrap flex-1 break-words">
      {displayed}<span className="inline-block w-2.5 h-5 ml-1 bg-white/70 animate-pulse align-middle rounded-sm"></span>
    </div>
  );
};


export default function App() {
  const [appMode, setAppMode] = useState('title');
  const [localTitleBgImage, setLocalTitleBgImage] = useState('');

  // ✨ 核心大迁徙：加入数据库唤醒锁与空壳状态
  const [isCoreLoading, setIsCoreLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [memos, setMemos] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [saveSlots, setSaveSlots] = useState({});
  const [quickSaveData, setQuickSaveData] = useState(null);
  const [autoSaveData, setAutoSaveData] = useState(null);

  // ✨ 异步潜入 IndexedDB 黑盒捞取数据
  useEffect(() => {
    const loadEverything = async () => {
      try {
        let savedSettings = await loadCoreData('live2d_settings_v35');
        let savedSessions = await loadCoreData('live2d_sessions_v35');
        let savedSlots = await loadCoreData('live2d_saves_v35');
        let savedQS = await loadCoreData('live2d_quicksave_v35');
        let savedAS = await loadCoreData('live2d_autosave_v35');
        let savedMemos = await loadCoreData('live2d_memos_v35');

        // ✨ 阻断污染：仅当处于默认主系统时，才允许从旧版 LocalStorage 继承进度数据
        const isDefaultMirror = getActiveMirrorId() === 'mirror_default';

        if (!savedSettings) { const o = localStorage.getItem('live2d_settings_v34') || localStorage.getItem('live2d_settings_v33'); if(o) savedSettings = JSON.parse(o); }
        if (!savedSessions && isDefaultMirror) { const o = localStorage.getItem('live2d_sessions_v34'); if(o) savedSessions = JSON.parse(o); }
        if (!savedSlots && isDefaultMirror) { const o = localStorage.getItem('live2d_saves_v34'); if(o) savedSlots = JSON.parse(o); }
        if (!savedQS && isDefaultMirror) { const o = localStorage.getItem('live2d_quicksave_v34'); if(o) savedQS = JSON.parse(o); }
        if (!savedAS && isDefaultMirror) { const o = localStorage.getItem('live2d_autosave_v34'); if(o) savedAS = JSON.parse(o); }
        if (!savedMemos && isDefaultMirror) { const o = localStorage.getItem('live2d_memos_v34'); if(o) savedMemos = JSON.parse(o); }

        if (savedSettings) {
            if (savedSettings.currentModelId === undefined) savedSettings.currentModelId = null;
            if (savedSettings.dialogLineHeight === undefined) savedSettings.dialogLineHeight = 1.8;
            setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
        }
        if (savedSessions && savedSessions.length > 0) { setSessions(savedSessions); setActiveSessionId(savedSessions[0].id); } 
        else { const newS = { id: Date.now().toString(), title: '新剧情', messages: [], memorySummary: '' }; setSessions([newS]); setActiveSessionId(newS.id); }
        if (savedSlots) setSaveSlots(savedSlots);
        if (savedQS) setQuickSaveData(savedQS);
        if (savedAS) setAutoSaveData(savedAS);
        if (savedMemos) setMemos(savedMemos);
      } catch(e) { console.error("唤醒失败", e); } finally { setIsCoreLoading(false); }
    };
    loadEverything();
  }, []);

  // ✨ 数据变动实时写入黑盒
  useEffect(() => { if (!isCoreLoading) saveCoreData('live2d_settings_v35', settings); }, [settings, isCoreLoading]);
  useEffect(() => { if (!isCoreLoading) saveCoreData('live2d_sessions_v35', sessions); }, [sessions, isCoreLoading]);
  useEffect(() => { if (!isCoreLoading) saveCoreData('live2d_saves_v35', saveSlots); }, [saveSlots, isCoreLoading]);
  useEffect(() => { if (!isCoreLoading) saveCoreData('live2d_quicksave_v35', quickSaveData); }, [quickSaveData, isCoreLoading]);
  useEffect(() => { if (!isCoreLoading) saveCoreData('live2d_autosave_v35', autoSaveData); }, [autoSaveData, isCoreLoading]);
  useEffect(() => { if (!isCoreLoading) saveCoreData('live2d_memos_v35', memos); }, [memos, isCoreLoading]);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [newMemoText, setNewMemoText] = useState('');
  const [newMemoDate, setNewMemoDate] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('visual'); 
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false); // ✨ 新增：底层并发锁，防止重复触发请求导致闪烁
  const [isCompressingMemory, setIsCompressingMemory] = useState(false); 
  
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [availableModels, setAvailableModels] = useState(['gpt-3.5-turbo', 'gpt-4o', 'gemini-pro', 'claude-3-opus']);
  const [live2dStatus, setLive2dStatus] = useState('初始化中...');
  const [modelReloadTrigger, setModelReloadTrigger] = useState(0);
// ✨ 核心大迁徙修复：当底层数据库(IDB)把设置唤醒完毕后，强制“踢”一脚触发模型重载！
  useEffect(() => {
    if (!isCoreLoading) {
      setModelReloadTrigger(prev => prev + 1);
    }
  }, [isCoreLoading]);

  const [suggestedReplies, setSuggestedReplies] = useState([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [storySummary, setStorySummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false); 

 const [isFaceTrackingLoading, setIsFaceTrackingLoading] = useState(false);

  // ✨ 原生扩展 API 状态
  const [pluginTitleButtons, setPluginTitleButtons] = useState([]);
  const [activePluginUI, setActivePluginUI] = useState(null);
  const [pluginDialog, setPluginDialog] = useState({ visible: false, speaker: '', text: '', spriteUrl: '', bgUrl: '', typing: false });

  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [backupProgress, setBackupProgress] = useState({ visible: false, percent: 0, text: '' }); 
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

  // ✨ 插件列表状态
  const [modsList, setModsList] = useState([]);

 /// ✨ 新增：环境探针状态，用于实时静默检测【平行镜像分身】插件是否已激活
  const [isMirrorPluginLoaded, setIsMirrorPluginLoaded] = useState(false);
  useEffect(() => {
    const checkInterval = setInterval(() => {
        // 检测 window 顶层对象中是否存在插件的专属挂载徽标
        const isLoaded = !!window.__ImageMirrorLoaded;
        if (isLoaded !== isMirrorPluginLoaded) {
            setIsMirrorPluginLoaded(isLoaded);
        }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [isMirrorPluginLoaded]);

  // ✨ 原生级融合：沉浸模式状态与虚拟键盘自适应
  const [isImmersive, setIsImmersive] = useState(false);

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
  
  // 维护给全局插件的 API
  const gwcApiRef = useRef({});

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    setToast({ visible: true, message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => { setToast(prev => ({ ...prev, visible: false })); }, duration); 
  }, []);

  // ✨ 核心修复：将依赖 showToast 的 Hook 移至声明下方，彻底解决初始化死区 (TDZ) 报错
  useEffect(() => {
      if (window.visualViewport) {
          const resizeHandler = () => document.body.style.height = window.visualViewport.height + 'px';
          window.visualViewport.addEventListener('resize', resizeHandler);
          return () => window.visualViewport.removeEventListener('resize', resizeHandler);
      }
  }, []);

  useEffect(() => {
      let lastTapTime = 0;
      const handleInteraction = (e) => {
          if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.z-\\[9999\\]') || e.target.closest('.pointer-events-auto')) return;
          const currentTime = new Date().getTime(); const tapLength = currentTime - lastTapTime;
          if (tapLength < 300 && tapLength > 0) { setIsImmersive(prev => !prev); e.preventDefault(); showToast("🌟 沉浸模式切换 (双击空白处恢复)", "info", 2000); }
          lastTapTime = currentTime;
      };
      document.addEventListener('touchend', handleInteraction, { passive: false });
      document.addEventListener('dblclick', handleInteraction);
      return () => { document.removeEventListener('touchend', handleInteraction); document.removeEventListener('dblclick', handleInteraction); };
  }, [showToast]);

  // ✨ GWC Plugin Core API 挂载
  useEffect(() => {
    gwcApiRef.current = {
        version: '4.1.0',
        getSettings: () => settings,
        updateSettings: (newSettings) => setSettings(s => ({...s, ...newSettings})),
        getSessions: () => sessions,
        updateSessions: setSessions,
        getActiveSessionId: () => activeSessionId,
        showToast,
        triggerSendMessage: (text, hidden) => {
            window.dispatchEvent(new CustomEvent('plugin-send-msg', { detail: { text, hidden } }));
        },
        registerTitleButton: (id, label, onClick) => {
            setPluginTitleButtons(prev => {
                if (prev.find(b => b.id === id)) return prev;
                return [...prev, {id, label, onClick}];
            });
        },
        setPluginUI: (uiName) => {
            setActivePluginUI(uiName);
            if (uiName) setAppMode('game');
        },
        getActivePluginUI: () => activePluginUI,
        updatePluginDialog: (data) => setPluginDialog(prev => ({...prev, ...data})),
        on: (eventName, callback) => window.addEventListener(eventName, callback),
        off: (eventName, callback) => window.removeEventListener(eventName, callback)
    };
    window.$GWC = gwcApiRef.current;
  }, [settings, sessions, activeSessionId, showToast, activePluginUI]);

  // ✨ 初始化 Mod 插件
  useEffect(() => {
    const initMods = async () => {
        try {
            const list = await loadModsFromDB() || [];
            setModsList(list);
            list.forEach(mod => {
                if (mod.enabled) {
                    try {
                        const script = document.createElement('script');
                        script.textContent = `(function() { try { ${mod.code} } catch(e) { console.error('Mod Error [${mod.name}]:', e); } })();`;
                        document.head.appendChild(script);
                        console.log(`[Plugin] Mod Loaded: ${mod.name}`);
                    } catch (e) { console.error(`Mod Execution Error [${mod.name}]:`, e); }
                }
            });
        } catch (e) {
            console.error("加载插件失败:", e);
        }
    };
    initMods();
  }, []);

  const handleNextBgm = useCallback(() => {
    if (bgmList.length === 0) return;
    let next = (currentBgmIndex + 1) % bgmList.length;
    if (settings.bgmMode === 'random') {
        if (bgmList.length > 1) {
            next = Math.floor(Math.random() * bgmList.length);
            if (next === currentBgmIndex) next = (next + 1) % bgmList.length;
        } else { next = 0; }
    }
    setCurrentBgmIndex(next);
    if (!isBgmPlaying) setIsBgmPlaying(true);
  }, [bgmList, currentBgmIndex, settings.bgmMode, isBgmPlaying]);

  const handlePrevBgm = useCallback(() => {
    if (bgmList.length === 0) return;
    let prev = (currentBgmIndex - 1 + bgmList.length) % bgmList.length;
    setCurrentBgmIndex(prev);
    if (!isBgmPlaying) setIsBgmPlaying(true);
  }, [bgmList, currentBgmIndex, isBgmPlaying]);

  const toggleBgmMode = useCallback(() => {
    const modes = ['sequential', 'random', 'loop'];
    const nextMode = modes[(modes.indexOf(settings.bgmMode) + 1) % modes.length];
    setSettings(s => ({ ...s, bgmMode: nextMode }));
  }, [settings.bgmMode]);

  const [bgmOffset, setBgmOffset] = useState({ x: 0, y: 0 });
  const isDraggingBgm = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const handleBgmPointerDown = (e) => {
    isDraggingBgm.current = true;
    dragStart.current = { x: e.clientX ?? e.touches[0].clientX, y: e.clientY ?? e.touches[0].clientY };
    offsetStart.current = { ...bgmOffset };
  };

  const handleBgmPointerMove = useCallback((e) => {
    if (!isDraggingBgm.current) return;
    const clientX = e.clientX ?? e.touches[0].clientX;
    const clientY = e.clientY ?? e.touches[0].clientY;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setBgmOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
  }, []);

  const handleBgmPointerUp = useCallback(() => {
    isDraggingBgm.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleBgmPointerMove);
    window.addEventListener('mouseup', handleBgmPointerUp);
    window.addEventListener('touchmove', handleBgmPointerMove, { passive: false });
    window.addEventListener('touchend', handleBgmPointerUp);
    return () => {
        window.removeEventListener('mousemove', handleBgmPointerMove);
        window.removeEventListener('mouseup', handleBgmPointerUp);
        window.removeEventListener('touchmove', handleBgmPointerMove);
        window.removeEventListener('touchend', handleBgmPointerUp);
    };
  }, [handleBgmPointerMove, handleBgmPointerUp]);

  const ttsTaskQueueRef = useRef([]);
  const ttsTimeoutRef = useRef(null); 
  const isPlayingTTSRef = useRef(false);

  const ttsVolRef = useRef(settings.ttsVolume);
  const ttsRateRef = useRef(settings.ttsPlaybackRate);
  useEffect(() => { ttsVolRef.current = settings.ttsVolume; }, [settings.ttsVolume]);
  useEffect(() => { ttsRateRef.current = settings.ttsPlaybackRate; }, [settings.ttsPlaybackRate]);
  const ttsPauseRef = useRef(settings.ttsSentencePause);
  useEffect(() => { ttsPauseRef.current = settings.ttsSentencePause; }, [settings.ttsSentencePause]);

  const videoRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const faceRigRef = useRef(null);
  const faceTrackingTickerRef = useRef(null);
  
  const enableFaceTrackingRef = useRef(settings.enableFaceTracking);
  useEffect(() => { enableFaceTrackingRef.current = settings.enableFaceTracking; }, [settings.enableFaceTracking]);

  const faceTrackingModeRef = useRef(settings.faceTrackingMode);
  useEffect(() => { faceTrackingModeRef.current = settings.faceTrackingMode; }, [settings.faceTrackingMode]);

  useEffect(() => {
    if (settings.enableFaceTracking && modelRef.current) {
        modelRef.current.focus(0, 0);
        if (modelRef.current.faceRigPrev) modelRef.current.faceRigPrev = {};
    }
  }, [settings.enableFaceTracking]);

  const nextProactiveTimeRef = useRef(Date.now() + 999999999);
  
  const resetProactiveTimer = useCallback(() => {
    if (!settings.enableProactiveChat) return;
    const min = Math.min(settings.proactiveMinInterval, settings.proactiveMaxInterval);
    const max = Math.max(settings.proactiveMinInterval, settings.proactiveMaxInterval);
    const randomDelay = Math.floor(Math.random() * ((max - min) * 60000 + 1)) + (min * 60000);
    nextProactiveTimeRef.current = Date.now() + randomDelay;
  }, [settings.enableProactiveChat, settings.proactiveMinInterval, settings.proactiveMaxInterval]);

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

  const handleCopyMessage = (text) => {
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); showToast('已复制对话文本', 'success', 2000); } 
    catch (err) { showToast('复制失败，请手动选择复制', 'error'); }
    document.body.removeChild(textArea);
  };

  const startFaceTracking = useCallback(async () => {
    if (!videoRef.current) return;
    setIsFaceTrackingLoading(true);
    try {
        setLive2dStatus('加载面部捕捉库...');
        await injectScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await injectScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
        await injectScript('https://cdn.jsdelivr.net/npm/kalidokit@1.1.5/dist/kalidokit.umd.js');

        if (!window.FaceMesh || !window.Camera || !window.Kalidokit) {
            throw new Error("面部捕捉依赖核心库拉取失败，请检查网络连接");
        }

        const faceMesh = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults((results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const faceLandmarks = results.multiFaceLandmarks[0];
                const riggedFace = window.Kalidokit.Face.solve(faceLandmarks, {
                    runtime: "mediapipe",
                    video: videoRef.current
                });
                faceRigRef.current = riggedFace;
            } else {
                faceRigRef.current = null;
            }
        });

        faceMeshRef.current = faceMesh;

        // 使用原生 getUserMedia 替代 Camera 以增加兼容性
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current.play();
                const sendFrames = async () => {
                    if (faceMeshRef.current && videoRef.current && settings.enableFaceTracking) {
                        try {
                            await faceMeshRef.current.send({ image: videoRef.current });
                        } catch (e) { }
                        requestAnimationFrame(sendFrames);
                    }
                };
                sendFrames();
            };
        } else {
             throw new Error("浏览器不支持摄像头 API");
        }
        
        setLive2dStatus('');
        setIsFaceTrackingLoading(false);
        showToast("📸 摄像头实时面捕已就绪", "success");

    } catch (err) {
        setIsFaceTrackingLoading(false);
        setSettings(s => ({...s, enableFaceTracking: false}));
        showToast("摄像头捕捉启动遭遇异常：" + err.message, "error");
        setLive2dStatus('');
    }
  }, [showToast, settings.enableFaceTracking]);

  const stopFaceTracking = useCallback(() => {
    if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
    faceRigRef.current = null;
  }, []);

  useEffect(() => {
    if (settings.enableFaceTracking) {
        startFaceTracking();
    } else {
        stopFaceTracking();
    }
  }, [settings.enableFaceTracking, startFaceTracking, stopFaceTracking]);

  useEffect(() => {
    return () => { stopFaceTracking(); };
  }, [stopFaceTracking]);


  // ✨ 核心大迁徙修复：等待黑盒数据唤醒后，再加载媒体并精准恢复上次播放的 BGM
  useEffect(() => {
    if (isCoreLoading) return; // 拦截开机的空状态，等待真实 settings 就绪
    
    loadImageFromDB('titleBgImage').then(img => { if (img) setLocalTitleBgImage(img); }).catch(console.error);
    loadModelsListFromDB().then(list => { if (list) setModelsList(list); }).catch(console.error);
    loadBgListFromDB().then(list => { if (list) setBgList(list); }).catch(console.error);
    
    loadBGMFromDB().then(list => {
      if (list && list.length > 0) {
        setBgmList(list);
        // 此时 settings 已经从黑盒中满血复活，能精准拿到上次的 currentBgmId
        if (settings.currentBgmId) {
          const idx = list.findIndex(b => b.id === settings.currentBgmId); 
          setCurrentBgmIndex(idx !== -1 ? idx : 0);
        } else { 
          setCurrentBgmIndex(0); 
        }
      }
    }).catch(console.error);
  }, [isCoreLoading]); // 依赖黑盒加载状态
  
  useEffect(() => { if (activeSessionId) { localStorage.setItem('live2d_active_session_v34', activeSessionId); setStorySummary(''); } }, [activeSessionId]);
  useEffect(() => { if (isLogOpen && logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [sessions, activeSessionId, isLogOpen]);

  useEffect(() => { bgmAudioRef.current.volume = settings.bgmVolume; }, [settings.bgmVolume]);

  useEffect(() => {
    if (currentBgmIndex >= 0 && bgmList[currentBgmIndex]) {
      const bgmItem = bgmList[currentBgmIndex]; const url = URL.createObjectURL(bgmItem.blob);
      bgmAudioRef.current.src = url; bgmAudioRef.current.loop = settings.bgmMode === 'loop'; setSettings(s => ({ ...s, currentBgmId: bgmItem.id }));
      
      if (isBgmPlaying) {
         bgmAudioRef.current.play().catch(e => console.warn("BGM Background play deferred:", e.message));
      }
      
      if (settings.enableBgmToast) {
        setBgmToast({ visible: true, name: bgmItem.name });
        if (bgmToastTimeoutRef.current) clearTimeout(bgmToastTimeoutRef.current);
        bgmToastTimeoutRef.current = setTimeout(() => { setBgmToast(prev => ({ ...prev, visible: false })); }, 3000);
      }

      if ('mediaSession' in navigator) {
         navigator.mediaSession.metadata = new window.MediaMetadata({ title: bgmItem.name, artist: 'GalGame Web Chat' });
         navigator.mediaSession.setActionHandler('previoustrack', handlePrevBgm);
         navigator.mediaSession.setActionHandler('nexttrack', handleNextBgm);
         navigator.mediaSession.setActionHandler('play', () => { bgmAudioRef.current.play(); setIsBgmPlaying(true); });
         navigator.mediaSession.setActionHandler('pause', () => { bgmAudioRef.current.pause(); setIsBgmPlaying(false); });
      }
    }
  }, [currentBgmIndex, settings.bgmMode, bgmList, handlePrevBgm, handleNextBgm]);

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
    else { bgmAudioRef.current.play().catch(e => console.warn("播放被拦截:", e)); setIsBgmPlaying(true); }
  };

  const handleBgmUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return; showToast(`正在导入 ${files.length} 首音乐...`); let added = 0;
    for (let file of files) {
      // ✨ 为音乐打上当前镜像的专属印记
      const bgmItem = { id: `${getActiveMirrorId()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name: file.name, blob: file };
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
        // ✨ 为背景图打上当前镜像的专属印记
        const bgItem = { id: `${getActiveMirrorId()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name: file.name, dataUrl }; await saveBgItemToDB(bgItem); setBgList(prev => [...prev, bgItem]); added++;
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

  // ✨ Mod 插件上传处理器 (原生融合支持多文件并发装载)
  const handleModUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      
      showToast(`📦 正在安全挂载 ${files.length} 个插件，请稍候...`, "info", 5000);
      let successCount = 0;
      let newMods = [];

      for (let file of files) {
          if (!file.name.toLowerCase().endsWith('.js') && !file.name.toLowerCase().endsWith('.txt')) continue;
          try {
              const text = await file.text();
              const modItem = {
                  id: Date.now().toString() + Math.random().toString().slice(2,6),
                  name: file.name.replace(/\.txt$/i, '.js'),
                  code: text,
                  enabled: true,
                  installDate: new Date().toLocaleString()
              };
              await saveModToDB(modItem);
              newMods.push(modItem);
              successCount++;
          } catch (err) { console.error("插件导入失败:", file.name, err); }
      }
      
      if (successCount > 0) {
          setModsList(prev => [...prev, ...newMods]);
          showToast(`✅ 成功将 ${successCount} 个插件烧录至系统！即将执行热重载...`, "success", 4000);
          setTimeout(() => window.location.reload(), 2000);
      } else {
          showToast("未导入任何合法格式的插件 (.js 或 .txt)", "error");
      }
      e.target.value = '';
  };

  const toggleModEnabled = async (id, currentStatus) => {
      const updatedList = modsList.map(m => m.id === id ? { ...m, enabled: !currentStatus } : m);
      setModsList(updatedList);
      const modToUpdate = updatedList.find(m => m.id === id);
      if (modToUpdate) await saveModToDB(modToUpdate);
      showToast("模组状态已更新，刷新页面后生效", "info");
  };

  const removeMod = async (id) => {
      await deleteModFromDB(id);
      setModsList(prev => prev.filter(m => m.id !== id));
      showToast("模组已彻底卸载", "success");
  };

  const handleAddMemo = () => {
    if (!newMemoText.trim()) return; const newMemo = { id: Date.now().toString(), text: newMemoText.trim(), date: newMemoDate, isDone: false, hasReminded: false };
    setMemos([newMemo, ...memos]); setNewMemoText(''); setNewMemoDate(''); showToast("已添加日程！AI将在系统时钟到达时主动提示。", "success");
  };
  const toggleMemoDone = (id) => setMemos(memos.map(m => m.id === id ? { ...m, isDone: !m.isDone } : m));
  const deleteMemo = (id) => setMemos(memos.filter(m => m.id !== id));

  useEffect(() => {
    if (settings.enableProactiveChat) resetProactiveTimer();
  }, [settings.enableProactiveChat, resetProactiveTimer]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (appMode === 'game' && settings.enableProactiveChat && !isLoading && activeSessionId) {
        if (Date.now() >= nextProactiveTimeRef.current) {
          nextProactiveTimeRef.current = Date.now() + 999999999; 
          window.dispatchEvent(new CustomEvent('trigger-proactive-chat'));
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [appMode, settings.enableProactiveChat, isLoading, activeSessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        setMemos(prevMemos => {
            let changed = false;
            const newMemos = prevMemos.map(m => {
                if (!m.isDone && !m.hasReminded && m.date) {
                    const mDate = new Date(m.date);
                    if (now >= mDate && (now.getTime() - mDate.getTime()) < 5 * 60 * 1000) {
                        changed = true; 
                        window.dispatchEvent(new CustomEvent('trigger-reminder', { detail: m.text })); 
                        // ✨ 核心修复：触发提醒后，不仅标记已提醒，还自动标记为已完成(isDone: true)
                        return { ...m, hasReminded: true, isDone: true }; 
                    }
                } return m;
            }); return changed ? newMemos : prevMemos;
        });
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleReminder = (e) => {
        const memoText = e.detail;
        // ✨ 加入并发锁保护，防止在极短时间内多次触发导致画面闪烁
        if (appMode === 'game' && !isLoadingRef.current && activeSessionId) {
            // ✨ 核心修复：严厉警告 AI 这次是提醒，绝对禁止再次生成 <ADD_MEMO> 标签！
            triggerSendMessage(`【系统自动触发：内部指令】现在时间到了！玩家设定的日程：“${memoText}”已生效。请立刻主动开口提醒玩家，用符合你人设的自然语气，绝对不要复述这条系统指令或提及“系统自动触发”，直接进入角色表现出是你自己记住并提醒的。**[最高警告]：本次是执行提醒任务，请绝对不要在结尾输出 <ADD_MEMO> 标签重复添加日程！**`, true);
        } else { showToast(`⏰ 日程提醒: ${memoText}\n(因处于系统菜单或AI正忙，未能触发语音互动)`, 'success', 8000); }
    };
    const handleProactiveChat = () => {
        if (appMode === 'game' && !isLoadingRef.current && activeSessionId) {
            triggerSendMessage(`【系统自动触发：主动搭话】距离上次对话已经过了一段时间，请你现在主动找玩家搭话，随便聊点什么，分享一下心情、日常或者开启一个新话题。语气要自然、生动，符合你的人设。绝对不要复述这条系统指令或提及“系统自动触发”，直接进入角色！`, true);
        }
    };
    const handlePluginSendMsg = (e) => {
        if (e.detail && e.detail.text) {
            triggerSendMessage(e.detail.text, e.detail.hidden);
        }
    }
    window.addEventListener('trigger-reminder', handleReminder);
    window.addEventListener('trigger-proactive-chat', handleProactiveChat);
    window.addEventListener('plugin-send-msg', handlePluginSendMsg);
    return () => {
        window.removeEventListener('trigger-reminder', handleReminder);
        window.removeEventListener('trigger-proactive-chat', handleProactiveChat);
        window.removeEventListener('plugin-send-msg', handlePluginSendMsg);
    }
  });

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

  // ✨ 核心重构：世界观预设的完整增删改查
  const saveWorldviewProfile = () => { const name = prompt("请输入世界观配置名称：", "新世界观"); if(name) { setSettings(prev => ({ ...prev, worldviewProfiles: [...(prev.worldviewProfiles || []), { id: Date.now().toString(), name: name.trim(), text: settings.worldviewText }] })); showToast("世界观保存成功", "success"); } };
  const applyWorldviewProfile = (profile) => { setSettings(prev => ({ ...prev, worldviewText: profile.text })); showToast(`已加载世界观: ${profile.name}`, "success"); };
 const renameWorldviewProfile = (id, oldName) => { const newName = prompt("请输入新的世界观名称：", oldName); if(newName && newName.trim()) { setSettings(prev => ({ ...prev, worldviewProfiles: prev.worldviewProfiles.map(p => p.id === id ? { ...p, name: newName.trim() } : p) })); } };
  const deleteWorldviewProfile = (id) => { setSettings(prev => ({ ...prev, worldviewProfiles: prev.worldviewProfiles.filter(p => p.id !== id) })); };
  
  // ✨ 新增：世界观导出功能
  const exportWorldviewProfile = (profile) => { const content = `【世界观名称】\n${profile.name}\n【世界观设定】\n${profile.text}`; const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${profile.name}_世界观.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast(`导出成功: ${profile.name}_世界观.txt`, "success"); };
  
  // ✨ 核心重构：API 配置的完整增删改查
  const saveApiProfile = () => { const name = prompt("请输入模型配置名称：", "新配置"); if(name) { setSettings(prev => ({ ...prev, apiProfiles: [...(prev.apiProfiles || []), { id: Date.now().toString(), name: name.trim(), baseUrl: settings.openaiBaseUrl, apiKey: settings.openaiApiKey, model: settings.aiModel, temp: settings.aiTemperature }] })); showToast("API配置保存成功", "success"); } };
  const applyApiProfile = (profile) => { setSettings(prev => ({ ...prev, openaiBaseUrl: profile.baseUrl, openaiApiKey: profile.apiKey, aiModel: profile.model, aiTemperature: profile.temp })); showToast(`已加载API配置: ${profile.name}`, "success"); };
  const renameApiProfile = (id, oldName) => { const newName = prompt("请输入新的配置名称：", oldName); if(newName && newName.trim()) { setSettings(prev => ({ ...prev, apiProfiles: prev.apiProfiles.map(p => p.id === id ? { ...p, name: newName.trim() } : p) })); } };
  const deleteApiProfile = (id) => { setSettings(prev => ({ ...prev, apiProfiles: prev.apiProfiles.filter(p => p.id !== id) })); };

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

  // ✨ --- 修复重构的 handleExportBackup 功能 ---
  // 修复 Invalid string length 崩溃报错 (打包 JSON 时自动拦截并丢弃造成内存溢出的巨型图片和音乐Base64代码)
  
  // ✨ 核心修复 1：在点击的第一毫秒，瞬间抢夺用户手势令牌，弹出原生另存为窗口
  const getFileHandle = async (defaultFilename) => {
      if (!window.showSaveFilePicker) return null; 
      try {
          return await window.showSaveFilePicker({
              suggestedName: defaultFilename,
              types: [{ description: 'GWC 数据备份包', accept: {'application/zip': ['.zip']} }]
          });
      } catch (err) {
          if (err.name === 'AbortError') throw new Error('ABORT_BY_USER'); 
          console.warn("原生另存为API调用失败，将降级为传统下载:", err);
          return null;
      }
  };

  // ✨ 核心修复 2：拿到令牌后，再执行耗时操作，并通过回调更新进度条
  const finalizeZipSave = async (zip, fileHandle, defaultFilename, successMsg) => {
      setBackupProgress({ visible: true, percent: 0, text: '正在初始化压缩引擎...' });
      try {
          // 利用 onUpdate 回调实时获取底层 JSZip 的封装进度
          const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (metadata) => {
              setBackupProgress({ visible: true, percent: metadata.percent.toFixed(1), text: `正在封装 ZIP 数据卷...` });
          });
          
          setBackupProgress({ visible: true, percent: 100, text: '正在写入磁盘...' });

          if (fileHandle) {
              const writable = await fileHandle.createWritable();
              await writable.write(zipBlob);
              await writable.close();
              showToast(`✅ ${successMsg}`, "success", 5000);
          } else {
              const url = URL.createObjectURL(zipBlob); 
              const a = document.createElement('a'); 
              a.href = url; a.download = defaultFilename;
              document.body.appendChild(a); a.click(); document.body.removeChild(a); 
              setTimeout(() => URL.revokeObjectURL(url), 20000); 
              showToast(`✅ ${successMsg} (已降级调用传统下载)`, "success", 5000);
          }
      } catch (err) { showToast(`打包崩溃: ${err.message}`, "error", 8000); }
      finally { setTimeout(() => setBackupProgress({ visible: false, percent: 0, text: '' }), 1500); }
  };

  // 1. 导出全量系统备份
  const handleExportFullBackup = async () => {
    const defaultFilename = `GWC_全量系统备份_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.zip`;
    let fileHandle = null;
    
    // 瞬间截获点击动作，弹出另存为窗口
    try { fileHandle = await getFileHandle(defaultFilename); } 
    catch (e) { if (e.message === 'ABORT_BY_USER') { showToast("已取消保存", "info"); return; } }

    setBackupProgress({ visible: true, percent: 10, text: '正在提取底层数据库...' });
    try {
      await injectScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      const zip = new window.JSZip();
      zip.folder("bgm"); zip.folder("models"); zip.folder("bgs"); zip.folder("videos"); zip.folder("sprites");
      const db = await initDB(); const exportData = { backupType: 'full', stores: {} };
      const stores = ['core_data', 'model_files', 'app_settings', 'bgm_files', 'bg_images', 'live2d_models', 'app_mods'];
      
      for (const storeName of stores) {
        if (!db.objectStoreNames.contains(storeName)) continue;
        const tx = db.transaction(storeName, 'readonly'); const store = tx.objectStore(storeName);
        const keys = await new Promise(res => { const r = store.getAllKeys(); r.onsuccess = () => res(r.result); });
        const values = await new Promise(res => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
        exportData.stores[storeName] = [];
        for (let i = 0; i < keys.length; i++) {
          let val = values[i]; const key = keys[i];
          if (storeName === 'bgm_files' && val.blob) {
            const safeName = (val.name || 'audio.mp3').replace(/[^a-zA-Z0-9.\-_]/g, '_'); const blobPath = `bgm/${key}_${safeName}`; 
            try { const buffer = await val.blob.arrayBuffer(); zip.file(blobPath, buffer); val = { ...val, blob: { __isZipBlob: true, path: blobPath, type: val.blob.type } }; } catch(e) {}
          } else if (storeName === 'live2d_models' && val.files) {
            val.files = await Promise.all(val.files.map(async (f, fIdx) => {
              if (f.blob) { 
                const safeName = f.path ? f.path.replace(/[^a-zA-Z0-9.\-_]/g, '_') : 'file'; const blobPath = `models/${key}/${fIdx}_${safeName}`; 
                try { const buffer = await f.blob.arrayBuffer(); zip.file(blobPath, buffer); return { ...f, blob: { __isZipBlob: true, path: blobPath, type: f.blob.type } }; } catch(e) { return f; }
              } return f;
            }));
          } else if (storeName === 'bg_images' && val.dataUrl) {
            const txtPath = `bgs/${key}.txt`; zip.file(txtPath, val.dataUrl); val = { ...val, dataUrl: { __isZipTxt: true, path: txtPath } };
          }
          exportData.stores[storeName].push({ key: key, value: val });
        }
      }

      setBackupProgress({ visible: true, percent: 30, text: '正在提取多开镜像与插件数据...' });
      try {
          const mirrorDbReq = indexedDB.open('GWC_Image_Mirrors_DB');
          const mirrorDb = await new Promise((res) => { mirrorDbReq.onsuccess = e => res(e.target.result); mirrorDbReq.onerror = () => res(null); mirrorDbReq.onupgradeneeded = e => { e.target.transaction.abort(); res(null); }; });
          if (mirrorDb && mirrorDb.objectStoreNames.contains('mirrors')) {
              const tx = mirrorDb.transaction(['mirrors', 'config'], 'readonly');
              const mirrors = await new Promise(res => { const r = tx.objectStore('mirrors').getAll(); r.onsuccess = () => res(r.result); });
              const config = await new Promise(res => { const r = tx.objectStore('config').getAll(); r.onsuccess = () => res(r.result); });
              exportData.mirrorsDb = { mirrors, config };
          }
      } catch(e) {}

      try {
          const videoDbReq = indexedDB.open('GWC_VideoBG_Plugin_DB');
          const videoDb = await new Promise((res) => { videoDbReq.onsuccess = e => res(e.target.result); videoDbReq.onerror = () => res(null); videoDbReq.onupgradeneeded = e => { e.target.transaction.abort(); res(null); }; });
          if (videoDb && videoDb.objectStoreNames.contains('videos')) {
              const tx = videoDb.transaction('videos', 'readonly'); const store = tx.objectStore('videos');
              const keys = await new Promise(res => { const r = store.getAllKeys(); r.onsuccess = () => res(r.result); });
              const values = await new Promise(res => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
              exportData.videosDb = [];
              for (let i = 0; i < keys.length; i++) {
                  if (values[i]) {
                      const blobPath = `videos/${keys[i]}_bg.mp4`; const buffer = await values[i].arrayBuffer(); zip.file(blobPath, buffer);
                      exportData.videosDb.push({ key: keys[i], value: { __isZipBlob: true, path: blobPath, type: values[i].type } });
                  }
              }
          }
      } catch(e) {}

      try {
          const spriteDbReq = indexedDB.open('GWC_Sprite_DLC_DB', 1);
          const spriteDb = await new Promise((res) => { spriteDbReq.onsuccess = e => res(e.target.result); spriteDbReq.onerror = () => res(null); spriteDbReq.onupgradeneeded = e => { e.target.transaction.abort(); res(null); }; });
          if (spriteDb && spriteDb.objectStoreNames.contains('sprite_sets')) {
              const tx = spriteDb.transaction('sprite_sets', 'readonly'); 
              const store = tx.objectStore('sprite_sets');
              const sets = await new Promise(res => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
              exportData.spriteDb = [];
              for (const set of sets) {
                  const processedSet = { ...set, sprites: [] };
                  for (let i = 0; i < set.sprites.length; i++) {
                      const sp = set.sprites[i];
                      const txtPath = `sprites/${set.id}_${i}.txt`; 
                      zip.file(txtPath, sp.dataUrl);
                      processedSet.sprites.push({ name: sp.name, dataUrl: { __isZipTxt: true, path: txtPath } });
                  }
                  exportData.spriteDb.push(processedSet);
              }
          }
      } catch(e) {}

      zip.file("database.json", JSON.stringify(exportData));
      
      // ✨ 进度达到一半，交由写入器接管剩余合并任务
      setBackupProgress({ visible: true, percent: 50, text: '准备封卷...' });
      await finalizeZipSave(zip, fileHandle, defaultFilename, "全局全量 ZIP 备份导出完成！");
    } catch (err) { 
        showToast(`导出失败: ${err.message}`, "error"); 
        setBackupProgress({ visible: false, percent: 0, text: '' });
    }
  };

  // 2. 仅导出当前活跃镜像的独立备份包
  const handleExportSingleBackup = async () => {
    const targetId = getActiveMirrorId();
    const defaultFilename = `GWC_单体镜像备份_${targetId}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.zip`;
    let fileHandle = null;

    try { fileHandle = await getFileHandle(defaultFilename); } 
    catch (e) { if (e.message === 'ABORT_BY_USER') { showToast("已取消保存", "info"); return; } }

    setBackupProgress({ visible: true, percent: 10, text: `正在提取当前独立镜像 [${targetId}]...` });
    try {
      await injectScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      const zip = new window.JSZip();
      zip.folder("bgm"); zip.folder("models"); zip.folder("bgs"); zip.folder("videos"); zip.folder("sprites");
      const db = await initDB(); 
      const exportData = { backupType: 'single', sourceMirrorId: targetId, stores: {} };
      const stores = ['core_data', 'app_settings', 'bgm_files', 'bg_images', 'live2d_models'];
      
      for (const storeName of stores) {
        if (!db.objectStoreNames.contains(storeName)) continue;
        const tx = db.transaction(storeName, 'readonly'); const store = tx.objectStore(storeName);
        const keys = await new Promise(res => { const r = store.getAllKeys(); r.onsuccess = () => res(r.result); });
        const values = await new Promise(res => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
        exportData.stores[storeName] = [];
        for (let i = 0; i < keys.length; i++) {
          let val = values[i]; const key = keys[i];
          if (typeof key === 'string' && (key.startsWith(`${targetId}_`) || key === targetId)) {
             if (storeName === 'bgm_files' && val.blob) {
                const blobPath = `bgm/${key}_audio.bin`; 
                try { const buffer = await val.blob.arrayBuffer(); zip.file(blobPath, buffer); val = { ...val, blob: { __isZipBlob: true, path: blobPath, type: val.blob.type } }; } catch(e) {}
             } else if (storeName === 'live2d_models' && val.files) {
                val.files = await Promise.all(val.files.map(async (f, fIdx) => {
                  if (f.blob) { const blobPath = `models/${key}/${fIdx}_file`; try { const buffer = await f.blob.arrayBuffer(); zip.file(blobPath, buffer); return { ...f, blob: { __isZipBlob: true, path: blobPath, type: f.blob.type } }; } catch(e) { return f; } } return f;
                }));
             } else if (storeName === 'bg_images' && val.dataUrl) {
                const txtPath = `bgs/${key}.txt`; zip.file(txtPath, val.dataUrl); val = { ...val, dataUrl: { __isZipTxt: true, path: txtPath } };
             }
             exportData.stores[storeName].push({ key: key, value: val });
          }
        }
      }

      setBackupProgress({ visible: true, percent: 40, text: '正在提取专属插件资源...' });
      try {
          const videoDbReq = indexedDB.open('GWC_VideoBG_Plugin_DB');
          const videoDb = await new Promise((res) => { videoDbReq.onsuccess = e => res(e.target.result); videoDbReq.onerror = () => res(null); });
          if (videoDb && videoDb.objectStoreNames.contains('videos')) {
              const tx = videoDb.transaction('videos', 'readonly'); const store = tx.objectStore('videos');
              const videoKey = `${targetId}_title_video`;
              const videoVal = await new Promise(res => { const r = store.get(videoKey); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
              if (videoVal) {
                  exportData.videoData = [];
                  const blobPath = `videos/${videoKey}.mp4`; const buffer = await videoVal.arrayBuffer(); zip.file(blobPath, buffer);
                  exportData.videoData.push({ key: videoKey, value: { __isZipBlob: true, path: blobPath, type: videoVal.type } });
              }
          }
      } catch(e) {}

      try {
          const spriteDbReq = indexedDB.open('GWC_Sprite_DLC_DB', 1);
          const spriteDb = await new Promise((res) => { spriteDbReq.onsuccess = e => res(e.target.result); spriteDbReq.onerror = () => res(null); });
          if (spriteDb && spriteDb.objectStoreNames.contains('sprite_sets')) {
              const tx = spriteDb.transaction('sprite_sets', 'readonly'); 
              const store = tx.objectStore('sprite_sets');
              const sets = await new Promise(res => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
              exportData.spriteData = [];
              for (const set of sets) {
                  if (set.id.startsWith(`${targetId}_`)) {
                      const processedSet = { ...set, sprites: [] };
                      for (let i = 0; i < set.sprites.length; i++) {
                          const sp = set.sprites[i];
                          const txtPath = `sprites/${set.id}_${i}.txt`; 
                          zip.file(txtPath, sp.dataUrl);
                          processedSet.sprites.push({ name: sp.name, dataUrl: { __isZipTxt: true, path: txtPath } });
                      }
                      exportData.spriteData.push(processedSet);
                  }
              }
          }
      } catch(e) {}

      zip.file("database.json", JSON.stringify(exportData));
      
      setBackupProgress({ visible: true, percent: 50, text: '准备封卷...' });
      await finalizeZipSave(zip, fileHandle, defaultFilename, "单体镜像 ZIP 导出完成！");
    } catch (err) { 
        showToast(`导出失败: ${err.message}`, "error"); 
        setBackupProgress({ visible: false, percent: 0, text: '' });
    }
  };

  // 3. 独立抹除当前镜像数据
  const handleClearCurrentMirror = async () => {
      if (!window.confirm("⚠️ 危险操作！\\n确定要清空当前镜像的所有聊天记录、存档和专属媒体资源吗？\\n(此操作不可逆，但其他分身镜像不受影响)")) return;
      showToast("🗑️ 正在抹除当前镜像数据...", "info");
      const targetId = getActiveMirrorId();
      try {
          const db = await initDB();
          const stores = ['core_data', 'app_settings', 'bgm_files', 'bg_images', 'live2d_models'];
          for (const storeName of stores) {
              if (!db.objectStoreNames.contains(storeName)) continue;
              await new Promise((res, rej) => {
                  const tx = db.transaction(storeName, 'readwrite'); const store = tx.objectStore(storeName);
                  const req = store.getAllKeys();
                  req.onsuccess = () => { req.result.forEach(k => { if (String(k).startsWith(`${targetId}_`)) store.delete(k); }); res(); };
                  req.onerror = rej;
              });
          }
          try {
              const videoDbReq = indexedDB.open('GWC_VideoBG_Plugin_DB');
              const videoDb = await new Promise((res) => { videoDbReq.onsuccess = e => res(e.target.result); videoDbReq.onerror = () => res(null); });
              if (videoDb && videoDb.objectStoreNames.contains('videos')) {
                  await new Promise(res => { videoDb.transaction('videos', 'readwrite').objectStore('videos').delete(`${targetId}_title_video`).onsuccess = res; });
              }
          } catch(e) {}

          try {
              const spriteDbReq = indexedDB.open('GWC_Sprite_DLC_DB', 1);
              const spriteDb = await new Promise((res) => { spriteDbReq.onsuccess = e => res(e.target.result); spriteDbReq.onerror = () => res(null); });
              if (spriteDb && spriteDb.objectStoreNames.contains('sprite_sets')) {
                  await new Promise((res, rej) => {
                      const tx = spriteDb.transaction('sprite_sets', 'readwrite'); 
                      const store = tx.objectStore('sprite_sets');
                      const req = store.getAllKeys();
                      req.onsuccess = () => { req.result.forEach(k => { if (String(k).startsWith(`${targetId}_`)) store.delete(k); }); res(); };
                      req.onerror = rej;
                  });
              }
          } catch(e) {}
          
          showToast("✅ 当前镜像已纯净重置，即将重启", "success");
          setTimeout(() => window.location.reload(), 1500);
      } catch(e) { showToast("清除失败", "error"); }
  };

  // 4. 智能恢复引擎 (自动识别并处理全量包/单体包)
  const handleSmartImportBackup = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBackupProgress({ visible: true, percent: 10, text: '正在解析 ZIP 数据卷...' });
    try {
      await injectScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      const zip = await window.JSZip.loadAsync(file);
      const dbJsonFile = zip.file("database.json"); if (!dbJsonFile) throw new Error("缺失 database.json");
      
      const parsedData = JSON.parse(await dbJsonFile.async("text"));
      const isSingle = parsedData.backupType === 'single';
      const importData = isSingle ? parsedData.stores : parsedData.stores; 
      
      const db = await initDB();
      const currentMirrorId = getActiveMirrorId(); // 若无插件则默认返回 'mirror_default'
      const sourceMirrorId = isSingle ? parsedData.sourceMirrorId : null;

      // ✨ 新增：智能向下兼容机制 (如果导入单体包，但检测到未安装分身插件)
      let isDowngradeToMain = false;
      if (isSingle && !isMirrorPluginLoaded) {
          isDowngradeToMain = true;
          showToast("⚠️ 未检测到镜像分身插件！已自动向下兼容，将该单体包作为【主系统全量数据】覆盖导入...", "info", 8000);
      }

      const storesToProcess = isSingle ? ['core_data', 'app_settings', 'bgm_files', 'bg_images', 'live2d_models'] 
                                       : ['core_data', 'model_files', 'app_settings', 'bgm_files', 'bg_images', 'live2d_models', 'app_mods'];

      setBackupProgress({ visible: true, percent: 30, text: '清理并重建数据库表...' });
      for (const storeName of storesToProcess) {
        if (!importData[storeName] || !db.objectStoreNames.contains(storeName)) continue;
        
        await new Promise((res, rej) => { 
            const tx = db.transaction(storeName, 'readwrite'); const store = tx.objectStore(storeName); 
            if (isSingle && !isDowngradeToMain) {
                // 原逻辑：已安装插件，仅删除此分身的数据，保留其他分身
                const req = store.getAllKeys();
                req.onsuccess = () => { req.result.forEach(k => { if (String(k).startsWith(`${currentMirrorId}_`)) store.delete(k); }); res(); };
            } else {
                // ✨ 兼容逻辑：若未装插件(或全量包)，直接清空整张表，让其成为主系统唯一的主人
                store.clear().onsuccess = res; 
            }
        });
        
        for (const item of importData[storeName]) {
          let val = item.value;
          let mappedKey = item.key;

          // 核心映射：自动将源 UUID 改写为目标系统 UUID (包括降级为主系统)
          if (isSingle) {
              if (typeof mappedKey === 'string' && mappedKey.startsWith(`${sourceMirrorId}_`)) mappedKey = mappedKey.replace(`${sourceMirrorId}_`, `${currentMirrorId}_`);
              if (val && typeof val === 'object' && val.id && typeof val.id === 'string' && val.id.startsWith(`${sourceMirrorId}_`)) val.id = val.id.replace(`${sourceMirrorId}_`, `${currentMirrorId}_`);
          }

          if (storeName === 'bgm_files' && val.blob && val.blob.__isZipBlob) {
            const zipEntry = zip.file(val.blob.path);
            if (zipEntry) { const blobData = await zipEntry.async("arraybuffer"); val.blob = new Blob([blobData], { type: val.blob.type }); }
          } else if (storeName === 'live2d_models' && val.files) {
            val.files = await Promise.all(val.files.map(async f => {
              if (f.blob && f.blob.__isZipBlob) { 
                const zipEntry = zip.file(f.blob.path);
                if(zipEntry) { const blobData = await zipEntry.async("arraybuffer"); f.blob = new Blob([blobData], { type: f.blob.type }); }
              } return f;
            }));
          } else if (storeName === 'bg_images' && val.dataUrl && val.dataUrl.__isZipTxt) {
            const zipEntry = zip.file(val.dataUrl.path);
            if (zipEntry) val.dataUrl = await zipEntry.async("text");
          }
          await new Promise((res, rej) => { const tx = db.transaction(storeName, 'readwrite'); const store = tx.objectStore(storeName); const req = store.put(val, store.keyPath ? undefined : mappedKey); req.onsuccess = res; req.onerror = rej; });
        }
      }

      setBackupProgress({ visible: true, percent: 80, text: '正在重建扩展媒体资源库...' });
      const targetSpriteData = isSingle ? parsedData.spriteData : parsedData.spriteDb;
      if (targetSpriteData) {
          const spriteDbReq = indexedDB.open('GWC_Sprite_DLC_DB', 1);
          const spriteDb = await new Promise((res, rej) => { spriteDbReq.onupgradeneeded = e => { if (!e.target.result.objectStoreNames.contains('sprite_sets')) e.target.result.createObjectStore('sprite_sets', { keyPath: 'id' }); }; spriteDbReq.onsuccess = e => res(e.target.result); spriteDbReq.onerror = e => rej(e.target.error); });
          
          const tx = spriteDb.transaction('sprite_sets', 'readwrite'); 
          const store = tx.objectStore('sprite_sets');
          if (isSingle && !isDowngradeToMain) {
              const keys = await new Promise(res => { const r = store.getAllKeys(); r.onsuccess = () => res(r.result); });
              for (const k of keys) { if (String(k).startsWith(`${currentMirrorId}_`)) store.delete(k); }
          } else {
              await new Promise(res => { store.clear().onsuccess = res; });
          }
          
          for (const set of targetSpriteData) {
              const mappedSetId = isSingle ? set.id.replace(`${sourceMirrorId}_`, `${currentMirrorId}_`) : set.id;
              const newSet = { ...set, id: mappedSetId };
              for (const sp of newSet.sprites) {
                  if (sp.dataUrl && sp.dataUrl.__isZipTxt) {
                      const zipEntry = zip.file(sp.dataUrl.path);
                      if (zipEntry) sp.dataUrl = await zipEntry.async("text");
                  }
              }
              await new Promise(res => { const putTx = spriteDb.transaction('sprite_sets', 'readwrite'); putTx.objectStore('sprite_sets').put(newSet).onsuccess = res; });
          }
      }

      if (!isSingle) {
          if (parsedData.mirrorsDb) {
              const mirrorDbReq = indexedDB.open('GWC_Image_Mirrors_DB', 2);
              const mirrorDb = await new Promise((res, rej) => { mirrorDbReq.onupgradeneeded = e => { const d = e.target.result; if (!d.objectStoreNames.contains('mirrors')) d.createObjectStore('mirrors', { keyPath: 'id' }); if (!d.objectStoreNames.contains('config')) d.createObjectStore('config', { keyPath: 'key' }); }; mirrorDbReq.onsuccess = e => res(e.target.result); mirrorDbReq.onerror = e => rej(e.target.error); });
              const tx = mirrorDb.transaction(['mirrors', 'config'], 'readwrite');
              await new Promise(res => { tx.objectStore('mirrors').clear().onsuccess = res; }); await new Promise(res => { tx.objectStore('config').clear().onsuccess = res; });
              const mirrorsData = parsedData.mirrorsDb.mirrors || []; for (const m of mirrorsData) tx.objectStore('mirrors').put(m);
              const configData = parsedData.mirrorsDb.config || []; for (const c of configData) tx.objectStore('config').put(c);
              await new Promise(res => { tx.oncomplete = res; });
          }
          if (parsedData.videosDb) {
              const videoDbReq = indexedDB.open('GWC_VideoBG_Plugin_DB', 1);
              // ✨ 核心修复：将极其致命的拼写错误 onsukeccess 订正为 onsuccess，解除死锁
              const videoDb = await new Promise((res, rej) => { videoDbReq.onupgradeneeded = e => { if (!e.target.result.objectStoreNames.contains('videos')) e.target.result.createObjectStore('videos'); }; videoDbReq.onsuccess = e => res(e.target.result); videoDbReq.onerror = e => rej(e.target.error); });
              const tx = videoDb.transaction('videos', 'readwrite'); await new Promise(res => { tx.objectStore('videos').clear().onsuccess = res; });
              for (const item of parsedData.videosDb) {
                  if (item.value && item.value.__isZipBlob) {
                      const zipEntry = zip.file(item.value.path);
                      if (zipEntry) {
                          const buffer = await zipEntry.async("arraybuffer"); const blob = new Blob([buffer], { type: item.value.type });
                          await new Promise(res => { const putTx = videoDb.transaction('videos', 'readwrite'); putTx.objectStore('videos').put(blob, item.key).onsuccess = res; });
                      }
                  }
              }
          }
      } else {
          if (parsedData.videoData) {
              const videoDbReq = indexedDB.open('GWC_VideoBG_Plugin_DB', 1);
              const videoDb = await new Promise((res) => { videoDbReq.onupgradeneeded = e => { if (!e.target.result.objectStoreNames.contains('videos')) e.target.result.createObjectStore('videos'); }; videoDbReq.onsuccess = e => res(e.target.result); videoDbReq.onerror = () => res(null); });
              if (videoDb) {
                  // ✨ 兼容逻辑：如果是降级覆盖为主系统，先把废弃的旧主系统动态视频清空
                  if (isDowngradeToMain) {
                      const tx = videoDb.transaction('videos', 'readwrite'); 
                      await new Promise(res => { tx.objectStore('videos').clear().onsuccess = res; });
                  }
                  for (const item of parsedData.videoData) {
                      if (item.value && item.value.__isZipBlob) {
                          const zipEntry = zip.file(item.value.path);
                          if (zipEntry) {
                              const buffer = await zipEntry.async("arraybuffer"); const blob = new Blob([buffer], { type: item.value.type });
                              const mappedVideoKey = item.key.replace(`${sourceMirrorId}_`, `${currentMirrorId}_`);
                              await new Promise(res => { const putTx = videoDb.transaction('videos', 'readwrite'); putTx.objectStore('videos').put(blob, mappedVideoKey).onsuccess = res; });
                          }
                      }
                  }
              }
          }
      }
      
      setBackupProgress({ visible: true, percent: 100, text: '挂载完成，准备重启...' });
      
      // 动态显示正确的提示文案
      let finalMsg = isSingle ? "🎉 单体镜像数据完美挂载并映射！系统即将重启..." : "🎉 史诗级全量数据恢复成功！系统即将重启...";
      if (isDowngradeToMain) finalMsg = "🎉 已向下兼容，分身数据已成功作为主系统挂载！系统即将重启...";

      showToast(finalMsg, "success", 5000);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) { 
        showToast(`恢复失败: ${err.message}`, "error"); 
        setBackupProgress({ visible: false, percent: 0, text: '' });
    } 
    e.target.value = ''; 
  };
  const handleFactoryReset = () => { setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); try { indexedDB.deleteDatabase(DB_NAME); } catch (e) {} localStorage.clear(); window.location.reload(); };
  const handleSecondResetClick = () => { setConfirmDialog({ isOpen: true, text: '【最终确认】\n此操作绝对不可逆！\n\n您的所有模型、剧情、音乐和背景即将灰飞烟灭！真的要恢复出厂设置吗？', onConfirm: handleFactoryReset }); };
  const handleFirstResetClick = () => { setConfirmDialog({ isOpen: true, text: '警告：您即将清空所有系统数据！\n（包含所有存档、模型缓存、背景图、BGM、角色卡和系统设置）\n\n确定要继续吗？', onConfirm: handleSecondResetClick }); };

  const currentBgItem = bgList.find(b => b.id === settings.currentBgId);
  const activeBgUrl = appMode === 'title' ? (localTitleBgImage || '') : (currentBgItem ? currentBgItem.dataUrl : '');
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const latestMessage = activeSession?.messages?.[activeSession.messages.length - 1];

  const triggerShortcut = (id, defaultAction, e) => {
      if (typeof window.triggerShortcut === 'function') {
          window.triggerShortcut(id, defaultAction, e);
      } else if (typeof defaultAction === 'function') {
          defaultAction(e);
      }
  };

  // ✨ 核心扩容：新增 title_text 和 title_bg 调整模式
  const handleEnterVisualAdjust = (mode) => {
    if (mode === 'model' || mode === 'dialog' || mode === 'story_model') { 
        if (appMode === 'title') { setAppMode('game'); showToast('已自动切换至游戏界面以进行排版预览', 'info'); } 
    } 
    else if (mode === 'title_model' || mode === 'title_text' || mode === 'title_bg') { 
        if (appMode === 'game') { setAppMode('title'); showToast('已自动切换至主标题界面以进行排版预览', 'info'); } 
    }
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

  // ✨ 核心修复：在打字机流式输出时，强制翻页跟随，解决长文本被截断显示不全的问题
  useEffect(() => {
    if (latestMessage?.isStreaming && pages.length > 0) {
        setVnPage(Math.max(0, pages.length - 1));
    }
  }, [pages.length, latestMessage?.isStreaming]);
  // ✨ --- 修复替换的 loadScripts 功能 ---
  // 修复 Could not find Cubism 4 runtime 报错 (支持离线引擎导入与热加载)
  const loadScripts = async () => {
    if (window.PIXI && window.PIXI.live2d) return true;
    const backupModule = window.module; const backupExports = window.exports; window.module = undefined; window.exports = undefined;
    try {
      await injectScript('https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.5.10/browser/pixi.min.js');
      
      // 原生级融合：优先尝试加载本地烧录的离线引擎核心
      const offlineCore = await loadCoreData('offline_cubism_core_js');
      if (offlineCore) {
          const inlineScript = document.createElement('script'); inlineScript.textContent = offlineCore; document.head.appendChild(inlineScript);
      } else {
          await injectScript('https://fastly.jsdelivr.net/gh/Eikanya/Live2d-model/Live2DCubismCore.js');
      }
      
      await injectScript('https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js');
      await injectScript('https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js');
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
           // ✨ 核心修复 1：为中文路径生成 URL 编码的隐形分身，骗过 PIXI 内部的严格路径匹配器
           const baseFiles = [];
           multiModel.files.forEach(item => {
             if (item.blob && item.path) { 
               const fileName = item.path.split('/').pop(); 
               const f1 = new File([item.blob], fileName, { type: item.blob.type || 'application/octet-stream' }); 
               Object.defineProperty(f1, 'webkitRelativePath', { value: item.path, writable: false }); 
               baseFiles.push(f1);
               
               const encodedPath = encodeURI(item.path);
               if (encodedPath !== item.path) {
                   const f2 = new File([item.blob], fileName, { type: item.blob.type || 'application/octet-stream' });
                   Object.defineProperty(f2, 'webkitRelativePath', { value: encodedPath, writable: false });
                   baseFiles.push(f2);
               }
             } else { baseFiles.push(item); }
           });
           files = baseFiles;
         }
      }
      if (!files || files.length === 0) files = await loadModelFilesFromDB() || [];
      if (!files || files.length === 0) return setLive2dStatus('未检测到模型，请在系统设置(⚙)中导入模型');

      setLive2dStatus('加载引擎中...'); const scriptsLoaded = await loadScripts(); if (!scriptsLoaded || !isMounted) return;
      if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) return setLive2dStatus('Live2D 插件未就绪，环境可能被拦截');
      setLive2dStatus('读取本地模型文件中...');

      const targetRes = parseFloat(settings.live2dResolution) || window.devicePixelRatio || 1;
      if (!appRef.current) { 
          appRef.current = new window.PIXI.Application({ view: canvasRef.current, transparent: true, autoDensity: true, resizeTo: containerRef.current, backgroundAlpha: 0, resolution: targetRes }); 
      } else if (appRef.current.renderer.resolution !== targetRes) {
          appRef.current.renderer.resolution = targetRes;
          appRef.current.resize(); 
      }
      const app = appRef.current;
      
      if (modelRef.current) { 
          if (faceTrackingTickerRef.current) app.ticker.remove(faceTrackingTickerRef.current);
          app.stage.removeChild(modelRef.current); 
          modelRef.current.destroy({ children: true, texture: true, baseTexture: true }); 
          modelRef.current = null; 
      }

      try {
        // ✨ 终极绝杀：虚拟英文沙盒映射
        // 彻底丢弃真实的中文路径，给所有文件生成随机的纯英文分身，并暴力修改 model.json 内的指针
        const nameMap = {};
        const safeFiles = files.map((f, index) => {
            const origPath = f.webkitRelativePath || f.name || '';
            const origName = origPath.split('/').pop();
            const extMatch = origName.match(/\.[0-9a-z]+$/i);
            const ext = extMatch ? extMatch[0] : '';
            const safeName = `asset_${index}${ext}`;
            const safePath = `model_root/${safeName}`;
            
            nameMap[origPath] = safeName;
            nameMap[origName] = safeName;
            nameMap[decodeURI(origName)] = safeName;
            
            const newFile = new File([f], safeName, { type: f.type || 'application/octet-stream' });
            Object.defineProperty(newFile, 'webkitRelativePath', { value: safePath, writable: false });
            newFile._origName = origName;
            return newFile;
        });

        const modelFileIdx = safeFiles.findIndex(f => f._origName.match(/\.model3?\.json$/i));
        if (modelFileIdx === -1) throw new Error("模型包内未找到 model.json 或 model3.json");

        const modelFile = safeFiles[modelFileIdx];
        let text = await modelFile.text();
        
        // 暴力清洗 VTube Studio 等软件导出的非法 JSON 注释
        text = text.replace(/^[ \t]*\/\/.*$/gm, '').replace(/,\s*([\]}])/g, '$1');
        let json = JSON.parse(text);

        // 递归扫描 JSON，将内部的中文引用路径全部替换为纯英文 safeName
        const replaceWithSafeName = (obj) => {
            if (Array.isArray(obj)) {
                for (let i=0; i<obj.length; i++) {
                    if (typeof obj[i] === 'string') {
                        const fname = obj[i].split('/').pop();
                        if (nameMap[obj[i]]) obj[i] = nameMap[obj[i]];
                        else if (nameMap[fname]) obj[i] = nameMap[fname]; 
                    } else if (typeof obj[i] === 'object' && obj[i] !== null) replaceWithSafeName(obj[i]);
                }
            } else if (typeof obj === 'object' && obj !== null) {
                for (let key in obj) {
                    if (typeof obj[key] === 'string') {
                        const fname = obj[key].split('/').pop();
                        if (nameMap[obj[key]]) obj[key] = nameMap[obj[key]];
                        else if (nameMap[fname]) obj[key] = nameMap[fname];
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) replaceWithSafeName(obj[key]);
                }
            }
        };

        if (json.FileReferences) replaceWithSafeName(json.FileReferences);
        if (json.model) replaceWithSafeName(json);

        // 自动挂载可能丢失路径的表情文件
        if (json.Version >= 3 || json.FileReferences) {
            if (!json.FileReferences) json.FileReferences = {};
            if (!json.FileReferences.Expressions || json.FileReferences.Expressions.length === 0) {
                const expFiles = safeFiles.filter(f => f._origName.match(/\.exp3?\.json$/i));
                json.FileReferences.Expressions = expFiles.map(f => ({
                    Name: f._origName.replace(/\.exp3?\.json$/i, ''),
                    File: f.name
                }));
            }
        }

        const newBlob = new Blob([JSON.stringify(json)], { type: 'application/json' });
        const newModelFile = new File([newBlob], 'model.json', { type: 'application/json' });
        Object.defineProperty(newModelFile, 'webkitRelativePath', { value: 'model_root/model.json', writable: false });
        safeFiles[modelFileIdx] = newModelFile;

        const Live2DModel = window.PIXI.live2d.Live2DModel; 
        const model = await Live2DModel.from(safeFiles); 
        if (!isMounted) { model.destroy(); return; }
        
        if (model.internalModel && model.internalModel.focusController) {
           const originalFocusUpdate = model.internalModel.focusController.update;
           model.internalModel.focusController.update = function(dt) {
               if (enableFaceTrackingRef.current && faceTrackingModeRef.current === 'full') return;
               originalFocusUpdate.call(this, dt);
           };
        }

        app.stage.addChild(model); modelRef.current = model; updateModelTransform(); setLive2dStatus(''); 
        
        if (faceTrackingTickerRef.current) app.ticker.remove(faceTrackingTickerRef.current);
        const faceTrackingTicker = () => {
            if (!enableFaceTrackingRef.current || !modelRef.current) return;
            const rig = faceRigRef.current;
            const core = modelRef.current.internalModel.coreModel;
            if (!core) return;
            
            const setParam = (id, value) => {
                if (core.setParameterValueById) core.setParameterValueById(id, value);
                else if (core.setParamFloat) core.setParamFloat(id, value);
            };

            const lerp = (a, b, t) => a + (b - a) * t;
            const lerpFactor = 0.5; 

            if (!modelRef.current.faceRigPrev) modelRef.current.faceRigPrev = {};
            const prev = modelRef.current.faceRigPrev;

            const updateParam = (id, val, weight = 1) => {
                let target = val * weight;
                if (prev[id] === undefined) prev[id] = target;
                prev[id] = lerp(prev[id], target, lerpFactor);
                setParam(id, prev[id]);
            };

            if (rig) {
                if (faceTrackingModeRef.current === 'full') {
                    updateParam('ParamAngleX', rig.head.degrees.y, 1);
                    updateParam('ParamAngleY', rig.head.degrees.x, 1);
                    updateParam('ParamAngleZ', rig.head.degrees.z, 1);
                    updateParam('ParamBodyAngleX', rig.head.degrees.y, 0.3);
                    updateParam('ParamBodyAngleY', rig.head.degrees.x, 0.3);
                    updateParam('ParamBodyAngleZ', rig.head.degrees.z, 0.3);
                    if (rig.pupil) {
                        updateParam('ParamEyeBallX', rig.pupil.x, 1);
                        updateParam('ParamEyeBallY', rig.pupil.y, 1);
                    }
                }
                updateParam('ParamEyeLOpen', rig.eye.l, 1);
                updateParam('ParamEyeROpen', rig.eye.r, 1);
                updateParam('ParamMouthOpenY', rig.mouth.y, 1);
                updateParam('ParamMouthForm', rig.mouth.x, 1);
            }
        };
        app.ticker.add(faceTrackingTicker);
        faceTrackingTickerRef.current = faceTrackingTicker;

        const rawExps = model.internalModel?.settings?.expressions || model.internalModel?.settings?.FileReferences?.Expressions || [];
        const expList = rawExps.map((e, idx) => { let cleanName = e.Name || e.name || e.File || e.file || `表情 ${idx + 1}`; cleanName = cleanName.split('/').pop().replace(/\.exp3?\.json$/i, ''); return { id: e.Name || e.name || idx, name: cleanName }; });
        setExpressions(expList);
        if (settings.currentExpressionId !== null && settings.currentExpressionId !== undefined) { try { model.expression(settings.currentExpressionId); } catch(e) {} }
        
        const handleMouseMove = (event) => { 
            if (!modelRef.current) return; 
            if (enableFaceTrackingRef.current && faceTrackingModeRef.current === 'full') return; 
            modelRef.current.focus(event.clientX, event.clientY); 
        }; 
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (faceTrackingTickerRef.current && appRef.current) {
                appRef.current.ticker.remove(faceTrackingTickerRef.current);
            }
        };

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

  const handleResetFocus = () => {
    if (modelRef.current) {
      modelRef.current.focus(0, 0); 
      if (modelRef.current.faceRigPrev) modelRef.current.faceRigPrev = {}; 
      showToast("✨ 模型视线与头部已强制居中复位", "success");
    }
  };

 const handleModelUpload = async (e) => {
    const fileList = Array.from(e.target.files); if (!fileList.length) return;
    const hasJson = fileList.some(f => f.name.match(/\.model3?\.json$/i)); if (!hasJson) return showToast("错误：所选文件夹中不包含 model.json 或 model3.json 模型配置文件！", "error");
    
    // ✨ 核心修复：移除中文拦截，将所有中文根目录名在底层安全替换为 model_root，彻底解决跨平台乱码崩溃问题
    const originalFolderName = fileList[0].webkitRelativePath.split('/')[0] || '未命名模型';
    const folderName = originalFolderName;
    
    showToast("正在导入模型，请稍候...", "info"); const modelId = `${getActiveMirrorId()}_${Date.now().toString()}`;
    const processedFiles = fileList.map(f => {
        let safePath = f.webkitRelativePath || f.name;
        // 将可能包含中文/特殊字符的外层根目录统一转译为安全的 model_root
        safePath = safePath.replace(new RegExp('^' + originalFolderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'model_root');
        return { blob: f, path: safePath };
    });
    
   const newModel = { id: modelId, name: folderName, files: processedFiles };
    try {
      await saveMultiModelToDB(newModel); setModelsList(prev => [...prev, { id: modelId, name: folderName }]); showToast(`模型 [${folderName}] 导入成功！`, "success");
      if (!settings.currentModelId) { setSettings(s => ({ ...s, currentModelId: modelId })); setModelReloadTrigger(prev => prev + 1); }
    } catch(err) { showToast(`模型保存失败: ${err.message}`, "error"); } e.target.value = '';
  };

  // ✨ 原生级融合：处理 ZIP 模型包与离线引擎烧录
  const handleZipModelUpload = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      showToast("📦 正在解析并解压 ZIP 模型包...", "info", 8000);
      try {
          await injectScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
          const zip = await window.JSZip.loadAsync(file); const files = []; let modelName = file.name.replace(/\.zip$/i, '').replace(/\.txt$/i, ''); 
          const promises = [];
          zip.forEach((relativePath, zipEntry) => {
              if (!zipEntry.dir) promises.push(zipEntry.async("blob").then(blob => { files.push({ path: relativePath, blob: new File([blob], relativePath.split('/').pop(), { type: blob.type || 'application/octet-stream' }) }); }));
          });
          await Promise.all(promises);
          if (!files.some(f => f.path.match(/\.model3?\.json$/i))) throw new Error("压缩包内未找到 .model3.json");
          
          const modelId = `${getActiveMirrorId()}_${Date.now().toString()}`;
          const newModel = { id: modelId, name: modelName + " (ZIP)", files: files };
          await saveMultiModelToDB(newModel); setModelsList(prev => [...prev, { id: modelId, name: newModel.name }]); 
          showToast(`🎉 模型 [${modelName}] 导入成功！`, "success", 5000);
          if (!settings.currentModelId) { setSettings(s => ({ ...s, currentModelId: modelId })); setModelReloadTrigger(prev => prev + 1); }
      } catch (err) { showToast("ZIP 导入失败: " + err.message, "error"); }
      e.target.value = '';
  };

  const handleOfflineEngineUpload = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      if (text.includes('Live2D') || text.includes('Cubism')) {
          await saveCoreData('offline_cubism_core_js', text);
          showToast("✅ 离线引擎核心已永久烧录！即将强制重启...", "success", 4000);
          setTimeout(() => window.location.reload(), 2000);
      } else { showToast("❌ 文件格式不符", "error"); }
      e.target.value = '';
  };
  
  const handleFullscreen = () => { document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.(); };

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
       const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify({ model: aiModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], stream: false, temperature: settings.aiTemperature || 0.7 }) });
        if (!response.ok) throw new Error(`HTTP ${response.status} 错误`);
        const data = await response.json();
        
        let textContent = data.choices?.[0]?.message?.content || data.message || ""; 
        // ✨ 核心修复：强力正则装甲，无视大模型加戏的任何废话，暴力抠出 [ ] 数组结构
        const arrayMatch = textContent.match(/\[\s*[\s\S]*\s*\]/);
        
        if (arrayMatch) {
            try {
                const replies = JSON.parse(arrayMatch[0]); 
                if (Array.isArray(replies)) setSuggestedReplies(replies.slice(0, 3));
            } catch (parseErr) {
                // ✨ 终极防丢兜底：如果大模型不听话用了单引号或多余逗号导致 JSON.parse 崩溃，直接用正则硬抠字符串强制显示
                const fallbackMatch = arrayMatch[0].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) || arrayMatch[0].match(/'([^'\\]*(?:\\.[^'\\]*)*)'/g);
                if (fallbackMatch) {
                    const replies = fallbackMatch.map(s => s.replace(/(^['"]|['"]$)/g, '').replace(/\\"/g, '"'));
                    setSuggestedReplies(replies.slice(0, 3));
                } else {
                    console.warn("选项推演底层解析完全失败:", textContent);
                }
            }
        } else {
            console.warn("选项推演解析失败，未找到数组结构:", textContent);
        }
      } catch (e) { console.warn("选项推演解析出错:", e); } finally { setIsGeneratingReplies(false); }
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
    if (isPlayingTTSRef.current || ttsTaskQueueRef.current.length === 0) return;
    
    isPlayingTTSRef.current = true;
    const currentTask = ttsTaskQueueRef.current.shift();
    
    activeAudioRef.current = currentTask.audioObj;
    activeAudioRef.current.volume = ttsVolRef.current;
    activeAudioRef.current.playbackRate = ttsRateRef.current || 1.0; 
    
    activeAudioRef.current.onended = () => { 
      if (ttsPauseRef.current > 0) { 
        ttsTimeoutRef.current = setTimeout(() => { isPlayingTTSRef.current = false; processAudioQueue(); }, ttsPauseRef.current); 
      } else { 
        isPlayingTTSRef.current = false; processAudioQueue(); 
      } 
    };

    activeAudioRef.current.onerror = (e) => {
      console.warn("TTS 音频流错误，可能后端推理异常或连接断开:", e);
      isPlayingTTSRef.current = false; processAudioQueue();
    };

    const playPromise = activeAudioRef.current.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => { 
          console.warn("TTS 播放被浏览器拦截或失败:", e); 
          isPlayingTTSRef.current = false; processAudioQueue(); 
        });
    }
  }, []);

  const enqueueTTS = useCallback((text) => {
    if (!settings.ttsEnabled || !settings.ttsUrlTemplate || !text.trim() || settings.workMode) return;
    try {
      let url = settings.ttsUrlTemplate
          .replace('{text}', encodeURIComponent(text.trim()))
          .replace('{lang}', settings.ttsLanguage);

      if (settings.ttsMobileMode) {
          // ✨ 手机端模式：利用正则彻底将 URL 中的本地参考音频参数剥离，强迫后端使用 start.py 的默认配置
          url = url.replace(/([&?])ref_audio_path=\{ref_audio\}/g, '')
                   .replace(/([&?])prompt_text=\{ref_text\}/g, '')
                   .replace(/([&?])prompt_lang=\{ref_lang\}/g, '')
                   .replace(/\?&/, '?').replace(/&$/, '');
      } else {
          // 电脑端模式：按原样带入本地客户端填写的参考音频
          url = url.replace('{ref_audio}', encodeURIComponent(settings.ttsRefAudio || ''))
                   .replace('{ref_text}', encodeURIComponent(settings.ttsRefText || ''))
                   .replace('{ref_lang}', settings.ttsRefLang || 'zh');
      }
      
      const preloader = new window.Audio();
      preloader.preload = 'auto';
      preloader.src = url;
      preloader.load(); 

      ttsTaskQueueRef.current.push({ text, url, audioObj: preloader });
      processAudioQueue();
    } catch (error) {}
  }, [settings, processAudioQueue]);

 const clearTTSQueue = useCallback(() => {
    ttsTaskQueueRef.current.forEach(task => { 
        if (task.audioObj) { task.audioObj.pause(); task.audioObj.removeAttribute('src'); task.audioObj.load(); } 
    });
    ttsTaskQueueRef.current = [];
    if (activeAudioRef.current) { activeAudioRef.current.pause(); activeAudioRef.current.removeAttribute('src'); activeAudioRef.current.load(); activeAudioRef.current = null; }
    isPlayingTTSRef.current = false; if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current); 
  }, []);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    let newFiles = [];
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(file); });
            newFiles.push({ type: 'image', name: file.name, data: dataUrl });
        } else {
            const text = await file.text();
            newFiles.push({ type: 'document', name: file.name, data: text });
        }
    }
    setSelectedFiles(prev => [...prev, ...newFiles]); e.target.value = '';
  };

  const triggerSendMessage = async (overrideText = null, isHidden = false) => {
    const targetText = overrideText !== null ? overrideText : (inputValue.trim() || (selectedFiles.length > 0 ? '请查看附件' : ''));
    if (!targetText && selectedFiles.length === 0) return; 
    // ✨ 加入底层并发锁，防止重复触发
    if (!activeSessionId || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setIsLoading(true);

    const userMessage = { role: 'user', content: targetText, files: isHidden ? [] : selectedFiles };
    if (overrideText === null) { setInputValue(''); setSelectedFiles([]); setSuggestedReplies([]); setVnPage(0); }
    clearTTSQueue();

    const currentHistory = activeSession?.messages || [];
    const uiMessages = isHidden ? [...currentHistory] : [...currentHistory, userMessage];
    const apiRequestHistory = isHidden ? [...currentHistory, userMessage] : [...currentHistory, userMessage];

    updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: '', isStreaming: settings.enableStreaming }], (uiMessages.length === 0 && overrideText === null) ? userMessage.content.slice(0, 15) : undefined);
    
    try {
      const fetchUrl = buildProxyUrl(`${getFormatBaseUrl()}/v1/chat/completions`);
      const langMap = { 'zh': '中文', 'ja': '日文', 'en': '英文', 'ko': '韩文' }; const dispLangStr = langMap[settings.displayLanguage] || settings.displayLanguage; const voiceLangStr = langMap[settings.ttsLanguage] || settings.ttsLanguage;
      
      let finalSystemPrompt = settings.customSystemPrompt;
      if (settings.worldviewText) { finalSystemPrompt += `\n\n【世界观与背景设定】\n${settings.worldviewText}`; }
      const now = new Date();
      const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0'); const min = String(now.getMinutes()).padStart(2, '0'); const ss = String(now.getSeconds()).padStart(2, '0');
      const timeString = `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;

      let systemStatusInjection = `\n\n【系统实时状态】\n当前现实时间：${timeString}\n`;
      const activeMemos = memos.filter(m => !m.isDone);
      if (activeMemos.length > 0) { systemStatusInjection += `玩家当前的备忘录/日程安排如下：\n${activeMemos.map(m => `- ${m.date ? '['+new Date(m.date).toLocaleString()+'] ' : ''}${m.text}`).join('\n')}\n(请作为智能助手在对话中适时提醒，或者结合这些日程进行合理互动。)\n`; }
      if (activeSession?.memorySummary) { systemStatusInjection += `\n【长期记忆档案(重要前情提要)】\n${activeSession.memorySummary}\n(请牢记以上你们之前对话总结的设定与重要事件)\n`; }
      
      systemStatusInjection += `\n【自动日程管理指令 (最高优先级)】\n如果玩家在对话中明确要求你“几分钟/几小时后提醒我”或安排未来某个时间的日程，你必须用自然的语气答应下来。并且，**必须在你回复内容的最末尾，另起一行输出以下隐藏 JSON 标签格式**，系统会拦截它为你定闹钟：\n<ADD_MEMO>{"time": "YYYY/MM/DD HH:mm:ss", "text": "要提醒的简短事项"}</ADD_MEMO>\n注意：请根据当前时间(${timeString})精准计算出目标时间。绝不要向玩家透露这个标签和这套机制！`;

      finalSystemPrompt += systemStatusInjection;
      
      if (settings.workMode) { finalSystemPrompt += `\n\n【系统最高指令：工作/编程模式已开启】\n请你完全无视前文中关于“简短回答”、“字数限制”、“二次元口癖”等娱乐性要求。请以极其专业、详尽的态度解答问题。如果涉及代码编写，请务必输出完整且包含注释的完整代码块，绝对不要因为长度而截断或省略！`; }
      if (settings.enableTranslation) { finalSystemPrompt += `\n\n【重要强制指令】已开启同声传译模式！你必须严格输出两种语言版本，格式必须为：\n<VOICE>此处填写${voiceLangStr}版本的回复，用于语音合成</VOICE>\n<TEXT>此处填写${dispLangStr}版本的回复，用于屏幕显示</TEXT>\n绝不要输出任何多余的字符或Markdown。`; }
      
      const apiMessages = [{ role: 'system', content: finalSystemPrompt }, ...apiRequestHistory.map(m => { 
        if (m.files && m.files.length > 0 && m.role === 'user') { 
            let contentArray = [{ type: 'text', text: m.content }];
            let docText = "";
            m.files.forEach(f => {
                if (f.type === 'image') contentArray.push({ type: 'image_url', image_url: { url: f.data } });
                else docText += `\n--- 附件文档: ${f.name} ---\n${f.data}\n`;
            });
            if (docText) contentArray[0].text += `\n\n【用户提供的附件文档内容】：${docText}`;
            return { role: m.role, content: contentArray }; 
        } 
        return { role: m.role, content: m.content }; 
      })];
      const headers = { 'Content-Type': 'application/json' }; if (settings.openaiApiKey) headers['Authorization'] = `Bearer ${settings.openaiApiKey}`;

      const response = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify({ model: settings.aiModel, messages: apiMessages, stream: settings.enableStreaming, temperature: settings.aiTemperature || 0.7 }) });
      if (!response.ok) throw new Error(`HTTP ${response.status} 错误`);

      if (settings.enableStreaming) {
        let networkDone = false, networkError = null, fullContentBuffer = "", displayedContent = ""; 
        let ttsBuffer = ""; 
        let processedVoiceLength = 0; 
        const effectiveSpeed = settings.workMode ? Math.max(5, settings.typingSpeed / 3) : settings.typingSpeed;

        const typeInterval = setInterval(() => {
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
            clearInterval(typeInterval); isLoadingRef.current = false; setIsLoading(false);
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
                       const deltaText = data.choices[0].delta.content; 
                       fullContentBuffer += deltaText; 
                       
                       // ✨ 核心修复：彻底将 TTS 切片解析逻辑与 <ADD_MEMO> 隔离
                       const currentMemoIdx = fullContentBuffer.indexOf('<ADD_MEMO');
                       const cleanBuffer = currentMemoIdx !== -1 ? fullContentBuffer.substring(0, currentMemoIdx) : fullContentBuffer;

                       if (settings.enableTranslation) {
                           const match = cleanBuffer.match(/<VOICE>([\s\S]*?)(?:<\/VOICE>|$)/i);
                           if (match) { 
                               const currentVoiceText = match[1]; 
                               const newVoiceChunk = currentVoiceText.slice(processedVoiceLength); 
                               ttsBuffer += newVoiceChunk; 
                               processedVoiceLength = currentVoiceText.length; 
                           } else if (cleanBuffer.length > 30 && !/<VOICE>/i.test(cleanBuffer) && !/<TEXT>/i.test(cleanBuffer)) { 
                               const newChunk = cleanBuffer.slice(processedVoiceLength);
                               ttsBuffer += newChunk;
                               processedVoiceLength = cleanBuffer.length;
                           }
                       } else { 
                           const newChunk = cleanBuffer.slice(processedVoiceLength);
                           ttsBuffer += newChunk;
                           processedVoiceLength = cleanBuffer.length;
                       }
                       
                       const splitRegex = settings.ttsFastMode ? /^([\s\S]*?[。！？\.\!\?\n，,、~～]+)/ : /^([\s\S]*?[。！？\.\!\?\n]+)/;
                       let matchPunc;
                       while ((matchPunc = ttsBuffer.match(splitRegex))) {
                           const chunk = matchPunc[1]; 
                           if (chunk.trim()) enqueueTTS(chunk.trim()); 
                           ttsBuffer = ttsBuffer.slice(chunk.length);
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
          resetProactiveTimer();
        }

      } else {
        const data = await response.json(); if (data.error) throw new Error(data.error.message || 'API 返回错误');
        let assistantContent = data.choices?.[0]?.message?.content || data.message || "";
        
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
        if (settings.enablePlotOptions) generatePlotOptions(finalMessages); isLoadingRef.current = false; setIsLoading(false);
        if (settings.enableMemory && finalMessages.length >= settings.memoryInterval) { triggerMemoryCompression(activeSessionId, finalMessages, activeSession?.memorySummary); }
        resetProactiveTimer();
      }
    } catch (error) { 
        showToast(`发送失败: ${error.message}`, "error"); 
        updateSessionMessages(activeSessionId, [...uiMessages, { role: 'assistant', content: `[系统错误]: ${error.message}`, isError: true }]); 
        isLoadingRef.current = false; 
        setIsLoading(false); 
    }
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
    setConfirmDialog({ isOpen: true, text: '确定要返回标题画面吗？\n当前未保存的对话进度将会丢失！', onConfirm: () => { 
        setAppMode('title'); 
        setIsSettingsOpen(false); 
        setIsSaveLoadUIOpen(false); 
        setIsMemoOpen(false); 
        setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); 
        clearTTSQueue(); 
        setActivePluginUI(null);
        window.dispatchEvent(new CustomEvent('gwc-force-stop-plugin'));
    } });
  };

  useEffect(() => {
    // 统一管控退出逻辑堆栈
    const handleBackAction = () => {
        if (confirmDialog.isOpen) { if (confirmDialog.onCancel) confirmDialog.onCancel(); else setConfirmDialog({ isOpen: false, text: '', onConfirm: null }); return; }
        if (editingSlotId !== null) { setEditingSlotId(null); return; }
        if (isBgMenuOpen || isExpressionMenuOpen || isModelMenuOpen) { setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); return; }
        if (visualAdjustMode) { setVisualAdjustMode(null); return; }
        if (isMemoOpen) { setIsMemoOpen(false); return; }
        if (isSettingsOpen) { setIsSettingsOpen(false); return; }
        if (isSaveLoadUIOpen) { setIsSaveLoadUIOpen(false); return; }
        if (isLogOpen) { setIsLogOpen(false); return; }
        const mapOverlay = document.getElementById('sm-player-map-overlay'); if (mapOverlay) { mapOverlay.remove(); return; }
        if (appMode === 'game') { handleReturnToTitle(); return; }
        if (appMode === 'title') { handleExitGame(); return; }
    };

    const handleGlobalKeyDown = (e) => { if (e.key === 'Escape') handleBackAction(); };
    
    // ✨ 核心防御：安卓物理返回键/侧边滑动手势劫持 (拦截浏览器 PopState)
    const handlePopState = (e) => {
        // 瞬间补充虚拟历史记录，防止下一次手势直接杀掉 APP
        window.history.pushState({ app: 'gwc_back_guard' }, document.title, window.location.href);
        handleBackAction();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('popstate', handlePopState);
    
    // 初始化时注入虚拟防身记录
    if (!window.history.state || window.history.state.app !== 'gwc_back_guard') {
        window.history.pushState({ app: 'gwc_back_guard' }, document.title, window.location.href);
    }

    return () => { window.removeEventListener('keydown', handleGlobalKeyDown); window.removeEventListener('popstate', handlePopState); };
  }, [confirmDialog, editingSlotId, isBgMenuOpen, isExpressionMenuOpen, isModelMenuOpen, visualAdjustMode, isMemoOpen, isSettingsOpen, isSaveLoadUIOpen, isLogOpen, appMode]);

  // ✨ 核心大迁徙：在数据未从黑盒中完全取出前，强行锁死渲染，防止白板空数据误杀
  if (isCoreLoading) {
    return (
      <div className="fixed inset-0 bg-[#2c2b29] flex flex-col items-center justify-center text-[#e6d5b8] z-50">
        <div className="w-12 h-12 border-4 border-[#ba3f42] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold tracking-widest">正在潜入底层数据库唤醒记忆...</h2>
      </div>
    );
  }
  return (
    <div className="relative h-screen w-full bg-slate-900 overflow-hidden font-sans select-none" onClick={() => { setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); }}>
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .text-outline-blue { text-shadow: -1px -1px 0 #1e3a8a, 1px -1px 0 #1e3a8a, -1px 1px 0 #1e3a8a, 1px 1px 0 #1e3a8a; } .light-scrollbar::-webkit-scrollbar { width: 8px; } .light-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 4px;} .light-scrollbar::-webkit-scrollbar-thumb { background: #d9c5b2; border-radius: 4px; } .light-scrollbar::-webkit-scrollbar-thumb:hover { background: #ba3f42; } .clip-polygon { clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%); }`}} />
 
 {/* ✨ 新增：全局备份与恢复进度条 (左上角悬浮) */}
      {backupProgress.visible && (
        <div className="fixed top-6 left-6 z-[100000] bg-black/85 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-2.5 w-72 pointer-events-none transition-all duration-300 animate-fade-in">
            <div className="flex justify-between items-center text-white text-xs font-bold tracking-wider">
                <span className="flex items-center gap-1.5"><Archive size={14} className="animate-pulse text-[#4fa0d8]"/> {backupProgress.text}</span>
                <span className="text-[#4fa0d8]">{backupProgress.percent}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-[#4fa0d8] to-[#ba3f42] h-full rounded-full transition-all duration-200 ease-out" style={{ width: `${backupProgress.percent}%` }}></div>
            </div>
        </div>
      )}

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

      {/* ✨ 背景图层支持原生插件接管 (已修复重复渲染) */}
      <div className="absolute inset-0 bg-cover z-0 transition-all duration-1000" style={{ 
          backgroundImage: (activePluginUI && pluginDialog.bgUrl) ? `url(${pluginDialog.bgUrl})` : (activeBgUrl ? `url(${activeBgUrl})` : 'none'), 
          backgroundColor: (activePluginUI && pluginDialog.bgUrl) ? 'transparent' : (activeBgUrl ? 'transparent' : '#1e1b4b'),
          backgroundPosition: (appMode === 'title' && localTitleBgImage) ? `calc(50% + ${settings.titleBgOffsetX || 0}px) calc(50% + ${settings.titleBgOffsetY || 0}px)` : 'center'
        }}>
        {!activeBgUrl && (!activePluginUI || !pluginDialog.bgUrl) && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.1),_transparent_70%)]" />}
      </div>

      {/* ✨ 剧本模式专属的原生立绘图层 (已接入原生预览悬浮窗机制) */}
      {((activePluginUI && pluginDialog.spriteUrl) || visualAdjustMode === 'story_model') && (
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-[15]">
             <img 
               src={(activePluginUI && pluginDialog.spriteUrl) ? pluginDialog.spriteUrl : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" width="400" height="800"><rect width="400" height="800" fill="rgba(186,63,66,0.15)" stroke="%23ba3f42" stroke-width="6" stroke-dasharray="15,15"/><circle cx="200" cy="200" r="80" fill="rgba(186,63,66,0.3)"/><path d="M100 800V500c0-60 40-100 100-100s100 40 100 100v300" fill="rgba(186,63,66,0.3)"/><text x="200" y="450" font-family="sans-serif" font-size="36" font-weight="bold" fill="%23ba3f42" text-anchor="middle">立绘预览占位</text></svg>'} 
               style={{ 
                 transform: `translate(${settings.storySpriteX || 0}px, ${settings.storySpriteY || 0}px) scale(${settings.storySpriteScale || 1.0})`, 
                 transformOrigin: 'bottom center', 
                 transition: 'all 0.3s ease',
                 filter: (activePluginUI && pluginDialog.spriteUrl) ? 'none' : 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
               }} 
               className={`max-h-[140%] object-contain ${!(activePluginUI && pluginDialog.spriteUrl) ? 'opacity-90' : ''}`} 
               alt="sprite" 
             />
          </div>
      )}

      {/* ✨ 核心修复：当处于故事模式时，原生 Live2D 容器必须彻底透明并失去交互，彻底解决立绘重叠！ */}
      <div ref={containerRef} className={`absolute inset-0 z-10 overflow-hidden ${activePluginUI ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'} transition-opacity duration-300`} onClick={handleModelContainerClick}>
        {live2dStatus && !settings.enableNoLive2DMode && (<div className="absolute bottom-8 left-8 flex items-center justify-center text-white/70 pointer-events-none drop-shadow-md z-30"><span className="bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm text-xs tracking-widest border border-white/10">{live2dStatus}</span></div>)}
        <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
      </div>

      {/* 实时面部捕捉摄像头画中画 */}
      <video 
        ref={videoRef} 
        className={`absolute top-6 left-6 z-50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-white/20 object-cover backdrop-blur-sm pointer-events-none transition-all duration-300 ${settings.enableFaceTracking && settings.enableCameraPreview ? 'w-48 h-36 opacity-80' : 'w-0 h-0 opacity-0'}`} 
        autoPlay 
        playsInline 
        muted 
        style={{ transform: 'scaleX(-1)' }} 
      />

      {isSettingsOpen && visualAdjustMode && (
        <div className="fixed top-8 right-8 z-[99999] w-80 bg-[#fdfaf5]/95 backdrop-blur-xl border-2 border-[#d9c5b2] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-5 text-[#4a4036] pointer-events-auto animate-fade-in">
           <div className="flex justify-between items-center border-b-2 border-dashed border-[#e6d5b8] pb-3 mb-4">
              <h3 className="font-black text-[#ba3f42] text-sm flex items-center gap-2">
                <Eye size={16} /> 
                {visualAdjustMode === 'model' && '聊天模型实时调整'} 
                {visualAdjustMode === 'title_model' && '主标题模型实时调整'} 
                {visualAdjustMode === 'dialog' && '对话框排版实时调整'}
                {visualAdjustMode === 'story_model' && '剧本立绘实时调整'}
              </h3>
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
                {/* ✨ 新增：快捷预览面板里的文本行距滑块 */}
                <SettingSlider label="文本行距" value={settings.dialogLineHeight || 1.8} min={1.0} max={3.0} step={0.1} suffix="倍" onChange={v => setSettings({...settings, dialogLineHeight: v})} />
                <SettingSlider label="对话框垂直偏移" value={settings.dialogPositionY} min={0} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, dialogPositionY: v})} />
                <SettingSlider label="对话框不透明度" value={settings.dialogOpacity} min={0} max={1} step={0.05} suffix="" onChange={v => setSettings({...settings, dialogOpacity: v})} />
                <div className="flex flex-col gap-2 w-full pt-2 border-t border-dashed border-[#e6d5b8]"><label className="text-[#ba3f42] font-bold flex items-center gap-1"><span className="text-sm">✱</span> 窗口背景主题色</label><div className="flex items-center gap-3"><input type="color" value={settings.dialogThemeColor} onChange={e => setSettings({...settings, dialogThemeColor: e.target.value})} className="h-10 w-full rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner" /></div></div>
              </div>
           )}
           
          {/* ✨ 新增：故事剧本立绘预览调整 */}
           {visualAdjustMode === 'story_model' && (
              <div className="space-y-5">
                <SettingSlider label="立绘缩放 (Scale)" value={settings.storySpriteScale || 1.0} min={0.5} max={3.0} step={0.05} suffix="x" onChange={v => setSettings({...settings, storySpriteScale: v})} />
                <SettingSlider label="水平偏移 (X)" value={settings.storySpriteX || 0} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, storySpriteX: v})} />
                <SettingSlider label="垂直偏移 (Y)" value={settings.storySpriteY || 0} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, storySpriteY: v})} />
              </div>
           )}
           {/* ✨ 新增：主标题排版预览调整 */}
           {visualAdjustMode === 'title_text' && (
              <div className="space-y-5">
                <SettingSlider label="主标题水平位置 (X)" value={settings.mainTitleX} min={-800} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, mainTitleX: v})} />
                <SettingSlider label="主标题垂直位置 (Y)" value={settings.mainTitleY} min={-500} max={500} step={10} suffix="px" onChange={v => setSettings({...settings, mainTitleY: v})} />
                <div className="border-t border-dashed border-[#e6d5b8] my-2"></div>
                <SettingSlider label="副标题水平位置 (X)" value={settings.subTitleX} min={-800} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, subTitleX: v})} />
                <SettingSlider label="副标题垂直位置 (Y)" value={settings.subTitleY} min={-500} max={500} step={10} suffix="px" onChange={v => setSettings({...settings, subTitleY: v})} />
              </div>
           )}
           {/* ✨ 新增：主标题背景偏移预览调整 */}
           {visualAdjustMode === 'title_bg' && (
              <div className="space-y-5">
                <SettingSlider label="背景水平偏移 (X)" value={settings.titleBgOffsetX} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, titleBgOffsetX: v})} />
                <SettingSlider label="背景垂直偏移 (Y)" value={settings.titleBgOffsetY} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, titleBgOffsetY: v})} />
              </div>
           )}
        </div>
    )}

      {appMode === 'title' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex">
          <div className={`flex-1 flex flex-col justify-center relative w-full h-full ${settings.enableMobileUI ? 'px-8 md:px-24 lg:px-32' : 'px-12 md:px-32'}`}>
            <div className="pointer-events-auto">
              <h1 className="font-black drop-shadow-[0_5px_5px_rgba(30,58,138,0.8)] tracking-widest leading-none inline-block transition-transform duration-300" style={{ fontSize: settings.enableMobileUI ? 'clamp(4rem, 8vw, 8rem)' : 'clamp(5rem, 8vw, 8rem)', color: settings.mainTitleColor, fontFamily: settings.mainTitleFont, transform: `translate(${settings.mainTitleX || 0}px, ${settings.mainTitleY || 0}px)` }}>{settings.mainTitleText}</h1><br/>
              <p className={`font-bold tracking-[0.4em] mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] inline-block transition-transform duration-300 ${settings.enableMobileUI ? 'text-lg md:text-2xl md:ml-2' : 'text-xl md:text-2xl ml-2'}`} style={{ color: settings.subTitleColor, fontFamily: settings.subTitleFont, transform: `translate(${settings.subTitleX || 0}px, ${settings.subTitleY || 0}px)` }}>{settings.subTitleText}</p>
             {/* ✨ 优化：增加 max-h 和 overflow-y-auto，让手机横屏时可以上下滑动菜单 */}
             <div className={`flex flex-col w-56 max-h-[50vh] landscape:max-h-[45vh] overflow-y-auto hide-scrollbar py-2 ${settings.enableMobileUI ? 'mt-8 md:mt-24 gap-5 md:gap-6 ml-2 md:ml-4' : 'mt-12 md:mt-24 gap-6 ml-4'}`}>
                <button onClick={handleStartGame} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>START</button>
                <button onClick={handleContinueGame} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>CONTINUE</button>
                
                {/* ✨ 原生级动态注入插件按钮 */}
                {pluginTitleButtons.map(btn => (
                   <button key={btn.id} onClick={btn.onClick} className={`shrink-0 text-left font-bold text-amber-400 hover:text-amber-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)] ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>{btn.label}</button>
                ))}

                <button onClick={() => { setSlMode('load'); setIsSaveLoadUIOpen(true); }} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>LOAD</button>
                <button onClick={() => setIsSettingsOpen(true)} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>SYSTEM</button>
                <button onClick={handleExitGame} className={`shrink-0 text-left font-bold text-white/90 hover:text-blue-300 tracking-wider transition-all duration-300 hover:translate-x-3 drop-shadow-md ${settings.enableMobileUI ? 'text-xl md:text-2xl' : 'text-2xl'}`}>EXIT</button>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-white/60 font-bold text-sm drop-shadow-md pointer-events-none">v3.50</div>
        </div>
      )}

      {appMode === 'title' && settings.showTitleBgmPlayer && (
        <div 
           className="absolute z-[8500] bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col p-4 w-72 pointer-events-auto transition-transform duration-75"
           style={{ left: '2rem', bottom: '2rem', transform: `translate(${bgmOffset.x}px, ${bgmOffset.y}px)` }}
        >
           <div 
             className="flex justify-center items-center mb-3 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
             onMouseDown={handleBgmPointerDown} onTouchStart={handleBgmPointerDown}
           >
             <GripHorizontal size={18} className="text-white" />
           </div>
           <div className="text-white text-sm font-bold truncate mb-4 text-center tracking-wider drop-shadow-md px-2">
             {bgmList.length > 0 ? (bgmList[currentBgmIndex]?.name || '加载中...') : '暂无背景音乐'}
           </div>
           <div className="flex justify-between items-center px-3">
             <button onClick={toggleBgmMode} className="text-white/60 hover:text-white transition-colors" title="播放模式 (顺序/随机/单曲循环)">
               {settings.bgmMode === 'sequential' && <Repeat size={18} />}
               {settings.bgmMode === 'random' && <Shuffle size={18} />}
               {settings.bgmMode === 'loop' && <Repeat1 size={18} />}
             </button>
             <div className="flex items-center gap-4">
               <button onClick={handlePrevBgm} className="text-white/80 hover:text-white transition-colors"><SkipBack size={20} /></button>
               <button onClick={toggleBgm} className="bg-white text-black p-2.5 rounded-full hover:scale-105 transition-all shadow-md">
                 {isBgmPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
               </button>
               <button onClick={handleNextBgm} className="text-white/80 hover:text-white transition-colors"><SkipForward size={20} /></button>
             </div>
             <button onClick={() => setSettings({...settings, showTitleBgmPlayer: false})} className="text-white/30 hover:text-red-400 transition-colors" title="关闭播放器 (可在设置中恢复)"><X size={18} /></button>
           </div>
        </div>
      )}

    {appMode === 'game' && !visualAdjustMode && (
        <>
          {!activePluginUI && (
            <div className={`absolute top-16 right-6 z-[8000] flex flex-col items-end gap-3 pointer-events-none max-w-[300px] md:max-w-sm transition-all duration-500 ${isImmersive ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
              {isGeneratingReplies && (<div className="pointer-events-auto"><span className="bg-black/60 text-indigo-300 text-xs px-4 py-1.5 rounded-full animate-pulse border border-indigo-500/30 backdrop-blur-md shadow-lg flex items-center"><Sparkles size={12} className="mr-1" /> 正在推演选项...</span></div>)}
              {!isGeneratingReplies && suggestedReplies.length > 0 && (
                <div className="flex flex-col gap-2.5 items-end pointer-events-auto w-full">
                  {suggestedReplies.map((reply, idx) => (
                    <button key={idx} onClick={() => { setInputValue(reply); setSuggestedReplies([]); }} className="group bg-black/70 hover:bg-indigo-900/90 border border-indigo-500/50 text-indigo-50 px-4 py-3 rounded-xl text-sm tracking-widest backdrop-blur-md transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_20px_rgba(79,70,229,0.6)] hover:-translate-x-1 text-left break-words w-full border-r-4 border-r-pink-500"><span className="text-pink-400 mr-1.5 opacity-80 text-xs transition-transform group-hover:translate-x-1 inline-block">▶</span> {reply}</button>
                  ))}
                </div>
             )}
            </div>
          )}

         {/* ✨ 核心渲染重构：将 className 里的 -translate-x-1/2 抽离到 style transform 中，以便叠加全局 Scale 缩放 */}
         {(!activePluginUI || pluginDialog.visible) && (
            <div className="absolute left-1/2 z-20 pointer-events-none flex flex-col transition-all duration-300 w-[94%] max-w-5xl" style={{ bottom: `calc(1.5rem - ${settings.dialogPositionY}px)`, transform: `translateX(-50%) ${settings.enableMobileUI ? `scale(${settings.mobileUIScale || 1.0})` : ''}`, transformOrigin: 'bottom center' }}>
              <div className={`transition-opacity duration-300 ${(!activePluginUI && latestMessage) || (activePluginUI && pluginDialog.speaker) ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`px-4 md:px-8 py-1 rounded-t-lg w-fit text-sm md:text-xl font-bold tracking-widest text-white ${settings.dialogOpacity > 0 ? 'backdrop-blur-md' : ''} pointer-events-auto transition-colors duration-300`} style={{ backgroundColor: activePluginUI ? hexToRgba('#312e81', settings.dialogOpacity) : (latestMessage?.role === 'user' ? hexToRgba('#064e3b', settings.dialogOpacity) : hexToRgba('#312e81', settings.dialogOpacity)), borderLeft: `4px solid rgba(${(!activePluginUI && latestMessage?.role === 'user') ? '52, 211, 153' : '129, 140, 248'}, ${settings.dialogOpacity > 0 ? 1 : 0})` }}>
                  {activePluginUI ? pluginDialog.speaker : (latestMessage?.role === 'user' ? settings.userName : settings.aiName)}
                </div>
              </div>

           <div className={`rounded-b-xl rounded-tr-xl ${settings.dialogOpacity > 0 ? 'backdrop-blur-sm' : ''} relative flex flex-col pointer-events-auto transition-all duration-300 ${hasNextPage || activePluginUI ? 'cursor-pointer' : ''}`} style={{ backgroundColor: hexToRgba(settings.dialogThemeColor, settings.dialogOpacity), borderColor: `rgba(255, 255, 255, ${settings.dialogOpacity * 0.2})`, borderWidth: settings.dialogOpacity > 0 ? '1px' : '0px', boxShadow: settings.dialogOpacity > 0.1 ? `0 8px 32px rgba(0,0,0,${settings.dialogOpacity * 0.5})` : 'none' }} onClick={(e) => { e.stopPropagation(); if(activePluginUI){ window.dispatchEvent(new CustomEvent('gwc-dialog-click')); } else { handleDialogClick(); } }} onWheel={handleWheel}>
                {/* ✨ 优化：通过开关隔离移动端紧凑模式与PC端原版宽敞模式 */}
                <div ref={vnTextContainerRef} style={{ color: settings.dialogTextColor, fontFamily: settings.dialogFontFamily, lineHeight: settings.dialogLineHeight || 1.8 }} className={`overflow-y-auto scroll-smooth relative pointer-events-auto select-text cursor-text tracking-widest ${settings.enableMobileUI ? 'p-3 md:p-6 landscape:p-2 landscape:md:p-4 pb-2 md:pb-4 landscape:pb-1 text-sm sm:text-base md:text-xl lg:text-2xl landscape:text-sm min-h-[60px] md:min-h-[120px] landscape:min-h-[50px] max-h-[35vh] landscape:max-h-[22vh]' : 'p-8 pb-4 text-xl md:text-2xl min-h-[140px] max-h-[30vh]'}`}>
                  {activePluginUI ? (
                      <span>
                        <span className="whitespace-pre-wrap">{pluginDialog.text}</span>
                        {pluginDialog.typing && <span className={`inline-block ml-1 bg-white/70 animate-pulse align-middle rounded-sm ${settings.enableMobileUI ? 'w-2 md:w-2.5 h-4 md:h-6' : 'w-2.5 h-6'}`}></span>}
                        {!pluginDialog.typing && <span className={`inline-block animate-bounce text-indigo-300 pointer-events-none select-none ${settings.enableMobileUI ? 'ml-2 md:ml-3' : 'ml-3'}`}><ChevronDown size={settings.enableMobileUI ? 20 : 24} className={settings.enableMobileUI ? "md:w-6 md:h-6" : ""}/></span>}
                      </span>
                  ) : (latestMessage 
                    ? <span className={`${latestMessage.isError ? 'text-red-400' : ''}`}>
                        <div className="whitespace-pre-wrap">{currentDisplay}</div>
                        {latestMessage.isStreaming && !hasNextPage && <span className={`inline-block ml-1 bg-white/70 animate-pulse align-middle rounded-sm ${settings.enableMobileUI ? 'w-2 md:w-2.5 h-4 md:h-6' : 'w-2.5 h-6'}`}></span>}
                        {hasNextPage && <span className={`inline-block animate-bounce text-indigo-300 pointer-events-none select-none ${settings.enableMobileUI ? 'ml-2 md:ml-3' : 'ml-3'}`}><ChevronDown size={settings.enableMobileUI ? 20 : 24} className={settings.enableMobileUI ? "md:w-6 md:h-6" : ""} /></span>}
                      </span>
                    : <span className="italic pointer-events-none select-none" style={{ opacity: settings.dialogOpacity > 0 ? 0.4 : 0.8, color: '#ffffff' }}>（环境极其安静，试着在下方输入框说点什么打破沉寂吧...）</span>
                  )}
                </div>

                {!activePluginUI && (
                  <div className={`border-t border-white/10 flex flex-col relative pointer-events-auto ${settings.enableMobileUI ? 'px-2 md:px-6 py-1.5 md:py-3 landscape:py-1' : 'px-6 py-4'}`} onClick={e => e.stopPropagation()}>
                    {selectedFiles.length > 0 && (
                        <div className={`flex flex-wrap ${settings.enableMobileUI ? 'mb-2 md:mb-3 gap-2 md:gap-3' : 'mb-3 gap-3'}`}>
                            {selectedFiles.map((f, i) => (
                                <div key={i} className={`relative rounded-md border border-white/20 overflow-hidden shadow-lg flex items-center bg-black/50 pr-2 ${settings.enableMobileUI ? 'h-12 md:h-16 max-w-[150px] md:max-w-[200px]' : 'h-16 max-w-[200px]'}`}>
                                    {f.type === 'image' ? <img src={f.data} className={`object-cover shrink-0 ${settings.enableMobileUI ? 'w-12 h-12 md:w-16 md:h-16' : 'w-16 h-16'}`} alt="preview" /> : <div className={`flex items-center justify-center text-white/50 bg-white/5 shrink-0 ${settings.enableMobileUI ? 'w-12 h-12 md:w-16 md:h-16' : 'w-16 h-16'}`}><FileText size={settings.enableMobileUI ? 20 : 24}/></div>}
                                    {f.type === 'document' && <span className={`text-white/80 ml-2 truncate font-bold ${settings.enableMobileUI ? 'text-[10px] md:text-xs' : 'text-xs'}`}>{f.name}</span>}
                                    <button onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black/60 p-1 rounded-bl-md hover:bg-red-500 text-white transition-colors" title="取消文件"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={`flex items-center w-full ${settings.enableMobileUI ? 'gap-1.5 md:gap-3' : 'gap-3'}`}>
                      <input type="file" accept="image/*,.txt,.md,.json,.csv" multiple hidden ref={fileInputRef} onChange={handleFileSelect} />
                      <button onClick={() => fileInputRef.current.click()} className={`text-white/50 hover:text-white transition-colors shrink-0 bg-white/5 hover:bg-white/10 rounded-md ${settings.enableMobileUI ? 'p-1.5 md:p-2' : 'p-2'}`} title="上传附件(图片/文档)"><Plus size={settings.enableMobileUI ? 18 : 20} className={settings.enableMobileUI ? "md:w-5 md:h-5" : ""}/></button>
                      <div className="flex-1 relative">
                        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={settings.workMode ? "编程模式，无字数限制..." : "输入你想说的话..."} disabled={isLoading} className={`w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 focus:bg-black/40 transition-all font-sans disabled:opacity-50 ${settings.enableMobileUI ? 'px-2 py-1.5 md:px-4 md:py-2 landscape:py-1 text-xs md:text-base' : 'px-4 py-3 text-base'}`} />
                        <button onClick={handleSendMessage} disabled={(!inputValue.trim() && selectedFiles.length === 0) || isLoading} className={`absolute top-1/2 -translate-y-1/2 bg-indigo-500/80 hover:bg-indigo-400 disabled:bg-white/10 text-white rounded-md transition-colors ${settings.enableMobileUI ? 'right-1.5 md:right-2 p-1.5 md:p-2' : 'right-2 p-2'}`}><Send size={settings.enableMobileUI ? 16 : 18} className={settings.enableMobileUI ? "md:w-[18px] md:h-[18px]" : ""} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ✨ 快捷栏全面适配：修复字体发黑 Bug，严格限定颜色，同时保留双端隔离 */}
              <div className={`w-full flex justify-end pointer-events-none z-[9000] ${settings.enableMobileUI ? 'mt-1 md:mt-2' : 'mt-2'}`}>
                <div className={`flex flex-wrap justify-end items-center ${settings.dialogOpacity > 0 ? 'backdrop-blur-md' : ''} rounded-xl font-bold shadow-lg transition-colors duration-300 pointer-events-auto text-indigo-200 ${settings.enableMobileUI ? 'px-2 md:px-4 py-1 md:py-2 landscape:py-1 gap-x-2 md:gap-x-4 gap-y-1 md:gap-y-2 text-[10px] sm:text-xs md:text-sm' : 'px-4 py-2 gap-x-5 gap-y-2.5 text-sm'}`} style={{ backgroundColor: hexToRgba(settings.dialogThemeColor, settings.dialogOpacity), border: settings.dialogOpacity > 0 ? `1px solid rgba(255, 255, 255, ${settings.dialogOpacity * 0.2})` : 'none' }} onClick={e => e.stopPropagation()}>
                  
                  {/* ✨ 快捷栏全面挂载拦截器 (triggerShortcut) */}
                  {settings.shortcuts?.save && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('save', handleAutoSaveSButton, e)} title="一键保存当前进度并命名">S</span>}
                  {settings.shortcuts?.load && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('load', () => { setSlMode('load'); setIsSaveLoadUIOpen(true); }, e)} title="打开存档/读档页面">L</span>}
                  {settings.shortcuts?.quickSave && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('quickSave', handleQuickSave, e)} title="记录临时快捷存档 (不占常规栏位)">QS</span>}
                  {settings.shortcuts?.quickLoad && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('quickLoad', handleQuickLoad, e)} title="瞬间加载快捷存档">QL</span>}
                  {settings.shortcuts?.skip && <span className="cursor-pointer text-blue-300 hover:text-white transition-colors shrink-0 whitespace-nowrap font-bold" onClick={(e) => triggerShortcut('skip', handleSkip, e)} title="跳过当前对话，直接翻到最后一页">SKIP</span>}
                  
                  {(settings.shortcuts?.save || settings.shortcuts?.load || settings.shortcuts?.quickSave || settings.shortcuts?.quickLoad || settings.shortcuts?.skip) && 
                    <span className="hidden sm:inline-block w-px h-4 bg-white/20 mx-1 shrink-0"></span>
                  }
                  
                  {/* ✨ 核心修复：当处于故事剧本模式 (activePluginUI) 时，自动隐藏所有用不到的功能 */}
                  {settings.shortcuts?.bg && !activePluginUI && (
                    <div className="relative flex items-center shrink-0">
                      <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => triggerShortcut('bg', () => { setIsBgMenuOpen(!isBgMenuOpen); setIsExpressionMenuOpen(false); setIsModelMenuOpen(false); }, e)} title="切换背景"><ImageIcon size={14} /> 背景</span>
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
                  )}
                  {settings.shortcuts?.model && !activePluginUI && (
                    <div className="relative flex items-center shrink-0">
                      <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => triggerShortcut('model', () => { setIsModelMenuOpen(!isModelMenuOpen); setIsBgMenuOpen(false); setIsExpressionMenuOpen(false); }, e)} title="切换Live2D模型"><User size={14} /> 模型</span>
                      {isModelMenuOpen && (
                        <div className="absolute bottom-full mb-3 right-0 bg-black/85 backdrop-blur-xl border border-white/20 rounded-xl p-2 w-48 max-h-64 overflow-y-auto flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50">
                          {modelsList.length === 0 ? (<span className="text-xs text-white/50 px-3 py-2 text-center">暂无模型，请在设置中导入</span>) : (
                            <>{modelsList.map(m => (<button key={m.id} onClick={() => switchModel(m.id)} className={`shrink-0 text-sm px-3 py-2.5 rounded-lg text-left transition-colors whitespace-nowrap overflow-hidden overflow-ellipsis leading-tight ${settings.currentModelId === m.id ? 'bg-indigo-600/80 text-white font-bold' : 'hover:bg-white/10 text-white/80'}`}>{m.name}</button>))}</>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {settings.shortcuts?.expression && !activePluginUI && (
                    <div className="relative flex items-center shrink-0">
                      <span className="cursor-pointer transition-colors flex items-center gap-1 hover:text-white whitespace-nowrap" onClick={(e) => triggerShortcut('expression', () => { setIsExpressionMenuOpen(!isExpressionMenuOpen); setIsBgMenuOpen(false); setIsModelMenuOpen(false); }, e)} title="切换模型预设表情"><Smile size={14} /> 表情</span>
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
                  )}
                  {settings.shortcuts?.memo && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap hover:text-white`} onClick={(e) => triggerShortcut('memo', () => { setIsMemoOpen(true); }, e)} title="记录备忘录或日程安排"><FileText size={14} /> 备忘</span>}
                  {settings.shortcuts?.workMode && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.workMode ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('workMode', () => { const newMode = !settings.workMode; setSettings({...settings, workMode: newMode, ttsEnabled: newMode ? false : settings.ttsEnabled}); if (newMode) showToast("💻 编程模式开启！自动闭麦，解除字数限制，请在此挥洒代码~", "success", 5000); else showToast("🌸 娱乐模式开启！", "info"); }, e)} title="开启/关闭工作编程模式 (解除AI字数限制)"><Monitor size={14} /> {settings.workMode ? '工作:开' : '工作:关'}</span>}
                  
                  {settings.shortcuts?.faceTracking && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.enableFaceTracking ? 'text-indigo-300 drop-shadow-[0_0_5px_rgba(165,180,252,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('faceTracking', () => { setSettings({...settings, enableFaceTracking: !settings.enableFaceTracking}); }, e)} title="开启/关闭摄像头实时面捕 (Face Tracking)"><Video size={14} className={isFaceTrackingLoading ? 'animate-pulse' : ''}/> {settings.enableFaceTracking ? '面捕:开' : '面捕:关'}</span>}
                  {settings.shortcuts?.hideModel && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.hideLive2dModel ? 'text-white/50 hover:text-white' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('hideModel', () => { setSettings({...settings, hideLive2dModel: !settings.hideLive2dModel}); }, e)} title="开启/关闭看板娘显示"><Eye size={14} /> {settings.hideLive2dModel ? '模型:隐' : '模型:显'}</span>}
                  {settings.shortcuts?.bgm && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${isBgmPlaying ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('bgm', toggleBgm, e)} title="播放/暂停背景音乐"><Music size={14} className={isBgmPlaying ? 'animate-pulse' : ''}/> BGM</span>}
                  {settings.shortcuts?.plot && !activePluginUI && <span className={`cursor-pointer transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${settings.enablePlotOptions ? 'text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('plot', () => setSettings({...settings, enablePlotOptions: !settings.enablePlotOptions}), e)} title="开启/关闭剧情选项推演"><Sparkles size={14} className={settings.enablePlotOptions ? 'animate-pulse' : ''}/> 选项</span>}
                  {settings.shortcuts?.tts && <span className={`cursor-pointer transition-colors shrink-0 whitespace-nowrap ${settings.ttsEnabled ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'hover:text-white'}`} onClick={(e) => triggerShortcut('tts', () => setSettings({...settings, ttsEnabled: !settings.ttsEnabled}), e)}>Auto(TTS)</span>}
                  {settings.shortcuts?.log && <span className="cursor-pointer hover:text-white transition-colors shrink-0 whitespace-nowrap" onClick={(e) => triggerShortcut('log', () => setIsLogOpen(true), e)}>Log</span>}
                  
                  {/* 强制始终显示设置按钮以防锁死 */}
                  <Settings className="w-4 h-4 cursor-pointer hover:text-white transition-colors shrink-0" onClick={() => setIsSettingsOpen(true)} title="系统设置" />
                </div>
              </div>
            </div>
          )}
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
                  {(msg.files || (msg.image ? [{type:'image', data:msg.image}] : [])).map((f, i) => f.type === 'image' ? <img key={i} src={f.data} className="max-w-sm rounded-lg mb-3 border border-white/20 shadow-md" alt="upload" /> : <div key={i} className="text-xs text-emerald-200/70 mb-2 border border-emerald-500/30 p-2 rounded bg-black/20 flex items-center gap-1"><FileText size={14}/> 附件: {f.name}</div>)}
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* 柚子社风格浅色主题系统设置面板 */}
      {isSettingsOpen && !visualAdjustMode && (
       <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="w-[95%] max-w-5xl h-[85vh] bg-[#fdfaf5] rounded-xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.4)] border-2 border-[#d9c5b2] relative" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 2px, transparent 2px, transparent 4px)' }}>
            <div className="flex h-16 bg-[#efe6d5] border-b border-[#d9c5b2] shrink-0 overflow-hidden">
               {/* ✨ 优化：在手机端隐藏左侧标题，为菜单腾出空间 */}
               <div className="bg-[#c44a4a] text-white hidden md:flex flex-col justify-center px-8 shrink-0 clip-polygon relative z-10 shadow-md">
                  <span className="text-xl font-black tracking-widest text-shadow-sm">系统设定</span>
                  <span className="text-[10px] tracking-widest opacity-80 uppercase font-bold">System Config</span>
               </div>
               {/* ✨ 优化：增加 shrink-0 和 whitespace-nowrap 允许横向滑动 */}
               <div className="flex-1 flex overflow-x-auto hide-scrollbar bg-[#fdfaf5]/50 items-end px-2 md:px-4 gap-1 md:gap-2">
                  {[ 
                    { id: 'visual', icon: <ImageIcon size={18}/>, label: '视觉设定', hideInStory: false }, 
                    { id: 'text', icon: <Type size={18}/>, label: '文本互动', hideInStory: true }, 
                    { id: 'sound', icon: <Volume2 size={18}/>, label: '声音设定', hideInStory: false }, 
                    { id: 'character', icon: <MessageSquare size={18}/>, label: '剧本角色', hideInStory: true }, 
                    { id: 'api', icon: <ServerCrash size={18}/>, label: '模型接口', hideInStory: true }, 
                    { id: 'data', icon: <Database size={18}/>, label: '数据管理', hideInStory: true },
                    { id: 'mods', icon: <Puzzle size={18}/>, label: '插件模组', hideInStory: false },
                    { id: 'about', icon: <Info size={18}/>, label: '关于系统', hideInStory: false }
                  ].filter(t => activePluginUI === 'story_mode_dlc' ? (t.showInStoryOnly || !t.hideInStory) : !t.showInStoryOnly).map(tab => (
                    <button key={tab.id} onClick={() => setSettingsTab(tab.id)} className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 md:py-3 font-bold text-xs md:text-sm transition-all border-b-4 rounded-t-lg ${settingsTab === tab.id ? 'bg-white border-[#c44a4a] text-[#c44a4a] shadow-[0_-4px_10px_rgba(0,0,0,0.05)]' : 'border-transparent text-[#7a6b5d] hover:bg-[#e8decb]'}`}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
               </div>
               <button onClick={() => setIsSettingsOpen(false)} className="px-4 md:px-6 hover:bg-black/5 transition-colors shrink-0 border-l border-[#d9c5b2]"><X size={20} className="md:w-6 md:h-6 text-[#888] hover:text-[#c44a4a] transition-colors"/></button>
            </div>

           <div className="flex-1 overflow-y-auto p-8 light-scrollbar text-[#4a4036]">
              {settingsTab === 'visual' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* ✨ 新增：移动端 UI 适配独立开关 */}
                  <SettingSectionTitle title="UI 布局适配 (Mobile UI)" />
                  <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm mb-6">
                    <SettingToggle label="开启手机端紧凑布局适配" value={settings.enableMobileUI} onChange={v => setSettings({...settings, enableMobileUI: v})} />
                    {settings.enableMobileUI && (
                      <div className="pt-4 mt-4 border-t border-dashed border-[#e6d5b8]">
                        <SettingSlider label="紧凑布局全局等比缩放 (Scale)" value={settings.mobileUIScale || 1.0} min={0.5} max={1.5} step={0.05} suffix="x" onChange={v => setSettings({...settings, mobileUIScale: v})} />
                      </div>
                    )}
                    <p className="text-xs text-[#7a6b5d] mt-3 leading-relaxed">开启后，将大幅压缩对话框、输入框和快捷栏的内边距与字体大小，专门优化手机竖屏及横屏模式下的视野遮挡问题。配合上方的“全局缩放”可进一步缩小遮挡面积。PC端请保持关闭以获得最佳体验。</p>
                  </div>

                  <SettingSectionTitle 
                    title="Live2D 模型管理" 
                    extra={
                      <>
                        <label className="flex items-center gap-1 px-4 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white text-xs font-bold rounded-full transition-colors shadow-sm cursor-pointer"><Database size={14}/> 离线引擎<input type="file" accept=".js,.txt" hidden onChange={handleOfflineEngineUpload} /></label>
                        <button onClick={handleFullscreen} className="flex items-center gap-1 px-4 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Monitor size={14}/> 全屏</button>
                        <button onClick={() => handleEnterVisualAdjust('model')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整</button>
                      </>
                    } 
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
                      <label className="block font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> Live2D 模型库管理 (支持多模型)</label>
                      <p className="text-xs text-[#7a6b5d] mb-4 leading-relaxed">选择包含 <code>.model3.json</code> 的模型文件夹。导入后可在底栏快速切换。</p>
                      
                      <div className="flex flex-col gap-2 mb-4">
                        <input type="file" webkitdirectory="true" directory="true" multiple onChange={handleModelUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#c44a4a] file:text-white hover:file:bg-[#a63d3d] cursor-pointer"/>
                        <label className="block w-full text-sm text-center font-bold bg-[#4fa0d8] text-white hover:bg-[#3b82f6] rounded-full py-2 px-4 cursor-pointer shadow-sm transition-colors">
                          📦 导入 ZIP 模型包 (安卓兼容)
                          <input type="file" accept=".zip,application/zip,application/x-zip-compressed,*/*" hidden onChange={handleZipModelUpload} />
                        </label>
                      </div>

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
                      {/* ✨ 新增：模型渲染精度选择 */}
                      <div className="border-t border-dashed border-[#e6d5b8] pt-4">
                        <label className="block text-sm font-bold text-[#ba3f42] mb-2">Live2D 模型渲染精度 (防模糊)</label>
                        <select value={settings.live2dResolution || window.devicePixelRatio || 1} onChange={e => { setSettings({...settings, live2dResolution: parseFloat(e.target.value)}); setModelReloadTrigger(prev => prev + 1); }} className="w-full bg-[#fdfaf5] border border-[#d9c5b2] text-[#4a4036] font-bold text-xs rounded-md px-3 py-2 outline-none shadow-inner focus:border-[#ba3f42]">
                            <option value={1}>标准精度 (1x - 性能优先)</option>
                            <option value={2}>高清精度 (2x - 适合手机)</option>
                            <option value={3}>超清精度 (3x - 极度细腻)</option>
                            <option value={window.devicePixelRatio || 1}>自适应屏幕 (Auto)</option>
                        </select>
                        <p className="text-xs text-[#7a6b5d] mt-2">手机端感觉立绘模糊时，请选择【高清】或【超清】并等待重载。</p>
                      </div>
                    </div>
                  </div>
                  
                  <SettingSectionTitle title="面部捕捉 (Face Tracking)" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                      <div className="flex flex-col gap-3">
                          <SettingToggle label="开启摄像头实时面部捕捉" value={settings.enableFaceTracking} onChange={v => setSettings({...settings, enableFaceTracking: v})} />
                          <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed">基于 Mediapipe 驱动，面部动作将直接映射给当前 Live2D 模型。会自动切断内置的鼠标视线跟随以防鬼畜冲突。</p>
                          <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#e6d5b8] pt-4">
                              <label className="text-sm font-bold text-[#ba3f42]">捕捉精度模式</label>
                              <select value={settings.faceTrackingMode} onChange={e => setSettings({...settings, faceTrackingMode: e.target.value})} className="bg-[#fdfaf5] border border-[#d9c5b2] text-[#4a4036] font-bold text-xs rounded-md px-3 py-1.5 outline-none shadow-inner focus:border-[#ba3f42]">
                                  <option value="full">全脸追踪 (头部+五官)</option>
                                  <option value="mouthOnly">仅捕捉嘴巴 (极度防抖定点)</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-dashed border-[#e6d5b8] pt-6 md:pt-0 md:pl-6">
                          <SettingToggle label="显示摄像头画中画预览" value={settings.enableCameraPreview} onChange={v => setSettings({...settings, enableCameraPreview: v})} />
                          <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed">在左上角实时显示摄像头回显画面，以便您确认光线和追踪效果。</p>
                          <div className="mt-3 pt-4 border-t border-dashed border-[#e6d5b8]">
                              <button onClick={handleResetFocus} className="w-full px-4 py-2 bg-[#fdfaf5] hover:bg-[#efe6d5] border border-[#d9c5b2] text-[#4a4036] font-bold text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2">
                                  <RefreshCw size={14} className="text-[#ba3f42]"/> 强制复位视线与头部
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm flex flex-col gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-[#ba3f42] mb-3 border-b border-dashed border-[#e6d5b8] pb-2">默认 Live2D 模型微调</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SettingSlider label="模型缩放" value={currentModelConfig.scale} min={0.01} max={2} step={0.01} suffix="x" onChange={v => updateModelConfig('scale', v)} />
                            <SettingSlider label="水平位置 (X)" value={currentModelConfig.x} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('x', v)} />
                            <SettingSlider label="垂直位置 (Y)" value={currentModelConfig.y} min={-1500} max={1500} step={10} suffix="px" onChange={v => updateModelConfig('y', v)} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-3 border-b border-dashed border-[#e6d5b8] pb-2">
                            <h4 className="text-sm font-bold text-[#ba3f42]">DLC: 故事剧本立绘微调</h4>
                            <button onClick={() => handleEnterVisualAdjust('story_model')} className="flex items-center gap-1 px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={12}/> 预览调整</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SettingSlider label="立绘缩放" value={settings.storySpriteScale || 1.0} min={0.5} max={3.0} step={0.05} suffix="x" onChange={v => setSettings({...settings, storySpriteScale: v})} />
                            <SettingSlider label="水平偏移 (X)" value={settings.storySpriteX || 0} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, storySpriteX: v})} />
                            <SettingSlider label="立绘垂直 (Y)" value={settings.storySpriteY || 0} min={-1000} max={1000} step={10} suffix="px" onChange={v => setSettings({...settings, storySpriteY: v})} />
                        </div>
                    </div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>
               <SettingSectionTitle title="背景图管理" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
                      <label className="block font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 导入游戏内背景图 (支持多张)</label>
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
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-bold text-[#ba3f42]"><span className="text-sm">✱</span> 主标题界面背景图</label>
                        {/* ✨ 新增：背景偏移预览调整按钮 */}
                        {localTitleBgImage && <button onClick={() => handleEnterVisualAdjust('title_bg')} className="flex items-center gap-1 px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-[10px] font-bold rounded-full transition-colors shadow-sm"><Eye size={12}/> 预览调整偏移</button>}
                      </div>
                      <p className="text-xs text-[#7a6b5d] mb-4">设置启动软件时，主标题画面的专属背景图。</p>
                      <div className="flex flex-col gap-3">
                        <input type="file" accept="image/*" onChange={handleTitleBgUpload} className="block w-full text-sm text-[#7a6b5d] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#4fa0d8] file:text-white hover:file:bg-[#5db4f0] cursor-pointer"/>
                        
                        {localTitleBgImage && (
                          <div className="mt-4 border-t border-dashed border-[#e6d5b8] pt-4 space-y-4">
                            <button onClick={clearTitleBgImage} className="w-max px-4 py-1.5 bg-[#f5e6e6] hover:bg-[#eabfbf] text-[#ba3f42] rounded-full text-xs font-bold transition-colors shadow-sm">清除标题背景</button>
                          </div>
                       )}
                      </div>
                    </div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>
                  
                  {/* ✨ 新增：文字排版预览调整按钮 */}
                  <SettingSectionTitle title="主标题定制 (Title Screen)" extra={<button onClick={() => handleEnterVisualAdjust('title_text')} className="flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full transition-colors shadow-sm"><Eye size={14}/> 预览调整排版</button>} />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-[#4a4036] mb-3">主标题文案与排版</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-[#7a6b5d] mb-1 font-bold">文字内容</label>
                          <input type="text" value={settings.mainTitleText} onChange={e => setSettings({...settings, mainTitleText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm focus:border-[#ba3f42] outline-none shadow-inner" />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs text-[#7a6b5d] mb-1 font-bold">字体选择</label>
                            <select value={settings.mainTitleFont} onChange={e => setSettings({...settings, mainTitleFont: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-2 py-2 text-sm focus:border-[#ba3f42] outline-none shadow-inner">
                              <option value='"Microsoft YaHei", sans-serif'>默认黑体</option><option value='"SimSun", "Songti SC", serif'>经典宋体</option><option value='"KaiTi", "Kaiti SC", serif'>优雅楷体</option><option value='serif'>标准衬线 (Serif)</option>
                            </select>
                          </div>
                          <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">颜色</label><input type="color" value={settings.mainTitleColor} onChange={e => setSettings({...settings, mainTitleColor: e.target.value})} className="h-9 w-14 rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner block" /></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingSlider label="水平偏移 (X)" value={settings.mainTitleX} min={-800} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, mainTitleX: v})} />
                        <SettingSlider label="垂直偏移 (Y)" value={settings.mainTitleY} min={-500} max={500} step={10} suffix="px" onChange={v => setSettings({...settings, mainTitleY: v})} />
                      </div>
                    </div>
                    <div className="pt-6 border-t border-[#e6d5b8]">
                      <h4 className="text-sm font-bold text-[#4a4036] mb-3">副标题文案与排版</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-[#7a6b5d] mb-1 font-bold">文字内容</label>
                          <input type="text" value={settings.subTitleText} onChange={e => setSettings({...settings, subTitleText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm focus:border-[#ba3f42] outline-none shadow-inner" />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs text-[#7a6b5d] mb-1 font-bold">字体选择</label>
                            <select value={settings.subTitleFont} onChange={e => setSettings({...settings, subTitleFont: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-2 py-2 text-sm focus:border-[#ba3f42] outline-none shadow-inner">
                              <option value='"Microsoft YaHei", sans-serif'>默认黑体</option><option value='"SimSun", "Songti SC", serif'>经典宋体</option><option value='"KaiTi", "Kaiti SC", serif'>优雅楷体</option><option value='sans-serif'>现代无衬线</option>
                            </select>
                          </div>
                          <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">颜色</label><input type="color" value={settings.subTitleColor} onChange={e => setSettings({...settings, subTitleColor: e.target.value})} className="h-9 w-14 rounded cursor-pointer bg-white border border-[#d9c5b2] p-0.5 shadow-inner block" /></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingSlider label="水平偏移 (X)" value={settings.subTitleX} min={-800} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, subTitleX: v})} />
                        <SettingSlider label="垂直偏移 (Y)" value={settings.subTitleY} min={-500} max={500} step={10} suffix="px" onChange={v => setSettings({...settings, subTitleY: v})} />
                      </div>
                    </div>
                    <div className="pt-6 border-t border-[#e6d5b8]">
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="text-sm font-bold text-[#4a4036]">主标题 Live2D 模型排版</h4>
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
                  
                  <SettingSectionTitle title="快捷栏显示管理 (界面右下角)" />
                  <div className="bg-white/60 p-5 rounded-xl border border-[#e6d5b8] shadow-sm">
                     <p className="text-xs text-[#7a6b5d] mb-4">根据您的需求或屏幕大小，自由开启或隐藏游戏界面右下角的快捷按钮。隐藏不需要的按钮可以让沉浸感更强。</p>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {SHORTCUT_DEFS.map(def => (
                          <button 
                            key={def.id} 
                            onClick={() => setSettings(s => ({...s, shortcuts: {...s.shortcuts, [def.id]: !s.shortcuts[def.id]}}))} 
                            className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 
                              ${settings.shortcuts[def.id] ? 'bg-[#8fbf8f]/20 text-[#4a4036] border-[#8fbf8f]/50 shadow-inner' : 'bg-white/60 text-[#a89578] border-[#e6d5b8] hover:bg-white'}`}
                          >
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${settings.shortcuts[def.id] ? 'bg-[#ba3f42] shadow-[0_0_5px_rgba(186,63,66,0.6)]' : 'bg-[#d9c5b2]'}`}></div>
                            {def.label}
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

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
                    
                    {/* ✨ 新增：文本行距独立滑块 */}
                    <div className="md:col-span-2 pt-2 border-t border-dashed border-[#e6d5b8]">
                      <SettingSlider label="文本排版行距 (Line Height)" value={settings.dialogLineHeight || 1.8} min={1.0} max={3.0} step={0.1} suffix="倍" onChange={v => setSettings({...settings, dialogLineHeight: v})} />
                      <p className="text-xs text-[#7a6b5d] mt-2">控制每行文字之间的间距。较大的行距会带来更舒适的视觉小说阅读体验。</p>
                    </div>

                    <div className="md:col-span-2 pt-2 border-t border-dashed border-[#e6d5b8]">
                      <SettingSlider label="对话框/快捷栏 垂直位置偏移" value={settings.dialogPositionY} min={0} max={800} step={10} suffix="px" onChange={v => setSettings({...settings, dialogPositionY: v})} />
                      <p className="text-xs text-[#7a6b5d] mt-2">调整高度可避免文本框遮挡Live2D模型的重要部位。</p>
                    </div>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

                  <SettingSectionTitle title="主动搭话机制 (Proactive Chat)" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <SettingToggle label="开启大模型主动搭话" value={settings.enableProactiveChat} onChange={v => setSettings({...settings, enableProactiveChat: v})} />
                        <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed">开启后，若玩家长时间未发言，AI会在设定的时间范围内随机寻找时机主动开启新话题，打破沉默增强陪伴感。</p>
                      </div>
                      {settings.enableProactiveChat && (
                        <div className="flex-1 flex flex-col gap-4 justify-center border-t-2 md:border-t-0 md:border-l-2 border-dashed border-[#e6d5b8] pt-6 md:pt-0 md:pl-6">
                          <SettingSlider label="最小间隔时长" value={settings.proactiveMinInterval} min={1} max={60} step={1} suffix="分钟" onChange={v => setSettings({...settings, proactiveMinInterval: Math.min(v, settings.proactiveMaxInterval)})} />
                          <SettingSlider label="最大间隔时长" value={settings.proactiveMaxInterval} min={1} max={120} step={1} suffix="分钟" onChange={v => setSettings({...settings, proactiveMaxInterval: Math.max(v, settings.proactiveMinInterval)})} />
                        </div>
                      )}
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
                      
                      {/* ✨ 新增：排版与打字机效果实时预览框 */}
                      <div className="md:col-span-2 pt-6 border-t border-dashed border-[#e6d5b8]">
                         <label className="block text-sm font-bold text-[#ba3f42] mb-3 flex items-center gap-2"><Eye size={16}/> 动态排版与打字机效果预览</label>
                         <div className="p-6 rounded-xl bg-black/80 shadow-inner min-h-[160px] border-2 border-white/10 flex items-start overflow-hidden">
                            <TypewriterPreview 
                               speed={settings.workMode ? Math.max(5, settings.typingSpeed / 3) : settings.typingSpeed} 
                               text={"初次见面，请多关照！\n这将会是您在游戏内看到的实际文字排版效果。\n您可以自由调节上方的「文本行距」和「打字速度」，\n来找到最适合您的阅读节奏哦~"} 
                               textStyle={{ color: settings.dialogTextColor, fontFamily: settings.dialogFontFamily, lineHeight: settings.dialogLineHeight || 1.8, fontSize: '1.125rem', letterSpacing: '0.05em' }}
                            />
                         </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* 3. 声音设定 Tab */}
              {settingsTab === 'sound' && (
                <div className="space-y-8 animate-fade-in">
                  
                  <SettingSectionTitle title="主界面音乐组件设定" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <SettingToggle label="在主界面显示音乐播放器 (可拖拽)" value={settings.showTitleBgmPlayer} onChange={v => setSettings({...settings, showTitleBgmPlayer: v})} />
                    <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed">开启后，在游戏主标题界面的左下角会显示一个半透明的悬浮播放器组件。您可以在那里自由切歌、修改循环模式与拖拽移动它。</p>
                  </div>
                  <div className="border-b-2 border-dashed border-[#e6d5b8] my-6"></div>

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
                        <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> API URL 模板 (已支持并发流式切片推理)</label>
                        <input type="text" value={settings.ttsUrlTemplate} onChange={e => setSettings({...settings, ttsUrlTemplate: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner focus:border-[#ba3f42]" />
                        <div className="bg-[#fdfaf5] p-3 mt-2 rounded border border-[#e6d5b8] shadow-inner">
                          <p className="text-[11px] text-[#7a6b5d] font-bold mb-1"><AlertCircle size={12} className="inline mr-1 text-[#ba3f42]"/> 若报错 404 或 500 (text_lang为空)，请确保模板如下：</p>
                          <code className="text-[10px] text-blue-600 break-all select-all block bg-white p-1.5 rounded border border-[#d9c5b2] cursor-text">http://127.0.0.1:9880/tts?text={'{text}'}&text_lang={'{lang}'}&ref_audio_path={'{ref_audio}'}&prompt_text={'{ref_text}'}&prompt_lang={'{ref_lang}'}</code>
                        </div>
                      </div>
                      <div className="md:col-span-3 border-t border-dashed border-[#e6d5b8] pt-4">
                        <SettingSlider label="流式分句停顿时间 (句与句之间的间隔)" value={settings.ttsSentencePause} min={0} max={3000} step={10} suffix="ms" onChange={v => setSettings({...settings, ttsSentencePause: v})} />
                      </div>
                      <div className="md:col-span-3 pt-2">
                         <SettingToggle label="🚀 极速短标点切句预加载 (后台高并发消除延迟)" value={settings.ttsFastMode} onChange={v => setSettings({...settings, ttsFastMode: v})} />
                         <p className="text-xs text-[#7a6b5d] mt-2 leading-relaxed bg-[#fdfaf5] p-3 rounded-lg border border-[#e6d5b8]"><strong className="text-emerald-600">针对 GPT-SoVITS 的终极优化：</strong>开启后，大模型输出只要遇到逗号(,)或顿号(、)就会立刻放入后台并发 Fetch 队列进行推理预加载。即使上一句仍在播放，下一句也会在后台被GPU火速算出并存入内存，完全消除排队延迟。若您希望保持长段落推理的情感连贯，可关闭此项。</p>
                      </div>
                      <div className="md:col-span-3 border-t border-dashed border-[#e6d5b8] pt-6">
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                             <h4 className="text-sm font-bold text-[#4a4036] flex items-center gap-2"><Mic size={16} className="text-[#ba3f42]"/> 参考音频配置 (克隆/指定音色必填)</h4>
                             {/* ✨ 手机端/云端模式开关 */}
                             <SettingToggle label="📱 云端挂载模式 (手机端适配)" value={settings.ttsMobileMode} onChange={v => setSettings({...settings, ttsMobileMode: v})} />
                         </div>

                         {!settings.ttsMobileMode ? (
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                                 <div className="md:col-span-2"><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频路径/URL</label><input type="text" value={settings.ttsRefAudio} onChange={e => setSettings({...settings, ttsRefAudio: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner focus:border-[#ba3f42]" placeholder="如: D:\audio\ref.wav" /></div>
                                 <div><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频语种</label><select value={settings.ttsRefLang} onChange={e => setSettings({...settings, ttsRefLang: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-3 py-2 outline-none shadow-inner focus:border-[#ba3f42]"><option value="zh">中文 (zh)</option><option value="ja">日文 (ja)</option><option value="en">英文 (en)</option><option value="ko">韩文 (ko)</option></select></div>
                                 <div className="md:col-span-3"><label className="block text-xs text-[#7a6b5d] mb-1 font-bold">参考音频文本</label><input type="text" value={settings.ttsRefText} onChange={e => setSettings({...settings, ttsRefText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] rounded-md px-3 py-2 text-sm outline-none shadow-inner focus:border-[#ba3f42]" placeholder="参考音频里说的话..." /></div>
                             </div>
                         ) : (
                             <div className="bg-[#fdfaf5] p-5 rounded-xl border border-[#e6d5b8] shadow-inner flex items-start gap-4 animate-fade-in">
                                 <div className="bg-[#8fbf8f]/20 p-2 rounded-lg text-[#7ebd7e] shrink-0"><CheckCircle size={24}/></div>
                                 <div>
                                    <h5 className="font-bold text-[#4a4036] text-sm mb-1">云端模式已开启：本地参考选项已隐藏</h5>
                                    <p className="text-xs text-[#7a6b5d] leading-relaxed">
                                        系统已剥离客户端的参考音频参数。现在无论在手机还是局域网设备上，系统都会自动使用 <code className="bg-white px-1 py-0.5 rounded text-[#ba3f42] border border-[#e6d5b8]">start.py</code> 服务端里默认配置的参考音色。
                                    </p>
                                 </div>
                             </div>
                         )}
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
                    
                    {/* ✨ 重构：世界观设定的卡片库 */}
                    <div className="pt-6 border-t border-[#e6d5b8]">
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-bold text-[#ba3f42]">世界观与背景设定 (选填)</label>
                            <button onClick={saveWorldviewProfile} className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md"><Plus size={16} className="mr-1.5" /> 存为新预设</button>
                        </div>
                        <textarea value={settings.worldviewText || ''} onChange={e => setSettings({...settings, worldviewText: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] leading-relaxed rounded-md px-4 py-3 outline-none shadow-inner focus:border-[#ba3f42] min-h-[100px] mb-6" placeholder="在此处补充当前对话所处的世界观、背景故事、前置条件等... (将与人设一同作为系统提示词发送)" />
                        
                       <h4 className="text-sm font-bold text-[#ba3f42] mb-3">世界观预设库</h4>
                        {settings.worldviewProfiles?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto light-scrollbar pr-2">
                            {settings.worldviewProfiles.map(profile => (
                              <div key={profile.id} className="flex flex-col p-4 bg-white border-2 border-[#e6d5b8] rounded-xl hover:border-[#c44a4a] transition-colors shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-base font-black text-[#c44a4a] truncate">{profile.name}</span>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button onClick={() => applyWorldviewProfile(profile)} className="px-3 py-1 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-xs rounded-full transition-colors shadow-sm">切换加载</button>
                                    <button onClick={() => exportWorldviewProfile(profile)} className="p-1 text-[#f59e0b] hover:bg-[#fef3c7] rounded transition-colors" title="导出TXT"><Download size={16}/></button>
                                    <button onClick={() => renameWorldviewProfile(profile.id, profile.name)} className="p-1 text-[#4fa0d8] hover:bg-[#e0f2fe] rounded transition-colors" title="重命名"><Edit3 size={16}/></button>
                                    <button onClick={() => deleteWorldviewProfile(profile.id)} className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors" title="删除"><Trash2 size={16}/></button>
                                  </div>
                                </div>
                                <span className="text-[10px] text-[#a89578] truncate mt-1">{profile.text}</span>
                              </div>
                            ))}
                          </div>
                        ) : (<div className="text-center text-[#a89578] text-sm py-6 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">暂无世界观预设，请上方“存为新预设”。</div>)}
                    </div>
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
                  
                  {/* 当前工作区的配置输入 */}
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm space-y-6">
                    <div><label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 接口地址 (Base URL)</label><input type="text" value={settings.openaiBaseUrl} onChange={e => setSettings({...settings, openaiBaseUrl: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" /></div>
                    <div><label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> API Key</label><input type="password" value={settings.openaiApiKey} onChange={e => setSettings({...settings, openaiApiKey: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" /></div>
                    <div className="flex flex-col md:flex-row items-end gap-3">
                      <div className="flex-1 relative w-full">
                        <label className="block text-sm font-bold text-[#ba3f42] mb-2"><span className="text-sm">✱</span> 模型名称 (支持手动输入)</label>
                        <input type="text" list="model-suggestions" value={settings.aiModel} onChange={e => setSettings({...settings, aiModel: e.target.value})} className="w-full bg-white border border-[#d9c5b2] text-[#4a4036] font-bold rounded-md px-4 py-2 outline-none shadow-inner focus:border-[#ba3f42]" />
                        <datalist id="model-suggestions">{availableModels.map(m => <option key={m} value={m} />)}</datalist>
                      </div>
                      <button onClick={fetchOpenAIModels} disabled={isFetchingModels} className="bg-[#4fa0d8] hover:bg-[#5db4f0] disabled:opacity-50 text-white px-5 py-2 rounded-lg font-bold transition-colors flex items-center justify-center shadow-md h-[40px] w-full md:w-auto"><RefreshCw size={16} className={`mr-2 ${isFetchingModels ? "animate-spin" : ""}`} /> 探测模型</button>
                    </div>
                    <div className="pt-4 border-t border-dashed border-[#e6d5b8]">
                        <SettingSlider label="模型创造力 / 发散度 (Temperature)" value={settings.aiTemperature || 0.7} min={0.0} max={2.0} step={0.1} suffix="" onChange={v => setSettings({...settings, aiTemperature: v})} />
                        <p className="text-xs text-[#7a6b5d] mt-2">较低的值会让模型回答更严谨、稳定；较高的值会让模型更具创意、发散性。</p>
                    </div>
                    <div className="pt-4 border-t border-[#e6d5b8] flex justify-end">
                        <button onClick={saveApiProfile} className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center transition-colors shadow-md"><Plus size={16} className="mr-1.5" /> 存为新配置</button>
                    </div>
                  </div>
                  
                  {/* ✨ 重构：脱敏的安全配置卡片库 */}
                  <SettingSectionTitle title="模型接口配置库" />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
                    {settings.apiProfiles?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto light-scrollbar pr-2">
                        {settings.apiProfiles.map(profile => (
                          <div key={profile.id} className="flex flex-col p-4 bg-white border-2 border-[#e6d5b8] rounded-xl hover:border-[#4fa0d8] transition-colors shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-base font-black text-[#4fa0d8] truncate">{profile.name}</span>
                              <div className="flex gap-1.5 shrink-0">
                                <button onClick={() => applyApiProfile(profile)} className="px-3 py-1 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white font-bold text-xs rounded-full transition-colors shadow-sm">加载该配置</button>
                                <button onClick={() => renameApiProfile(profile.id, profile.name)} className="p-1 text-[#8fbf8f] hover:bg-[#eaf4ea] rounded transition-colors" title="重命名"><Edit3 size={16}/></button>
                                <button onClick={() => deleteApiProfile(profile.id)} className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors" title="删除"><Trash2 size={16}/></button>
                              </div>
                            </div>
                            <span className="text-xs text-[#7a6b5d] font-bold truncate mt-1">模型: <span className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{profile.model}</span></span>
                            <span className="text-[10px] text-[#a89578] truncate mt-1">创造力(Temp): {profile.temp || 0.7}</span>
                          </div>
                        ))}
                      </div>
                    ) : (<div className="text-center text-[#a89578] text-sm py-8 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">暂无保存的配置，请保存当前配置或新建。</div>)}
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

                 {/* ✨ 智能隐藏：仅当探测到镜像分身插件正在运行时，才渲染单体管理面板 */}
                  {isMirrorPluginLoaded && (
                    <>
                      <SettingSectionTitle title="当前系统镜像独立管理 (轻量级)" />
                      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm mb-6 animate-fade-in">
                        <p className="text-sm text-[#7a6b5d] font-bold mb-6 leading-relaxed">
                          仅对当前活跃的分身镜像（当前存档、专属媒体、聊天记录）进行独立操作。<br/>
                          <span className="text-xs text-indigo-600">✨ 智能映射：您可以将某一个分身的独立备份包，无缝导入并覆盖到另一个全新的分身中！</span>
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                          <button onClick={handleExportSingleBackup} className="flex-1 py-3 bg-[#60a5fa] hover:bg-[#3b82f6] text-white font-bold rounded-xl flex justify-center items-center transition-colors shadow-md">
                            <Download size={20} className="mr-2" /> 导出当前独立镜像
                          </button>
                          <label className="flex-1 py-3 bg-white hover:bg-[#f4ebdc] border border-[#d9c5b2] text-[#1e3a8a] font-bold rounded-xl flex justify-center items-center cursor-pointer transition-colors shadow-md">
                            <Upload size={20} className="mr-2 text-[#60a5fa]" /> 导入并覆盖当前
                            <input type="file" accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream,multipart/x-zip,*/*" hidden onChange={handleSmartImportBackup} />
                          </label>
                        </div>
                        <button onClick={handleClearCurrentMirror} className="w-full py-3 bg-transparent hover:bg-red-500/10 border-2 border-red-400 text-red-500 font-bold rounded-xl flex justify-center items-center transition-colors">
                          <Trash2 size={20} className="mr-2" /> 格式化抹除当前镜像数据
                        </button>
                      </div>
                    </>
                  )}

                  {/* ✨ 动态标题与文案：根据是否有分身系统来改变文案解释 */}
                  <SettingSectionTitle title={isMirrorPluginLoaded ? "全局防丢备份 (终极全量 ZIP)" : "全量数据防丢备份 (完整 ZIP 封包)"} />
                  <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
                    <p className="text-sm text-[#7a6b5d] font-bold mb-6 leading-relaxed">
                      {isMirrorPluginLoaded 
                        ? "将引擎底层的所有的多开分身、插件模组、Live2D模型、动态视频等一切内容，打包为一个史诗级的终极备份卷。" 
                        : "将所有设置、历史剧情、插件、Live2D模型、背景图及音乐打包为一个 ZIP 文件。已解除后缀拦截，深度兼容安卓套壳环境。"}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <button onClick={handleExportFullBackup} className="flex-1 py-4 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-lg rounded-xl flex justify-center items-center transition-colors shadow-lg border-2 border-white/50">
                        <Archive size={24} className="mr-2" /> {isMirrorPluginLoaded ? "导出全局数据卷 (.zip)" : "导出完整数据卷 (.zip)"}
                      </button>
                      <label className="flex-1 py-4 bg-white hover:bg-[#f4ebdc] border-2 border-[#d9c5b2] text-[#4a4036] font-bold text-lg rounded-xl flex justify-center items-center cursor-pointer transition-colors shadow-md">
                        <Database size={24} className="mr-2 text-[#ba3f42]" /> {isMirrorPluginLoaded ? "挂载全局卷并覆盖" : "挂载数据卷并恢复"}
                        <input type="file" accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream,multipart/x-zip,*/*" hidden onChange={handleSmartImportBackup} />
                      </label>
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
              
             {/* ✨ 7. 插件模组 Tab (新增) */}
              {settingsTab === 'mods' && (
                  <div className="space-y-8 animate-fade-in text-[#4a4036]">
                      <SettingSectionTitle title="第三方插件模组 (Mods) 管理" />
                      <div className="bg-white/60 p-6 rounded-xl border border-[#e6d5b8] shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                              <p className="text-sm text-[#7a6b5d] font-bold">导入 `.js` 插件以动态扩展核心功能或定制界面。<br/><span className="text-amber-600">⚠️ 提示：若安卓系统中文件变灰无法选择，请将其改名为 `.txt` 后缀再导入即可！</span></p>
                              <label className="px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md shrink-0">
                                  <Puzzle size={16} className="mr-1.5" /> 批量装载插件
                                  <input type="file" accept=".js,application/javascript,text/javascript,text/plain,*/*" multiple hidden onChange={handleModUpload} />
                              </label>
                          </div>
                          
                          {modsList.length > 0 ? (
                              <div className="space-y-3">
                                  {modsList.map(mod => (
                                      <div key={mod.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors shadow-sm ${mod.enabled ? 'bg-white border-[#8fbf8f]/50' : 'bg-[#e8decb]/30 border-transparent opacity-80'}`}>
                                          <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-inner ${mod.enabled ? 'bg-[#8fbf8f]' : 'bg-[#a89578]'}`}><Shield size={20}/></div>
                                              <div>
                                                  <h5 className="font-bold text-base text-[#ba3f42]">{mod.name}</h5>
                                                  <p className="text-[10px] text-[#7a6b5d] uppercase tracking-wider mt-0.5">Installed: {mod.installDate}</p>
                                              </div>
                                          </div>
                                          <div className="flex gap-2 shrink-0">
                                              <button onClick={() => toggleModEnabled(mod.id, mod.enabled)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm ${mod.enabled ? 'bg-[#e8decb] text-[#7a6b5d] hover:bg-[#d9c5b2]' : 'bg-[#4fa0d8] text-white hover:bg-[#5db4f0]'}`}>
                                                  {mod.enabled ? '暂时停用' : '启用插件'}
                                              </button>
                                              <button onClick={() => { if(window.confirm('彻底卸载此插件？')) removeMod(mod.id); }} className="px-3 py-1.5 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors shadow-sm">
                                                  <Trash2 size={14}/>
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center text-[#a89578] text-sm py-12 font-bold border-2 border-dashed border-[#e6d5b8] rounded-xl bg-white/40">
                                  暂无任何第三方插件，系统正在以纯净原版运行。
                              </div>
                          )}
                      </div>
                  </div>
              )}

               {/* ✨ 新增: 关于 (About) Tab */}
              {settingsTab === 'about' && (
                <div className="space-y-6 md:space-y-8 animate-fade-in p-2 md:p-4">
                  <h2 className="text-xl md:text-2xl font-black text-[#ba3f42] tracking-widest mb-6">关于 GWC</h2>
                  
                  <div className="bg-white rounded-2xl border border-[#e6d5b8] shadow-sm overflow-hidden p-6 md:p-8">
                    
                    {/* 开发者名单 */}
                    <div className="mb-10">
                      <h4 className="text-sm md:text-base font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
                        <User size={18} /> 开发者名单
                      </h4>
                      <div className="w-full text-xs md:text-sm text-[#4a4036]">
                        <div className="flex bg-[#fdfaf5] p-3 rounded-t-lg font-bold text-[#7a6b5d] border-b border-[#e6d5b8]">
                          <span className="w-12 md:w-16 text-center">序号</span>
                          <span className="w-24 md:w-48 px-2 md:px-4">开发者名称</span>
                          <span className="flex-1 text-right md:text-left">负责项目</span>
                        </div>
                        <div className="flex p-3 border-b border-dashed border-[#e6d5b8] items-center">
                          <span className="w-12 md:w-16 text-center font-bold text-[#ba3f42]">01</span>
                          <span className="w-24 md:w-48 px-2 md:px-4 font-bold text-[#4a4036]">【Qys】</span>
                          <span className="flex-1 text-[#7a6b5d] text-right md:text-left">【核心程序 / UI设计】</span>
                        </div>
                        <div className="flex p-3 border-b border-dashed border-[#e6d5b8] items-center">
                          <span className="w-12 md:w-16 text-center font-bold text-[#ba3f42]">02</span>
                          <span className="w-24 md:w-48 px-2 md:px-4 font-bold text-[#4a4036]">【Qys】</span>
                          <span className="flex-1 text-[#7a6b5d] text-right md:text-left">【Live2D 动效与面捕调试】</span>
                        </div>
                        <div className="flex p-3 items-center">
                          <span className="w-12 md:w-16 text-center font-bold text-[#ba3f42]">03</span>
                          <span className="w-24 md:w-48 px-2 md:px-4 font-bold text-[#4a4036]">【Gemini-3/3.1-Pro】</span>
                          <span className="flex-1 text-[#7a6b5d] text-right md:text-left">【海量Bug修复】</span>
                        </div>
                      </div>
                    </div>

                    {/* 特别鸣谢 */}
                    <div>
                      <h4 className="text-sm md:text-base font-bold text-[#ba3f42] mb-4 flex items-center gap-2">
                        <Sparkles size={18} /> 特别鸣谢
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        <span className="px-4 py-2 bg-[#fdfaf5] border border-[#e6d5b8] rounded-lg text-xs md:text-sm font-bold text-[#7a6b5d] shadow-sm">Gemini提供的强力辅助</span>
                        <span className="px-4 py-2 bg-[#fdfaf5] border border-[#e6d5b8] rounded-lg text-xs md:text-sm font-bold text-[#7a6b5d] shadow-sm">ATRI提供的灵感</span>
                        <span className="px-4 py-2 bg-[#fdfaf5] border border-[#e6d5b8] rounded-lg text-xs md:text-sm font-bold text-[#7a6b5d] shadow-sm">GPT-SoVITS项目提供的TTS支持</span>
                        <span className="px-4 py-2 bg-[#fdfaf5] border border-[#e6d5b8] rounded-lg text-xs md:text-sm font-bold text-[#7a6b5d] shadow-sm">前端开源社区的各类组件库</span>
                      </div>
                    </div>

                    <div className="text-center pt-6 mt-4 border-t-2 border-dashed border-[#e6d5b8] text-xs text-[#a89578] font-bold tracking-widest leading-relaxed">
                      GalGame Web Chat Engine Ver.3.50<br/>
                      Powered by React & Tailwind CSS
                    </div>
                  </div>

                </div>
              )}

            </div>
            {/* Footer 区域 移动端适配 */}
            <div className="h-auto md:h-16 bg-[#2c2b29] shrink-0 flex flex-col md:flex-row justify-between items-center p-3 md:px-8 border-t-[3px] border-[#ba3f42] gap-3 md:gap-0">
              <div className="hidden md:block text-white/30 text-[10px] font-black tracking-widest uppercase">GalGame Web Chat Settings</div>
              <div className="flex flex-wrap justify-center gap-2 md:gap-4 w-full md:w-auto">
                <button onClick={handleReturnToTitle} className="flex-1 md:flex-none justify-center bg-transparent hover:bg-white/10 text-white/80 border border-white/20 px-3 md:px-6 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm transition-colors flex items-center gap-1.5"><ArrowLeft size={14}/> 主界面</button>
                <button onClick={handleExitGame} className="flex-1 md:flex-none justify-center bg-transparent hover:bg-red-500/20 text-red-300 border border-red-500/30 px-3 md:px-6 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm transition-colors flex items-center gap-1.5 md:mr-4"><LogOut size={14}/> 退出</button>
                <button onClick={() => setIsSettingsOpen(false)} className="w-full md:w-auto bg-[#ba3f42] hover:bg-[#d64b4f] text-white px-6 md:px-10 py-2 md:py-2 rounded-full font-bold tracking-widest text-xs md:text-sm transition-all shadow-lg border border-[#e86b6e] hover:scale-105">保存并关闭</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
