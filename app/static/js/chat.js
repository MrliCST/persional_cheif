/**
 * 对话管理模块
 * 处理消息发送、SSE 流式接收、消息渲染、图片上传等
 */

const ChatModule = {
    /** 当前 thread_id */
    threadId: null,

    /** 是否正在接收 AI 回复 */
    isReceiving: false,

    /** 当前 AI 回复的累积内容 */
    currentAiContent: '',

    /** 当前 AI 消息元素 */
    currentAiElement: null,

    /** AbortController 用于取消请求 */
    abortController: null,

    /** DOM 元素引用 */
    elements: {},

    /** 初始化 */
    init() {
        this.elements = {
            chatContainer: document.getElementById('chat-container'),
            messagesArea: document.getElementById('messages-area'),
            inputArea: document.getElementById('input-area'),
            inputField: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            imageBtn: document.getElementById('image-btn'),
            imageInput: document.getElementById('image-input'),
            imagePreview: document.getElementById('image-preview'),
            newChatBtn: document.getElementById('new-chat-btn'),
            favoritesBtn: document.getElementById('favorites-btn'),
            shoppingListBtn: document.getElementById('shopping-list-btn'),
            historyBtn: document.getElementById('history-btn'),
            emptyState: document.getElementById('empty-state'),
        };

        this._bindEvents();
        this._generateThreadId();
        this._loadHistory();
    },

    /** 绑定事件 */
    _bindEvents() {
        // 发送消息
        this.elements.sendBtn.addEventListener('click', () => this._handleSend());
        this.elements.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleSend();
            }
        });

        // 图片上传
        this.elements.imageBtn.addEventListener('click', () => this.elements.imageInput.click());
        this.elements.imageInput.addEventListener('change', (e) => this._handleImageSelect(e));

        // 新对话
        this.elements.newChatBtn.addEventListener('click', () => this.newChat());

        // 收藏弹窗
        this.elements.favoritesBtn.addEventListener('click', () => {
            FavoritesModule.showFavoritesModal();
        });

        // 购物清单弹窗
        this.elements.shoppingListBtn.addEventListener('click', () => {
            ShoppingListModule.showShoppingListModal();
        });

        // 历史记录弹窗
        this.elements.historyBtn.addEventListener('click', () => this._showHistoryModal());

        // 输入框自动调整高度
        this.elements.inputField.addEventListener('input', () => {
            this.elements.inputField.style.height = 'auto';
            this.elements.inputField.style.height = Math.min(this.elements.inputField.scrollHeight, 120) + 'px';
        });
    },

    /** 生成新的 thread_id */
    _generateThreadId() {
        this.threadId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('current_thread_id', this.threadId);
        FavoritesModule.setThreadId(this.threadId);
        ShoppingListModule.setThreadId(this.threadId);
    },

    /** 设置 thread_id */
    setThreadId(threadId) {
        this.threadId = threadId;
        localStorage.setItem('current_thread_id', threadId);
        FavoritesModule.setThreadId(threadId);
        ShoppingListModule.setThreadId(threadId);
    },

    /** 处理发送消息 */
    async _handleSend() {
        const message = this.elements.inputField.value.trim();
        const imageUrl = this.elements.imagePreview.dataset.imageUrl || '';

        if (!message && !imageUrl) return;
        if (this.isReceiving) return;

        // 隐藏空状态
        this._hideEmptyState();

        // 添加用户消息
        this._addUserMessage(message, imageUrl);

        // 清空输入
        this.elements.inputField.value = '';
        this.elements.inputField.style.height = 'auto';
        this._clearImagePreview();

        // 发送到 AI
        await this._sendToAI(message, imageUrl);
    },

    /** 发送消息到 AI（SSE 流式） */
    async _sendToAI(message, imageUrl) {
        this.isReceiving = true;
        this._setInputState(false);

        // 创建 AI 消息气泡
        this.currentAiContent = '';
        this.currentAiElement = this._createAiMessageElement();
        this.elements.messagesArea.appendChild(this.currentAiElement);

        // 显示打字指示器
        const typingIndicator = this._createTypingIndicator();
        this.currentAiElement.querySelector('.bubble-content').appendChild(typingIndicator);

        // 滚动到底部
        this._scrollToBottom();

        this.abortController = new AbortController();

        try {
            const response = await fetch('/api/v1/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    image_url: imageUrl || undefined,
                    thread_id: this.threadId,
                }),
                signal: this.abortController.signal,
            });

            if (!response.ok) {
                throw new Error(`请求失败: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                // 后端直接返回纯文本流（不是标准 SSE data: 格式）
                if (text) {
                    this.currentAiContent += text;
                    this._updateAiMessage(this.currentAiContent);
                }
            }

            // 渲染完成后的食谱卡片和收藏按钮
            this._finalizeAiMessage(this.currentAiElement, this.currentAiContent);
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('请求已取消');
            } else {
                console.error('AI 响应错误:', e);
                this._updateAiMessage('抱歉，我遇到了问题，请稍后再试。');
            }
        } finally {
            this.isReceiving = false;
            this._setInputState(true);
            this._scrollToBottom();
        }
    },

    /** 添加用户消息 */
    _addUserMessage(text, imageUrl) {
        const div = document.createElement('div');
        div.className = 'message-bubble user message-enter';
        let content = '';

        if (imageUrl) {
            content += `<div class="image-preview mb-2"><img src="${imageUrl}" alt="上传图片" /></div>`;
        }
        if (text) {
            content += `<div>${this._escapeHtml(text)}</div>`;
        }

        div.innerHTML = `<div class="bubble-content">${content}</div>`;
        this.elements.messagesArea.appendChild(div);
        this._scrollToBottom();
    },

    /** 创建 AI 消息元素 */
    _createAiMessageElement() {
        const div = document.createElement('div');
        div.className = 'message-bubble ai message-enter';
        div.innerHTML = `<div class="bubble-content"></div>`;
        return div;
    },

    /** 创建打字指示器 */
    _createTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.innerHTML = '<span></span><span></span><span></span>';
        return div;
    },

    /** 更新 AI 消息内容 */
    _updateAiMessage(content) {
        const bubble = this.currentAiElement.querySelector('.bubble-content');
        // 移除打字指示器
        const indicator = bubble.querySelector('.typing-indicator');
        if (indicator) indicator.remove();

        // 渲染 Markdown 风格内容
        bubble.innerHTML = this._renderMarkdown(content);
        this._scrollToBottom();
    },

    /** 从文本中提取食谱名称 */
    _extractRecipeNames(content) {
        const names = new Set();
        
        // 匹配多种格式的食谱名称（按优先级从高到低）
        const patterns = [
            // 1. 完整格式：🥇 推荐No.1｜食谱名（最标准）
            /[🥇🥈🥉🏅]\s*推荐No\.\d+\s*[｜|]\s*(.+?)(?:\n|$)/g,
            // 2. 缺少奖牌：推荐No.1｜食谱名
            /推荐No\.\d+\s*[｜|]\s*(.+?)(?:\n|$)/g,
            // 3. 奖牌+No.1｜食谱名（缺少"推荐"二字）
            /[🥇🥈🥉🏅]\s*No\.\d+\s*[｜|]\s*(.+?)(?:\n|$)/g,
            // 4. 奖牌+推荐No.1｜食谱名（评分）（括号后有评分）
            /[🥇🥈🥉🏅]\s*推荐No\.\d+\s*[｜|]\s*(.+?)\s*[（(].*?[）)]/g,
            // 5. 奖牌+推荐No.1｜食谱名（后面跟评分文字）
            /[🥇🥈🥉🏅]\s*推荐No\.\d+\s*[｜|]\s*(.+?)(?:\s*综合|\s*📊|\s*✅|\s*📝|\s*👨|$)/g,
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const name = match[1].trim();
                // 过滤掉明显不是食谱名的内容
                const skipWords = ['食谱', '推荐', '报告', '清单', '食材', '材料', '步骤', '做法', '小贴士', '提示', '总结', '说明', '注意事项', '综合建议'];
                if (name.length > 0 && name.length < 30 &&
                    !skipWords.some(w => name.includes(w))) {
                    names.add(name);
                }
            }
        });

        return [...names];
    },

    /** 渲染食谱卡片 */
    _renderRecipeCards(element, content) {
        // 从内容中提取食谱名称
        const recipes = this._extractRecipeNames(content);
        if (recipes.length === 0) return;

        const bubble = element.querySelector('.bubble-content');
        recipes.forEach(recipeName => {
            const isFav = FavoritesModule.isFavorited(recipeName);
            const card = document.createElement('div');
            card.className = 'recipe-card';

            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <div class="recipe-title">🍽️ ${this._escapeHtml(recipeName)}</div>
                        <div class="recipe-desc">AI 推荐的食谱，点击下方按钮收藏或加入购物清单</div>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <button class="recipe-fav-btn p-2 rounded-xl transition-all ${isFav ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-400 hover:bg-red-50'}" 
                                title="${isFav ? '取消收藏' : '收藏食谱'}"
                                data-recipe="${this._escapeHtml(recipeName)}">
                            ${isFav 
                                ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
                                : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
                            }
                        </button>
                        <button class="recipe-shop-btn p-2 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                title="加入购物清单"
                                data-recipe="${this._escapeHtml(recipeName)}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        </button>
                    </div>
                </div>
            `;

            // 收藏按钮事件
            card.querySelector('.recipe-fav-btn').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const name = btn.dataset.recipe;
                
                // 先判断当前状态（取反即为操作后的状态）
                const wasFav = FavoritesModule.isFavorited(name);
                
                const result = await FavoritesModule.toggleFavorite({ recipe_name: name });
                if (result !== null) {
                    // 收藏成功：立即更新按钮样式（不依赖缓存刷新）
                    const isNowFav = !wasFav;  // toggle 操作，状态取反
                    if (isNowFav) {
                        btn.className = 'recipe-fav-btn p-2 rounded-xl transition-all text-red-500 bg-red-50';
                        btn.title = '取消收藏';
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
                    } else {
                        btn.className = 'recipe-fav-btn p-2 rounded-xl transition-all text-gray-400 hover:text-red-400 hover:bg-red-50';
                        btn.title = '收藏食谱';
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
                    }
                    this._showToast(isNowFav ? '已收藏 ❤️' : '已取消收藏', 'success');
                }
            });

            // 加入购物清单按钮事件
            card.querySelector('.recipe-shop-btn').addEventListener('click', async (btn) => {
                const name = btn.currentTarget.dataset.recipe;
                await ShoppingListModule.generate([{ name, source_recipe: name }]);
                this._showToast(`已添加「${name}」到购物清单`, 'success');
            });
            bubble.appendChild(card);
        });
    },

    /** 在 AI 消息末尾添加"收藏此回答"浮动按钮 */
    _injectFavoriteAnswerButton(element, content) {
        // 如果内容太短，不添加按钮
        if (!content || content.length < 20) return;
        const bubble = element.querySelector('.bubble-content');

        if (!bubble) return;

        // 避免重复注入
        if (bubble.querySelector('.fav-answer-btn')) return;

        // 从内容中提取可能的食谱名称
        const detectedRecipes = this._extractRecipeNames(content);

        const btnContainer = document.createElement('div');
        btnContainer.className = 'fav-answer-btn mt-4 pt-3 border-t border-gray-100 flex items-center justify-between';

        // 左侧提示文字
        const hintText = document.createElement('span');
        hintText.className = 'text-xs text-gray-400';
        if (detectedRecipes.length > 0) {
            hintText.textContent = `检测到 ${detectedRecipes.length} 个食谱，可点击收藏`;
        } else {
            hintText.textContent = '觉得这个回答不错？收藏食谱吧';
        }
        btnContainer.appendChild(hintText);

        // 右侧按钮组
        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex items-center gap-2';

        // 收藏按钮
        const favBtn = document.createElement('button');
        favBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-all';
        favBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            收藏食谱
        `;
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._showFavoriteDialog(content, detectedRecipes);
        });
        btnGroup.appendChild(favBtn);

        btnContainer.appendChild(btnGroup);
        bubble.appendChild(btnContainer);
    },

    /** 显示收藏食谱对话框（支持手动输入） */
    _showFavoriteDialog(content, detectedRecipes) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm';
        overlay.style.animation = 'fadeIn 0.2s ease';

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" style="animation: slideUp 0.3s ease">
                <!-- 标题 -->
                <div class="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                        收藏食谱
                    </h3>
                    <button class="p-1.5 hover:bg-gray-100 rounded-lg transition-colors close-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>

                <div class="p-4">
                    <!-- 自动检测到的食谱列表 -->
                    ${detectedRecipes.length > 0 ? `
                        <div class="mb-4">
                            <label class="text-xs font-medium text-gray-500 mb-2 block">从回答中检测到的食谱（点击快速收藏）</label>
                            <div class="flex flex-wrap gap-2">
                                ${detectedRecipes.map(name => `
                                    <button class="detected-recipe-btn px-3 py-1.5 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-all border border-orange-200"
                                            data-recipe="${this._escapeHtml(name)}">
                                        🍽️ ${this._escapeHtml(name)}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="border-t border-gray-100 my-3"></div>
                    ` : ''}

                    <!-- 手动输入 -->
                    <div class="mb-3">
                        <label class="text-xs font-medium text-gray-500 mb-2 block">${detectedRecipes.length > 0 ? '或者手动输入食谱名称' : '输入你想收藏的食谱名称'}</label>
                        <input type="text" id="manual-recipe-input" 
                               class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                               placeholder="例如：红烧肉" />
                    </div>

                    <!-- 可选：备注/描述 -->
                    <div class="mb-4">
                        <label class="text-xs font-medium text-gray-500 mb-2 block">备注（可选）</label>
                        <textarea id="recipe-description-input" rows="2"
                                  class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all resize-none"
                                  placeholder="简单描述一下这个食谱..."></textarea>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="flex items-center gap-2">
                        <button class="cancel-btn flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                            取消
                        </button>
                        <button id="confirm-favorite-btn" class="flex-1 px-3 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all flex items-center justify-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                            确认收藏
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 关闭事件
        overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
        overlay.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        // 点击检测到的食谱快速收藏
        overlay.querySelectorAll('.detected-recipe-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const recipeName = btn.dataset.recipe;
                const desc = document.getElementById('recipe-description-input').value.trim();
                const result = await FavoritesModule.toggleFavorite({ 
                    recipe_name: recipeName,
                    recipe_description: desc || undefined,
                });
                if (result !== null) {
                    this._showToast(`已收藏「${recipeName}」`, 'success');
                    overlay.remove();
                }
            });
        });

        // 确认收藏按钮
        document.getElementById('confirm-favorite-btn').addEventListener('click', async () => {
            const input = document.getElementById('manual-recipe-input');
            const desc = document.getElementById('recipe-description-input').value.trim();
            const recipeName = input.value.trim();

            if (!recipeName) {
                this._showToast('请输入食谱名称', 'error');
                input.focus();
                return;
            }

            const result = await FavoritesModule.toggleFavorite({ 
                recipe_name: recipeName,
                recipe_description: desc || undefined,
            });
            if (result !== null) {
                this._showToast(`已收藏「${recipeName}」`, 'success');
                overlay.remove();
            }
        });

        // 回车键确认
        document.getElementById('manual-recipe-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('confirm-favorite-btn').click();
            }
        });
    },

    _finalizeAiMessage(element, content) {
        // 渲染食谱卡片（原有逻辑）
        this._renderRecipeCards(element, content);
        // 注入"收藏此回答"按钮（新增逻辑）
        this._injectFavoriteAnswerButton(element, content);
    },

    /** 加载历史消息 */
    async _loadHistory() {
        if (!this.threadId) return;

        try {
            const res = await fetch(`/api/v1/chat/messages?thread_id=${encodeURIComponent(this.threadId)}`);
            const data = await res.json();
            const messages = data.messages || [];

            if (messages.length > 0) {
                this._hideEmptyState();
                messages.forEach(msg => {
                    if (msg.role === 'user') {
                        this._addUserMessage(msg.content, msg.image_url);
                    } else if (msg.role === 'assistant') {
                        const el = this._createAiMessageElement();
                        const bubble = el.querySelector('.bubble-content');
                        bubble.innerHTML = this._renderMarkdown(msg.content || '');
                        this.elements.messagesArea.appendChild(el);
                        this._finalizeAiMessage(el, msg.content || '');
                    }
                });

                this._scrollToBottom();
            }
        } catch (e) {
            console.error('加载历史消息失败:', e);
        }
    },

    /** 新对话 */
    newChat() {
        if (this.isReceiving) {
            this._cancelRequest();
        }
        this.elements.messagesArea.innerHTML = '';
        this._generateThreadId();
        this._showEmptyState();
        this._clearImagePreview();
        this.elements.inputField.value = '';
        this.elements.inputField.style.height = 'auto';
    },

    /** 取消请求 */
    _cancelRequest() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isReceiving = false;
        this._setInputState(true);
    },

    /** 设置输入状态 */
    _setInputState(enabled) {
        this.elements.inputField.disabled = !enabled;
        this.elements.sendBtn.disabled = !enabled;
        if (enabled) {
            this.elements.sendBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            `;
            this.elements.sendBtn.className = 'p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all btn-hover-scale disabled:opacity-50 disabled:cursor-not-allowed';
        } else {
            this.elements.sendBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/></svg>
            `;
            this.elements.sendBtn.className = 'p-2.5 bg-gray-400 text-white rounded-xl cursor-not-allowed';
        }
    },

    /** 处理图片选择 */
    async _handleImageSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            this._showToast('请选择图片文件', 'error');
            return;
        }

        // 验证文件大小（最大 10MB）
        if (file.size > 10 * 1024 * 1024) {
            this._showToast('图片大小不能超过 10MB', 'error');
            return;
        }

        try {
            this._showToast('正在上传图片...', 'info');

            // 获取 OSS 上传签名
            const filename = encodeURIComponent(file.name);
            const signRes = await fetch(`/api/v1/oss/presign?filename=${filename}`);
            const signData = await signRes.json();

            if (!signData.uploadUrl || !signData.accessUrl) {
                throw new Error('获取上传链接失败');
            }

            // 上传图片
            const uploadRes = await fetch(signData.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            if (!uploadRes.ok) {
                throw new Error('图片上传失败');
            }

            // 显示图片预览
            this.elements.imagePreview.innerHTML = `
                <div class="relative inline-block">
                    <img src="${signData.accessUrl}" alt="预览" class="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                    <button class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors" id="remove-image-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
            `;
            this.elements.imagePreview.dataset.imageUrl = signData.accessUrl;
            this.elements.imagePreview.classList.remove('hidden');

            // 移除图片按钮事件
            document.getElementById('remove-image-btn').addEventListener('click', () => {
                this._clearImagePreview();
            });

            this._showToast('图片上传成功', 'success');
        } catch (e) {
            console.error('图片上传失败:', e);
            this._showToast('图片上传失败: ' + e.message, 'error');
        }

        // 清空 input 以便重复选择同一文件
        e.target.value = '';
    },

    /** 清除图片预览 */
    _clearImagePreview() {
        this.elements.imagePreview.innerHTML = '';
        this.elements.imagePreview.dataset.imageUrl = '';
        this.elements.imagePreview.classList.add('hidden');
    },

    /** 显示空状态 */
    _showEmptyState() {
        this.elements.emptyState.classList.remove('hidden');
    },

    /** 隐藏空状态 */
    _hideEmptyState() {
        this.elements.emptyState.classList.add('hidden');
    },

    /** 滚动到底部 */
    _scrollToBottom() {
        setTimeout(() => {
            this.elements.messagesArea.scrollTop = this.elements.messagesArea.scrollHeight;
        }, 50);
    },

    /** 显示 Toast 提示 */
    _showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    /** 显示历史记录弹窗 */
    async _showHistoryModal() {
        try {
            // 获取所有历史对话（这里使用当前 thread 的消息列表作为演示）
            // 实际项目中可能需要一个获取所有对话列表的 API
            const res = await fetch(`/api/v1/chat/messages?thread_id=${encodeURIComponent(this.threadId)}`);
            const data = await res.json();
            const messages = data.messages || [];

            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm modal-overlay';
            overlay.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] mx-4 flex flex-col modal-content">
                    <div class="flex items-center justify-between p-4 border-b border-gray-100">
                        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            历史记录
                        </h2>
                        <button class="p-2 hover:bg-gray-100 rounded-xl transition-colors close-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        ${messages.length === 0 ? `
                            <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4 text-gray-300"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                <p class="text-base">暂无历史记录</p>
                                <p class="text-sm mt-1">开始对话后，消息会自动保存</p>
                            </div>
                        ` : messages.map((msg, idx) => `
                            <div class="p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer mb-2 history-item" data-index="${idx}">
                                <div class="flex items-start gap-3">
                                    <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-500'}">
                                        ${msg.role === 'user' 
                                            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
                                            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>'
                                        }
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-xs text-gray-400 mb-1">${msg.role === 'user' ? '你' : 'AI 私人厨师'}</div>
                                        <div class="text-sm text-gray-700 line-clamp-2">${this._escapeHtml(msg.content || '')}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // 关闭事件
            overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        } catch (e) {
            console.error('加载历史记录失败:', e);
            this._showToast('加载历史记录失败', 'error');
        }
    },

    /** 简易 Markdown 渲染 */
    _renderMarkdown(text) {
        if (!text) return '';

        let html = this._escapeHtml(text);

        // 代码块
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-sm"><code>$2</code></pre>');

        // 行内代码
        html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-orange-600">$1</code>');

        // 标题
        html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-gray-800 mt-3 mb-1">$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-800 mt-4 mb-2">$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-800 mt-4 mb-2">$1</h1>');

        // 加粗和斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // 无序列表
        html = html.replace(/^- (.+)$/gm, '<li class="text-gray-700 ml-4 list-disc">$1</li>');
        html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>');

        // 有序列表
        html = html.replace(/^\d+\. (.+)$/gm, '<li class="text-gray-700 ml-4 list-decimal">$1</li>');

        // 链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-orange-500 hover:text-orange-600 underline">$1</a>');

        // 换行
        html = html.replace(/\n\n/g, '</p><p class="my-2 text-gray-700 leading-relaxed">');
        html = html.replace(/\n/g, '<br/>');

        // 包裹段落
        if (!html.startsWith('<')) {
            html = '<p class="my-1 text-gray-700 leading-relaxed">' + html + '</p>';
        }

        return html;
    },

    /** HTML 转义 */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    ChatModule.init();
});
