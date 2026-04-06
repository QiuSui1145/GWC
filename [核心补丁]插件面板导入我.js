/**
 * 插件名称：GWC Core Engine Patch (V10.1 核心增强补丁)
 * 兼容版本：GWC v2.1.0+
 * 功能描述：
 * 1. 【新增】支持第三方插件模组 (Mods) 的批量多选导入与静默热重载。
 * 2. 【新增】双击屏幕空白处开启/关闭“沉浸模式”（隐藏对话框与UI，纯享Live2D）。
 * 3. 【新增】移动端虚拟键盘防遮挡自适应算法 (Visual Viewport)。
 * 4. 【修复】彻底修复 V10.0 中导致上传按钮变白且无法响应的多选失效 Bug。
 */

(function() {
    try {
        console.log("[GWC Core Patch V10.1] 核心补丁开始初始化...");

        const GWC = window.$GWC;
        if (!GWC) throw new Error("GWC API 未就绪");

        // ==========================================
        // 0. 史诗级修复：全局防爆存拦截器
        // ==========================================
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            try {
                originalSetItem.call(this, key, value);
            } catch (e) {
                if (e.name === 'QuotaExceededError' || e.message.includes('quota') || e.message.includes('exceeded')) {
                    console.warn(`[Core Patch] 写入 [${key}] 时触发 5MB 物理极限！执行紧急剥离...`);
                    try {
                        const obj = JSON.parse(value);
                        const prune = (o) => {
                            if (typeof o === 'string' && o.startsWith('data:')) return '[媒体过大，为防爆存断档已在本地截断]';
                            if (typeof o === 'string' && o.length > 200 * 1024) return o.substring(0, 1024) + '...[超长文本截断]';
                            if (Array.isArray(o)) return o.map(prune);
                            if (typeof o === 'object' && o !== null) {
                                const newObj = {};
                                for (const k in o) newObj[k] = prune(o[k]);
                                return newObj;
                            }
                            return o;
                        };
                        originalSetItem.call(this, key, JSON.stringify(prune(obj)));
                        if (GWC.showToast) GWC.showToast("⚠️ 内存已达物理上限！系统已自动剥离超大图片防丢档。", "error", 6000);
                    } catch (parseErr) {}
                } else { throw e; }
            }
        };

        const getDB = () => new Promise((resolve, reject) => {
            const request = indexedDB.open('Live2D_Local_Storage', 7);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });

        const saveToFallbackDB = async (key, data) => {
            const db = await getDB();
            return new Promise((resolve) => {
                const tx = db.transaction('app_settings', 'readwrite');
                tx.objectStore('app_settings').put(data, key);
                tx.oncomplete = resolve;
            });
        };

        const loadFromFallbackDB = async (key) => {
            const db = await getDB();
            return new Promise((resolve) => {
                const tx = db.transaction('app_settings', 'readonly');
                const req = tx.objectStore('app_settings').get(key);
                req.onsuccess = () => resolve(req.result);
            });
        };

        // ==========================================
        // 1. 容灾备份系统
        // ==========================================
        setInterval(async () => {
            const sessions = GWC.getSessions();
            if (sessions && sessions.length > 0 && sessions[0].messages.length > 0) {
                try {
                    const safeSessionStr = JSON.stringify(sessions, (k, v) => (typeof v === 'string' && v.startsWith('data:')) ? '[已剥离高清媒体]' : v);
                    await saveToFallbackDB('android_sessions_backup', safeSessionStr);
                } catch (e) {}
            }
        }, 10000);

        // ==========================================
        // 2. 离线引擎内联注入 + 智能多节点路由
        // ==========================================
        const originalAppend = document.head.appendChild;
        document.head.appendChild = function(child) {
            if (child && child.tagName === 'SCRIPT' && child.src) {
                const srcLower = child.src.toLowerCase();
                if (srcLower.includes('cubismcore') || srcLower.includes('eikanya') || srcLower.includes('guansss')) {
                    loadFromFallbackDB('offline_cubism_core_js').then(coreCode => {
                        if (coreCode) {
                            console.log("[Core Patch] 探明离线引擎，触发绝对穿透内联注入！");
                            const inlineScript = document.createElement('script');
                            inlineScript.textContent = coreCode;
                            originalAppend.call(document.head, inlineScript);
                            if (child.onload) child.onload(new Event('load'));
                        } else {
                            const mirrors = [
                                'https://fastly.jsdelivr.net/gh/guansss/pixi-live2d-display@master/test/assets/cubism4/core/live2dcubismcore.min.js',
                                'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display@master/test/assets/cubism4/core/live2dcubismcore.min.js',
                                'https://unpkg.com/live2d-cubism-core@4.2.2/live2dcubismcore.min.js'
                            ];
                            let attempt = 0;
                            const tryNextNode = () => {
                                if (attempt >= mirrors.length) {
                                    GWC.showToast("❌ 引擎连接失败！请刷新或导入离线引擎！", "error", 8000);
                                    if (child.onerror) child.onerror(new Event('error'));
                                    return;
                                }
                                const retryScript = document.createElement('script');
                                retryScript.src = mirrors[attempt];
                                retryScript.onload = (e) => {
                                    if (!window.Live2DCubismCore) { attempt++; tryNextNode(); } 
                                    else { if (child.onload) child.onload(e); }
                                };
                                retryScript.onerror = () => { attempt++; tryNextNode(); };
                                originalAppend.call(document.head, retryScript);
                            };
                            tryNextNode();
                        }
                    }).catch(e => { originalAppend.call(document.head, child); });
                    return child;
                }
            }
            return originalAppend.call(this, child);
        };

        // ==========================================
        // 3. UI 交互增强与视觉修复
        // ==========================================
        const injectStyles = () => {
            const style = document.createElement('style');
            style.innerHTML = `
                @media screen and (max-width: 768px) and (orientation: portrait) {
                    .fixed.inset-0 > div.w-\\[95\\%\\] { width: 100% !important; max-width: 100% !important; height: 100% !important; max-height: 100vh !important; border-radius: 0 !important; border: none !important; }
                    .flex.h-16.bg-\\[\\#efe6d5\\] { height: auto !important; min-height: 4rem; flex-wrap: wrap; }
                    .clip-polygon { display: none !important; }
                }
                .mod-btn-injected { animation: mod-fade-in 0.3s ease-out; white-space: nowrap !important; flex-shrink: 0 !important; }
                
                /* ✨ 双击沉浸模式过渡动画 */
                .ui-immersive-hide {
                    opacity: 0 !important;
                    pointer-events: none !important;
                    transform: translateY(20px) !important;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                .ui-immersive-show {
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                @keyframes mod-fade-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            `;
            document.head.appendChild(style);
        };

        // ✨ 虚拟键盘防遮挡 (Visual Viewport)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                document.body.style.height = window.visualViewport.height + 'px';
            });
        }

        // ✨ 双击沉浸模式逻辑
        let lastTapTime = 0;
        let isImmersive = false;
        
        const toggleImmersiveMode = () => {
            isImmersive = !isImmersive;
            const dialogBox = document.querySelector('.absolute.left-1\\/2.-translate-x-1\\/2');
            const shortcutBar = document.querySelector('.absolute.top-16.right-6');
            
            if (dialogBox) {
                if (isImmersive) {
                    dialogBox.classList.add('ui-immersive-hide');
                    if(shortcutBar) shortcutBar.classList.add('ui-immersive-hide');
                    GWC.showToast("🌟 已开启沉浸模式 (双击空白处恢复)", "info", 2000);
                } else {
                    dialogBox.classList.remove('ui-immersive-hide');
                    if(shortcutBar) shortcutBar.classList.remove('ui-immersive-hide');
                }
            }
        };

        const handleInteraction = (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.z-\\[9999\\]') || e.target.closest('.pointer-events-auto')) {
                return;
            }
            
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTapTime;
            if (tapLength < 300 && tapLength > 0) {
                toggleImmersiveMode();
                e.preventDefault();
            }
            lastTapTime = currentTime;
        };

        document.addEventListener('touchend', handleInteraction, { passive: false });
        document.addEventListener('dblclick', handleInteraction);

        // ==========================================
        // 4. ZIP 导入
        // ==========================================
        const handleZipUpload = async () => {
            const input = document.createElement('input'); input.type = 'file'; 
            input.accept = '.zip,application/zip,application/x-zip-compressed,*/*';
            input.onchange = async (e) => {
                const file = e.target.files[0]; if (!file) return;
                GWC.showToast("📦 正在解析并解压 ZIP 模型包...", "info", 8000);
                if (!window.JSZip) await new Promise(resolve => { const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; script.onload = resolve; document.head.appendChild(script); });
                try {
                    const zip = await JSZip.loadAsync(file); const files = []; let modelName = file.name.replace(/\.zip$/i, '').replace(/\.txt$/i, ''); 
                    const promises = [];
                    zip.forEach((relativePath, zipEntry) => {
                        if (!zipEntry.dir) promises.push(zipEntry.async("blob").then(blob => { files.push({ path: relativePath, blob: new File([blob], relativePath.split('/').pop(), { type: blob.type || 'application/octet-stream' }) }); }));
                    });
                    await Promise.all(promises);
                    if (!files.some(f => f.path.match(/\.model3?\.json$/i))) throw new Error("未找到 .model3.json");
                    const db = await getDB(); const tx = db.transaction('live2d_models', 'readwrite');
                    tx.objectStore('live2d_models').put({ id: Date.now().toString(), name: modelName + " (ZIP)", files: files });
                    tx.oncomplete = () => GWC.showToast(`🎉 模型 [${modelName}] 导入成功！刷新生效。`, "success", 5000);
                } catch (err) { GWC.showToast("ZIP 导入失败: " + err.message, "error"); }
            };
            input.click();
        };

        // ==========================================
        // 5. DOM 深度定制与劫持
        // ==========================================
        const injectUIComponents = () => {
            const observer = new MutationObserver(() => {
                
                const visualSectionTitle = Array.from(document.querySelectorAll('h3')).find(h => h.textContent && h.textContent.includes('Live2D 模型管理'));
                if (visualSectionTitle && !document.getElementById('mod-offline-engine-btn')) {
                    const engineBtn = document.createElement('button');
                    engineBtn.id = 'mod-offline-engine-btn';
                    engineBtn.className = 'mod-btn-injected flex items-center gap-1 px-4 py-1.5 bg-[#4fa0d8] hover:bg-[#5db4f0] text-white text-xs font-bold rounded-full shadow-sm ml-2';
                    engineBtn.innerHTML = '🔌 导入离线引擎';
                    engineBtn.onclick = () => {
                        const input = document.createElement('input'); input.type = 'file'; input.accept = '.js,application/javascript,text/javascript,text/plain,*/*';
                        input.onchange = async (e) => {
                            const file = e.target.files[0]; if (!file) return;
                            const text = await file.text();
                            if (text.includes('Live2D') || text.includes('Cubism')) {
                                await saveToFallbackDB('offline_cubism_core_js', text);
                                GWC.showToast("✅ 离线引擎核心已永久烧录！即将强制重启...", "success", 4000);
                                setTimeout(() => window.location.reload(), 2000);
                            } else { GWC.showToast("❌ 文件格式不符", "error"); }
                        };
                        input.click();
                    };
                    visualSectionTitle.parentElement.appendChild(engineBtn);

                    const fsBtn = document.createElement('button'); fsBtn.id = 'mod-fullscreen-btn';
                    fsBtn.className = 'mod-btn-injected flex items-center gap-1 px-4 py-1.5 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white text-xs font-bold rounded-full shadow-sm ml-2';
                    fsBtn.innerHTML = '🔲 全屏'; fsBtn.onclick = () => { document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.(); };
                    visualSectionTitle.parentElement.appendChild(fsBtn);
                }

                const modelLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent && l.textContent.includes('Live2D 模型库管理'));
                if (modelLabel && !document.getElementById('mod-zip-upload-btn')) {
                    const zipBtn = document.createElement('button'); zipBtn.id = 'mod-zip-upload-btn';
                    zipBtn.className = 'mod-btn-injected block w-full text-sm font-bold bg-[#c44a4a] text-white hover:bg-[#a63d3d] rounded-full py-2.5 px-4 mt-3 mb-2 shadow-md';
                    zipBtn.innerHTML = '📦 导入 ZIP 模型包 (安卓兼容)'; zipBtn.onclick = handleZipUpload;
                    const originalInput = modelLabel.parentElement.querySelector('input[type="file"]');
                    if (originalInput) originalInput.parentNode.insertBefore(zipBtn, originalInput.nextSibling);
                }

                // --- 3. ✨ 插件批量导入劫持 (V10.1 核心修复) ---
                const modLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent && (l.textContent.includes('导入 JS 插件') || l.textContent.includes('批量装载插件')));
                if (modLabel && !modLabel.dataset.modded) {
                    modLabel.dataset.modded = 'true';
                    
                    // 修复 1：使用原版的安全纯色类名，避免被 React Tailwind 编译器当成垃圾清理掉
                    modLabel.className = "px-4 py-2 bg-[#8fbf8f] hover:bg-[#7ebd7e] text-white font-bold text-sm rounded-full flex items-center cursor-pointer transition-colors shadow-md shrink-0 hover:scale-105";
                    
                    // 修复 2：写入文字前，先准备好包含所有属性的崭新 input
                    modLabel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M19.121 15.879A3 3 0 0 1 18 17v4H6v-4a3 3 0 0 1-1.121-1.121A3 3 0 0 1 4 13H2V7h2a3 3 0 0 1 1.121-1.121A3 3 0 0 1 6 4V0h12v4a3 3 0 0 1 1.121 1.121A3 3 0 0 1 20 7h2v6h-2a3 3 0 0 1-1.121 1.121z"></path></svg> 批量装载插件`;
                    
                    const newInput = document.createElement('input');
                    newInput.type = 'file';
                    newInput.multiple = true; // 开启多选
                    newInput.accept = '.js,application/javascript,text/javascript,text/plain,*/*';
                    newInput.hidden = true;
                    
                    newInput.onchange = async (e) => {
                        const files = Array.from(e.target.files);
                        if (!files.length) return;
                        
                        GWC.showToast(`📦 正在安全挂载 ${files.length} 个插件，请稍候...`, "info", 5000);
                        const db = await getDB();
                        let successCount = 0;

                        for (let file of files) {
                            try {
                                const text = await file.text();
                                const modItem = {
                                    id: Date.now().toString() + Math.random().toString().slice(2,6),
                                    name: file.name.replace(/\.txt$/i, '.js'),
                                    code: text,
                                    enabled: true,
                                    installDate: new Date().toLocaleString()
                                };
                                const tx = db.transaction('app_mods', 'readwrite');
                                await new Promise((resolve, reject) => {
                                    const req = tx.objectStore('app_mods').put(modItem);
                                    req.onsuccess = resolve; req.onerror = reject;
                                });
                                successCount++;
                            } catch(err) { console.error("插件导入失败:", file.name, err); }
                        }
                        
                        GWC.showToast(`✅ 成功将 ${successCount} 个插件烧录至系统！即将执行热重载...`, "success", 4000);
                        setTimeout(() => window.location.reload(), 2000);
                    };
                    
                    // 修复 3：将拥有完整事件绑定的新 input 强行塞回给 Label
                    modLabel.appendChild(newInput);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        };

        injectStyles();
        injectUIComponents();

        GWC.showToast("🚀 GWC Core Patch V10.1 已启动！\n支持插件批量装载、双击沉浸模式及虚拟键盘自适应。", "success", 6000);
    } catch (error) { console.error("[Core Patch] 加载失败:", error); }
})();
