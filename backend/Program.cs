using Photino.NET;
using Photino.NET.Server;
using System.Text;
using Avalonia;
using Avalonia.Controls;
using FB2Editor.Services;
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
            // Users can resize windows by default.
            // Let's make this one fixed instead.
            .SetResizable(true)
            .SetDevToolsEnabled(true)
            .RegisterCustomSchemeHandler("app", (object sender, string scheme, string url, out string contentType) =>
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

        window.Load(appUrl).WaitForClose(); // Starts the application event loop
    }

    private static void InitializeAvalonia()
    {
        AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .SetupWithoutStarting();

        DialogOwner = new Window
        {
            SystemDecorations = SystemDecorations.None,
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
        // "save-file:{"text":"..."}" -> ["save-file", "{"text":"..."}"]
        var parts = message.Split(':', 2);
        string command = parts[0];
        string payload = parts.Length > 1 ? parts[1] : string.Empty;

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
                _ = fileService.SelectImageAsync();
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
