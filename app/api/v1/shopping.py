"""
购物清单 API
"""
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import ShoppingListGenerateRequest
from app.db.operations import (
    add_shopping_items,
    get_shopping_list,
    toggle_shopping_item,
    delete_shopping_item,
    clear_checked_items,
)

router = APIRouter()


@router.post("/shopping-list/generate", summary="生成购物清单")
async def generate_shopping_list(data: ShoppingListGenerateRequest):
    """根据食材列表生成购物清单"""
    items = add_shopping_items(data.thread_id, data.items)
    return {"success": True, "data": items}


@router.get("/shopping-list", summary="获取购物清单")
async def list_shopping_list(thread_id: str = None):
    """获取购物清单"""
    items = get_shopping_list(thread_id)
    return {"success": True, "data": items}


@router.patch("/shopping-list/{item_id}/toggle", summary="切换勾选状态")
async def toggle_item(item_id: int):
    """切换购物清单项的勾选/未勾选状态"""
    result = toggle_shopping_item(item_id)
    if not result:
        raise HTTPException(status_code=404, detail="购物清单项不存在")
    return {"success": True, "data": result}


@router.delete("/shopping-list/{item_id}", summary="删除购物清单项")
async def remove_item(item_id: int):
    """删除单个购物清单项"""
    success = delete_shopping_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="购物清单项不存在")
    return {"success": True, "message": "已删除"}


@router.delete("/shopping-list/checked", summary="清除已购项")
async def clear_checked(thread_id: str = Query(..., description="会话ID")):
    """清除所有已勾选的购物清单项"""
    count = clear_checked_items(thread_id)
    return {"success": True, "message": f"已清除 {count} 项已购食材"}
