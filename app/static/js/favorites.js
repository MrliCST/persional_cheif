/**
 * 收藏食谱功能模块
 * 提供收藏按钮注入、收藏列表展示等功能
 */
const FavoritesModule = {
    /** 当前 thread_id，由外部设置 */
    threadId: null,

    /** 收藏列表缓存 */
    _favoritesCache: [],

    /** 初始化 */
    init(threadId) {
        this.threadId = threadId;
        this._loadFavorites();
    },

    /** 更新 thread_id */
    setThreadId(threadId) {
        this.threadId = threadId;
        if (threadId) {
            this._loadFavorites();
        }
    },

    /** 从后端加载收藏列表 */
    async _loadFavorites() {
        if (!this.threadId) return;
        try {
            const res = await favoritesApi.list(this.threadId);
            this._favoritesCache = res.data || [];
        } catch (e) {
            console.error('加载收藏列表失败:', e);
            this._favoritesCache = [];
        }
    },

    /** 检查是否已收藏某食谱（按名称匹配） */
    isFavorited(recipeName) {
        return this._favoritesCache.some(f => f.recipe_name === recipeName);
    },

    /** 获取收藏 ID（按名称） */
    getFavoriteId(recipeName) {
        const fav = this._favoritesCache.find(f => f.recipe_name === recipeName);
        return fav ? fav.id : null;
    },

    /** 收藏食谱 */
    async addFavorite(recipeData) {
        if (!this.threadId) {
            alert('请先开始一个对话');
            return null;
        }
        try {
            const res = await favoritesApi.add({
                thread_id: this.threadId,
                ...recipeData,
            });
            await this._loadFavorites();
            return res.data;
        } catch (e) {
            console.error('收藏失败:', e);
            alert('收藏失败: ' + e.message);
            return null;
        }
    },

    /** 取消收藏 */
    async removeFavorite(recipeName) {
        const id = this.getFavoriteId(recipeName);
        if (!id) return;
        try {
            await favoritesApi.remove(id);
            await this._loadFavorites();
            return true;
        } catch (e) {
            console.error('取消收藏失败:', e);
            alert('取消收藏失败: ' + e.message);
            return false;
        }
    },

    /** 切换收藏状态 */
    async toggleFavorite(recipeData) {
        if (this.isFavorited(recipeData.recipe_name)) {
            return await this.removeFavorite(recipeData.recipe_name);
        } else {
            return await this.addFavorite(recipeData);
        }
    },

    /** 获取收藏列表 */
    getFavorites() {
        return [...this._favoritesCache];
    },

    /** 渲染收藏列表弹窗 */
    showFavoritesModal() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm';
        overlay.style.animation = 'fadeIn 0.2s ease';

        const favorites = this.getFavorites();

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] mx-4 flex flex-col" style="animation: slideUp 0.3s ease">
                <div class="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                        我的收藏
                    </h2>
                    <button class="p-2 hover:bg-gray-100 rounded-xl transition-colors close-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-4">
                    ${favorites.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4 text-gray-300"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                            <p class="text-base">还没有收藏任何食谱</p>
                            <p class="text-sm mt-1">在食谱卡片上点击 ♥ 即可收藏</p>
                        </div>
                    ` : favorites.map(fav => `
                        <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group mb-2" data-favid="${fav.id}">
                            ${fav.recipe_image ? `<img src="${fav.recipe_image}" alt="${fav.recipe_name}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0"/>` : `
                                <div class="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-orange-400"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                                </div>
                            `}
                            <div class="flex-1 min-w-0">
                                <h4 class="font-medium text-gray-800 truncate">${fav.recipe_name}</h4>
                                ${fav.recipe_description ? `<p class="text-sm text-gray-500 line-clamp-2 mt-0.5">${fav.recipe_description}</p>` : ''}
                                ${fav.score ? `<div class="flex items-center gap-1 mt-1"><span class="text-yellow-500 text-sm">★</span><span class="text-sm text-gray-600">${fav.score}</span></div>` : ''}
                            </div>
                            <button class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 remove-fav-btn" title="取消收藏">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 关闭事件
        overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        // 取消收藏事件
        overlay.querySelectorAll('.remove-fav-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('[data-favid]');
                const id = parseInt(card.dataset.favid);
                try {
                    await favoritesApi.remove(id);
                    await this._loadFavorites();
                    overlay.remove();
                    this.showFavoritesModal();
                } catch (e) {
                    alert('取消收藏失败');
                }
            });
        });
    },

    /** 创建收藏按钮 HTML */
    createFavoriteButton(recipeName, isFavorited = false) {
        const btn = document.createElement('button');
        btn.className = `p-2 rounded-xl transition-all favorite-btn ${isFavorited ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-400 hover:bg-red-50'}`;
        btn.title = isFavorited ? '取消收藏' : '收藏食谱';
        btn.innerHTML = isFavorited
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
        btn.dataset.recipeName = recipeName;
        return btn;
    },
};

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
`;
document.head.appendChild(style);
