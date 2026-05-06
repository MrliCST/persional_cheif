"""
数据库操作层
封装收藏和购物清单的增删改查
"""
from app.db.database import get_connection
from app.common.logger import logger


# ==================== 收藏操作 ====================

def add_favorite(thread_id: str, recipe_name: str, recipe_description: str = None,
                 recipe_image: str = None, score: float = None,
                 reason: str = None, ingredients: str = None) -> dict:
    """添加收藏"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO favorites (thread_id, recipe_name, recipe_description, recipe_image, score, reason, ingredients)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (thread_id, recipe_name, recipe_description, recipe_image, score, reason, ingredients))
    conn.commit()
    favorite_id = cursor.lastrowid
    conn.close()
    logger.info(f"收藏成功: {recipe_name}")
    return {"id": favorite_id, "recipe_name": recipe_name}


def delete_favorite(favorite_id: int) -> bool:
    """取消收藏"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM favorites WHERE id = ?", (favorite_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if deleted:
        logger.info(f"取消收藏: id={favorite_id}")
    return deleted


def get_favorites(thread_id: str = None) -> list[dict]:
    """获取收藏列表，可按 thread_id 过滤"""
    conn = get_connection()
    cursor = conn.cursor()
    if thread_id:
        cursor.execute("SELECT * FROM favorites WHERE thread_id = ? ORDER BY created_at DESC", (thread_id,))
    else:
        cursor.execute("SELECT * FROM favorites ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_favorite_by_id(favorite_id: int) -> dict | None:
    """根据 ID 获取收藏"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM favorites WHERE id = ?", (favorite_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


# ==================== 购物清单操作 ====================

def add_shopping_items(thread_id: str, items: list[dict]) -> list[dict]:
    """批量添加购物清单项"""
    conn = get_connection()
    cursor = conn.cursor()
    added_items = []
    for item in items:
        cursor.execute("""
            INSERT INTO shopping_list (thread_id, ingredient_name, quantity, source_recipe)
            VALUES (?, ?, ?, ?)
        """, (
            thread_id,
            item.get("ingredient_name", ""),
            item.get("quantity"),
            item.get("source_recipe")
        ))
        added_items.append({
            "id": cursor.lastrowid,
            "thread_id": thread_id,
            "ingredient_name": item.get("ingredient_name", ""),
            "quantity": item.get("quantity"),
            "is_checked": False,
            "source_recipe": item.get("source_recipe"),
        })
    conn.commit()
    conn.close()
    logger.info(f"添加了 {len(items)} 项购物清单")
    return added_items


def get_shopping_list(thread_id: str = None) -> list[dict]:
    """获取购物清单"""
    conn = get_connection()
    cursor = conn.cursor()
    if thread_id:
        cursor.execute("SELECT * FROM shopping_list WHERE thread_id = ? ORDER BY is_checked ASC, created_at DESC", (thread_id,))
    else:
        cursor.execute("SELECT * FROM shopping_list ORDER BY is_checked ASC, created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    result = []
    for row in rows:
        d = dict(row)
        d["is_checked"] = bool(d["is_checked"])
        result.append(d)
    return result


def toggle_shopping_item(item_id: int) -> dict | None:
    """切换购物清单项的勾选状态"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM shopping_list WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    current = bool(row["is_checked"])
    cursor.execute("UPDATE shopping_list SET is_checked = ? WHERE id = ?", (0 if current else 1, item_id))
    conn.commit()
    conn.close()
    logger.info(f"切换购物清单项 {item_id}: {not current}")
    return {"id": item_id, "is_checked": not current}


def delete_shopping_item(item_id: int) -> bool:
    """删除购物清单项"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM shopping_list WHERE id = ?", (item_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def clear_checked_items(thread_id: str) -> int:
    """清除已勾选的购物清单项"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM shopping_list WHERE thread_id = ? AND is_checked = 1", (thread_id,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    logger.info(f"清除了 {deleted} 项已购食材")
    return deleted
