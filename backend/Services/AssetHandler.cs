using System.Reflection;

namespace FB2Writer.Services;

/// <summary>
/// Статический класс для управления встроенными ресурсами приложения, такими как статические файлы (HTML, JS, CSS),
/// изображения и шрифты. Обеспечивает индексацию, извлечение и обслуживание ресурсов из сборки.
/// Поддерживает работу в режиме SPA с fallback-маршрутизацией на index.html.
/// </summary>
public static class AssetHandler
{
    /// <summary>
    /// Словарь, сопоставляющий виртуальные пути (например, "static/js/app.js") с именами ресурсов в манифесте сборки.
    /// Заполняется при вызове метода <see cref="IndexEmbeddedResources(string)"/>.
    /// </summary>
    private static readonly Dictionary<string, string> _resourceMap = new();

    /// <summary>
    /// Индексирует встроенные ресурсы из сборки, соответствующие статическим файлам в папке wwwroot.
    /// Создаёт карту путей (в формате URL) к именам ресурсов в манифесте, позволяя быстро получать доступ к файлам по их виртуальному пути.
    /// Например, преобразует имя ресурса "FB2Writer.Resources.wwwroot.static.js.main.js" в путь "static/js/main.js".
    /// Выполняется один раз при инициализации хоста.
    /// </summary>
    public static void IndexEmbeddedResources(string assemblyName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        string prefix = $"{assemblyName}.Resources.wwwroot.";

        foreach (var res in assembly.GetManifestResourceNames())
        {
            if (!res.StartsWith(prefix)) continue;

            string path = res.Substring(prefix.Length);
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

    /// <summary>
    /// Возвращает поток данных для запрошенного ресурса по указанному URL.
    /// Используется веб-сервером для отдачи статических файлов из встроенных ресурсов.
    /// В случае отсутствия точного совпадения и отсутствия расширения у URL, возвращается index.html (SPA fallback).
    /// </summary>
    /// <param name="url">Полный URL запрашиваемого ресурса.</param>
    /// <param name="virtualDomain">Виртуальный домен (например, "http://localhost:8080"), который будет отброшен при поиске ресурса.</param>
    /// <param name="contentType">Тип содержимого (MIME type), определённый по расширению файла.</param>
    /// <returns>Поток данных ресурса или <see langword="null"/>, если ресурс не найден и нет fallback.</returns>
    public static Stream? GetResourceStream(string url, string virtualDomain, out string contentType)
    {
        contentType = GetMimeType(url);
        string relativePath = url.Replace(virtualDomain, "").TrimStart('/');
        if (string.IsNullOrEmpty(relativePath) || relativePath == "index.html")
            relativePath = "index.html";

        if (_resourceMap.TryGetValue(relativePath, out var resourceName))
        {
            return Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName);
        }

        // Fallback для SPA (React routing)
        if (!Path.HasExtension(url) && _resourceMap.TryGetValue("index.html", out var indexRes))
        {
            contentType = "text/html";
            return Assembly.GetExecutingAssembly().GetManifestResourceStream(indexRes);
        }

        return null;
    }

    /// <summary>
    /// Возвращает MIME-тип содержимого на основе расширения файла в URL.
    /// Используется для корректной передачи статических ресурсов веб-сервером.
    /// </summary>
    /// <param name="url">Путь к файлу или URL, из которого извлекается расширение.</param>
    /// <returns>Строка с MIME-типом, соответствующим расширению файла. 
    /// Если расширение неизвестно, возвращается "application/octet-stream".</returns>
    public static string GetMimeType(string url)
    {
        var ext = Path.GetExtension(url).ToLower();
        return ext switch
        {
            ".html" => "text/html",
            ".js" => "text/javascript",
            ".css" => "text/css",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".svg" => "image/svg+xml",
            ".json" => "application/json",
            ".wasm" => "application/wasm",
            ".woff" => "font/woff",
            ".woff2" => "font/woff2",
            ".ico" => "image/x-icon",
            _ => "application/octet-stream"
        };
    }

    /// <summary>
    /// Извлекает внедрённый ресурс-иконку из сборки и сохраняет его во временной папке.
    /// Используется для предоставления иконок окну приложения, когда требуется локальный путь к файлу.
    /// </summary>
    /// <param name="resourceName">Имя файла ресурса (например, "app.ico"). Метод автоматически найдёт полное имя в манифесте.</param>
    /// <returns>Полный путь к временному файлу с извлечённой иконкой. Если ресурс не найден — возвращается переданное имя.</returns>
    public static string ExtractIconResource(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        string fullResourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(x => x.EndsWith(resourceName)) ?? resourceName;

        string tempPath = Path.Combine(Path.GetTempPath(), resourceName);

        using Stream? stream = assembly.GetManifestResourceStream(fullResourceName);
        if (stream == null) return resourceName;

        using FileStream fileStream = new(tempPath, FileMode.Create, FileAccess.Write);
        stream.CopyTo(fileStream);

        return tempPath;
    }
}
