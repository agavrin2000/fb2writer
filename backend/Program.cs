using Photino.NET;
using FB2Editor.Services;
using System.Reflection;

namespace FB2Editor;

class Program
{

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

        // Creating a new PhotinoWindow instance with the fluent API
        _window = new PhotinoWindow()
            .SetTitle("FB2 Writer")
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

        _fileService = new FileService(_window);
        // Проверяем, передан ли путь к файлу (обычно это первый аргумент после имени exe)
        _initialFile = args.Length > 0 && File.Exists(args[0]) ? args[0] : null;

        // Регистрация обработчика сообщений
        _window.RegisterWebMessageReceivedHandler(OnWebMessageReceived);

        _fileService.OnMessageEmitted += (json) => _window.SendWebMessage(json);

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
                    // 1. Определяем начальный путь: последний использованный ИЛИ "Мои документы"
                    string defaultPath = !string.IsNullOrEmpty(_lastUsedPath)
                        ? _lastUsedPath
                        : Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

                    var filters = new (string Name, string[] Extensions)[]
                    {
                        ("Книги FB2", ["fb2", "fb2.zip"]),
                        ("Все файлы", ["*"])
                    };

                    string[] result = await _window.ShowOpenFileAsync(
                        title: "Открыть книгу FB2",
                        defaultPath: defaultPath,
                        multiSelect: false,
                        filters: filters
                    );

                    var localPath = result?.FirstOrDefault();

                    if (string.IsNullOrEmpty(localPath))
                    {
                        _fileService.Emit("cancel-loading", string.Empty);
                        return;
                    }

                    _fileService.Emit("start-loading", Path.GetFileName(localPath));

                    // 2. Сохраняем путь к папке (без имени файла) для следующего раза
                    _lastUsedPath = Path.GetDirectoryName(localPath);

                    string json = await _fileService.LoadFileByPathAsync(localPath);
                    // Отправка контента во фронтенд
                    _fileService.Emit("fb2-content", json);
                    break;

                case "save-file":
                    if (!string.IsNullOrEmpty(payload))
                        await _fileService.SaveFileAsync(payload);
                    break;

                case "app-ready":
                    // Если при запуске был передан файл — открываем его сейчас
                    if (!string.IsNullOrEmpty(_initialFile))
                    {
                        await _fileService.LoadFileByPathAsync(_initialFile);
                        _initialFile = null; // ВАЖНО: больше не открываем при рефреше страницы
                    }
                    else
                    {
                        // Файла нет, разрешаем фронтенду показать шаблон
                        _fileService.Emit("cancel-loading", string.Empty);
                    }
                    break;

                case "select-image":
                    await _fileService.SelectImageAsync(payload);
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
            _fileService.Emit("error", ex.Message);
        }

    }
}
