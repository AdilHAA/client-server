# Папки `agent/` и `new_agent/` – интеллект ассистента

Документ описывает две подсистемы, отвечающие за «мозг» AI Assistant:

1.  `agent/news_agent` — классический **LangChain Agent** (инструменты **поиск-→форматирование-→суммаризация**).  
2.  `new_agent/` — более продвинутый пайплайн на LangGraph + собственный парсер новостей; используется как fallback и для расширенных сценариев.

Эти подсистемы вызываются из `app/utils/ai_agent_new.py`.

В продакшн-коде (файл `app/utils/ai_agent_new.py`) **активно используется только `new_agent`**.  
`news_agent` с Mistral оставлен в репозитории как экспериментальная/резервная реализация и по умолчанию **не подключён к REST/WS-эндпоинтам**.

---
## 1. `agent/news_agent/` – классический агент

### 1.1. Точка входа: `agent/news_agent/agent/news_agent.py`

| Раздел | Смысл |
|--------|-------|
| **`__init__`** | Инициализация Mistral LLM (`ChatMistralAI`) + двух LangChain **Tools**: `NewsSearchTool`, `NewsFormatterTool`. |
| **`process_query()`** | Главный публичный метод.  
 1. Быстрая эвристика: ‑ если запрос не содержит «новост» → обычный ответ LLM (без поиска).  
 2. Иначе: `search_tool._run()` (поиск) → `formatter_tool._run()` (скрейпинг HTML → текст) → `_summarize_news()` (LLM-сводка с жёстким промптом).  
 3. Финальный промпт: красиво структурировать результат (заголовки H2/H3, списки, источники). |

### 1.2. Инструменты (`agent/news_agent/agent/tools/`)
* **`search_tool.py`**
  * Наследует `BaseTool` (LangChain).  
  * Делегирует поиск функции **`search_news()`** из `utils/helpers.py`.
* **`formatter_tool.py`**
  * Для каждого URL: `fetch_html_content()` → `extract_text_from_html()` (BeautifulSoup + очистка) → `truncate_text()`.

### 1.3. `utils/helpers.py`
* **`search_tavily_news()`** – при наличии `TAVILY_API_KEY` использует `TavilySearchResults` (LangChain).  
* **`search_duckduckgo_news()`** – парсинг DuckDuckGo News HTML.  
* **`search_news()`** – комбинирует две стратегии; гарантирует `num_results`.
* **HTML utils**: `fetch_html_content`, `extract_text_from_html`, `truncate_text`.

### 1.4. Поток «новостной запрос» (схема)
```
User query ➜ NewsAgent.process_query
         ├─(is_news?)─ no ➜ Mistral LLM → ответ
         └─ yes
             ├─ NewsSearchTool  → search_news()
             ├─ NewsFormatterTool → fetch+scrape each link
             ├─ _summarize_news()  (LLM)
             └─ final_prompt (LLM) → markdown reply
```

---
## 2. `new_agent/` – расширенный LangGraph-агент

Цель — сделать более устойчивый и масштабируемый пайплайн для новостей.

### 2.1. Ключевые файлы
* **`new_agent/main.py`** – монолит >700 строк.
  * Валидатор токена GigaChat (`validate_gigachat_token`) + «заглушки», если токена нет.
  * `safe_model_invoke()` – универсальная обёртка (пытается `.invoke`, `.predict` …).
  * Функции поиска источников (`find_credible_news_sources`), извлечения контента, асинх. скрейпинга.
  * Класс **`AgentState`** – LangGraph state‐node; узлы: `search_sources` → `gather_news` → `generate_response` → `END`.
  * `run_news_agent(query)` – orchestration (StateGraph → run). Используется как fallback.

### 2.2. Библиотеки
* **LangGraph** – декларативный граф LLM-узлов (альтернатива стандартному AgentExecutor).  
* **BeautifulSoup**, **requests** – скрейпинг.
* **langchain_community.tools.tavily_search**, **DuckDuckGoSearchResults** – поиск.
* **langchain_gigachat.GigaChat** – LLM (или мок-класс при отсутствии токена).

### 2.3. Поток (LangGraph)
```
┌──────────┐   search_sources   ┌───────────┐
│   Init   │ ────────────────▶ │  sources  │
└──────────┘                   └───────────┘
       │ gather_news                │
       ▼                            ▼
┌──────────┐                   ┌───────────┐
│  news    │  generate_resp.   │  summary  │
└──────────┘ ────────────────▶ └───────────┘
                             END
```

### 2.4. Почему две реализации парсинга новостей?
* **news_parser_old.get_news_summary** – быстрый синхронный HTML-парсер (без LangChain). Работает через requests/BeautifulSoup, сразу делает сводку LLM. Используется первым.
* **new_agent.run_news_agent** – асинхронный LangGraph-пайплайн с более богатой логикой и GigaChat. Используется как резерв.
В `ai_agent_new.py` логика такая:  
`get_news_summary(query)` → **если ответ пустой / слишком короткий** → `run_news_agent(query)`.

---
## 3. Связь с `ai_agent_new.py`

```
(app/utils/ai_agent_new.py)
  ↓
 _is_news_query(user_text) ?
   ├─ no  → обычный ответ (LLM / web-search)
   └─ yes
        1️⃣ get_news_summary(query)
            │ если длина < MIN
        2️⃣ run_news_agent(query)
            │
         markdown summary → chat.py → WebSocket → клиент
```

---
## 4. Используемые LLM-модели и параметры
| Агент | Модель | Температура | Статус |
|-------|--------|------------|---------|
| news_agent (эксперим.) | `mistral-large-latest` | 0.1 | не задействован по умолчанию |
| new_agent  (основной)  | `GigaChat`            | 0.7 | активная модель в продакшн |

(В обоих случаях возможна «заглушка» MockModel, если API ключей нет.)

---
## 5. Безопасность и ограничения
* URL-фетчинг имеет таймаут + обработку 403/429 (смена User-Agent).
* Ограничение длины контента `truncate_text(..., 8000)`.
* LLM-классификаторы кешируются (`lru_cache`) ⇒ экономия токенов.

---
