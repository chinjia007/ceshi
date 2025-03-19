document.addEventListener('DOMContentLoaded', function() {
    // 初始化加载动画
    const loadingScreen = document.getElementById('loadingScreen');
    
    // 在页面加载完成后隐藏加载动画
    window.addEventListener('load', function() {
        setTimeout(function() {
            loadingScreen.classList.add('hidden');
            setTimeout(function() {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1500);
    });
    
    // 初始化像素猫
    initPixelCat();
    
    // 初始化页面布局控制
    initLayoutControls();
    
    // 初始化窗口控制
    initWindowControls();
    
    // 初始化工具选择器
    initToolSelectors();
    
    // 初始化缩放控制
    initZoomControls();
    
    // 设置默认工具
    initDefaultTools();
    
    // 初始化统一控制面板
    initUnifiedControls();
});

/**
 * 初始化工具选择器
 */
function initToolSelectors() {
    // 获取所有工具选择器
    const toolSelectors = document.querySelectorAll('.tool-dropdown');
    
    // 为每个选择器添加选择事件
    toolSelectors.forEach(selector => {
        console.log("找到工具选择器:", selector.id);
        selector.addEventListener('change', function() {
            const windowId = this.closest('.tool-selector').getAttribute('data-window') || 
                           'window' + this.id.replace('tool', '');
            console.log("选择工具，窗口ID:", windowId);
            const iframeId = 'iframe' + windowId.slice(-1);
            const iframe = document.getElementById(iframeId);
            const iframeContainer = iframe.closest('.iframe-container');
            const placeholder = document.getElementById(`placeholder${windowId.slice(-1)}`);
            const windowTitle = document.querySelector(`#${windowId} .window-title`);
            
            // 获取当前选中工具信息
            const selectedOption = this.options[this.selectedIndex];
            const selectedValue = selectedOption.value;
            
            if (selectedValue) {
                // 显示加载动画
                showToolLoading(true, windowId);
                
                console.log(`正在加载工具: ${selectedOption.textContent}, URL: ${selectedValue}`);
                
                // 清除可能的旧的超时处理器
                if (iframe._loadTimeoutId) {
                    clearTimeout(iframe._loadTimeoutId);
                }
                
                // 设置iframe的安全属性
                iframe.setAttribute('allow', 'fullscreen');
                iframe.setAttribute('referrerpolicy', 'no-referrer');
                
                // 本地文件不需要加sandbox属性，但外部页面可能需要
                if (!selectedValue.startsWith('http')) {
                    // 本地文件
                    iframe.removeAttribute('sandbox');
                } else {
                    // 外部URL，添加sandbox属性，但允许必要的权限
                    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
                }
                
                // 设置加载超时处理
                iframe._loadTimeoutId = setTimeout(() => {
                    // 如果30秒后还没有加载完成，认为加载失败
                    if (iframe.src === selectedValue) {
                        console.error(`加载工具超时: ${selectedOption.textContent}`);
                        showToolLoading(false);
                        
                        // 打开诊断模式，尝试重新加载
                        retryLoadTool(iframe, selectedOption, selectedValue, windowId, iframeContainer, placeholder);
                    }
                }, 30000);
                
                // 设置iframe的URL
                iframe.src = selectedValue;
                
                // 设置窗口标题
                windowTitle.textContent = selectedOption.textContent;
                
                // 在iframe加载完成后显示
                iframe.onload = function() {
                    // 清除加载超时处理器
                    if (iframe._loadTimeoutId) {
                        clearTimeout(iframe._loadTimeoutId);
                    }
                    
                    console.log(`工具 ${selectedOption.textContent} 加载完成`);
                    
                    // 隐藏加载动画
                    showToolLoading(false);
                    
                    // 显示iframe，隐藏占位符
                    iframeContainer.style.display = 'block';
                    iframe.style.display = 'block';
                    placeholder.style.display = 'none';
                    
                    // 启用窗口控制按钮
                    const controlButtons = document.querySelectorAll(`#${windowId} .window-controls button`);
                    controlButtons.forEach(button => {
                        button.disabled = false;
                    });
                    
                    // 应用缩放
                    applyZoom(windowId.slice(-1));
                    
                    // 尝试与iframe通信
                    try {
                        iframe.contentWindow.postMessage({ type: 'hello' }, '*');
                    } catch (e) {
                        console.log('无法与iframe通信，可能是跨域限制');
                    }
                };
                
                // 添加错误处理
                iframe.onerror = function(e) {
                    // 清除加载超时处理器
                    if (iframe._loadTimeoutId) {
                        clearTimeout(iframe._loadTimeoutId);
                    }
                    
                    console.error(`工具 ${selectedOption.textContent} 加载失败`, e);
                    showToolLoading(false);
                    
                    // 尝试重新加载
                    retryLoadTool(iframe, selectedOption, selectedValue, windowId, iframeContainer, placeholder);
                };
            } else {
                // 如果没有选择工具，隐藏iframe，显示占位符
                iframe.src = '';
                iframeContainer.style.display = 'none';
                iframe.style.display = 'none';
                placeholder.style.display = 'flex';
                windowTitle.textContent = '窗口 ' + windowId.slice(-1);
                
                // 禁用窗口控制按钮，但保持刷新按钮禁用
                const controlButtons = document.querySelectorAll(`#${windowId} .window-controls button`);
                controlButtons.forEach(button => {
                    if (!button.classList.contains('close-button')) {
                        // 刷新按钮在没有加载工具时应该被禁用
                        if (button.classList.contains('refresh-btn')) {
                            button.disabled = true;
                        }
                        // 其他按钮按原逻辑处理
                        else {
                            button.disabled = true;
                        }
                    }
                });
            }
        });
    });
}

/**
 * 尝试重新加载工具
 */
function retryLoadTool(iframe, selectedOption, selectedValue, windowId, iframeContainer, placeholder) {
    const diagnosisDiv = document.createElement('div');
    diagnosisDiv.className = 'load-diagnosis';
    diagnosisDiv.innerHTML = `
        <h3>加载 ${selectedOption.textContent} 失败</h3>
        <p>URL: ${selectedValue}</p>
        <p>可能的原因:</p>
        <ul>
            <li>网络连接问题</li>
            <li>目标网站不允许在iframe中显示（X-Frame-Options）</li>
            <li>目标网站访问限制</li>
            <li>浏览器安全策略阻止</li>
        </ul>
        <p>操作:</p>
        <button id="retry-btn-${windowId}" class="retry-button">重试</button>
        <button id="open-new-tab-${windowId}" class="new-tab-button">在新标签页打开</button>
    `;
    
    // 显示诊断界面
    placeholder.innerHTML = '';
    placeholder.appendChild(diagnosisDiv);
    placeholder.style.display = 'flex';
    iframeContainer.style.display = 'none';
    
    // 绑定重试按钮事件
    document.getElementById(`retry-btn-${windowId}`).addEventListener('click', function() {
        showToolLoading(true, windowId);
        iframe.src = selectedValue;
    });
    
    // 绑定在新标签页打开按钮事件
    document.getElementById(`open-new-tab-${windowId}`).addEventListener('click', function() {
        window.open(selectedValue, '_blank');
    });
}

/**
 * 工具窗口加载状态控制
 */
function showToolLoading(show, windowId) {
    const toolLoading = document.getElementById('toolLoading');
    
    if (!toolLoading) {
        console.error("找不到主加载动画元素!");
        return;
    }
    
    // 获取窗口ID但不再使用特定窗口的加载器
    let windowNumber = null;
    if (windowId) {
        windowNumber = windowId.slice(-1);
        console.log(`显示加载动画: ${show}, 窗口ID: ${windowId}`);
    }
    
    // 重置所有加载动画元素的函数 - 只保留主加载动画
    function resetAllLoaders() {
        // 首先清除所有现有的猫爪容器，确保不会叠加
        const allPawsContainers = document.querySelectorAll('.cat-paws-container');
        allPawsContainers.forEach(container => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        // 重置主加载动画
        if (toolLoading) {
            // 创建新的猫爪容器
            const newPawsContainer = document.createElement('div');
            newPawsContainer.className = 'cat-paws-container';
            
            // 添加3个猫爪
            for (let i = 0; i < 3; i++) {
                const classes = ['paw-left', 'paw-center', 'paw-right'][i];
                const paw = document.createElement('div');
                paw.className = `cat-paw ${classes}`;
                
                // 添加爪子内部元素
                paw.innerHTML = `
                    <div class="paw-claw"></div>
                    <div class="paw-pad"></div>
                    <div class="paw-dot dot1"></div>
                    <div class="paw-dot dot2"></div>
                    <div class="paw-dot dot3"></div>
                    <div class="paw-dot dot4"></div>
                `;
                
                newPawsContainer.appendChild(paw);
            }
            
            // 添加到主容器（在加载文本前添加）
            const loadingText = toolLoading.querySelector('.loading-text');
            if (loadingText) {
                toolLoading.insertBefore(newPawsContainer, loadingText);
            } else {
                toolLoading.appendChild(newPawsContainer);
            }
        }
        
        // 不再重置小窗口加载器，我们不使用它们了
    }
    
    if (show) {
        // 重置所有加载动画元素 - 在显示之前先清除所有旧动画
        resetAllLoaders();
        
        // 显示主加载动画
        toolLoading.classList.remove('hidden');
        toolLoading.style.display = 'flex';
        
        // 如果提供了窗口ID，将加载动画移动到对应窗口
        if (windowId) {
            const windowElement = document.getElementById(windowId);
            if (windowElement) {
                const windowRect = windowElement.getBoundingClientRect();
                toolLoading.style.top = windowRect.top + 'px';
                toolLoading.style.left = windowRect.left + 'px';
                toolLoading.style.width = windowRect.width + 'px';
                toolLoading.style.height = windowRect.height + 'px';
                
                // 不再显示特定窗口的加载动画
            }
        }
    } else {
        // 隐藏主加载动画
        toolLoading.classList.add('hidden');
        
        // 在动画结束后彻底隐藏并清理加载器元素
        setTimeout(() => {
            if (toolLoading.classList.contains('hidden')) {
                toolLoading.style.display = 'none';
                
                // 清理加载动画元素，避免堆积
                const mainPawsContainer = toolLoading.querySelector('.cat-paws-container');
                if (mainPawsContainer) {
                    mainPawsContainer.remove();
                }
            }
        }, 500); // 等待过渡动画完成
        
        // 隐藏动画后再次清理所有可能的残留元素
        setTimeout(() => {
            // 再次清理确保没有残留元素
            const allPawsContainers = document.querySelectorAll('.cat-paws-container');
            allPawsContainers.forEach(container => {
                if (container && container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            });
        }, 600);
    }
}

/**
 * 初始化像素猫
 */
function initPixelCat() {
    const pixelCat = {
        element: document.getElementById('pixelCat'),
        catEl: document.querySelector('.pixel-cat'),
        position: -80,
        direction: 1, // 1为向右，-1为向左
        speed: 2,
        isRunning: true,
        windowWidth: window.innerWidth,
        actionTimeout: null,
        bubbleTimeout: null,
        mouseInteractionTimeout: null, // 新增：鼠标交互的冷却时间
        
        // 猫咪的所有可能状态
        states: [
            'sitting', 'licking', 'sleeping', 'happy', 'excited', 
            'curious', 'playing', 'running'
        ],
        
        // 猫咪可能的对话内容
        messages: [
            '喵~', '我好可爱！', '摸摸我呀！', '喵喵喵~', 
            '好困喵...', '我要去抓老鼠啦！', '快夸我可爱！',
            '厉害！', '好厉害！', '真聪明！',
            '咕噜咕噜~', '我想玩毛线球...', '蝴蝶结好看吗？', 
            '喵星人最可爱！', '点我有惊喜哦！', '今天天气真好~',
            '别工作太累了，休息一下~', '工作效率UP↑', 
            '我会保护屏幕的！', '提前祝你周末愉快！',
            '我悄悄告诉你一个秘密...', '(‾◡◝)', '(｡･ω･｡)',
            '(=^･ω･^=)', '(≧▽≦)', '(´･ω･`)', 'ฅ՞•ﻌ•՞ฅ',
            '喵喵喵~！', '抱抱~', '小鱼干好好吃！', '阳光真温暖~',
            '你真棒！', '加油哦！', '喵~开心！', '喵~舒服~',
            '喵~漂亮！', '你真厉害！', '你超棒的！', '喵~加油！',
            '喜欢我吗？', '喵~很可爱吧！', '喵~！', '看我可爱吗？',
            '(づ￣ 3￣)づ', '(๑•̀ㅂ•́)و✧', '٩(๑❛ᴗ❛๑)۶', '(｡◕‿◕｡)', 
            'ヾ(•ω•`)o', '(っ•̀ω•́)っ✎⁾⁾', '૮₍ ˶ᵔ ᵕ ᵔ˶ ₎ა', '( •̀ ω •́ )✧',
            
            // 新增可爱的猫咪表达
            '喵星人出动！', '主人抱抱~', '今天天气真适合睡觉喵~', '毛茸茸的尾巴~',
            '喵呜~肚子饿了', '我是最可爱的猫咪！', '猫爪子软软的~', '舔舔毛毛~',
            
            // 新增颜文字表情
            '(๑ᵔ ᵕ ᵔ๑)', '(=^-ω-^=)', 'ฅ^•ﻌ•^ฅ', '(ฅ\'ω\'ฅ)', 
            'ʕ•ᴥ•ʔ', '₍˄·͈༝·͈˄₎ฅ˒˒', '(◕ᴗ◕✿)', '(„• ֊ •„)',
            
            // 新增夸人的话
            '你最好啦！', '谢谢你的关心~', '你今天也很棒哦！', '你是我的最爱~',
            '被你发现了真开心！', '有你在真好~', '我们做个朋友吧！', '你真的好温柔~',
            
            // 新增卖萌短语
            '想被摸摸头...', '可以给我小零食吗？', '陪我玩一会儿嘛~', '我可乖了~',
            '我最喜欢你了~', '喵喵喵三连！', '来抱抱我吧~', '眨巴眨巴眼睛~',
            
            // 新增监督学习语句
            '我是学习监督官', '你好好学习了没', '不准偷懒哦', 
            '好好学习，才是好喵', '你多学一点，我给你学猫叫', 
            '你信不信我可以学狗叫：汪'
        ],
        
        // 新增鼠标碰触时的特殊对话 - 更萌更可爱
        mouseInteractionMessages: [
            '你碰到我啦！','你碰我干嘛啦~','呜喵？被发现了~',
            '嘿嘿，我在这里！','不要逗我啦~','你的鼠标好痒痒哦~',
            '被抓住尾巴啦！','喵呜~被撞到了','被你发现藏猫猫啦~',
            '别碰我的小爪爪~','咦？你看到我啦？','喵喵喵？被发现了~',
            '干嘛戳我呀~','我超凶的哦！喵~','被摸到小尾巴了~好害羞',
            '啊哦~被抓到啦','喵星人警告⚠️','肚肚不要碰~会咬人的喵',
            '我躲不掉你的鼠标呢~','偷偷摸猫被发现了','唔~好痒痒呀',
            '喵喵？你想跟我玩吗？','主人主人~抱抱我~','想吃小鱼干~喵呜~',
            '你好呀~我是小喵喵','揉揉我的小脑袋吧~','喵喵~别跟着我啦~',
            '呜呜~被捉到了','嘿嘿~你好呀','喵喵教你写代码吧~',
            '喵星人万岁！','不小心被你发现了呢~'
        ],
        
        // 点击次数计数
        clickCount: 0,
        
        init: function() {
            // 应用正确的CSS样式
            this.applyCatStyles();
            
            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                this.windowWidth = window.innerWidth;
            });
            
            // 开始动画
            this.startAnimation();
            
            // 监听点击事件
            this.element.addEventListener('click', () => {
                // 增加点击计数
                this.clickCount++;
                
                // 根据点击次数执行不同操作
                if (this.clickCount % 10 === 0) {
                    // 每10次点击执行特殊动作
                    this.doSpecialAction();
                } else {
                    // 普通点击显示消息
                    this.showRandomMessage();
                    
                    // 随机播放喵喵声
                    if (Math.random() < 0.3) {
                        this.playMeow();
                    }
                }
                
                // 如果正在移动，50%的几率停下来做动作
                if (this.isRunning && Math.random() < 0.5) {
                    this.stopAndDoAction();
                }
            });
            
            // 新增：监听鼠标移动事件，检测与猫咪的碰触
            document.addEventListener('mousemove', (e) => {
                this.checkMouseInteraction(e);
            });
        },
        
        // 新增：检测鼠标与猫咪的碰触
        checkMouseInteraction: function(e) {
            // 如果已经在交互冷却中，则跳过
            if (this.mouseInteractionTimeout) {
                return;
            }
            
            // 获取猫咪元素的位置和尺寸
            const catRect = this.element.getBoundingClientRect();
            
            // 判断鼠标是否在猫咪元素区域内
            if (
                e.clientX >= catRect.left && 
                e.clientX <= catRect.right && 
                e.clientY >= catRect.top && 
                e.clientY <= catRect.bottom
            ) {
                // 从特殊的鼠标交互消息中随机选择一条
                const message = this.mouseInteractionMessages[
                    Math.floor(Math.random() * this.mouseInteractionMessages.length)
                ];
                
                // 显示消息
                this.showMessage(message);
                
                // 50%的几率停下来做动作
                if (this.isRunning && Math.random() < 0.5) {
                    this.stopAndDoAction();
                }
                
                // 设置交互冷却，2秒内不再响应鼠标碰触
                this.mouseInteractionTimeout = setTimeout(() => {
                    this.mouseInteractionTimeout = null;
                }, 2000);
            }
        },
        
        // 确保像素猫样式正确应用
        applyCatStyles: function() {
            // 设置像素猫容器样式
            this.element.style.position = 'fixed';
            this.element.style.bottom = '15px';
            this.element.style.left = '-80px';
            this.element.style.width = '70px';
            this.element.style.height = '60px';
            this.element.style.zIndex = '9998';
            this.element.style.pointerEvents = 'auto';
            this.element.style.transform = 'scale(1.2)';
            this.element.style.filter = 'drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2))';
            this.element.style.cursor = 'pointer';
            this.element.style.imageRendering = 'pixelated';
            this.element.style.display = 'none'; // 初始隐藏
            
            // 应用猫身体样式
            const catBody = this.element.querySelector('.cat-body');
            if (catBody) {
                catBody.style.width = '32px';
                catBody.style.height = '20px';
                catBody.style.backgroundColor = '#e74c3c';
                catBody.style.position = 'absolute';
                catBody.style.bottom = '12px';
                catBody.style.left = '9px';
                catBody.style.borderRadius = '0';
                catBody.style.zIndex = '1';
            }
            
            // 应用猫头样式
            const catHead = this.element.querySelector('.cat-head');
            if (catHead) {
                catHead.style.width = '28px';
                catHead.style.height = '24px';
                catHead.style.backgroundColor = '#e74c3c';
                catHead.style.position = 'absolute';
                catHead.style.top = '8px';
                catHead.style.left = '24px';
                catHead.style.borderRadius = '0';
                catHead.style.zIndex = '2';
            }
            
            // 应用猫眼样式
            const catEyes = this.element.querySelectorAll('.cat-eye');
            catEyes.forEach(eye => {
                eye.style.width = '4px';
                eye.style.height = '4px';
                eye.style.backgroundColor = '#000';
                eye.style.position = 'absolute';
                eye.style.top = '10px';
                eye.style.borderRadius = '0';
            });
            
            // 应用左右眼位置
            const leftEye = this.element.querySelector('.cat-eye.left');
            const rightEye = this.element.querySelector('.cat-eye.right');
            if (leftEye) leftEye.style.left = '6px';
            if (rightEye) rightEye.style.right = '6px';
            
            // 应用猫耳样式
            const catEars = this.element.querySelectorAll('.cat-ear');
            catEars.forEach(ear => {
                ear.style.width = '12px';
                ear.style.height = '18px'; // 增加高度使耳朵更长
                ear.style.backgroundColor = '#000'; // 黑色耳朵更明显
                ear.style.position = 'absolute';
                ear.style.top = '-18px'; // 调整位置使耳朵更明显
                ear.style.zIndex = '1';
            });
            
            // 应用左右耳朵位置和形状
            const leftEar = this.element.querySelector('.cat-ear.left');
            const rightEar = this.element.querySelector('.cat-ear.right');
            const leftInnerEar = this.element.querySelector('.cat-inner-ear.left');
            const rightInnerEar = this.element.querySelector('.cat-inner-ear.right');
            
            if (leftEar) {
                leftEar.style.width = '12px';
                leftEar.style.height = '18px';
                leftEar.style.top = '-18px';
                leftEar.style.left = '3px';
                leftEar.style.backgroundColor = '#000';
                leftEar.style.clipPath = 'polygon(0 100%, 100% 100%, 50% 0)';
                leftEar.style.transform = 'rotate(-10deg)';
            }
            
            if (rightEar) {
                rightEar.style.width = '12px';
                rightEar.style.height = '18px';
                rightEar.style.top = '-18px';
                rightEar.style.right = '3px';
                rightEar.style.backgroundColor = '#000';
                rightEar.style.clipPath = 'polygon(0 100%, 100% 100%, 50% 0)';
                rightEar.style.transform = 'rotate(10deg)';
            }
            
            if (leftInnerEar) {
                leftInnerEar.style.width = '6px';
                leftInnerEar.style.height = '10px';
                leftInnerEar.style.top = '3px';
                leftInnerEar.style.left = '3px';
                leftInnerEar.style.backgroundColor = '#ff9999';
                leftInnerEar.style.clipPath = 'polygon(0 100%, 100% 100%, 50% 0)';
            }
            
            if (rightInnerEar) {
                rightInnerEar.style.width = '6px';
                rightInnerEar.style.height = '10px';
                rightInnerEar.style.top = '3px';
                rightInnerEar.style.left = '3px';
                rightInnerEar.style.backgroundColor = '#ff9999';
                rightInnerEar.style.clipPath = 'polygon(0 100%, 100% 100%, 50% 0)';
            }
            
            // 应用猫鼻子样式
            const catNose = this.element.querySelector('.cat-nose');
            if (catNose) {
                catNose.style.width = '4px';
                catNose.style.height = '4px';
                catNose.style.backgroundColor = '#222';
                catNose.style.position = 'absolute';
                catNose.style.top = '15px';
                catNose.style.left = '50%';
                catNose.style.transform = 'translateX(-50%)';
                catNose.style.borderRadius = '0';
            }
            
            // 应用猫嘴样式
            const catMouth = this.element.querySelector('.cat-mouth');
            if (catMouth) {
                catMouth.style.width = '8px';
                catMouth.style.height = '2px';
                catMouth.style.borderBottom = '2px solid #222';
                catMouth.style.position = 'absolute';
                catMouth.style.top = '19px';
                catMouth.style.left = '50%';
                catMouth.style.transform = 'translateX(-50%)';
                catMouth.style.borderRadius = '0';
            }
            
            // 应用猫腿样式
            const catLegs = this.element.querySelectorAll('.cat-leg');
            catLegs.forEach(leg => {
                leg.style.width = '6px';
                leg.style.height = '10px';
                leg.style.backgroundColor = '#e74c3c';
                leg.style.position = 'absolute';
                leg.style.bottom = '2px';
                leg.style.zIndex = '2';
                leg.style.borderRadius = '0';
            });
            
            // 设置各腿位置
            const frontLeft = this.element.querySelector('.cat-leg.front-left');
            const frontRight = this.element.querySelector('.cat-leg.front-right');
            const backLeft = this.element.querySelector('.cat-leg.back-left');
            const backRight = this.element.querySelector('.cat-leg.back-right');
            
            if (frontLeft) frontLeft.style.left = '15px';
            if (frontRight) frontRight.style.left = '25px';
            if (backLeft) backLeft.style.left = '32px';
            if (backRight) backRight.style.left = '42px';
            
            // 应用猫尾巴样式
            const catTail = this.element.querySelector('.cat-tail');
            if (catTail) {
                catTail.style.position = 'absolute';
                catTail.style.bottom = '20px';
                catTail.style.left = '-16px';
                catTail.style.zIndex = '0';
                catTail.style.transformOrigin = 'right center';
                
                // 添加尾巴前部
                if (!catTail.querySelector('.tail-before')) {
                    const tailBefore = document.createElement('div');
                    tailBefore.className = 'tail-before';
                    tailBefore.style.content = '';
                    tailBefore.style.position = 'absolute';
                    tailBefore.style.width = '12px';
                    tailBefore.style.height = '6px';
                    tailBefore.style.backgroundColor = '#e74c3c';
                    tailBefore.style.left = '8px';
                    tailBefore.style.top = '0';
                    tailBefore.style.zIndex = '0';
                    catTail.appendChild(tailBefore);
                }
                
                // 添加尾巴后部
                if (!catTail.querySelector('.tail-after')) {
                    const tailAfter = document.createElement('div');
                    tailAfter.className = 'tail-after';
                    tailAfter.style.content = '';
                    tailAfter.style.position = 'absolute';
                    tailAfter.style.width = '8px';
                    tailAfter.style.height = '6px';
                    tailAfter.style.backgroundColor = '#e74c3c';
                    tailAfter.style.left = '0';
                    tailAfter.style.top = '-6px';
                    tailAfter.style.zIndex = '0';
                    catTail.appendChild(tailAfter);
                }
            }
            
            // 应用猫胡须样式
            const catWhiskers = this.element.querySelectorAll('.cat-whisker');
            catWhiskers.forEach(whisker => {
                whisker.style.position = 'absolute';
                whisker.style.height = '2px';
                whisker.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                whisker.style.top = '15px';
                whisker.style.zIndex = '3';
            });
            
            // 设置各胡须位置
            const whiskerLeftTop = this.element.querySelector('.cat-whisker.left-top');
            const whiskerLeftBottom = this.element.querySelector('.cat-whisker.left-bottom');
            const whiskerRightTop = this.element.querySelector('.cat-whisker.right-top');
            const whiskerRightBottom = this.element.querySelector('.cat-whisker.right-bottom');
            
            if (whiskerLeftTop) {
                whiskerLeftTop.style.width = '6px';
                whiskerLeftTop.style.left = '-4px';
            }
            
            if (whiskerLeftBottom) {
                whiskerLeftBottom.style.width = '4px';
                whiskerLeftBottom.style.left = '-2px';
                whiskerLeftBottom.style.top = '18px';
            }
            
            if (whiskerRightTop) {
                whiskerRightTop.style.width = '6px';
                whiskerRightTop.style.right = '-4px';
            }
            
            if (whiskerRightBottom) {
                whiskerRightBottom.style.width = '4px';
                whiskerRightBottom.style.right = '-2px';
                whiskerRightBottom.style.top = '18px';
            }
            
            // 设置猫舌头样式
            const catTongue = this.element.querySelector('.cat-tongue');
            if (catTongue) {
                catTongue.style.width = '4px';
                catTongue.style.height = '2px';
                catTongue.style.backgroundColor = '#ff6b81';
                catTongue.style.position = 'absolute';
                catTongue.style.top = '21px';
                catTongue.style.left = '12px';
                catTongue.style.borderRadius = '0';
                catTongue.style.opacity = '0';
            }
            
            // 设置高亮样式
            const catHighlight = this.element.querySelector('.cat-highlight');
            if (catHighlight) {
                catHighlight.style.position = 'absolute';
                catHighlight.style.width = '4px';
                catHighlight.style.height = '4px';
                catHighlight.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                catHighlight.style.top = '6px';
                catHighlight.style.left = '6px';
                catHighlight.style.zIndex = '4';
                catHighlight.style.borderRadius = '0';
            }
            
            // 添加气泡样式
            this.addBubbleStyle();
            
            // 添加动画关键帧
            this.addAnimationKeyframes();
            
            // 设置初始状态为跑步
            this.catEl.classList.add('running');
        },
        
        // 添加气泡样式
        addBubbleStyle: function() {
            // 获取或创建气泡样式
            let bubbleStyle = document.getElementById('cat-bubble-style');
            if (!bubbleStyle) {
                bubbleStyle = document.createElement('style');
                bubbleStyle.id = 'cat-bubble-style';
                
                bubbleStyle.textContent = `
                    .cat-bubble {
                        position: absolute;
                        top: -35px;
                        left: 15px;
                        background: white;
                        border-radius: 0;
                        padding: 4px;
                        font-size: 10px;
                        opacity: 0;
                        transition: none;
                        pointer-events: none;
                        box-shadow: 2px 0 0 rgba(0,0,0,0.5), 
                                    0 2px 0 rgba(0,0,0,0.5), 
                                    2px 2px 0 rgba(0,0,0,0.5);
                        max-width: 80px;
                        text-align: center;
                        line-height: 1.2;
                        z-index: 9999;
                        font-family: 'Courier New', monospace;
                        image-rendering: pixelated;
                    }
                    
                    .cat-bubble:after {
                        content: '';
                        position: absolute;
                        bottom: -6px;
                        left: 8px;
                        width: 8px;
                        height: 6px;
                        background-color: white;
                        clip-path: polygon(0 0, 100% 0, 50% 100%);
                    }
                    
                    .cat-bubble.visible {
                        opacity: 1;
                    }
                    
                    /* 当猫咪朝左时的气泡位置 */
                    .pixel-cat-container.left-facing .cat-bubble {
                        left: auto;
                        right: 15px;
                        transform: scaleX(-1);
                    }
                    
                    /* 当猫咪朝左时的气泡内容 */
                    .pixel-cat-container.left-facing .cat-bubble span {
                        display: inline-block;
                        transform: scaleX(-1);
                    }
                    
                    /* 当猫咪朝左时的气泡箭头位置 */
                    .pixel-cat-container.left-facing .cat-bubble:after {
                        left: auto;
                        right: 8px;
                    }
                `;
                
                document.head.appendChild(bubbleStyle);
            }
        },
        
        startAnimation: function() {
            this.animationFrame = requestAnimationFrame(this.update.bind(this));
        },
        
        update: function() {
            // 如果正在跑动
            if (this.isRunning) {
                // 更新位置
                this.position += this.speed * this.direction;
                
                // 检查是否需要改变方向
                if (this.direction > 0 && this.position > this.windowWidth - 80) {
                    // 到达右边界，向左转
                    this.direction = -1;
                    this.element.style.transform = 'scaleX(-1) scale(1.2)';
                    // 添加朝左类
                    this.element.classList.add('left-facing');
                } else if (this.direction < 0 && this.position < -80) {
                    // 到达左边界，向右转
                    this.direction = 1;
                    this.element.style.transform = 'scale(1.2)';
                    // 移除朝左类
                    this.element.classList.remove('left-facing');
                }
                
                // 应用新位置
                this.element.style.left = this.position + 'px';
                
                // 随机决定是否停下来做动作
                if (Math.random() < 0.005) { // 0.5%的几率每帧
                    this.stopAndDoAction();
                }
            }
            
            // 继续动画循环
            this.animationFrame = requestAnimationFrame(this.update.bind(this));
        },
        
        stopAndDoAction: function() {
            // 停止跑动
            this.isRunning = false;
            
            // 随机选择一个非running的状态
            const filteredStates = this.states.filter(state => state !== 'running');
            const randomState = filteredStates[Math.floor(Math.random() * filteredStates.length)];
            
            // 移除所有状态类
            this.states.forEach(state => {
                this.catEl.classList.remove(state);
            });
            
            // 添加新状态类
            this.catEl.classList.add(randomState);
            
            // 如果是舔手或开心状态，显示一条消息
            if (['licking', 'happy', 'excited', 'curious'].includes(randomState)) {
                setTimeout(() => this.showRandomMessage(), 500);
            }
            
            // 随机1-5秒后恢复跑动
            const pauseTime = Math.random() * 4000 + 1000;
            clearTimeout(this.actionTimeout);
            
            this.actionTimeout = setTimeout(() => {
                // 随机10%的几率改变方向
                if (Math.random() < 0.1) {
                    this.direction *= -1;
                    if (this.direction > 0) {
                        this.element.style.transform = 'scale(1.2)';
                        this.element.classList.remove('left-facing');
                    } else {
                        this.element.style.transform = 'scaleX(-1) scale(1.2)';
                        this.element.classList.add('left-facing');
                    }
                }
                
                // 恢复跑动状态
                this.states.forEach(state => {
                    this.catEl.classList.remove(state);
                });
                this.catEl.classList.add('running');
                this.isRunning = true;
            }, pauseTime);
        },
        
        showRandomMessage: function() {
            // 随机选择一条消息
            const message = this.messages[Math.floor(Math.random() * this.messages.length)];
            this.showMessage(message);
        },
        
        showMessage: function(message, duration = 3500) {
            // 移除现有的消息气泡
            const existingBubble = this.element.querySelector('.cat-bubble');
            if (existingBubble) {
                this.element.removeChild(existingBubble);
            }

            // 创建新的消息气泡
            const bubble = document.createElement('div');
            bubble.className = 'cat-bubble';
            
            // 将消息包装在span中，以便可以单独对文本应用变换
            const textSpan = document.createElement('span');
            textSpan.textContent = message;
            bubble.appendChild(textSpan);
            
            // 添加到猫咪元素
            this.element.appendChild(bubble);
            
            // 延迟一帧添加可见类，确保CSS过渡生效
            requestAnimationFrame(() => {
                bubble.classList.add('visible');
            });

            // 设置气泡消失的定时器
            this.bubbleTimeout = setTimeout(() => {
                bubble.classList.remove('visible');
                setTimeout(() => {
                    if (bubble.parentNode === this.element) {
                        this.element.removeChild(bubble);
                    }
                }, 300);
            }, duration);
        },
        
        // 眨眼动画 - 定期触发
        blinkEyes: function() {
            const eyes = this.catEl.querySelectorAll('.cat-eye');
            
            // 添加眨眼类
            eyes.forEach(eye => eye.classList.add('blink'));
            
            // 很快移除眨眼类
            setTimeout(() => {
                eyes.forEach(eye => eye.classList.remove('blink'));
            }, 200);
            
            // 随机2-6秒后再次眨眼
            setTimeout(() => this.blinkEyes(), Math.random() * 4000 + 2000);
        },
        
        // 播放喵喵声
        playMeow: function() {
            // 随机选择不同的喵喵声
            const meowNumber = Math.floor(Math.random() * 3) + 1;
            const audio = new Audio(`meow${meowNumber}.mp3`);
            audio.volume = 0.2; // 设置音量较小
            
            // 播放声音
            audio.play().catch(e => {
                // 处理浏览器可能阻止自动播放的情况
                console.log('无法播放声音:', e);
            });
        },
        
        // 特殊动作
        doSpecialAction: function() {
            // 清除所有当前状态
            this.states.forEach(state => {
                this.catEl.classList.remove(state);
            });
            
            // 停止移动
            this.isRunning = false;
            clearTimeout(this.actionTimeout);
            
            // 添加一个翻跟头的动画类
            this.catEl.classList.add('special-action');
            
            // 创建翻跟头动画
            this.element.style.transition = 'transform 1s';
            this.element.style.transform = `${this.direction > 0 ? '' : 'scaleX(-1)'} scale(1.2) rotate(360deg)`;
            
            // 显示特殊消息
            this.showMessage('哇！你发现了我的特技！👏');
            
            // 恢复原状
            setTimeout(() => {
                this.element.style.transition = 'transform 0.3s';
                this.element.style.transform = this.direction > 0 ? 'scale(1.2)' : 'scaleX(-1) scale(1.2)';
                this.catEl.classList.remove('special-action');
                this.catEl.classList.add('running');
                this.isRunning = true;
            }, 1500);
        },
        
        // 添加动画关键帧CSS
        addAnimationKeyframes: function() {
            // 检查是否已存在样式
            if (document.getElementById('cat-animations')) {
                return;
            }
            
            // 创建样式元素
            const style = document.createElement('style');
            style.id = 'cat-animations';
            
            // 定义动画关键帧
            style.textContent = `
                @keyframes cat-run {
                    0% { height: 10px; }
                    50% { height: 6px; }
                    100% { height: 10px; }
                }
                
                @keyframes tail-running {
                    0% { transform: rotate(10deg); }
                    50% { transform: rotate(0deg); }
                    100% { transform: rotate(-10deg); }
                }
                
                @keyframes tail-sitting {
                    0% { transform: rotate(30deg); }
                    50% { transform: rotate(15deg); }
                    100% { transform: rotate(0deg); }
                }
                
                @keyframes lick {
                    0%, 100% { opacity: 0; }
                    30%, 70% { opacity: 1; }
                }
                
                @keyframes tail-excited {
                    0% { transform: rotate(20deg); }
                    50% { transform: rotate(0deg); }
                    100% { transform: rotate(-20deg); }
                }
                
                @keyframes head-tilt {
                    0% { transform: translateX(-2px); }
                    100% { transform: translateX(2px); }
                }
                
                @keyframes body-bounce {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-4px); }
                }
                
                @keyframes leg-play {
                    0% { height: 6px; }
                    100% { height: 10px; }
                }
                
                .pixel-cat.running .cat-leg {
                    animation: cat-run 0.4s infinite;
                }
                
                .pixel-cat.running .cat-leg.front-right,
                .pixel-cat.running .cat-leg.back-left {
                    animation-delay: 0.2s;
                }
                
                .pixel-cat.running .cat-tail {
                    animation: tail-running 0.4s infinite alternate;
                }
                
                .pixel-cat.sitting .cat-body {
                    height: 16px;
                    bottom: 8px;
                    border-radius: 0;
                }
                
                .pixel-cat.sitting .cat-leg {
                    height: 6px;
                }
                
                .pixel-cat.sitting .cat-tail {
                    bottom: 12px;
                    animation: tail-sitting 2s infinite alternate;
                }
                
                .pixel-cat.licking .cat-leg.front-left {
                    height: 12px;
                    transform: rotate(45deg);
                    bottom: 6px;
                }
                
                .pixel-cat.licking .cat-tongue {
                    animation: lick 1s infinite;
                }
                
                .pixel-cat.sleeping .cat-eye {
                    height: 2px;
                    top: 12px;
                }
                
                .pixel-cat.sleeping .cat-mouth {
                    width: 4px;
                    height: 4px;
                    border: none;
                    background-color: #222;
                    border-radius: 0;
                    opacity: 0.7;
                }
                
                .pixel-cat.happy .cat-mouth {
                    width: 10px;
                    height: 4px;
                    border-top: 2px solid #222;
                    border-bottom: none;
                    top: 18px;
                }
                
                .pixel-cat.happy .cat-eye {
                    height: 4px;
                    border-radius: 0;
                    background: transparent;
                    border-bottom: 2px solid #222;
                    top: 10px;
                }
                
                .pixel-cat.excited .cat-tail {
                    animation: tail-excited 0.2s infinite alternate;
                }
                
                .pixel-cat.curious .cat-head {
                    animation: head-tilt 2s infinite alternate;
                }
                
                .pixel-cat.playing .cat-body {
                    animation: body-bounce 0.5s infinite alternate;
                }
                
                .pixel-cat.playing .cat-leg {
                    animation: leg-play 0.5s infinite alternate;
                }
                
                .pixel-cat.special-action .cat-tail {
                    animation: tail-excited 0.2s infinite alternate;
                }
                
                .pixel-cat.special-action .cat-leg {
                    animation: leg-play 0.3s infinite alternate;
                }
                
                .cat-eye.blink {
                    height: 2px !important;
                    top: 12px !important;
                }
                
                @keyframes cat-pixel-jump {
                    0% { transform: translateY(0); }
                    25% { transform: translateY(-4px); }
                    50% { transform: translateY(-16px); }
                    75% { transform: translateY(-4px); }
                    100% { transform: translateY(0); }
                }
                
                .pixel-cat.special-action {
                    animation: cat-pixel-jump 1s forwards;
                }
                
                .cat-bubble.visible {
                    opacity: 1;
                    animation: bubble-pixel-pop 0.3s forwards;
                }
                
                @keyframes bubble-pixel-pop {
                    0% { transform: scale(0.5); }
                    33% { transform: scale(0.8); }
                    66% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                
                /* 猫耳动画 */
                @keyframes ear-twitch {
                    0%, 100% { transform: rotate(-10deg); }
                    50% { transform: rotate(-20deg); }
                }
                
                @keyframes ear-twitch-right {
                    0%, 100% { transform: rotate(10deg); }
                    50% { transform: rotate(20deg); }
                }
                
                /* 随机触发耳朵摇动 */
                .pixel-cat .cat-ear.left {
                    animation: ear-twitch 1.5s ease-in-out infinite;
                    animation-play-state: paused;
                }
                
                .pixel-cat .cat-ear.right {
                    animation: ear-twitch-right 1.5s ease-in-out infinite;
                    animation-play-state: paused;
                }
                
                .pixel-cat.running .cat-ear.left {
                    animation-play-state: running;
                    animation-duration: 2s;
                }
                
                .pixel-cat.running .cat-ear.right {
                    animation-play-state: running;
                    animation-duration: 2s;
                    animation-delay: 0.3s;
                }
                
                .pixel-cat.curious .cat-ear.left,
                .pixel-cat.excited .cat-ear.left,
                .pixel-cat.happy .cat-ear.left {
                    animation-play-state: running;
                    animation-duration: 1s;
                }
                
                .pixel-cat.curious .cat-ear.right,
                .pixel-cat.excited .cat-ear.right,
                .pixel-cat.happy .cat-ear.right {
                    animation-play-state: running;
                    animation-duration: 1s;
                    animation-delay: 0.5s;
                }
            `;
            
            // 添加到文档
            document.head.appendChild(style);
        }
    };
    
    // 初始化像素猫
    pixelCat.init();
    
    // 启动眨眼动画
    pixelCat.blinkEyes();
    
    // 在页面加载后短暂延迟显示猫咪，使其出现更自然
    setTimeout(() => {
        pixelCat.element.style.transition = 'left 0.3s linear';
        pixelCat.element.style.display = 'block';
        pixelCat.showMessage('喵~欢迎回来！');
    }, 2000);
}

/**
 * 初始化页面布局控制
 */
function initLayoutControls() {
    // 当窗口大小改变时，重新计算布局
    window.addEventListener('resize', function() {
        // 重新计算grid容器大小
        const mainContent = document.querySelector('.main-content');
        const gridContainer = document.querySelector('.grid-container');
        
        if (mainContent && gridContainer) {
            gridContainer.style.height = (mainContent.clientHeight - 30) + 'px';
        }
    });
    
    // 初始调用一次
    window.dispatchEvent(new Event('resize'));
}

/**
 * 初始化窗口控制
 */
function initWindowControls() {
    // 全屏功能
    const fullscreenBtns = document.querySelectorAll('.fullscreen-btn');
    const exitFullscreenBtns = document.querySelectorAll('.exit-fullscreen-btn');
    
    // 新增: 刷新按钮功能
    const refreshBtns = document.querySelectorAll('.refresh-btn');
    refreshBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const windowElement = this.closest('.grid-item');
            const windowId = windowElement.id;
            const windowNumber = windowId.replace('window', '');
            const iframe = document.getElementById(`iframe${windowNumber}`);
            
            if (iframe && iframe.src && iframe.src !== 'about:blank' && iframe.style.display !== 'none') {
                // 显示加载动画
                showToolLoading(true, windowId);
                
                // 记录当前URL
                const currentSrc = iframe.src;
                
                // 短暂清除src然后重新设置，强制刷新
                iframe.src = '';
                setTimeout(() => {
                    iframe.src = currentSrc;
                    
                    // 设置iframe加载完成事件
                    iframe.onload = function() {
                        // 隐藏加载动画
                        showToolLoading(false);
                        
                        // 重新应用缩放
                        applyZoom(windowNumber);
                        
                        // 动画完成后停止旋转
                        const refreshIcon = document.querySelector(`#${windowId} .refresh-btn i`);
                        if (refreshIcon) {
                            refreshIcon.classList.remove('rotating');
                        }
                    };
                }, 100);
                
                // 使用类而不是内联样式来实现旋转动画，提供更平滑的视觉反馈
                const refreshIcon = this.querySelector('i');
                
                // 添加旋转类
                refreshIcon.classList.add('rotating');
                
                // 如果加载时间过长，设置一个超时，确保动画最终会停止
                setTimeout(() => {
                    refreshIcon.classList.remove('rotating');
                }, 5000); // 5秒后无论如何停止旋转
            }
        });
    });
    
    // 进入全屏
    fullscreenBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const windowId = this.closest('.control-panel').getAttribute('data-window');
            const windowElement = document.getElementById(`window${windowId}`);
            const exitBtn = windowElement.querySelector('.exit-fullscreen-btn');
            
            // 隐藏其他窗口
            document.querySelectorAll('.grid-item').forEach(item => {
                if (item.id !== `window${windowId}`) {
                    item.style.display = 'none';
                }
            });
            
            // 添加全屏类
            windowElement.classList.add('fullscreen-mode');
            
            // 显示退出全屏按钮
            exitBtn.style.display = 'flex';
            
            // 记录当前状态
            windowElement.setAttribute('data-fullscreen', 'true');
            
            // 新增: 自动将缩放比例恢复为100%
            const zoomControl = {
                scales: [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2],
                defaultIndex: 3 // 1 = 100%
            };
            
            // 获取窗口编号
            const windowNumber = windowId;
            
            // 重置缩放级别为100%
            window.windowZoomIndexes[windowNumber] = zoomControl.defaultIndex;
            
            // 应用缩放
            window.applyZoom(windowNumber);
            
            // 更新显示的缩放级别
            const zoomLevelElement = document.querySelector(`.control-panel[data-window="${windowNumber}"] .zoom-level`);
            zoomLevelElement.textContent = '100%';
        });
    });
    
    // 退出全屏
    exitFullscreenBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const windowElement = this.closest('.grid-item');
            
            // 显示所有窗口
            document.querySelectorAll('.grid-item').forEach(item => {
                item.style.display = 'flex';
            });
            
            // 移除全屏类
            windowElement.classList.remove('fullscreen-mode');
            
            // 隐藏退出全屏按钮
            this.style.display = 'none';
            
            // 更新状态
            windowElement.removeAttribute('data-fullscreen');
        });
    });
}

/**
 * 初始化缩放控制
 */
function initZoomControls() {
    // 缩放功能
    const zoomControl = {
        scales: [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2],
        defaultIndex: 3 // 1 = 100%
    };
    
    // 缩放相关
    const zoomOutBtns = document.querySelectorAll('.zoom-out-btn');
    const zoomInBtns = document.querySelectorAll('.zoom-in-btn');
    const zoomResetBtns = document.querySelectorAll('.zoom-reset-btn');
    
    // 存储每个窗口的缩放级别 - 改为全局变量
    window.windowZoomIndexes = {
        1: zoomControl.defaultIndex,
        2: zoomControl.defaultIndex,
        3: zoomControl.defaultIndex,
        4: zoomControl.defaultIndex
    };
    
    // 应用缩放 - 确保填满容器
    function applyZoom(windowNumber) {
        const iframe = document.getElementById(`iframe${windowNumber}`);
        const iframeContainer = iframe.closest('.iframe-container');
        const zoomIndex = window.windowZoomIndexes[windowNumber];
        const scale = zoomControl.scales[zoomIndex];
        const percentage = Math.round(scale * 100);
        
        // 更新显示的缩放级别
        const zoomLevelElement = document.querySelector(`.control-panel[data-window="${windowNumber}"] .zoom-level`);
        zoomLevelElement.textContent = `${percentage}%`;
        
        // 直接应用缩放到iframe元素
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = 'top left';
        
        // 调整iframe的容器大小以适应缩放
        if (scale !== 1) {
            iframe.style.width = `${(100 / scale)}%`;
            iframe.style.height = `${(100 / scale)}%`;
            
            // 确保滚动条显示在正确的位置
            if (scale < 1) {
                iframeContainer.style.overflow = 'hidden';
                setTimeout(() => {
                    iframeContainer.style.overflow = 'auto';
                }, 50);
            }
        } else {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
        }
    }
    
    // 缩小
    zoomOutBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const windowNumber = this.closest('.control-panel').getAttribute('data-window');
            if (window.windowZoomIndexes[windowNumber] > 0) {
                window.windowZoomIndexes[windowNumber]--;
                applyZoom(windowNumber);
            }
        });
    });
    
    // 放大
    zoomInBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const windowNumber = this.closest('.control-panel').getAttribute('data-window');
            if (window.windowZoomIndexes[windowNumber] < zoomControl.scales.length - 1) {
                window.windowZoomIndexes[windowNumber]++;
                applyZoom(windowNumber);
            }
        });
    });
    
    // 重置缩放
    zoomResetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const windowNumber = this.closest('.control-panel').getAttribute('data-window');
            window.windowZoomIndexes[windowNumber] = zoomControl.defaultIndex;
            applyZoom(windowNumber);
        });
    });
    
    // iframe加载完成后应用缩放
    const iframes = document.querySelectorAll('.tool-iframe');
    iframes.forEach(iframe => {
        iframe.addEventListener('load', function() {
            const windowNumber = this.id.replace('iframe', '');
            applyZoom(windowNumber);
        });
    });
    
    // 全局缩放函数，供外部调用
    window.applyZoom = applyZoom;
}

/**
 * 设置默认工具
 */
function initDefaultTools() {
    // 为选择器父容器添加data-window属性
    const toolSelectorContainers = document.querySelectorAll('.tool-selector');
    toolSelectorContainers.forEach((container, index) => {
        const windowNumber = index + 1;
        container.setAttribute('data-window', `window${windowNumber}`);
    });
    
    // 获取所有下拉菜单选择器
    const dropdowns = document.querySelectorAll('.tool-dropdown');
    dropdowns.forEach((dropdown, index) => {
        const windowNumber = index + 1;
        
        console.log(`初始化下拉菜单 #${dropdown.id} 对应窗口 ${windowNumber}`);
        
        // 添加智谱清言（如果没有）
        if (!Array.from(dropdown.options).some(opt => opt.value === "https://chatglm.cn/chat")) {
            const option = document.createElement("option");
            option.value = "https://chatglm.cn/chat";
            option.text = "智谱清言";
            dropdown.add(option);
        }
    });
    
    // 为占位符添加ID
    document.querySelectorAll('.placeholder').forEach((placeholder, index) => {
        placeholder.id = `placeholder${index + 1}`;
    });
}

/**
 * 初始化统一控制面板
 */
function initUnifiedControls() {
    // 这里可以添加统一的控制功能，如全部刷新、统一缩放等
} 