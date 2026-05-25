using System.Text.Json;
using Photino.NET;

namespace FB2Writer.Services;

/// <summary>
/// Центральный компонент приложения, отвечающий за обработку входящих сообщений из веб-интерфейса (frontend).
/// Организует маршрутизацию команд, взаимодействие с <see cref="FileService"/> и отправку ответов обратно.
/// Является связующим звеном между UI и бизнес-логикой.
/// <param name="window">Экземпляр окна Photino, используемый для отправки сообщений во frontend.</param>
/// <param name="fileService">Сервис для выполнения операций с файлами: открытие, сохранение, выбор изображений.</param>
/// <param name="initialFile">Опциональный путь к файлу, который должен быть загружен сразу после запуска приложения.</param>

/// </summary>
public class MessageHub(PhotinoWindow window, FileService fileService, string? initialFile)
{
    /// <summary>
    /// Флаг, определяющий необходимость подтверждения выхода из приложения
    /// По умолчанию: выход  без подтверждения запрещен
    /// </summary>
    public bool canClose = false;

    /// <summary>
    /// Хранит путь к последней использованной директории для открытия или сохранения файлов.
    /// Используется для улучшения пользовательского опыта, запоминая место предыдущей операции.
    /// Инициализируется папкой "Мои документы".
    /// </summary>
    private string? _lastUsedPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

    /// <summary>
    /// Основной метод, принимающий и обрабатывающий все входящие сообщения из веб-интерфейса.
    /// Парсит JSON-сообщение, определяет тип команды и вызывает соответствующий обработчик.
    /// Обрабатывает ошибки на уровне диспетчера и отправляет их во frontend.
    /// </summary>
    /// <param name="sender">Источник события (обычно не используется).</param>
    /// <param name="message">JSON-строка, содержащая команду в формате { "type": "command", "payload": {...} }.</param>
    public async void Handle(object? sender, string message)
    {
        try
        {
            using JsonDocument doc = JsonDocument.Parse(message);
            JsonElement root = doc.RootElement;

            string command = root.GetProperty("type").GetString() ?? "";

            root.TryGetProperty("payload", out JsonElement payload);

            switch (command)
            {
                case "app-ready":
                    await HandleAppReady();
                    break;

                case "open-file":
                    await HandleOpenFile();
                    break;

                case "save-file":
                    await HandleSaveFile(payload);
                    break;

                case "export-epub":
                    await HandleEpubExport(payload);
                    break;

                case "select-image":
                    await HandleSelectImage(payload);
                    break;

                case "close-app":
                    canClose = true;
                    window.Close();
                    break;

                case "set-file-name":
                    UpdateWindowTitle(payload.GetString() ?? "");
                    break;

                default:
                    Console.WriteLine($"[C# Unknown Command]: {command}");
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[C# Error in: {ex.Message}");
            Emit("error", ex.Message);
        }
    }

    /// <summary>
    /// Обрабатывает команду "app-ready" — сигнал от frontend о том, что приложение готово к работе.
    /// Отправляет информацию о приложении и, при наличии, автоматически загружает переданный при запуске файл.
    /// </summary>
    private async Task HandleAppReady()
    {
        // 1. Инфо о приложении
        var appDetails = new AppDetails(AppInfo.FriendlyName, AppInfo.Version);
        Emit("app-info", appDetails);

        // Передаем словари
            string affPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Dictionaries", "ru", "ru_RU.aff");
            string dicPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Dictionaries", "ru", "ru_RU.dic");

            if (File.Exists(affPath) && File.Exists(dicPath))
            {
                // Читаем текст файлов
                string affContent = File.ReadAllText(affPath);
                string dicContent = File.ReadAllText(dicPath);
                var dictionary = new DictionaryDetails("ru", affContent, dicContent);
                Emit("dict", dictionary);
            }
            else
            {
                Console.WriteLine("Критическая ошибка: Файлы словарей не найдены на диске!");
            }



        // 2. Открытие переданного файла
        if (!string.IsNullOrEmpty(initialFile))
        {
            Emit("fb2-content", await fileService.LoadFileByPathAsync(initialFile));
            UpdateWindowTitle(initialFile);
            initialFile = null;
        }
        else
        {
            Emit("cancel-loading");
        }
    }

    /// <summary>
    /// Обрабатывает команду "open-file" — запрос на открытие FB2-файла.
    /// Открывает нативный диалог выбора файла, загружает содержимое и отправляет его во frontend.
    /// </summary>
    private async Task HandleOpenFile()
    {
        string? path = await ChooseFileAsync("Выберите книгу", [("Книги FB2", ["fb2", "fb2.zip"]), ("Все файлы", ["*"])], "open");
        if (string.IsNullOrEmpty(path))
        {
            Emit("cancel-loading");
            return;
        }

        Emit("start-loading", Path.GetFileName(path));
        Emit("fb2-content", await fileService.LoadFileByPathAsync(path));
        UpdateWindowTitle(path);
    }

    /// <summary>
    /// Обрабатывает команду "save-file" — запрос на сохранение текущего документа.
    /// Если путь не указан, открывается диалог выбора места сохранения.
    /// Выполняет сохранение через <see cref="FileService"/> и уведомляет об успехе.
    /// </summary>
    /// <param name="payload">JSON-элемент с данными для сохранения, включая содержимое и опциональный путь.</param>
    private async Task HandleSaveFile(JsonElement payload)
    {
        if (payload.ValueKind == JsonValueKind.Null || payload.ValueKind == JsonValueKind.Undefined)
            return;
        string? localPath = payload.TryGetProperty("filePath", out var p) ? p.GetString() : null;

        if (string.IsNullOrEmpty(localPath))
        {
            localPath = await ChooseFileAsync("Сохранить книгу", [("Электронные книги FB2", ["fb2"]), ("Сжатые книги FB2 (ZIP)", ["fb2.zip"])], "save");
            if (string.IsNullOrEmpty(localPath))
            {
                Emit("cancel-loading");
                return;
            }
        }

        string fileName = Path.GetFileName(localPath);
        Emit("start-saving", fileName);
        await fileService.SaveFileAsync(payload, localPath);
        UpdateWindowTitle(localPath);
        Emit("save-success", localPath);
    }

    /// <summary>
    /// Обрабатывает команду "export-epub" — запрос на экспорт в EPUB текущего документа.
    /// Если путь не указан, открывается диалог выбора места сохранения.
    /// Выполняет сохранение через <see cref="FileService"/> и уведомляет об успехе.
    /// </summary>
    /// <param name="payload">JSON-элемент с данными для сохранения, включая содержимое и опциональный путь.</param>
    private async Task HandleEpubExport(JsonElement payload)
    {
        if (payload.ValueKind == JsonValueKind.Null || payload.ValueKind == JsonValueKind.Undefined)
            return;

        var localPath = await ChooseFileAsync("Экспорт в EPUB", [("Книги EPUB", ["epub"])], "save");
        if (string.IsNullOrEmpty(localPath))
        {
            Emit("cancel-loading");
            return;
        }

        string fileName = Path.GetFileName(localPath);
        Emit("start-exporting", fileName);
        await fileService.ExportEpubAsync(payload, localPath);
        UpdateWindowTitle(localPath);
        Emit("cancel-loading");
    }

    /// <summary>
    /// Обрабатывает команду "select-image" — запрос на вставку изображения.
    /// Открывает диалог выбора файла изображения, преобразует его в Data URL и отправляет результат во frontend.
    /// Поддерживает указание типа отображения (block/inline).
    /// </summary>
    /// <param name="payload">JSON-элемент с параметрами вставки изображения (например, тип отображения).</param>
    private async Task HandleSelectImage(JsonElement payload)
    {
        if (payload.ValueKind == JsonValueKind.Null || payload.ValueKind == JsonValueKind.Undefined)
            return;

        string displayType = payload.TryGetProperty("type", out var t) == true
            ? t.GetString() ?? "block"
            : "block";

        string? path = await ChooseFileAsync("Выберите изображение", [("Изображения", ["jpg", "jpeg", "png"])], "open");
        if (string.IsNullOrEmpty(path))
        {
            Emit("cancel-loading");
            return;
        }

        string data = await FileService.SelectImageAsync(path);
        var info = new ImageInfoMessage(data, displayType, $"#{Guid.NewGuid()}");
        Emit("image-selected", info);
    }

    /// <summary>
    /// Обновляет заголовок главного окна приложения, отображая имя текущего файла.
    /// Вызывается после открытия или сохранения документа.
    /// </summary>
    /// <param name="path">Полный путь к файлу, из которого извлекается имя.</param>
    private static void UpdateWindowTitle(string path) => Program.UpdateWindowTitle(path);

    /// <summary>
    /// Асинхронно открывает нативный диалог выбора файла с заданным заголовком и фильтрами.
    /// Запоминает последний использованный путь для улучшения пользовательского опыта.
    /// </summary>
    /// <param name="title">Заголовок окна диалога выбора файла.</param>
    /// <param name="filters">Массив кортежей, определяющих фильтры файлов (например, "Изображения", ["jpg", "png"]).</param>
    /// <param name="dialogType">Тип диалога: "open" или "save"</param>
    /// <returns>Полный путь к выбранному файлу или <see langword="null"/>, если выбор отменён.</returns>
    private async Task<string?> ChooseFileAsync(string title, (string Name, string[] Extensions)[] filters, string dialogType)
    {
        string? localPath = null;

        if (dialogType == "save")
        {
            localPath = await window.ShowSaveFileAsync(
                title: title,
                defaultPath: _lastUsedPath,
                filters: filters
            );

            if (!string.IsNullOrEmpty(localPath))
            {
                // Подготавливаем список разрешенных расширений (сортируем по длине: .fb2.zip -> .zip)
                var validExtensions = filters
                    .SelectMany(f => f.Extensions)
                    .Select(ext => ext.StartsWith('.') ? ext : "." + ext)
                    .OrderByDescending(ext => ext.Length)
                    .ToList();

                // 2. Проверяем, совпадает ли финал пути с каким-то из разрешенных расширений
                string? matchedExtension = validExtensions
                    .FirstOrDefault(ext => localPath.EndsWith(ext, StringComparison.OrdinalIgnoreCase));

                // Расширение чужое (не из списка) или отсутствует
                if (matchedExtension == null)
                {
                    // Вместо опасного цикла проверяем, заканчивается ли файл на ЛЮБОЕ расширение (.txt, .mp3 и т.д.)
                    string currentExt = Path.GetExtension(localPath);

                    // Если расширение есть и оно не пустое (избегаем багов с точкой на конце "file.")
                    if (!string.IsNullOrWhiteSpace(currentExt) && currentExt.Length > 1)
                    {
                        // Отрезаем ровно текущее чужое расширение, сохраняя точки в середине имени файла
                        localPath = localPath[..^currentExt.Length];
                    }

                    // Убираем случайную точку на конце, если пользователь ее оставил (например, "book.")
                    localPath = localPath.TrimEnd('.');

                    // Дописываем дефолтное расширение из фильтра
                    if (validExtensions.Count > 0)
                    {
                        localPath += validExtensions[0];
                    }
                }
            }
        }
        else // Диалог типа "open"
        {
            string[] result = await window.ShowOpenFileAsync(
                title: title,
                defaultPath: _lastUsedPath,
                multiSelect: false,
                filters: filters
            );
            localPath = result?.FirstOrDefault();
        }

        // Сохранение пути для обоих типов диалогов
        if (!string.IsNullOrEmpty(localPath))
        {
            try
            {
                _lastUsedPath = Path.GetDirectoryName(localPath);
            }
            catch
            {
                // Защита на случай некорректных путей ОС
            }
        }

        return localPath;
    }

    /// <summary>
    /// Вспомогательный метод для формирования и отправки JSON-сообщения через событие <see cref="OnMessageEmitted"/>.
    /// </summary>
    /// <param name="type">Тип сообщения (например, "fb2-content", "error", "start-loading").</param>
    /// <param name="payload">Полезная нагрузка сообщения в виде строки (может быть JSON).</param>
    public void Emit(string type, object? payload = null)
    {
        var messageData = new EmitMessage(type, payload);

        // Используем перегрузку с TypeInfo
        var message = JsonSerializer.Serialize(messageData, EmitContext.Custom.EmitMessage);
        window.SendWebMessage(message);
    }
}
