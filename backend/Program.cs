using Photino.NET;
using Photino.NET.Server;
using System.Text;
using Avalonia;
using Avalonia.Controls;
using FB2Editor.Services;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;

namespace FB2Editor;
//NOTE: To hide the console window, go to the project properties and change the Output Type to Windows Application.
// Or edit the .csproj file and change the <OutputType> tag from "WinExe" to "Exe".

class Program
{
    public static bool IsDebugMode = true;     //serve files from asp.net runtime
    public static Window? DialogOwner { get; private set; }


    [STAThread]
    static void Main(string[] args)
    {
        InitializeAvalonia();

        var fileService = new FileService();

        PhotinoServer
            .CreateStaticFileServer(args, out string baseUrl)
            .RunAsync();

        // The appUrl is set to the local development server when in debug mode.
        // This helps with hot reloading and debugging.
        string appUrl = IsDebugMode ? "http://localhost:3000" : $"{baseUrl}/index.html";
        // Loader на старте приложения
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
                            
                            // Сообщаем C#, что пора возвращать рамки окна
                            window.external.sendMessage('app_ready');
                            
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

        Console.WriteLine($"Serving React app at {appUrl}");

        var fb2Service = new Fb2Service();

        // Window title declared here for visibility
        string windowTitle = "FB2 Editor";

        // Creating a new PhotinoWindow instance with the fluent API
        var window = new PhotinoWindow()
            .SetTitle(windowTitle)
            // Resize to a percentage of the main monitor work area
            //.Resize(50, 50, "%")
            .SetUseOsDefaultSize(false)
            .SetSize(new System.Drawing.Size(800, 600))
            // Center window in the middle of the screen
            .Center()
            .SetMinWidth(600)
            // Users can resize windows by default.
            // Let's make this one fixed instead.
            .SetResizable(true)
            .SetDevToolsEnabled(true)
            .SetContextMenuEnabled(true)
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

        window.RegisterWebMessageReceivedHandler((sender, message) =>
        {
            if (sender is not PhotinoWindow w) return;
            ProcessMessage(message, fileService, window);
        });
        fileService.OnMessageEmitted += (json) => window.SendWebMessage(json);

        // Загружаем строку с лоадером, который будет сам переключаться на приложение после ответа сервера
        window.LoadRawString(loadingHtml);

        window.WaitForClose();
    }

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

    private static void ProcessMessage(string message, FileService fileService, PhotinoWindow window)
    {
        if (string.IsNullOrWhiteSpace(message)) return;

        // Разделяем строку на две части по первому двоеточию
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
                        var obj = JObject.Parse(payload);
                        type = obj["type"]?.ToString() ?? "block"; ;
                    }
                    catch (JsonException ex)
                    {
                        Console.WriteLine($"[C# JSON Parse Error]: {ex.Message}");
                        // Используем значение по умолчанию
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

    // 3. Минимальный класс App для инициализации Avalonia
    public class App : Avalonia.Application
    {
        public override void Initialize() => base.Initialize();
    }
}
