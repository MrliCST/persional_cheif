/**
 * API 请求封装
 * 后端 API 基地址
 */
const API_BASE = '/api/v1';

/**
 * 通用请求方法
 */
async function apiRequest(url, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };
    // 如果 body 是对象且没有设置 Content-Type，自动序列化
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }
    // 如果 body 是 FormData，删除 Content-Type 让浏览器自动设置
    if (config.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE}${url}`, config);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.detail || `请求失败: ${response.status}`);
    }
    return data;
}

// ==================== 收藏 API ====================

const favoritesApi = {
    /** 收藏食谱 */
    add(data) {
        return apiRequest('/favorites', {
            method: 'POST',
            body: data,
        });
    },

    /** 取消收藏 */
    remove(id) {
        return apiRequest(`/favorites/${id}`, {
            method: 'DELETE',
        });
    },

    /** 获取收藏列表 */
    list(threadId) {
        const params = threadId ? `?thread_id=${encodeURIComponent(threadId)}` : '';
        return apiRequest(`/favorites${params}`);
    },

    /** 获取单个收藏详情 */
    get(id) {
        return apiRequest(`/favorites/${id}`);
    },
};

// ==================== 购物清单 API ====================

const shoppingListApi = {
    /** 生成购物清单 */
    generate(threadId, items) {
        return apiRequest('/shopping-list/generate', {
            method: 'POST',
            body: { thread_id: threadId, items },
        });
    },

    /** 获取购物清单 */
    list(threadId) {
        const params = threadId ? `?thread_id=${encodeURIComponent(threadId)}` : '';
        return apiRequest(`/shopping-list${params}`);
    },

    /** 切换勾选状态 */
    toggle(id) {
        return apiRequest(`/shopping-list/${id}/toggle`, {
            method: 'PATCH',
        });
    },

    /** 删除单项 */
    remove(id) {
        return apiRequest(`/shopping-list/${id}`, {
            method: 'DELETE',
        });
    },

    /** 一键清除已购项 */
    clearChecked(threadId) {
        return apiRequest(`/shopping-list/checked?thread_id=${encodeURIComponent(threadId)}`, {
            method: 'DELETE',
        });
    },
};
