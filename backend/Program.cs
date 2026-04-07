using Photino.NET;
using Photino.NET.Server;
using System.Text;
using Avalonia;
using Avalonia.Controls;
using FB2Editor.Services;
using System.Text.Json;

namespace FB2Editor;

class Program
{
#if DEBUG
    public static bool IsDebugMode = true;
#else
    public static bool IsDebugMode = false;
#endif    

    public static Window? DialogOwner { get; private set; }

    [STAThread]
    static void Main(string[] args)
    {
        InitializeAvalonia();
        var fileService = new FileService();
        var fb2Service = new Fb2Service();

        PhotinoServer.CreateStaticFileServer(args, out string baseUrl).RunAsync();

        string appUrl = IsDebugMode ? "http://localhost:3000" : $"{baseUrl}/index.html";

        // Console.WriteLine($"Serving React app at {appUrl}");

        // Creating a new PhotinoWindow instance with the fluent API
        var window = new PhotinoWindow()
            .SetTitle("FB2 Writer")
            .SetUseOsDefaultSize(false)
            .SetSize(new System.Drawing.Size(800, 600))
            .Center()
            .SetMinWidth(600)
            .SetResizable(true)
            .SetDevToolsEnabled(true)
            .SetContextMenuEnabled(true)
            .SetBrowserControlInitParameters("--disable-http-cache") // Запрет кеширования, чтобы запускалась последняя версия
            .RegisterCustomSchemeHandler("app", (sender, scheme, url, out contentType) =>
            {
                contentType = "text/javascript";
                return new MemoryStream(Encoding.UTF8.GetBytes(@"
                        (() =>{
                            window.setTimeout(() => {
                                alert(`🎉 Dynamically inserted JavaScript.`);
                            }, 1000);
                        })();
                    "));
            });

        // Регистрация обработчика сообщений
        window.RegisterWebMessageReceivedHandler((sender, message) =>
        {
            if (sender is not PhotinoWindow w) return;
            ProcessMessage(message, fileService, window);
        });
        fileService.OnMessageEmitted += (json) => window.SendWebMessage(json);

        // Загружаем строку с лоадером, который будет сам переключаться на приложение после ответа сервера
        string loadingHtml = $@"
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ 
                        background: #fdfdfd; 
                        color: #333; 
                        display: flex; 
                        flex-direction: column; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        margin: 0; 
                        font-family: sans-serif; 
                    }}
                    .loader {{ 
                        border: 4px solid #eee; 
                        border-top: 4px solid #3498db; 
                        border-radius: 50%; 
                        width: 40px; 
                        height: 40px; 
                        animation: spin 1s linear infinite; 
                        margin-bottom: 15px;
                    }}
                    @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
                </style>
            </head>
            <body>
                <div class='loader'></div>
                <p id='status'>Загрузка FB2 Writer...</p>

                <script>
                    const targetUrl = '{appUrl}';
                    
                    async function checkServer() {{
                        try {{
                            // Проверяем доступность сервера
                            await fetch(targetUrl, {{ mode: 'no-cors' }});
                            
                            // Переходим в основное приложение
                            window.location.href = targetUrl;
                        }} catch (e) {{
                            // Если сервер еще не готов, повторяем через 500мс
                            setTimeout(checkServer, 500);
                        }}
                    }}

                    checkServer();
                </script>
            </body>
            </html>";
        window.LoadRawString(loadingHtml);
        window.WaitForClose();
    }

    /// <summary>
    /// Обработка сообщений от веб-интерфейса
    /// </summary>
    /// <param name="message">Сообщение</param>
    /// <param name="fileService">Сервис для работы с файлами</param>
    /// <param name="window">Окно Photino</param>
    private static void ProcessMessage(string message, FileService fileService, PhotinoWindow window)
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

        switch (command)
        {
            case "open-file":
                _ = fileService.OpenFileAsync();
                break;

            case "save-file":
                if (!string.IsNullOrEmpty(payload))
                    _ = fileService.SaveFileAsync(payload);
                break;

            case "select-image":
                string type = "block";
                if (!string.IsNullOrEmpty(payload))
                {
                    try
                    {
                        // Используем JsonDocument для доступа к свойствам "на лету"
                        using (JsonDocument doc = JsonDocument.Parse(payload))
                        {
                            if (doc.RootElement.TryGetProperty("type", out JsonElement typeElement))
                            {
                                type = typeElement.GetString() ?? "block";
                            }
                        }
                    }
                    catch (JsonException ex)
                    {
                        Console.WriteLine($"[C# JSON Parse Error]: {ex.Message}");
                        type = "block"; // Используем значение по умолчанию "block"
                    }
                }
                _ = fileService.SelectImageAsync(type);
                break;

            case "close-app":
                window.Close();
                break;

            default:
                Console.WriteLine($"[C# Unknown Command]: {command}");
                break;
        }
    }

    /// Минимальный класс App для инициализации Avalonia
    public class App : Avalonia.Application
    {
        public override void Initialize() => base.Initialize();
    }

    /// <summary>
    /// Initialize Avalonia
    /// </summary>
    private static void InitializeAvalonia()
    {
        AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .SetupWithoutStarting();

        DialogOwner = new Window
        {
            WindowDecorations = WindowDecorations.None,
            ShowInTaskbar = false,
            Opacity = 0,
            WindowStartupLocation = WindowStartupLocation.Manual,
            Position = new PixelPoint(-20000, -20000) // Уводим максимально далеко
        };

        DialogOwner.Show();
        DialogOwner.Hide();
    }


}
