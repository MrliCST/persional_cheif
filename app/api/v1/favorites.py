"""
收藏食谱 API
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import FavoriteCreate
from app.db.operations import add_favorite, delete_favorite, get_favorites, get_favorite_by_id

router = APIRouter()


@router.post("/favorites", summary="收藏食谱")
async def create_favorite(data: FavoriteCreate):
    """收藏一个食谱"""
    result = add_favorite(
        thread_id=data.thread_id,
        recipe_name=data.recipe_name,
        recipe_description=data.recipe_description,
        recipe_image=data.recipe_image,
        score=data.score,
        reason=data.reason,
        ingredients=data.ingredients,
    )
    return {"success": True, "data": result}


@router.delete("/favorites/{favorite_id}", summary="取消收藏")
async def remove_favorite(favorite_id: int):
    """取消收藏"""
    success = delete_favorite(favorite_id)
    if not success:
        raise HTTPException(status_code=404, detail="收藏不存在")
    return {"success": True, "message": "已取消收藏"}


@router.get("/favorites", summary="获取收藏列表")
async def list_favorites(thread_id: str = None):
    """获取收藏列表，可按 thread_id 过滤"""
    favorites = get_favorites(thread_id)
    # 转换 datetime 对象为字符串
    for fav in favorites:
        if "created_at" in fav and fav["created_at"]:
            fav["created_at"] = str(fav["created_at"])
    return {"success": True, "data": favorites}


@router.get("/favorites/{favorite_id}", summary="获取单个收藏")
async def get_favorite(favorite_id: int):
    """根据 ID 获取收藏详情"""
    fav = get_favorite_by_id(favorite_id)
    if not fav:
        raise HTTPException(status_code=404, detail="收藏不存在")
    if "created_at" in fav and fav["created_at"]:
        fav["created_at"] = str(fav["created_at"])
    return {"success": True, "data": fav}
