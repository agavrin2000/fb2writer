using Photino.NET;
using Photino.NET.Server;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using Newtonsoft.Json;

namespace Photino.HelloPhotino.React;
//NOTE: To hide the console window, go to the project properties and change the Output Type to Windows Application.
// Or edit the .csproj file and change the <OutputType> tag from "WinExe" to "Exe".

class Program
{
    public static bool IsDebugMode = true;     //serve files from asp.net runtime

    [STAThread]
    static void Main(string[] args)
    {
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
            .SetSize(new Size(800, 600))
            // Center window in the middle of the screen
            .Center()
            // Users can resize windows by default.
            // Let's make this one fixed instead.
            .SetResizable(true)
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
            })
            // Most event handlers can be registered after the
            // PhotinoWindow was instantiated by calling a registration 
            // method like the following RegisterWebMessageReceivedHandler.
            // This could be added in the PhotinoWindowOptions if preferred.
            .RegisterWebMessageReceivedHandler((object sender, string message) =>
            {
                var window = (PhotinoWindow)sender;

                if (message == "open-file:selected")
                {
                    var thread = new Thread(() =>
                    {
                        using (OpenFileDialog openFileDialog = new OpenFileDialog())
                        {
                            if (openFileDialog.ShowDialog() == DialogResult.OK)
                            {
                                // Извлекаем короткое имя файла
                                string fileName = Path.GetFileName(openFileDialog.FileName);

                                // 1. Отправляем в React сигнал о начале загрузки вместе с именем файла
                                var startMsg = JsonConvert.SerializeObject(new
                                {
                                    type = "start-loading",
                                    fileName = fileName
                                });
                                window.SendWebMessage(startMsg);

                                try
                                {
                                    var fb2Service = new Fb2Service();
                                    string json = fb2Service.LoadAndConvertToJson(openFileDialog.FileName);
                                    window.SendWebMessage(json);
                                }
                                catch (Exception ex)
                                {
                                    window.SendWebMessage($"{{\"type\":\"error\", \"msg\":\"{ex.Message}\"}}");
                                }
                            }
                            else
                            {
                                window.SendWebMessage("{\"type\":\"cancel-loading\"}");
                            }
                        }
                    });
                    thread.SetApartmentState(ApartmentState.STA);
                    thread.Start();
                }
                if (message.StartsWith("save-file:"))
                {
                    string json = message.Replace("save-file:", "");

                    // В реальном приложении здесь стоит вызвать SaveFileDialog, 
                    // но для теста сохраним в фиксированный файл или перезапишем текущий
                    var fb2Service = new Fb2Service();
                    fb2Service.SaveJsonToFb2("output.fb2", json);

                    window.SendWebMessage("{\"status\": \"saved\"}");
                }
                if (message == "select-image")
                {
                    var thread = new Thread(() =>
                    {
                        using (OpenFileDialog openFileDialog = new OpenFileDialog())
                        {
                            openFileDialog.Filter = "Images (*.jpg;*.png)|*.jpg;*.png";
                            if (openFileDialog.ShowDialog() == DialogResult.OK)
                            {
                                byte[] imageArray = File.ReadAllBytes(openFileDialog.FileName);
                                string base64Image = Convert.ToBase64String(imageArray);
                                string extension = Path.GetExtension(openFileDialog.FileName).Replace(".", "");

                                // Формируем Data URL для отображения в браузере
                                string dataUrl = $"data:image/{extension};base64,{base64Image}";

                                // Отправляем команду в React вставить картинку
                                window.SendWebMessage(JsonConvert.SerializeObject(new
                                {
                                    type = "insert-image",
                                    url = dataUrl
                                }));
                            }
                        }
                    });
                    thread.SetApartmentState(ApartmentState.STA);
                    thread.Start();
                }
                /*
                // The message argument is coming in from sendMessage.
                // "window.external.sendMessage(message: string)"
                string response = $"Received message: \"{message}\"";

                // Send a message back the to JavaScript event handler.
                // "window.external.receiveMessage(callback: Function)"
                window.SendWebMessage(response);*/
            })
            .Load(appUrl); // Can be used with relative path strings or "new URI()" instance to load a website.

        window.WaitForClose(); // Starts the application event loop
    }
}
