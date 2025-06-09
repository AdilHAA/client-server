import json
from typing import List, Dict, Any

from agent.news_agent.utils.helpers import (
    search_news,
    fetch_html_content,
    extract_text_from_html,
    truncate_text,
)

from new_agent.main import safe_model_invoke

# Максимальное число новостей для выборки и суммаризации
_MAX_RESULTS = 7


def _collect_articles(query: str, num_results: int = 5) -> List[Dict[str, Any]]:
    """Ищет статьи через search_news и извлекает их содержимое.

    Возвращает список словарей с ключами: title, url, source, date, content.
    """
    # Переводим запрос при необходимости (английские ключи дают больше результатов)
    query_en = _translate_if_needed(query)
    raw_results = search_news(query_en, num_results * 2) # Запрашиваем больше, чтобы было из чего выбирать после дедупликации

    articles: List[Dict[str, Any]] = []
    processed_urls = set()
    for r in raw_results:
        url = r.get("link") or r.get("url")
        if not url or url in processed_urls:
            continue

        # Пропускаем явные non-article ресурсы, которые плохо парсятся
        if any(bad in url for bad in ["youtube.com", "youtu.be", "quora.com"]):
            continue
        
        processed_urls.add(url)
        if len(articles) >= num_results: # Если уже набрали нужное количество уникальных статей
            break

        html = fetch_html_content(url) or ""
        text = extract_text_from_html(html) if html else ""
        text = truncate_text(text) if text else r.get("snippet", "")

        articles.append(
            {
                "title": r.get("title", ""),
                "url": url,
                "source": r.get("source", ""),
                "date": r.get("published_date", ""),
                "content": text,
            }
        )

    return articles


def get_news_summary(query: str, num_results: int = 5) -> str:
    """Формирует сводку новостей по *query*.

    1. Ищет релевантные статьи с помощью search_news (Google News/DuckDuckGo).
    2. Извлекает содержимое статей.
    3. Просит LLM (safe_model_invoke) сформировать отчёт с цитированием источников.
    """
    try:
        num_results = min(num_results, _MAX_RESULTS)
        articles = _collect_articles(query, num_results)
        if not articles:
            return ""

        # Формируем нумерованный список источников для промпта
        sources_block_lines = []
        content_block_lines = []
        for idx, art in enumerate(articles, 1):
            sources_block_lines.append(f"[{idx}] {art['title']} — {art['url']}")
            # В контент берём первые 2000 символов, чтобы не переполнить промпт
            content_excerpt = (art["content"] or "")[:2000]
            content_block_lines.append(
                f"СТАТЬЯ [{idx}]:\nИсточник: {art['source']}\nДата: {art['date']}\nURL: {art['url']}\n{content_excerpt}\n"
            )

        sources_block = "\n".join(sources_block_lines)
        content_block = "\n".join(content_block_lines)

        prompt = f"""
Ты — опытный аналитик новостей. На основе приведённых ниже статей составь детальный обзор по теме: "{query}".

Требования к ответу:
1. В начале дай развернутый вводный обзор (7–10 предложений).
2. Затем перечисли детально разобранные ключевые факты и события маркированным списком. Для каждого факта старайся привести больше подробностей, цифр, имен и названий из исходных статей, если они доступны.
3. При описании каждого ключевого факта или события, стремись органично включать информацию о том, КТО совершил действие, ЧТО именно было сделано, и КАКИЕ результаты или эффекты это повлекло (приводи цифры, даты, если они есть), не выделяя это в отдельные тематические блоки.
4. Если есть разные точки зрения, отрази их отдельно, также с подробностями.
5. Вставляй ссылки на источники в виде номеров в квадратных скобках, например [2], используя номера из предоставленного ниже списка источников.
6. Общий объем ответа должен быть не менее 300-400 слов, если позволяет информация из источников.

Важно писать конкретно, без вымышленных данных.

===== КОНТЕНТ СТАТЕЙ =====
{content_block}

===== КОНЕЦ КОНТЕНТА =====

Список источников (используй эти номера для ссылок в тексте):
{sources_block}

Сформируй ответ на русском языке.
"""
        summary = safe_model_invoke(prompt, "")

        # Гарантируем, что список источников будет присутствовать в ответе,
        # даже если LLM его не добавил.
        summary_with_sources = (
            summary.rstrip() + "\n\nИсточники:\n" + sources_block
        )

        return summary_with_sources
    except Exception as e:
        print(f"Ошибка в get_news_summary: {e}")
        return ""

# ----------------------------------------------------------------------------
# Вспомогательные функции
# ----------------------------------------------------------------------------

def _translate_if_needed(text: str) -> str:
    """Переводит text на английский, если в нём есть кириллица."""
    if any('а' <= ch.lower() <= 'я' for ch in text):
        prompt = (
            "Переведи следующую фразу на английский, чтобы использовать её как поисковый запрос. Верни ТОЛЬКО перевод без кавычек: "
            + text
        )
        translated = safe_model_invoke(prompt, text)
        return translated.strip().strip('"\'')
    return text 