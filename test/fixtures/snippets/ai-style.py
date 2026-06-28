"""用户服务模块

提供用户相关的 CRUD 操作。
"""

from typing import Optional, Dict, List


# --- 数据模型 ---

class UserData:
    """用户数据模型"""

    def __init__(self, user_id: str, name: str) -> None:
        self.user_id: str = user_id
        self.name: str = name


# --- 服务层 ---

class UserService:
    """用户服务类，封装用户相关操作。"""

    def get_user(self, user_id: str) -> Optional[UserData]:
        """根据 ID 获取用户。"""
        # TODO: 添加缓存
        return UserData(user_id, "default")

    def list_users(self) -> List[UserData]:
        """列出所有用户。"""
        return []


# --- 入口 ---

if __name__ == "__main__":
    service = UserService()
    result = service.get_user("1")
    print(result)
