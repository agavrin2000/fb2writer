using System.Text.Json;
using Photino.NET;

namespace FB2Editor.Services;

public class MessageHub
{
    private readonly PhotinoWindow _window;
    private readonly FileService _fileService;
    private string? _initialFile;
    // Запоминаем путь последнего открытия/сохранения
    private string? _lastUsedPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

    public MessageHub(PhotinoWindow window, FileService fileService, string? initialFile)
    {
        _window = window;
        _fileService = fileService;
        _initialFile = initialFile;
    }

    /// <summary>
    /// Основной диспетчер сообщений от Frontend
    /// </summary>
    public async void Handle(object? sender, string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return;

        var separatorIndex = message.IndexOf(':');
        if (separatorIndex == -1) return;

        string command = message[..separatorIndex];
        string strPayload = message[(separatorIndex + 1)..];

        using JsonDocument? payload = string.IsNullOrEmpty(strPayload) ? null : JsonDocument.Parse(strPayload);

        try
        {
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

                default:
                    Console.WriteLine($"[C# Unknown Command]: {command}");
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[C# Error in {command}]: {ex.Message}");
            Emit("error", ex.Message);
        }
    }

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

    private async Task HandleSaveFile(JsonDocument? payload)
    {
        if (payload == null) return;

        string? localPath = payload.RootElement.TryGetProperty("filePath", out var p) ? p.GetString() : null;

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
        await _fileService.SaveFileAsync(payload.RootElement, localPath);
        UpdateWindowTitle(localPath);
        Emit("save-success", fileName);
    }

    private async Task HandleSelectImage(JsonDocument? payload)
    {
        string displayType = payload?.RootElement.TryGetProperty("type", out var t) == true
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
