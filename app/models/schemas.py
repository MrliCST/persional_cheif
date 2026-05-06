from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


# --- 对话 ---
class ChatRequest(BaseModel):
    message: str
    image_url: Optional[str] = None
    thread_id: str


# --- 收藏 ---
class FavoriteCreate(BaseModel):
    thread_id: str
    recipe_name: str
    recipe_description: Optional[str] = None
    recipe_image: Optional[str] = None
    score: Optional[float] = None
    reason: Optional[str] = None
    ingredients: Optional[str] = None


class FavoriteResponse(BaseModel):
    id: int
    thread_id: str
    recipe_name: str
    recipe_description: Optional[str] = None
    recipe_image: Optional[str] = None
    score: Optional[float] = None
    reason: Optional[str] = None
    ingredients: Optional[str] = None
    created_at: str


# --- 购物清单 ---
class ShoppingItemResponse(BaseModel):
    id: int
    thread_id: str
    ingredient_name: str
    quantity: Optional[str] = None
    is_checked: bool
    source_recipe: Optional[str] = None
    created_at: str


class ShoppingListGenerateRequest(BaseModel):
    thread_id: str
    items: List[dict]


class ShoppingListGenerateResponse(BaseModel):
    items: List[ShoppingItemResponse]
