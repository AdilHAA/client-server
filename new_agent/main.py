from gigachat import GigaChat as NativeGigaChat
from langchain_gigachat import GigaChat
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.documents import Document
from langchain_core.tools import Tool
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langgraph.graph import END, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from bs4 import BeautifulSoup
import requests
import json
import os
import base64
from typing import List, Optional, Dict, Any, Union
from dotenv import load_dotenv
import re
from urllib.parse import urljoin

# Загрузка переменных окружения из .env файла
load_dotenv()

# Универсальный User-Agent, чтобы сайты не блокировали наши HTTP-запросы
HEADERS: Dict[str, str] = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0"
}

print(f"GIGACHAT_AUTH_TOKEN найден в .env: {'GIGACHAT_AUTH_TOKEN' in os.environ}")

# Функция для проверки токена GigaChat
def validate_gigachat_token(token: str) -> Dict[str, Any]:
    """
    Проверяет токен GigaChat и возвращает информацию о его валидности.
    
    Args:
        token: Токен в формате 'Basic XXX' или JWT
        
    Returns:
        Dict с информацией о валидности токена
    """
    result = {
        "is_valid": False,
        "format": None,
        "messages": [],
    }
    
    if not token:
        result["messages"].append("Токен отсутствует")
        return result
    
    # Проверка Basic Authentication
    if token.startswith("Basic "):
        result["format"] = "basic"
        base64_part = token[6:]  # Убираем 'Basic ' и получаем base64 часть
        
        try:
            # Попытка декодировать base64
            decoded = base64.b64decode(base64_part).decode('utf-8')
            if ':' in decoded:  # Проверка формата 'client_id:client_secret'
                result["is_valid"] = True
                result["messages"].append(f"Basic аутентификация в правильном формате: '{decoded.split(':')[0]}:***'")
            else:
                result["messages"].append("Basic аутентификация в неправильном формате (отсутствует ':')")
        except Exception as e:
            result["messages"].append(f"Ошибка при декодировании Basic токена: {str(e)}")
    
    # Проверка JWT
    elif token.count('.') == 2:
        result["format"] = "jwt"
        parts = token.split('.')
        
        try:
            # Попытка декодировать заголовок
            header = json.loads(base64.b64decode(parts[0] + '==').decode('utf-8'))
            result["is_valid"] = True
            result["messages"].append(f"JWT токен в правильном формате, алгоритм: {header.get('alg', 'unknown')}")
        except Exception as e:
            result["messages"].append(f"Ошибка при декодировании JWT заголовка: {str(e)}")
    
    else:
        result["messages"].append("Токен не соответствует ни формату Basic Auth, ни JWT")
    
    return result

# Инициализация языковой модели
gigachat_auth_token = os.getenv("GIGACHAT_AUTH_TOKEN")

# Определяю заглушки для случая отсутствия API ключа
class MockModel:
    def invoke(self, prompt):
        class MockResponse:
            def __init__(self, content):
                self.content = content  
        return MockResponse("API ключ не настроен. Запрос не может быть обработан.")

# Объявление глобальной переменной перед использованием
global run_news_agent

# Если токен найден, проверяем его
if gigachat_auth_token:
    print(f"Найден GIGACHAT_AUTH_TOKEN длиной {len(gigachat_auth_token)} символов")
    
    # Исправляем формат токена - удаляем кавычки, если они есть
    if gigachat_auth_token.startswith('"') and gigachat_auth_token.endswith('"'):
        gigachat_auth_token = gigachat_auth_token[1:-1]
    
    # Удаляем все переносы строк, но сохраняем пробелы для формата "Basic <token>"
    gigachat_auth_token = gigachat_auth_token.strip().replace("\n", "").replace("\r", "")
    
    try:
        # Функция для тестирования соединения с API GigaChat
        def test_gigachat_connection(credentials):
            """
            Тестирует соединение с API GigaChat и возвращает результат
            
            Returns:
                tuple: (успех (bool), сообщение (str))
            """
            try:
                # Пробуем выполнить простой запрос к API для проверки соединения
                test_client = NativeGigaChat(
                    credentials=credentials,
                    verify_ssl_certs=False,
                    scope="GIGACHAT_API_PERS"
                )
                
                # Получаем список доступных моделей - это простой запрос для проверки API
                models = test_client.get_models()
                model_names = []
                
                # Более надежный способ получения имен моделей
                for m in models.data:
                    # Надёжно пытаемся вытащить имя модели
                    model_name = getattr(m, "id", None) or getattr(m, "name", None) or str(m)
                    model_names.append(str(model_name))
                
                # Если не удалось получить имена моделей, просто сообщаем, что соединение установлено
                if not model_names:
                    return True, "Соединение с API установлено успешно"
                    
                return True, f"Доступны модели: {', '.join(model_names)}"
            except Exception as e:
                return False, str(e)
                
        # Тестируем соединение
        connection_success, connection_message = test_gigachat_connection(gigachat_auth_token)
        
        if not connection_success:
            print(f"ВНИМАНИЕ: Не удалось подключиться к GigaChat API. {connection_message}")
            model = MockModel()
            
            # Определяем функцию-заглушку при ошибке API
            def error_run_news_agent(query):
                """Заглушка для запуска агента при ошибке инициализации API ключа"""
                return f"""
# ⚠️ Ошибка инициализации GigaChat API

При попытке подключения к GigaChat API произошла ошибка:
{connection_message}

Убедитесь, что:
1. Токен в переменной GIGACHAT_AUTH_TOKEN действителен
2. Формат токена корректен (проверьте, нет ли переносов строк)
3. У вас есть подключение к интернету
4. Убедитесь, что используется формат "Basic ВАШ_ТОКЕН" или JWT токен

Ваш запрос: "{query}"
"""
            
            run_news_agent = error_run_news_agent
        else:
            # Пробуем использовать нативный GigaChat клиент для прямого доступа
            native_model = NativeGigaChat(
                credentials=gigachat_auth_token,
                verify_ssl_certs=False,
                scope="GIGACHAT_API_PERS"
            )
            
            # Для langchain используем wrapper
            model = GigaChat(
                credentials=gigachat_auth_token,
                model="GigaChat",
                temperature=0.7,
                verify_ssl_certs=False,
                scope="GIGACHAT_API_PERS"
            )
            
            # Проверяем работоспособность модели простым запросом
            try:
                test_response = native_model.chat("Привет")
                print(f"Тестовый вызов GigaChat API успешен: {test_response.choices[0].message.content[:20]}...")
            except Exception as e:
                print(f"Ошибка при тестовом вызове GigaChat: {e}")
        
    except Exception as e:
        print(f"Ошибка при инициализации GigaChat: {e}")
        # Возвращаемся к заглушке
        model = MockModel()
        
        # Определяем функцию-заглушку при ошибке API
        def mock_run_news_agent(query):
            """Заглушка для запуска агента при ошибке инициализации API ключа"""
            return """
# ⚠️ Отсутствует API ключ

Для полноценной работы агента необходимо добавить GIGACHAT_AUTH_TOKEN в файл .env. 

## Что нужно сделать:
1. Создайте файл .env в корне проекта (он уже создан)
2. Добавьте строку: GIGACHAT_AUTH_TOKEN=ваш_base64_токен_здесь
3. Перезапустите сервер

Ваш запрос: "{}"
""".format(query)

        # Присваиваем функцию-заглушку глобальной переменной
        run_news_agent = mock_run_news_agent
else:
    print("ВНИМАНИЕ: GIGACHAT_AUTH_TOKEN не найден в переменных окружения")
    # Заглушка для переменной model, чтобы не было ошибок в функциях, использующих эту переменную
    model = MockModel()
    
    # Заглушка для работы без API ключа
    def mock_run_news_agent(query):
        """Заглушка для запуска агента при отсутствии API ключа"""
        return """
# ⚠️ Отсутствует API ключ

Для полноценной работы агента необходимо добавить GIGACHAT_AUTH_TOKEN в файл .env. 

## Что нужно сделать:
1. Создайте файл .env в корне проекта (он уже создан)
2. Добавьте строку: GIGACHAT_AUTH_TOKEN=ваш_base64_токен_здесь
3. Перезапустите сервер

Ваш запрос: "{}"
""".format(query)

    # Присваиваем функцию-заглушку глобальной переменной
    run_news_agent = mock_run_news_agent

# Безопасная обертка для вызова модели
def safe_model_invoke(prompt: str, default: str = "Не удалось получить ответ от модели") -> str:
    """
    Безопасно вызывает модель LangChain или GigaChat, обрабатывая различные типы моделей
    и возвращая текстовый ответ. Предпочитает .invoke, затем .predict, затем .chat.

    Порядок проверки:
    1. `invoke`  – стандартный метод для LangChain (возвращает объект с `content` или строку).
    2. `predict` – более старый метод LangChain (обычно возвращает строку).
    3. `chat`    – нативный клиент GigaChat.
    """
    try:
        global model  # обеспечиваем доступ к глобальной переменной model

        # 1. invoke (LangChain BaseChatModel или другие вызываемые объекты)
        if hasattr(model, "invoke"):
            try:
                from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage  # локальный импорт

                # Если модель Chat, ей чаще всего нужен список сообщений
                # Проверяем, является ли prompt уже списком сообщений
                if isinstance(prompt, list) and all(isinstance(m, BaseMessage) for m in prompt):
                    invoke_input = prompt
                elif isinstance(prompt, str):
                    invoke_input = [HumanMessage(content=prompt)]
                else:
                    # Если это не строка и не список сообщений, пытаемся передать как есть
                    invoke_input = prompt # type: ignore[var-annotated]


                response = model.invoke(invoke_input)  # type: ignore[arg-type]
                
                if hasattr(response, "content") and isinstance(response.content, str):
                    return response.content
                elif isinstance(response, str):
                    return response
                # Для некоторых моделей AIMessage может быть сама ответом
                elif isinstance(response, AIMessage) and isinstance(response.content, str):
                    return response.content
                else:
                    # Если не можем извлечь строку, пробуем привести к строке
                    # Это может помочь для нестандартных ответов, но может быть не всегда корректно
                    return str(response) 
            except Exception as e_invoke:
                print(f"Ошибка при model.invoke: {e_invoke}, пробуем model.predict")
                pass  # перейдём к другим вариантам

        # 2. predict (более старый метод LangChain)
        if hasattr(model, "predict"):
            try:
                # predict обычно ожидает строку
                if not isinstance(prompt, str):
                    # Пытаемся преобразовать в строку, если это список сообщений
                    if isinstance(prompt, list) and prompt and hasattr(prompt[0], "content"):
                        predict_input = str(prompt[0].content)
                    else: # Иначе просто преобразуем в строку
                        predict_input = str(prompt)
                else:
                    predict_input = prompt
                
                response_predict = model.predict(predict_input)  # type: ignore[arg-type]
                if isinstance(response_predict, str):
                    return response_predict
                else:
                    # Если predict вернул не строку, пробуем привести к строке
                    return str(response_predict)

            except Exception as e_predict:
                print(f"Ошибка при model.predict: {e_predict}, пробуем model.chat")
                pass # перейдём к GigaChat .chat

        # 3. chat (нативный клиент GigaChat)
        if hasattr(model, "chat"):
            try:
                # GigaChat .chat обычно ожидает строку
                if not isinstance(prompt, str):
                    if isinstance(prompt, list) and prompt and hasattr(prompt[0], "content"):
                         chat_input = str(prompt[0].content)
                    else:
                         chat_input = str(prompt)
                else:
                    chat_input = prompt

                response_chat = model.chat(chat_input)  # type: ignore[arg-type]
                if hasattr(response_chat, "choices") and response_chat.choices:
                    choice0 = response_chat.choices[0]
                    if hasattr(choice0, "message") and hasattr(choice0.message, "content") and isinstance(choice0.message.content, str):
                        return choice0.message.content
                # Если структура ответа другая, пробуем привести к строке
                return str(response_chat)
            except Exception as e_chat:
                print(f"Ошибка при model.chat: {e_chat}")
                pass # Все методы не удались

        print(f"Все методы вызова модели (invoke, predict, chat) не удались для prompt: {str(prompt)[:100]}...")
        return default
    except Exception as e:
        print(f"Непредвиденная ошибка при вызове модели: {e}")
        return default

# Инициализация инструментов поиска
tavily_api_key = os.getenv("TAVILY_API_KEY")
if tavily_api_key:
    # Берём сразу побольше документов от Tavily
    search_tool = TavilySearchResults(max_results=10, tavily_api_key=tavily_api_key)
else:
    print("TAVILY_API_KEY not set; using DuckDuckGoSearchResults as search tool")
    # Увеличиваем количество результатов у DuckDuckGo
    search_tool = DuckDuckGoSearchResults(num_results=15, output_format="list")

def validate_news_source(url):
    """
    Оценивает достоверность новостного источника по нескольким критериям
    """
    try:
        # Проверка доступности URL
        response = requests.get(url, timeout=8, headers=HEADERS)
        if response.status_code != 200:
            return {"score": 0, "reason": "Сайт недоступен"}
        
        # Анализ контента
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Вспомогательная функция для безопасной проверки class_ атрибутов
        def _class_contains(sub: str):
            return lambda value: (
                isinstance(value, str) and sub in value.lower()
            ) or (
                isinstance(value, (list, tuple, set)) and any(isinstance(v, str) and sub in v.lower() for v in value)
            )

        has_articles = bool(soup.find_all('article') or soup.find_all(class_=_class_contains('article')))
        has_dates = bool(
            soup.find_all(['time', 'date']) or
            soup.find_all(class_=_class_contains('date')) or
            soup.find_all(class_=_class_contains('time'))
        )
        has_authors = bool(soup.find_all(class_=_class_contains('author')))
        
        # Базовая оценка
        score = sum([has_articles * 0.4, has_dates * 0.3, has_authors * 0.3])
        
        # Дополнительная проверка через LLM для более глубокого анализа
        content_sample = soup.get_text()[:2000]  # Ограничиваем размер для анализа
        
        prompt = f"""
        Оцени насколько данный сайт является надежным источником новостей по шкале от 0 до 10.
        Учти следующие факторы:
        - Наличие датированных статей
        - Указание авторов
        - Профессиональный стиль изложения
        - Отсутствие явной предвзятости
        
        Текст для анализа: {content_sample}
        
        Верни только число оценки от 0 до 10 и короткое обоснование.
        """
        
        llm_assessment = safe_model_invoke(prompt, "5 - Не удалось проанализировать достоверность источника")
        
        # Извлекаем числовую оценку из ответа LLM
        try:
            llm_score = float([int(s) for s in llm_assessment.split() if s.isdigit()][0]) / 10
            final_score = (score * 0.3) + (llm_score * 0.7)  # Взвешенная комбинация оценок
        except:
            final_score = score
            
        return {
            "score": final_score,
            "url": url,
            "reason": llm_assessment
        }
    except Exception as e:
        return {"score": 0, "url": url, "reason": f"Ошибка при анализе: {str(e)}"}

# Инструмент для поиска достоверных новостных источников
def find_credible_news_sources(query):
    """Находит и оценивает достоверные новостные источники по запросу.

    Функция устойчива к различным форматам, которые может вернуть `search_tool.invoke`,
    включая:
    1. list[dict]  – типичный результат `TavilySearchResults`.
    2. list[Document] – результат `DuckDuckGoSearchResults` (или других поисковых
       инструментов LangChain).
    3. list[str] – если поиск вернул только ссылки строками.
    """

    # Переводим запрос на английский, если он содержит кириллицу – так результаты будут богаче
    def _translate(text: str) -> str:
        if any('а' <= ch.lower() <= 'я' for ch in text):
            tr_prompt = f"Переведи следующую фразу на английский, чтобы использовать её как поисковый запрос. Верни только перевод без кавычек: {text}"
            translated = safe_model_invoke(tr_prompt, text)
            return translated.strip().strip('\"\'')
        return text

    search_phrase = _translate(query)

    # Запрашиваем потенциальные источники
    raw_results = search_tool.invoke(f"reliable news sources for {search_phrase}") or []

    validated_sources: list[dict] = []

    for item in raw_results:
        # Унифицируем данные о ссылке и заголовке
        url: str | None = None
        title: str | None = None

        # --- Вариант 1: результат – dict ------------------------------------
        if isinstance(item, dict):
            # Возможные ключи url в ответах разных движков
            url = item.get("url") or item.get("link") or item.get("href") or item.get("source")
            title = item.get("title") or item.get("text") or item.get("body")

        # --- Вариант 2: результат – Document --------------------------------
        elif hasattr(item, "metadata"):
            meta = getattr(item, "metadata", {}) or {}
            url = meta.get("source") or meta.get("url") or meta.get("link")
            # Если page_content длинный – используем первые 100 символов в качестве «title»
            title = getattr(item, "page_content", "")[:100] if hasattr(item, "page_content") else None

        # --- Вариант 3: результат – просто строка ---------------------------
        elif isinstance(item, str):
            url = item
            title = item

        # Если не нашли url – пропускаем запись
        if not url:
            continue

        # Валидируем источник
        validation = validate_news_source(url)

        # Добавляем, если источник прошёл порог
        if validation.get("score", 0) >= 0.4:
            validated_sources.append({
                "url": url,
                "title": title or url,
                "credibility_score": validation["score"],
                "assessment": validation["reason"],
            })

    return validated_sources

# Создание инструмента для агента
find_sources_tool = Tool(
    name="FindCredibleNewsSources",
    description="Находит и оценивает надежные новостные источники по запросу",
    func=find_credible_news_sources
)

def extract_news_from_source(url, topic):
    """
    Извлекает новостные статьи по теме из конкретного источника
    """
    try:
        response = requests.get(url, timeout=10, headers=HEADERS)
        soup = BeautifulSoup(response.text, "html.parser")

        # Собираем все ссылки <a>
        anchors = soup.find_all("a", href=True)
        topic_words = re.findall(r"[\w-]+", topic.lower())

        candidate_articles: list[dict[str, str]] = []

        for a in anchors:
            href: str = a["href"].strip()
            text: str = (a.get_text() or "").strip()

            # Фильтрация по ключевым словам в тексте ссылки или URL
            haystack = f"{text.lower()} {href.lower()}"
            if any(word in haystack for word in topic_words):
                full_url = urljoin(url, href)
                if not full_url.startswith("http") or any(full_url.startswith(p["url"]) for p in candidate_articles):
                    continue
                candidate_articles.append({"title": text or full_url, "url": full_url})

            if len(candidate_articles) >= 5:
                break

        articles: list[dict[str, str]] = []
        for art in candidate_articles:
            try:
                art_resp = requests.get(art["url"], timeout=10, headers=HEADERS)
                if art_resp.status_code != 200:
                    continue
                art_soup = BeautifulSoup(art_resp.text, "html.parser")
                article_text = art_soup.get_text(separator=" ", strip=True)[:6000]

                summary_prompt = (
                    "Сделай краткое (2–3 предложения) резюме следующей статьи по теме \"" + topic + "\". "
                    "Если известно, укажи дату (формат YYYY-MM-DD). Верни JSON вида {\"summary\": \"...\", \"date\": \"YYYY-MM-DD или blank\"}. "
                    "Текст статьи: " + article_text
                )
                summary_resp = safe_model_invoke(summary_prompt, "{\"summary\": \"Не удалось извлечь содержание\", \"date\": \"\"}")

                try:
                    summary_json = json.loads(summary_resp) if isinstance(summary_resp, str) else {}
                except json.JSONDecodeError:
                    summary_json = {"summary": summary_resp}

                articles.append({
                    "title": art["title"],
                    "url": art["url"],
                    "summary": summary_json.get("summary", ""),
                    "date": summary_json.get("date", ""),
                })
            except Exception as sub_e:
                print(f"Не удалось обработать статью {art['url']}: {sub_e}")

        return {"articles": articles}

    except Exception as e:
        return {"articles": [], "error": f"Ошибка при обработке источника: {str(e)}"}

# Инструмент для сбора новостей из валидированных источников
def collect_news(sources, topic):
    """
    Собирает новости по теме из списка источников
    """
    all_news = []
    
    for source in sources:
        news = extract_news_from_source(source['url'], topic)
        if news.get('articles'):
            for article in news['articles']:
                article['source'] = source['title']
                article['source_url'] = source['url']
                article['source_credibility'] = source['credibility_score']
                all_news.append(article)
                
    return all_news

# Создание инструмента для агента
collect_news_tool = Tool(
    name="CollectNewsArticles",
    description="Собирает новостные статьи по теме из списка источников",
    func=lambda x: collect_news(json.loads(x)['sources'], json.loads(x)['topic'])
)

# Определим структуру состояния
class AgentState:
    def __init__(self, query: str = "", sources: Optional[List[dict]] = None, news: Optional[List[dict]] = None, response: Optional[str] = None):
        self.query = query
        self.sources = sources if sources is not None else []
        self.news = news if news is not None else []
        self.response = response
    
    def dict(self):
        return {
            "query": self.query,
            "sources": self.sources,
            "news": self.news,
            "response": self.response
        }

# Функции для каждого узла графа
def search_sources(state):
    """Поиск достоверных источников новостей по запросу"""
    query = state.query
    sources = find_sources_tool.invoke(query)
    return {"sources": sources}

def gather_news(state):
    """Сбор новостей из найденных источников"""
    query = state.query
    sources = state.sources
    if not sources:
        return {"news": [], "next": "generate_response"}
    
    input_data = json.dumps({"sources": sources, "topic": query})
    news = collect_news_tool.invoke(input_data)
    
    return {"news": news}

def generate_response(state):
    """Генерация итогового ответа на основе собранных данных"""
    query = state.query
    sources = state.sources
    news_data = state.news or []
    
    # Преобразуем данные в строки для подстановки в промпт
    sources_str = json.dumps(sources, indent=2, ensure_ascii=False)
    news_str = json.dumps(news_data, indent=2, ensure_ascii=False)
    
    # Создаем итоговый ответ
    prompt = f"""
    На основе следующих новостей, предоставь структурированный русскоязычный обзор по теме: "{query}"
    
    Информация о источниках:
    {sources_str}
    
    Собранные новости:
    {news_str}
    
    Сделай следующее:
    1. Краткое резюме основных событий и тенденций (5-7 предложений)
    2. Основные факты и детали (в виде маркированного списка)
    3. Различные точки зрения, если такие представлены
    4. Укажи источники информации
    
    Ответ сформируй в виде четко структурированного отчета с заголовками.
    """
    
    response = safe_model_invoke(prompt, f"""
# Не удалось сгенерировать обзор

К сожалению, возникла ошибка при обработке вашего запроса по теме "{query}".

## Причины возможных проблем:
- Проблемы с API ключом
- Ошибка при обработке данных
- Недостаточно информации для генерации обзора

Пожалуйста, убедитесь, что в файле .env указан действующий API ключ GIGACHAT_AUTH_TOKEN.
""")
    return {"response": response, "next": END}

# Создание графа для рабочего процесса агента
workflow = StateGraph(AgentState)

# Добавление узлов
workflow.add_node("search_sources", search_sources)
workflow.add_node("gather_news", gather_news)
workflow.add_node("generate_response", generate_response)

# Определение потока
workflow.set_entry_point("search_sources")
workflow.add_edge("search_sources", "gather_news")
workflow.add_edge("gather_news", "generate_response")

# Компиляция графа
memory = MemorySaver() # Инициализация сессии ДО компиляции
news_agent = workflow.compile(checkpointer=memory)

def run_news_agent(query):
    """
    Запускает агента для поиска новостей по запросу
    """
    # Простая проверка входных данных
    if not isinstance(query, str):
        return f"Ошибка: запрос должен быть строкой, получен тип {type(query)}"
        
    # Запуск агента
    config = {"configurable": {"thread_id": f"news_query_{hash(query)}"}}
    
    # Для потокового вывода
    results = {"final_response": ""}
    try:
        for step in news_agent.stream(  # type: ignore[arg-type]
            {"query": query},
            config,  # type: ignore[arg-type]
            stream_mode="values"
        ):
            current_state = step.values()
            
            # Проверяем наличие ключа response
            if isinstance(current_state, dict) and "response" in current_state and current_state["response"]:
                results["final_response"] = current_state["response"]
        
        return results["final_response"]
    except Exception as e:
        print(f"Ошибка при выполнении news_agent: {str(e)}")
        return f"Произошла ошибка при обработке запроса: {str(e)}"

# Пример использования
if __name__ == "__main__":
    query = input("Введите тему для поиска новостей: ")
    
    print(f"\nНачинаю поиск новостей по теме: {query}")
    print("Это может занять некоторое время...\n")
    
    result = run_news_agent(query)
    print("\nРезультат поиска:\n")
    print(result)

import asyncio
from concurrent.futures import ThreadPoolExecutor

async def extract_news_async(sources, topic):
    """
    Асинхронно извлекает новости из списка источников
    """
    async def process_source(source):
        with ThreadPoolExecutor() as executor:
            result = await asyncio.get_event_loop().run_in_executor(
                executor, 
                extract_news_from_source, 
                source['url'], 
                topic
            )
            for article in result.get('articles', []):
                article['source'] = source['title']
                article['source_url'] = source['url']
                article['source_credibility'] = source['credibility_score']
            return result.get('articles', [])
    
    tasks = [process_source(source) for source in sources]
    results = await asyncio.gather(*tasks)
    
    all_news = []
    for articles in results:
        all_news.extend(articles)
    
    return all_news