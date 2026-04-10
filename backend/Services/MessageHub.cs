using System.Text.Json;
using Photino.NET;

namespace FB2Editor.Services;

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
    private readonly PhotinoWindow _window = window;
    private readonly FileService _fileService = fileService;
    private string? _initialFile = initialFile;
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

                case "select-image":
                    await HandleSelectImage(payload);
                    break;

                case "close-app":
                    Environment.Exit(0);
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
        Emit("app-info", JsonSerializer.Serialize(appDetails, EmitContext.CustomOptions));

        // 2. Открытие переданного файла
        if (!string.IsNullOrEmpty(_initialFile))
        {
            Emit("fb2-content", await _fileService.LoadFileByPathAsync(_initialFile));
            UpdateWindowTitle(_initialFile);
            _initialFile = null;
        }
        else
        {
            Emit("cancel-loading", string.Empty);
        }
    }

    /// <summary>
    /// Обрабатывает команду "open-file" — запрос на открытие FB2-файла.
    /// Открывает нативный диалог выбора файла, загружает содержимое и отправляет его во frontend.
    /// </summary>
    private async Task HandleOpenFile()
    {
        string? path = await ChooseFileAsync("Выберите книгу", [("Книги FB2", ["fb2", "fb2.zip"]), ("Все файлы", ["*"])]);
        if (string.IsNullOrEmpty(path))
        {
            Emit("cancel-loading", string.Empty);
            return;
        }

        Emit("start-loading", Path.GetFileName(path));
        string json = await _fileService.LoadFileByPathAsync(path);
        Emit("fb2-content", json);
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
            localPath = await ChooseFileAsync("Сохранить книгу", [("Книги FB2", ["fb2", "fb2.zip"]), ("Все файлы", ["*"])]);
            if (string.IsNullOrEmpty(localPath))
            {
                Emit("cancel-loading", string.Empty);
                return;
            }
        }

        string fileName = Path.GetFileName(localPath);
        Emit("start-saving", fileName);
        await _fileService.SaveFileAsync(payload, localPath);
        UpdateWindowTitle(localPath);
        Emit("save-success", fileName);
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

        string? path = await ChooseFileAsync("Выберите изображение", [("Изображения", ["jpg", "jpeg", "png"])]);
        if (string.IsNullOrEmpty(path))
        {
            Emit("cancel-loading", string.Empty);
            return;
        }

        string data = await FileService.SelectImageAsync(path);
        var info = new ImageInfoMessage(data, displayType, $"#{Guid.NewGuid()}");
        Emit("image-selected", JsonSerializer.Serialize(info, EmitContext.CustomOptions));
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
    /// <returns>Полный путь к выбранному файлу или <see langword="null"/>, если выбор отменён.</returns>
    private async Task<string?> ChooseFileAsync(string title, (string Name, string[] Extensions)[] filters)
    {
        // Выбираем метод: сохранение или открытие
        // Примечание: В текущей версии Photino.NET ShowSaveFileAsync может отсутствовать, 
        // тогда используйте ShowOpenFileAsync (многие системы позволяют это)

        string[] result = await _window.ShowOpenFileAsync(
            title: title,
            defaultPath: _lastUsedPath,
            multiSelect: false,
            filters: filters
        );

        string? localPath = result?.FirstOrDefault();

        if (string.IsNullOrEmpty(localPath)) return null;

        // Запоминаем папку, чтобы в следующий раз открыть её же
        _lastUsedPath = Path.GetDirectoryName(localPath);

        return localPath;
    }

    /// <summary>
    /// Вспомогательный метод для формирования и отправки JSON-сообщения через событие <see cref="OnMessageEmitted"/>.
    /// </summary>
    /// <param name="type">Тип сообщения (например, "fb2-content", "error", "start-loading").</param>
    /// <param name="payload">Полезная нагрузка сообщения в виде строки (может быть JSON).</param>
    public void Emit(string type, string payload)
    {
        var message = JsonSerializer.Serialize(
            new EmitMessage(type, payload), EmitContext.CustomOptions
        );
        _window.SendWebMessage(message);
    }
}
