import sys
import os
import asyncio
from typing import Dict
from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
from langchain.memory import ConversationBufferWindowMemory
from langchain.llms.base import LLM
from typing import Optional, List, Any

from agent.news_agent.agent.news_agent import NewsAgent
from new_agent.main import run_news_agent

# Инициализация NewsAgent и LLM
_news_agent = NewsAgent()

# Обёртка для ChatMistralAI, реализующая LLM
class MistralLLM(LLM):
    chat_model: Any

    @property
    def _identifying_params(self) -> Dict[str, any]:
        return {"model": getattr(self.chat_model, "model", "mistral"), "type": "mistral"}

    @property
    def _llm_type(self) -> str:
        return "mistral"

    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        # Используем ChatMistralAI.invoke для получения ответа
        result = self.chat_model.invoke(prompt)
        return result.content

_llm = MistralLLM(chat_model=_news_agent.llm)

# Инструмент для поиска и суммаризации новостей
news_tool = Tool(
    name="news_tool",
    func=lambda query: _news_agent.process_query(query),
    description="Поиск и суммаризация новостей по запросу пользователя"
)

def get_memory(chat_id: int) -> ConversationBufferWindowMemory:
    """
    Возвращает или создает память для данного чата (последние 5 сообщений).
    """
    if chat_id not in _memories:
        _memories[chat_id] = ConversationBufferWindowMemory(
            memory_key="chat_history", k=5, return_messages=True
        )
    return _memories[chat_id]

# Хранилище память для каждого чата
_memories: Dict[int, ConversationBufferWindowMemory] = {}

async def process_message(chat_id: int, user_message: str) -> str:
    """
    Обрабатывает сообщение пользователя с использованием переписанного агента
    """
    # Вызываем новый агент в отдельном потоке, чтобы не блокировать event loop
    return await asyncio.to_thread(run_news_agent, user_message) 