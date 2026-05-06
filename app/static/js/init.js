/**
 * 功能初始化脚本
 * 在页面加载后注入收藏和购物清单的 UI 入口
 */

(function () {
    'use strict';

    // ==================== 获取当前 thread_id ====================
    // 从 localStorage 或页面状态中获取 thread_id
    function getThreadId() {
        // 尝试从 localStorage 获取
        return localStorage.getItem('current_thread_id') || null;
    }

    function setThreadId(id) {
        if (id) {
            localStorage.setItem('current_thread_id', id);
        } else {
            localStorage.removeItem('current_thread_id');
        }
    }

    // ==================== 注入导航按钮 ====================
    function injectNavButtons() {
        const header = document.querySelector('header .max-w-4xl .flex.items-center.justify-between');
        if (!header) return;

        // 收藏按钮
        const favBtn = document.createElement('button');
        favBtn.className = 'flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors';
        favBtn.title = '我的收藏';
        favBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            <span class="text-sm hidden sm:inline">收藏</span>
        `;
        favBtn.addEventListener('click', () => {
            FavoritesModule.showFavoritesModal();
        });

        // 购物清单按钮
        const shopBtn = document.createElement('button');
        shopBtn.className = 'flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors';
        shopBtn.title = '购物清单';
        shopBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 11-5 5"/><path d="m11 15 5-5"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/><path d="M12 3v18"/></svg>
            <span class="text-sm hidden sm:inline">清单</span>
        `;
        shopBtn.addEventListener('click', () => {
            ShoppingListModule.showShoppingListModal();
        });

        // 插入到"新建会话"按钮前面
        const newSessionBtn = header.querySelector('button:last-child');
        if (newSessionBtn) {
            header.insertBefore(shopBtn, newSessionBtn);
            header.insertBefore(favBtn, shopBtn);
        }
    }

    // ==================== 监听 thread_id 变化 ====================
    function setupThreadIdObserver() {
        // 定期检查 thread_id 变化
        let lastThreadId = getThreadId();

        // 拦截可能的 thread_id 设置
        const originalSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function (key, value) {
            originalSetItem(key, value);
            if (key === 'current_thread_id') {
                const newId = value;
                FavoritesModule.setThreadId(newId);
                ShoppingListModule.setThreadId(newId);
                lastThreadId = newId;
            }
        };

        // 也监听自定义事件
        document.addEventListener('thread-changed', (e) => {
            const newId = e.detail?.threadId || null;
            setThreadId(newId);
            FavoritesModule.setThreadId(newId);
            ShoppingListModule.setThreadId(newId);
            lastThreadId = newId;
        });

        // 初始加载
        const initialId = getThreadId();
        if (initialId) {
            FavoritesModule.init(initialId);
            ShoppingListModule.init(initialId);
        }
    }

    // ==================== 注入收藏按钮到食谱卡片 ====================
    function injectFavoriteButtons() {
        // 监听 DOM 变化，当食谱卡片出现时注入收藏按钮
        const observer = new MutationObserver(() => {
            // 查找所有食谱卡片（根据现有 UI 结构）
            document.querySelectorAll('[class*="recipe-card"], .recipe-card, [class*="bg-white"][class*="rounded-xl"]').forEach(card => {
                // 避免重复注入
                if (card.querySelector('.favorite-btn-injected')) return;

                // 查找卡片中的食谱名称
                const titleEl = card.querySelector('h3, h4, [class*="font-bold"], [class*="font-semibold"]');
                if (!titleEl) return;

                const recipeName = titleEl.textContent.trim();
                if (!recipeName || recipeName.length > 50) return;

                // 查找卡片的操作区域
                const actionArea = card.querySelector('[class*="flex"][class*="gap"], [class*="flex"][class*="justify"]') || card.querySelector('.p-4:last-child') || card;
                
                const isFav = FavoritesModule.isFavorited(recipeName);
                const favBtn = FavoritesModule.createFavoriteButton(recipeName, isFav);
                favBtn.classList.add('favorite-btn-injected');

                favBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const name = favBtn.dataset.recipeName;
                    
                    // 收集食谱数据
                    const recipeData = { recipe_name: name };
                    
                    // 尝试从卡片中提取更多信息
                    const descEl = card.querySelector('p, [class*="text-gray"]');
                    if (descEl && descEl.textContent !== titleEl.textContent) {
                        recipeData.recipe_description = descEl.textContent.trim();
                    }
                    
                    const imgEl = card.querySelector('img');
                    if (imgEl && imgEl.src) {
                        recipeData.recipe_image = imgEl.src;
                    }

                    // 尝试提取评分
                    const scoreEl = card.querySelector('[class*="text-yellow"], [class*="star"], [class*="rating"]');
                    if (scoreEl) {
                        const scoreText = scoreEl.textContent.trim();
                        const scoreMatch = scoreText.match(/[\d.]+/);
                        if (scoreMatch) recipeData.score = parseFloat(scoreMatch[0]);
                    }

                    const result = await FavoritesModule.toggleFavorite(recipeData);
                    if (result !== null) {
                        // 更新按钮状态
                        const isNowFav = FavoritesModule.isFavorited(name);
                        if (isNowFav) {
                            favBtn.className = 'p-2 rounded-xl transition-all favorite-btn favorite-btn-injected text-red-500 bg-red-50';
                            favBtn.title = '取消收藏';
                            favBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
                        } else {
                            favBtn.className = 'p-2 rounded-xl transition-all favorite-btn favorite-btn-injected text-gray-400 hover:text-red-400 hover:bg-red-50';
                            favBtn.title = '收藏食谱';
                            favBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
                        }
                    }
                });

                actionArea.appendChild(favBtn);
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    // ==================== 注入"加入购物清单"按钮到食材列表 ====================
    function injectShoppingListButtons() {
        const observer = new MutationObserver(() => {
            // 查找食材列表区域 - 通常出现在 AI 回复中
            document.querySelectorAll('ul li, ol li').forEach(li => {
                if (li.querySelector('.shop-btn-injected')) return;
                
                const text = li.textContent.trim();
                if (!text || text.length > 100) return;

                // 检查是否看起来像食材项（包含常见食材关键词或数量词）
                const isIngredient = /[克斤个根把片勺碗袋盒瓶]/g.test(text) || 
                                    /^\d+[、.]/.test(text) ||
                                    /食材|材料|配料|调料/gi.test(li.closest('ul, ol')?.previousElementSibling?.textContent || '');

                if (!isIngredient) return;

                const btn = document.createElement('button');
                btn.className = 'shop-btn-injected ml-2 p-1 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all inline-flex items-center';
                btn.title = '加入购物清单';
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                `;

                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const ingredientName = text.replace(/^[\d]+[、.]\s*/, '').trim();
                    await ShoppingListModule.generate([{ name: ingredientName }]);
                    // 显示成功提示
                    const toast = document.createElement('div');
                    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm';
                    toast.textContent = `已添加「${ingredientName}」到购物清单`;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
                });

                li.style.position = 'relative';
                li.appendChild(btn);
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    // ==================== 初始化 ====================
    function init() {
        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(doInit, 500);
            });
        } else {
            setTimeout(doInit, 500);
        }
    }

    function doInit() {
        injectNavButtons();
        setupThreadIdObserver();
        injectFavoriteButtons();
        injectShoppingListButtons();
        console.log('📌 收藏 & 购物清单功能已加载');
    }

    init();
})();
