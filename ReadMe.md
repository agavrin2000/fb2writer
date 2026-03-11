FB2 Editor (Photino + Next.js)
Современный редактор электронных книг формата FB2, построенный на связке нативного контейнера .NET (Photino) и веб-интерфейса на Next.js (TipTap).
🏗 Архитектура
Проект представляет собой Monorepo с разделением на фронтенд и бэкенд:

* /frontend: Веб-приложение на Next.js 14, React 18 и Tailwind CSS. Использует редактор TipTap (на базе ProseMirror) для WYSIWYG-правки текста.
* /backend: Нативное приложение на .NET 8/9 с использованием библиотеки Photino.NET. Служит хостом для фронтенда и обеспечивает доступ к файловой системе ОС.

🚀 Быстрый старт (Разработка)
Чтобы использовать Hot Reload (мгновенное обновление интерфейса при правке кода React):

   1. Запустите фронтенд-сервер:
   
   cd frontend
   npm install
   npm run dev
   
   Интерфейс будет доступен по адресу http://localhost:3000.
   2. Запустите .NET приложение:
   * Откройте FB2Editor.sln в Visual Studio.
      * Убедитесь, что выбрана конфигурация Debug.
      * Нажмите F5. Photino автоматически подключится к запущенному серверу Next.js.
   
📦 Сборка (Production)
При сборке в режиме Release, проект автоматически упаковывается в единое нативное приложение:

   1. В Visual Studio переключите конфигурацию на Release.
   2. Начните сборку (Build Solution).
   3. MSBuild автоматически:
   * Запустит npm run build во фронтенде.
      * Выполнит статический экспорт (output: export).
      * Скопирует готовые файлы в папку backend/wwwroot.
      * Скомпилирует исполняемый файл .exe.
   
🛠 Технологический стек

* UI/Editor: TipTap (ProseMirror)
* Frontend Framework: Next.js (App Router)
* Desktop Bridge: Photino.NET
* Styling: Tailwind CSS
* Language: TypeScript & C#

📂 Структура проекта

├── FB2Editor.sln          # Файл решения Visual Studio
├── backend/               # C# проект (Photino хост)
│   ├── Program.cs         # Точка входа, настройка окна
│   └── wwwroot/           # Скомпилированный фронтенд (автогенерация)
├── frontend/              # Next.js проект
│   ├── app/               # Страницы и Layout
│   ├── components/        # React компоненты (Editor, Sidebar, etc.)
│   └── editor/            # Логика TipTap и хуки
└── .gitignore             # Общие правила исключений для Git

📝 Лицензия
MIT
------------------------------
Добавить в README раздел с описанием того, как работает "мост" (Photino Bridge) между JS и C# для сохранения файлов?

