#!/bin/bash

# Скрипт для деплоя приложения

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "Создание .env файла из example_dotenv..."
    cp example_dotenv .env
    echo "ВНИМАНИЕ: Необходимо заполнить токены в файле .env!"
    exit 1
fi

# Проверка наличия Docker и Docker Compose
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "Установка Docker и Docker Compose..."
    sudo apt update
    sudo apt install -y docker.io docker-compose
    sudo systemctl enable --now docker
    sudo usermod -aG docker $USER
    echo "Пожалуйста, перезапустите сессию для применения изменений группы docker"
    exit 1
fi

# Запуск контейнеров
echo "Запуск приложения..."
docker-compose down
docker-compose up -d --build

echo "Приложение запущено!"
echo "- Фронтенд доступен по адресу: http://localhost"
echo "- API доступно по адресу: http://localhost:8080"
echo "- Статус API: http://localhost:8080/status" 