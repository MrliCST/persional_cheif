"""
数据库初始化模块
负责创建收藏和购物清单相关的表
"""
import sqlite3
import os
from app.common.logger import logger

# 数据库路径（与 personal_chief.py 中的保持一致）
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "db", "personal_chief.db")


def get_connection() -> sqlite3.Connection:
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_tables():
    """初始化业务表"""
    conn = get_connection()
    cursor = conn.cursor()

    # 收藏食谱表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id TEXT NOT NULL,
            recipe_name TEXT NOT NULL,
            recipe_description TEXT,
            recipe_image TEXT,
            score REAL,
            reason TEXT,
            ingredients TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 购物清单表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shopping_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id TEXT NOT NULL,
            ingredient_name TEXT NOT NULL,
            quantity TEXT,
            is_checked INTEGER DEFAULT 0,
            source_recipe TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    logger.info("数据库表初始化完成")
