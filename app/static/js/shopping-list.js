/**
 * 购物清单功能模块
 */
const ShoppingListModule = {
    /** 当前 thread_id */
    threadId: null,

    /** 购物清单缓存 */
    _items: [],

    /** 初始化 */
    init(threadId) {
        this.threadId = threadId;
        if (threadId) {
            this._loadList();
        }
    },

    /** 更新 thread_id */
    setThreadId(threadId) {
        this.threadId = threadId;
        if (threadId) {
            this._loadList();
        } else {
            this._items = [];
        }
    },

    /** 从后端加载购物清单 */
    async _loadList() {
        if (!this.threadId) return;
        try {
            const res = await shoppingListApi.list(this.threadId);
            this._items = res.data || [];
        } catch (e) {
            console.error('加载购物清单失败:', e);
            this._items = [];
        }
    },

    /** 获取购物清单 */
    getItems() {
        return [...this._items];
    },

    /** 生成购物清单（从食材列表） */
    async generate(ingredients) {
        if (!this.threadId) {
            alert('请先开始一个对话');
            return null;
        }
        try {
            const items = ingredients.map(ing => ({
                ingredient_name: ing.name || ing,
                quantity: ing.quantity || null,
                source_recipe: ing.source_recipe || null,
            }));
            const res = await shoppingListApi.generate(this.threadId, items);
            await this._loadList();
            return res.data;
        } catch (e) {
            console.error('生成购物清单失败:', e);
            alert('生成购物清单失败: ' + e.message);
            return null;
        }
    },

    /** 切换勾选状态 */
    async toggle(id) {
        try {
            const res = await shoppingListApi.toggle(id);
            const item = this._items.find(i => i.id === id);
            if (item) item.is_checked = res.data.is_checked;
            return res.data;
        } catch (e) {
            console.error('切换状态失败:', e);
            return null;
        }
    },

    /** 删除单项 */
    async remove(id) {
        try {
            await shoppingListApi.remove(id);
            this._items = this._items.filter(i => i.id !== id);
            return true;
        } catch (e) {
            console.error('删除失败:', e);
            alert('删除失败: ' + e.message);
            return false;
        }
    },

    /** 一键清除已购项 */
    async clearChecked() {
        if (!this.threadId) return;
        try {
            const res = await shoppingListApi.clearChecked(this.threadId);
            this._items = this._items.filter(i => !i.is_checked);
            return res;
        } catch (e) {
            console.error('清除已购项失败:', e);
            alert('清除失败: ' + e.message);
            return null;
        }
    },

    /** 渲染购物清单弹窗 */
    showShoppingListModal() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm';
        overlay.style.animation = 'fadeIn 0.2s ease';

        const items = this.getItems();
        const uncheckedItems = items.filter(i => !i.is_checked);
        const checkedItems = items.filter(i => i.is_checked);

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] mx-4 flex flex-col" style="animation: slideUp 0.3s ease">
                <div class="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><path d="m15 11-5 5"/><path d="m11 15 5-5"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/><path d="M12 3v18"/></svg>
                        购物清单
                        <span class="text-sm font-normal text-gray-400">(${items.length}项)</span>
                    </h2>
                    <div class="flex items-center gap-2">
                        ${checkedItems.length > 0 ? `
                            <button class="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors clear-checked-btn">
                                清除已购
                            </button>
                        ` : ''}
                        <button class="p-2 hover:bg-gray-100 rounded-xl transition-colors close-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-4">
                    ${items.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4 text-gray-300"><path d="m15 11-5 5"/><path d="m11 15 5-5"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/><path d="M12 3v18"/></svg>
                            <p class="text-base">购物清单为空</p>
                            <p class="text-sm mt-1">AI 推荐的食谱食材会自动添加到清单</p>
                        </div>
                    ` : `
                        ${uncheckedItems.length > 0 ? `
                            <div class="mb-3">
                                <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">待购买</h3>
                                ${uncheckedItems.map(item => this._renderItem(item)).join('')}
                            </div>
                        ` : ''}
                        ${checkedItems.length > 0 ? `
                            <div>
                                <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">已购买</h3>
                                ${checkedItems.map(item => this._renderItem(item)).join('')}
                            </div>
                        ` : ''}
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 关闭事件
        overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        // 勾选/取消勾选事件
        overlay.querySelectorAll('.toggle-item-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                await this.toggle(id);
                overlay.remove();
                this.showShoppingListModal();
            });
        });

        // 删除事件
        overlay.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                await this.remove(id);
                overlay.remove();
                this.showShoppingListModal();
            });
        });

        // 清除已购事件
        const clearBtn = overlay.querySelector('.clear-checked-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                if (!confirm('确定要清除所有已购买的食材吗？')) return;
                await this.clearChecked();
                overlay.remove();
                this.showShoppingListModal();
            });
        }
    },

    /** 渲染单个购物清单项 */
    _renderItem(item) {
        return `
            <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group ${item.is_checked ? 'opacity-60' : ''}">
                <button class="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all toggle-item-btn ${item.is_checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'}" data-id="${item.id}">
                    ${item.is_checked ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>` : ''}
                </button>
                <div class="flex-1 min-w-0">
                    <span class="text-gray-800 ${item.is_checked ? 'line-through text-gray-400' : ''}">${item.ingredient_name}</span>
                    ${item.quantity ? `<span class="text-sm text-gray-400 ml-1">${item.quantity}</span>` : ''}
                    ${item.source_recipe ? `<span class="text-xs text-gray-400 ml-2">· ${item.source_recipe}</span>` : ''}
                </div>
                <button class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 delete-item-btn" data-id="${item.id}" title="删除">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
        `;
    },
};
