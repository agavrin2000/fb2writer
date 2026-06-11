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
    private static readonly Dictionary<string, string> _resourceMap = [];

    public static void IndexEmbeddedResources(string assemblyName)
    {
        var assembly = typeof(AssetHandler).Assembly;
        // Префикс, который Web SDK добавляет к файлам в папке Resources/wwwroot
        string prefix = $"{assemblyName}.Resources.wwwroot.";

        foreach (var res in assembly.GetManifestResourceNames())
        {
            if (res.StartsWith(prefix))
            {
                // Сохраняем как есть: "Resources.wwwroot.static.js.main.js"
                // Или обрезаем только имя сборки для удобства поиска
                _resourceMap[res] = res;
            }
        }
    }

    /// <summary>
    /// Возвращает поток встроенного ресурса по указанному URL-адресу.
    /// </summary>
    /// <param name="url">Запрашиваемый URL, включая виртуальный домен (например, http://app.io/static/js/main.js).</param>
    /// <param name="virtualDomain">Виртуальный домен приложения (например, "http://app.io"), который нужно удалить из пути.</param>
    /// <param name="contentType">Тип содержимого (MIME type) для запрошенного ресурса. Устанавливается при возврате.</param>
    /// <returns>
    /// Поток ресурса, если он найден; иначе — <see langword="null"/>.
    /// Поток должен быть освобождён вызывающим кодом после использования.
    /// </returns>
    public static Stream? GetResourceStream(string url, string virtualDomain, out string contentType)
    {
        contentType = GetMimeType(url);

        // Извлекаем чистый путь: "static/js/main.js"
        string relativePath = url.Replace(virtualDomain, "").TrimStart('/');
        if (string.IsNullOrEmpty(relativePath) || relativePath == "index.html")
            relativePath = "index.html";

        // Преобразуем путь запроса в формат ресурса: 
        // "static/js/main.js" -> "static.js.main.js"
        // Важно: точки в именах файлов (типа .min.js) остаются точками, 
        // а слэши папок становятся точками. Результат идентичен!
        string resourceKeyPart = relativePath.Replace('/', '.');

        // Формируем полный ключ, как он лежит в манифесте
        // Здесь assemblyName должен быть тем же, что и в IndexEmbeddedResources
        string fullResourceKey = $"FB2Writer.Resources.wwwroot.{resourceKeyPart}";

        if (_resourceMap.TryGetValue(fullResourceKey, out var resourceName))
        {
            return typeof(AssetHandler).Assembly.GetManifestResourceStream(resourceName);
        }

        // Fallback для SPA
        if (!Path.HasExtension(url))
        {
            string indexKey = "FB2Writer.Resources.wwwroot.index.html";
            if (_resourceMap.TryGetValue(indexKey, out var indexRes))
            {
                contentType = "text/html";
                return typeof(AssetHandler).Assembly.GetManifestResourceStream(indexRes);
            }
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
            ".aff" => "text/plain",
            ".dic" => "text/plain",
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
