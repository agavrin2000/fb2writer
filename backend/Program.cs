using Photino.NET;
using FB2Writer.Services;

namespace FB2Writer;

class Program
{
    /// <summary>
    /// Ссылка на главное окно приложения, предоставляемое фреймворком Photino.NET.
    /// Используется для отображения диалогов, отправки сообщений во frontend и управления UI.
    /// Инициализируется при создании хоста и должна быть доступна всем статическим методам.
    /// </summary>
    private static PhotinoWindow _window = null!;

    #if DEBUG
    public static bool IsDebugMode = true;
#else
    public static bool IsDebugMode = false;
#endif    

    [STAThread]
    static void Main(string[] args)
    {
        AssetHandler.IndexEmbeddedResources(AppInfo.AssemblyName);

        string virtualDomain = "https://fb2.local";
        string appUrl = IsDebugMode ? "http://localhost:3000" : $"{virtualDomain}/index.html";
        string tempUserDataPath = Path.Combine(Path.GetTempPath(), $"{AppInfo.AssemblyName}_Cache");

        var iconPath = AssetHandler.ExtractIconResource("fb2writer.ico");

        // Creating a new PhotinoWindow instance with the fluent API
        _window = new PhotinoWindow()
            .SetTitle($"{AppInfo.FriendlyName}")
            .SetIconFile(iconPath)
            .SetUseOsDefaultSize(false)
            .SetSize(new System.Drawing.Size(800, 600))
            .Center()
            .SetMinWidth(800)
            .SetResizable(true)
            .SetDevToolsEnabled(true)
            .SetContextMenuEnabled(true)
            .SetBrowserControlInitParameters("--allow-file-access-from-files --allow-scheme-access --disable-http-cache")
            .SetTemporaryFilesPath(tempUserDataPath)
            .RegisterCustomSchemeHandler("https", (sender, scheme, url, out ct) =>
                AssetHandler.GetResourceStream(url, "https://fb2.local", out ct));

        // Проверяем, передан ли путь к файлу (обычно это первый аргумент после имени exe)
        string? initialFile = args.Length > 0 && File.Exists(args[0]) ? args[0] : null;

        var fileService = new FileService();
        var messageHub = new MessageHub(_window, fileService, initialFile);

        // Регистрация обработчика сообщений
        _window.RegisterWebMessageReceivedHandler(messageHub.Handle);
        _window.RegisterWindowClosingHandler((sender, args) =>
         {
             // Если поднята рука "можно закрывать" — возвращаем false (не отменять закрытие)
            if (messageHub.canClose) return false;
             // Внимание: В Photino.NET логика инвертирована относительно WPF:
             // возвращаемое значение типа bool указывает, нужно ли ОТМЕНИТЬ закрытие.
             messageHub.Emit("show-exit-confirmation", "");
             return true;
         });
        // Загружаем строку с лоадером, который будет сам переключаться на приложение после ответа сервера
        _window.LoadRawString(GetLoadingHtml(appUrl));
        _window.WaitForClose();
    }

    /// <summary>
    /// Генерирует HTML-страницу с индикатором загрузки, которая автоматически перенаправляется на указанный URL,
    /// когда целевой ресурс становится доступен.
    /// Используется как временная страница при запуске приложения.
    /// </summary>
    /// <param name="targetUrl">Целевой URL, на который должно произойти перенаправление после успешной загрузки.</param>
    /// <returns>Строка с HTML-кодом страницы, содержащей скрипт проверки и текст "Загрузка..."</returns>
    public static string GetLoadingHtml(string targetUrl) => $@"
        <html>
        <head>
        <style>body {{ background: #fdfdfd; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 0; overflow: hidden; font-family: sans-serif; }}
        </style>        
        </head>
        <body><script>
            async function check() {{
                try {{ await fetch('{targetUrl}', {{ mode: 'no-cors' }}); window.location.href = '{targetUrl}'; }}
                catch {{ setTimeout(check, 500); }}
            }}
            check();
        </script><div>Загрузка...</div></body></html>";

    /// <summary>
    /// Индексирует встроенные ресурсы из сборки, соответствующие статическим файлам в папке wwwroot.
    /// Создаёт карту путей (в формате URL) к именам ресурсов в манифесте, позволяя быстро получать доступ к файлам по их виртуальному пути.
    /// Например, преобразует имя ресурса "FB2Writer.Resources.wwwroot.static.js.main.js" в путь "static/js/main.js".
    /// Выполняется один раз при инициализации хоста.
    /// </summary>
    public static void UpdateWindowTitle(string? filePath = null)
    {
        // Используем FriendlyName из AppInfo, который мы создали ранее
        string appName = AppInfo.FriendlyName;

        if (string.IsNullOrEmpty(filePath))
        {
            _window.SetTitle(appName);
        }
        else
        {
            string fileName = Path.GetFileName(filePath);
            _window.SetTitle($"{fileName} — {appName}");
        }
    }
}
