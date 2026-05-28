from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket


class TenantRealtimeManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, tenant_slug: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(tenant_slug, set()).add(websocket)

    async def disconnect(self, tenant_slug: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._connections.get(tenant_slug)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._connections.pop(tenant_slug, None)

    async def broadcast(self, tenant_slug: str, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._connections.get(tenant_slug, set()))

        if not sockets:
            return

        dead: list[WebSocket] = []
        message = {
            "type": "admin_change",
            "created_at": datetime.now(timezone.utc).isoformat(),
            **payload,
        }
        for websocket in sockets:
            try:
                await websocket.send_json(message)
            except Exception:
                dead.append(websocket)

        for websocket in dead:
            await self.disconnect(tenant_slug, websocket)


admin_realtime_manager = TenantRealtimeManager()


async def broadcast_tenant_event(tenant_slug: str, payload: dict[str, Any]) -> None:
    await admin_realtime_manager.broadcast(tenant_slug, payload)
