using Photino.NET;
using FB2Editor.Services;
using System.Reflection;
using System.Text.Json;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using FB2Editor.Models;

namespace FB2Editor;


// Контекст сериализации (Source Generator)
[JsonSerializable(typeof(EmitMessage))]
[JsonSerializable(typeof(ImageInfoMessage))]
[JsonSerializable(typeof(Fb2BookExport))]
[JsonSerializable(typeof(PersonInfo))]
[JsonSerializable(typeof(List<PersonInfo>))]
[JsonSerializable(typeof(List<object>))]
[JsonSerializable(typeof(System.Dynamic.ExpandoObject))] // На всякий случай, если есть dynamic
[JsonSerializable(typeof(object))] // Нужно для базовой поддержки
[JsonSerializable(typeof(TipTapNode))]         // Для одиночных узлов
[JsonSerializable(typeof(List<TipTapNode>))]   // Для массивов узлов
[JsonSerializable(typeof(Dictionary<string, List<object>>))] // Добавляем поддержку словаря со списками объектов внутри
[JsonSerializable(typeof(TipTapNode))]
[JsonSerializable(typeof(List<TipTapNode>))] // Для TipTap Content
[JsonSerializable(typeof(List<object>))]       // Для вложенного контента
[JsonSerializable(typeof(Dictionary<string, string>))] // Для атрибутов (attrs)
internal partial class EmitContext : JsonSerializerContext
{
    private static JsonSerializerOptions? _customOptions;

    /// <summary>
    /// Настройки сериализации JSON для формирования сообщений.
    /// Обеспечивает использование camelCase и корректное отображение кириллицы.
    /// </summary>
    public static JsonSerializerOptions CustomOptions => _customOptions ??= new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        TypeInfoResolver = EmitContext.Default // Важно для работы Source Generation
    };
}

class Program
{

    private static readonly JsonSerializerOptions _options = new()
    {
        TypeInfoResolver = EmitContext.Default, // Привязываем ваш генератор
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping, // Включаем русский текст
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly Dictionary<string, string> _resourceMap = [];
    private static readonly string _assemblyName = "FB2Editor";
    private static string? _initialFile;
    private static FileService _fileService = null!;
    private static PhotinoWindow _window = null!;

    /// <summary>
    /// Хранит путь к последней использованной директории для открытия или сохранения файлов.
    /// Используется для улучшения пользовательского опыта, запоминая место предыдущей операции.
    /// Значение инициализируется из специальной папки "Мои документы", если ранее не было задано.
    /// </summary>
    private static string? _lastUsedPath;

    /// <summary>
    /// Событие, возникающее при отправке сообщения во frontend.
    /// Параметр — JSON-строка, готовая к передаче через механизм Web-сообщений.
    /// </summary>
    //public event Action<string>? OnMessageEmitted;



#if DEBUG
    public static bool IsDebugMode = true;
#else
    public static bool IsDebugMode = false;
#endif    

    [STAThread]
    static void Main(string[] args)
    {
        IndexEmbeddedResources();

        string virtualDomain = "https://fb2.local";
        string appUrl = IsDebugMode ? "http://localhost:3000" : $"{virtualDomain}/index.html";
        string tempUserDataPath = Path.Combine(Path.GetTempPath(), $"{_assemblyName}_Cache");

        var iconPath = ExtractIconResource("fb2writer.ico");

        // Creating a new PhotinoWindow instance with the fluent API
        _window = new PhotinoWindow()
            .SetTitle("FB2 Writer")
            .SetIconFile(iconPath)
            .SetUseOsDefaultSize(false)
            .SetSize(new System.Drawing.Size(800, 600))
            .Center()
            .SetMinWidth(600)
            .SetResizable(true)
            .SetDevToolsEnabled(true)
            .SetContextMenuEnabled(true)
            .SetBrowserControlInitParameters("--allow-file-access-from-files --allow-scheme-access --disable-http-cache")
            .SetTemporaryFilesPath(tempUserDataPath)
            .RegisterCustomSchemeHandler("https", (sender, scheme, url, out contentType) =>
            {
                contentType = GetMimeType(url);

                // Извлекаем относительный путь (напр. /static/js/main.js)
                string relativePath = url.Replace(virtualDomain, "").Trim('/');
                if (string.IsNullOrEmpty(relativePath)) relativePath = "index.html";

                // Ищем в нашем словаре
                if (!_resourceMap.TryGetValue(relativePath, out var resourceName))
                {
                    // SPA Fallback: если файла нет и нет расширения — отдаем index.html
                    if (!Path.HasExtension(relativePath))
                    {
                        _resourceMap.TryGetValue("index.html", out resourceName);
                        contentType = "text/html";
                    }
                }

                if (resourceName != null)
                {
                    return Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName);
                }

                return null;
            });

        _fileService = new FileService();
        // Проверяем, передан ли путь к файлу (обычно это первый аргумент после имени exe)
        _initialFile = args.Length > 0 && File.Exists(args[0]) ? args[0] : null;

        // Регистрация обработчика сообщений
        _window.RegisterWebMessageReceivedHandler(OnWebMessageReceived);

        //        _fileService.OnMessageEmitted += (json) => _window.SendWebMessage(json);

        // Загружаем строку с лоадером, который будет сам переключаться на приложение после ответа сервера
        _window.LoadRawString(GetLoadingHtml(appUrl));
        _window.WaitForClose();
    }


    private static void IndexEmbeddedResources()
    {
        var assembly = Assembly.GetExecutingAssembly();
        string prefix = $"{_assemblyName}.Resources.wwwroot.";

        foreach (var res in assembly.GetManifestResourceNames())
        {
            if (res.StartsWith(prefix))
            {
                // Превращаем "FB2Editor.Resources.wwwroot.static.js.main.js" 
                // обратно в "static/js/main.js" (учитывая расширение)
                string path = res.Substring(prefix.Length);

                // Магия: заменяем точки на слэши, кроме последней (перед расширением)
                int lastDot = path.LastIndexOf('.');
                if (lastDot > 0)
                {
                    string name = path.Substring(0, lastDot).Replace('.', '/');
                    string ext = path.Substring(lastDot);
                    _resourceMap[name + ext] = res;
                }
                else
                {
                    _resourceMap[path] = res;
                }
            }
        }
    }

    /// <summary>
    /// Возвращает MIME-тип содержимого на основе расширения файла в URL.
    /// Используется для корректной передачи статических ресурсов веб-сервером.
    /// </summary>
    /// <param name="url">Путь к файлу или URL, из которого извлекается расширение.</param>
    /// <returns>Строка с MIME-типом, соответствующим расширению файла. 
    /// Если расширение неизвестно, возвращается "application/octet-stream".</returns>
    private static string GetMimeType(string url)
    {
        var ext = Path.GetExtension(url).ToLower();
        return ext switch
        {
            ".html" => "text/html",
            ".js" => "text/javascript",
            ".css" => "text/css",
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".svg" => "image/svg+xml",
            ".json" => "application/json",
            ".wasm" => "application/wasm",
            ".woff" => "font/woff",
            ".woff2" => "font/woff2",
            ".ico" => "image/x-icon",
            _ => "application/octet-stream"
        };
    }

    private static string GetLoadingHtml(string targetUrl) => $@"
        <html>
        <head><style>body {{ background: #fdfdfd; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }}</style></head>
        <body><script>
            async function check() {{
                try {{ await fetch('{targetUrl}', {{ mode: 'no-cors' }}); window.location.href = '{targetUrl}'; }}
                catch {{ setTimeout(check, 500); }}
            }}
            check();
        </script><div>Загрузка...</div></body></html>";

    /// <summary>
    /// Обработка сообщений от веб-интерфейса
    /// </summary>
    /// <param name="message">Сообщение</param>
    /// <param name="fileService">Сервис для работы с файлами</param>
    /// <param name="window">Окно Photino</param>
    private static async void OnWebMessageReceived(object? sender, string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return;

        // Разделяем команду и полезную нагрузку по первому двоеточию
        // "save-file:{"text":"..."}" -> ["save-file", "{"text":"..."}"]
        var separatorIndex = message.IndexOf(':');
        if (separatorIndex == -1)
        {
            Console.WriteLine($"[C# Unknown Command]: {message}");
            return;
        }

        string command = message[..separatorIndex];
        string payload = message[(separatorIndex + 1)..];
        try
        {
            switch (command)
            {
                case "open-file":
                    {
                        string? localPath = await ChooseFileAsync("Выберите книгу",
                        [
                            ("Книги FB2", ["fb2", "fb2.zip"]),
                            ("Все файлы", ["*"])
                        ]);

                        if (string.IsNullOrEmpty(localPath))
                        {
                            Emit("cancel-loading", string.Empty);
                            return;
                        }

                        Emit("start-loading", Path.GetFileName(localPath));

                        string json = await _fileService.LoadFileByPathAsync(localPath);
                        // Отправка контента во фронтенд
                        Emit("fb2-content", json);
                    }
                    break;

                case "save-file":
                    {
                        string? localPath = null;
                        try
                        {
                            // Используем JsonDocument для доступа к свойствам "на лету"
                            using JsonDocument doc = JsonDocument.Parse(payload);
                            if (doc.RootElement.TryGetProperty("filePath", out JsonElement filePathElement))
                            {
                                localPath = filePathElement.GetString() ?? "";
                            }
                        }
                        catch { }

                        if (string.IsNullOrEmpty(localPath))
                        {
                            // Имя файла не передано (save as...), показываем диалог сохранения
                            localPath = await ChooseFileAsync("Сохранить книгу",
                            [
                                ("Книги FB2", ["fb2", "fb2.zip"]),
                                ("Все файлы", ["*"])
                            ]);

                            if (string.IsNullOrEmpty(localPath))
                            {
                                Emit("cancel-loading", string.Empty);
                                return;
                            }
                        }

                        string fileName = Path.GetFileName(localPath);

                        Emit("start-saving", fileName);

                        await _fileService.SaveFileAsync(payload, localPath);

                        Emit("save-success", fileName);
                    }
                    break;

                case "app-ready":
                    // Если при запуске был передан файл — открываем его сейчас
                    if (!string.IsNullOrEmpty(_initialFile))
                    {
                        Emit("fb2-content", await _fileService.LoadFileByPathAsync(_initialFile));
                        _initialFile = null; // ВАЖНО: больше не открываем при рефреше страницы
                    }
                    else
                    {
                        // Файла нет, разрешаем фронтенду показать шаблон
                        Emit("cancel-loading", string.Empty);
                    }
                    break;

                case "select-image":
                    {
                        string displayType = "block";
                        if (!string.IsNullOrEmpty(payload))
                        {
                            try
                            {
                                // Используем JsonDocument для доступа к свойствам "на лету"
                                using JsonDocument doc = JsonDocument.Parse(payload);
                                if (doc.RootElement.TryGetProperty("type", out JsonElement typeElement))
                                {
                                    displayType = typeElement.GetString() ?? "block";
                                }
                            }
                            catch (JsonException ex)
                            {
                                Console.WriteLine($"[C# JSON Parse Error]: {ex.Message}");
                                displayType = "block"; // Используем значение по умолчанию "block"
                            }
                        }

                        string? localPath = await ChooseFileAsync("Выберите изображение",
                        [
                            ("Изображения", ["jpg", "jpeg", "png"])
                        ]);

                        if (string.IsNullOrEmpty(localPath))
                        {
                            Emit("cancel-loading", string.Empty);
                            return;
                        }

                        string data = await FileService.SelectImageAsync(localPath);
                        var imageInfo = JsonSerializer.Serialize(
                            new ImageInfoMessage(
                                Data: data,
                                Display: displayType,
                                Href: $"#{Guid.NewGuid()}"
                            ), EmitContext.CustomOptions
                        );


                        Emit("image-selected", imageInfo);
                    }
                    break;

                case "close-app":
                    _window.Close();
                    break;

                default:
                    Console.WriteLine($"[C# Unknown Command]: {command}");
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[C# Error in {command}]: {ex.Message}");
            // Отправить ошибку на фронтенд, чтобы показать Toast
            Emit("error", ex.Message);
        }
    }

    private static async Task<string?> ChooseFileAsync(string title,
    (string Name, string[] Extensions)[] filters)
    {
        // Определяем начальную папку
        string defaultPath = !string.IsNullOrEmpty(_lastUsedPath)
            ? _lastUsedPath
            : Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);

        // Вызываем нативный диалог Photino
        string[] result = await _window.ShowOpenFileAsync(
            title: title,
            defaultPath: defaultPath,
            multiSelect: false,
            filters: filters
        );

        string? localPath = result?.FirstOrDefault();

        // Если выбор отменен
        if (string.IsNullOrEmpty(localPath)) return null;

        // Обновляем путь последнего использования
        _lastUsedPath = Path.GetDirectoryName(localPath);

        return localPath;
    }

    /// <summary>
    /// Вспомогательный метод для формирования и отправки JSON-сообщения через событие <see cref="OnMessageEmitted"/>.
    /// </summary>
    /// <param name="type">Тип сообщения (например, "fb2-content", "error", "start-loading").</param>
    /// <param name="payload">Полезная нагрузка сообщения в виде строки (может быть JSON).</param>
    private static void Emit(string type, string payload)
    {
        var message = JsonSerializer.Serialize(
            new EmitMessage(type, payload), EmitContext.CustomOptions
        );
        _window.SendWebMessage(message);
    }

    public static string ExtractIconResource(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        // Имя ресурса обычно: "ИмяПроекта.имя_файла.ico"
        // Посмотреть все имена можно через assembly.GetManifestResourceNames()
        string fullResourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(x => x.EndsWith(resourceName)) ?? resourceName;

        string tempPath = Path.Combine(Path.GetTempPath(), resourceName);

        using Stream? stream = assembly.GetManifestResourceStream(fullResourceName);
        if (stream == null) return resourceName;

        using FileStream fileStream = new FileStream(tempPath, FileMode.Create, FileAccess.Write);
        stream.CopyTo(fileStream);

        return tempPath;
    }
}
