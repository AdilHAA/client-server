import asyncio
import json
from functools import lru_cache
import re

# Импортируем инструменты из news_agent
from new_agent.main import run_news_agent, safe_model_invoke, search_tool

# Новый импорт — улучшенный парсер на базе старого агента
from app.utils.news_parser_old import get_news_summary

# Порог, после которого считаем, что news-агент «не смог» ответить
_MIN_MEANINGFUL_LEN = 30

# ----------------------------------------------------------------------------
# Вспомогательные функции
# ----------------------------------------------------------------------------

@lru_cache(maxsize=256)
def _is_news_query(text: str) -> bool:
    """Определяет, является ли запрос *новостным* только через LLM.

    Отправляет запрос в GigaChat (safe_model_invoke) с просьбой вернуть
    строго `news` или `chat`.

    Добавлена быстрая эвристика: если текст короче 20 символов и содержит
    одно из распространённых приветствий/фраз ("как дела", "привет" и т.д.),
    сразу считаем его обычным чатом, чтобы не гонять LLM.
    """

    lower_text = text.lower().strip()
    greeting_triggers = [
        "как дела", "как у тебя дела", "привет", "доброе утро", "добрый вечер",
        "добрый день", "здравствуй", "здравствуйте"
    ]
    if len(lower_text) < 40 and any(g in lower_text for g in greeting_triggers):
        return False  # однозначно не новости

    prompt = (
        "Категоризируй пользовательский запрос строго одним словом: \n"
        "news  –  если пользователь хочет получить актуальные новости/обзор событий;\n"
        "chat  –  если это обычное общение, формальное или дружеское приветствие, \n"
        "личный вопрос или всё, что не требует свежих новостей.\n\n"
        "Примеры (→ ответ):\n"
        "\"Как дела?\" → chat\n"
        "\"Расскажи последние новости про Tesla\" → news\n"
        "\"Привет!\" → chat\n"
        "\"Что происходит на рынке нефти?\" → news\n\n"
        "Верни ТОЛЬКО одно слово (news или chat).\n\n"
        "Запрос: " + text
    )

    try:
        resp = safe_model_invoke(prompt, "chat").strip().lower()
        return resp.startswith("news")
    except Exception:
        # При ошибке классифицируем как обычное общение
        return False

# ----------------------------------------------------------------------------
# Вспомогательная утилита: получить свежую информацию из интернета
# ----------------------------------------------------------------------------

async def _answer_with_web_search(query: str) -> str:
    """Получить ответ на *query*, опираясь на результаты веб-поиска.

    1. Делает поиск (`search_tool.invoke`).
    2. Формирует контекст (до 5 результатов).
    3. Просит LLM ответить, ссылаясь на источники.
    """

    loop = asyncio.get_event_loop()

    # Поиск (может быть блокирующим) – выполняем в треде
    raw_results = await loop.run_in_executor(None, lambda: search_tool.invoke(query)) or []

    # Унификация результатов
    unified: list[dict] = []
    for item in raw_results[:5]:
        if isinstance(item, dict):
            unified.append({
                "title": item.get("title") or item.get("text") or "(без заголовка)",
                "url": item.get("url") or item.get("link") or item.get("href") or item.get("source"),
                "snippet": item.get("body") or item.get("snippet") or "",
            })
        elif hasattr(item, "metadata"):
            unified.append({
                "title": getattr(item, "page_content", "")[:80] or "(контент)",
                "url": item.metadata.get("source") if isinstance(item.metadata, dict) else None,
                "snippet": getattr(item, "page_content", "")[:150],
            })
        elif isinstance(item, str):
            unified.append({"title": item[:80], "url": item, "snippet": ""})

    # Строим контекст для LLM
    sources_text = "\n".join([
        f"[{idx+1}] {u['title']}\nURL: {u['url']}\n{u['snippet']}" for idx, u in enumerate(unified) if u.get("url")
    ])

    prompt = f"""
Ты — ассистент, который отвечает на вопросы, опираясь только на представленные источники.

Вопрос пользователя: "{query}"

Источники:
{sources_text}

Сформулируй краткий, точный ответ на русском языке, ссылаясь (в квадратных скобках) на номера использованных источников.
"""

    return await loop.run_in_executor(None, lambda: safe_model_invoke(prompt, ""))

# ----------------------------------------------------------------------------
# Новый классификатор: нужен ли веб-поиск
# ----------------------------------------------------------------------------

_INFO_QUERY_TRIGGERS = [
    r"\?",                       # любой вопросительный знак
    r"\b(что|когда|кто|почему|зачем|как|сколько|где|какой|какие)\b",
    r"\b(what|when|who|why|how|where|which)\b",
]

@lru_cache(maxsize=256)
def _needs_web_search(text: str) -> bool:
    """Определяет, требуется ли веб-поиск для ответа.

    Если запрос содержит явные вопросительные слова или знак вопроса, считаем,
    что нужна проверка информации. Обычные приветствия/реплики без вопроса не
    должны отдавать ссылки.
    """

    lower = text.lower()

    # Простые эвристики
    if any(re.search(pat, lower) for pat in _INFO_QUERY_TRIGGERS):
        return True

    # Если текст длиннее 120 символов и выглядит как пояснение/рассуждение –
    # обычно ответ без поиска достаточен.
    if len(lower) > 120:
        return False

    # Запасной вариант: быстрый LLM-классификатор
    prompt = (
        "Нужен ли веб-поиск, чтобы корректно ответить на следующий запрос? "
        "Ответь одним словом 'yes' или 'no'. Запрос: " + text
    )
    try:
        return safe_model_invoke(prompt, "no").strip().lower().startswith("y")
    except Exception:
        return False

async def process_message(chat_id: int, user_message: str) -> str:
    """
    Обрабатывает сообщение пользователя с использованием переписанного агента
    """
    try:
        # Проверяем, не является ли сообщение уже JSON-объектом в виде строки
        if user_message.strip().startswith('{') and user_message.strip().endswith('}'):
            try:
                # Попытка распарсить JSON
                json_data = json.loads(user_message)
                # Если в JSON есть поле content, используем его как сообщение
                if isinstance(json_data, dict) and 'content' in json_data:
                    user_message = json_data['content']
                # В противном случае просто обрабатываем весь JSON как текст
            except json.JSONDecodeError:
                # Если это не валидный JSON, используем исходное сообщение
                pass
                
        # Убедимся, что user_message - строка
        if not isinstance(user_message, str):
            user_message = str(user_message)
            
        response = ""

        # Если запрос похож на новостной – сначала пользуемся news-агентом
        if _is_news_query(user_message):
            summary_resp = await asyncio.to_thread(get_news_summary, user_message, 5)
            if summary_resp and len(summary_resp.strip()) >= _MIN_MEANINGFUL_LEN:
                response = summary_resp

            # Если парсер не дал достойного ответа – пробуем fallback-агента
            if not response:
                response = await asyncio.to_thread(run_news_agent, user_message)

        # Если пока нет содержательного ответа
        if not response or len(response.strip()) < _MIN_MEANINGFUL_LEN or "⚠️" in response:

            if _needs_web_search(user_message):
                # ✅ считаем, что нужен поиск
                web_resp = await _answer_with_web_search(user_message)
                if web_resp and len(web_resp.strip()) >= _MIN_MEANINGFUL_LEN:
                    response = web_resp
                else:
                    response = await asyncio.to_thread(safe_model_invoke, user_message, "")
            else:
                # ❌ веб-поиск не нужен – сразу LLM без ссылок
                response = await asyncio.to_thread(safe_model_invoke, user_message, "")

        print(f"AI response length: {len(response) if response else 0}")
        print(f"AI response: {response[:100]}...")  # Выводим начало ответа для отладки
        # Убеждаемся, что возвращаем именно строку
        return response if isinstance(response, str) else json.dumps(response, ensure_ascii=False)
    except Exception as e:
        print(f"Error in process_message: {str(e)}")
        return f"Произошла ошибка при обработке запроса: {str(e)}"