using System.Text.Json;
using System.Text.Encodings.Web;
using FB2Editor.Models;
using System.Text.Json.Serialization;
using Photino.NET;


namespace FB2Editor.Services;

// 2. Контекст сериализации (Source Generator)
[JsonSerializable(typeof(EmitMessage))]
[JsonSerializable(typeof(ImageInfoMessage))]
[JsonSerializable(typeof(Fb2BookExport))]
[JsonSerializable(typeof(PersonInfo))]
[JsonSerializable(typeof(List<PersonInfo>))]
[JsonSerializable(typeof(List<object>))] // Добавьте это: критично для TipTap Content
[JsonSerializable(typeof(System.Dynamic.ExpandoObject))] // На всякий случай, если есть dynamic
[JsonSerializable(typeof(object))] // Нужно для базовой поддержки
[JsonSerializable(typeof(TipTapNode))]         // Для одиночных узлов
[JsonSerializable(typeof(List<TipTapNode>))]   // Для массивов узлов
// Добавляем поддержку словаря со списками объектов внутри
[JsonSerializable(typeof(Dictionary<string, List<object>>))]
// Также убедитесь, что есть базовые типы, которые могут быть внутри List<object>
[JsonSerializable(typeof(TipTapNode))]
[JsonSerializable(typeof(List<TipTapNode>))]
[JsonSerializable(typeof(List<object>))]       // Для вложенного контента
[JsonSerializable(typeof(Dictionary<string, string>))] // Для атрибутов (attrs)
internal partial class EmitContext : JsonSerializerContext { }

/// <summary>
/// Сервис для работы с файлами: открытие, выбор изображений и сохранение FB2-документов.
/// Интегрируется с Avalonia через StorageProvider и взаимодействует с <see cref="Fb2Service"/> для конвертации форматов.
/// </summary>
public class FileService(PhotinoWindow window)
{
    /// <summary>
    /// Хранит путь к последней использованной директории для открытия или сохранения файлов.
    /// Используется для улучшения пользовательского опыта, запоминая место предыдущей операции.
    /// Значение инициализируется из специальной папки "Мои документы", если ранее не было задано.
    /// </summary>
    private string? _lastUsedPath;

    /// <summary>
    /// Представляет нативное окно приложения, предоставляемое фреймворком Photino.NET.
    /// Используется для отображения диалоговых окон выбора файлов (открытие/сохранение).
    /// Обеспечивает интеграцию с системными диалогами операционной системы.
    /// </summary>
    private readonly PhotinoWindow _window = window;

    /// <summary>
    /// Экземпляр сервиса конвертации FB2-файлов в JSON и обратно.
    /// Отвечает за парсинг FB2-документов (включая .fb2.zip) и их преобразование во внутреннее представление,
    /// а также за сохранение изменённого контента обратно в FB2-формат.
    /// Является потокобезопасным и инициализируется при создании экземпляра класса.
    /// </summary>
    private readonly Fb2Service _fb2Converter = new();

    /// <summary>
    /// Событие, возникающее при отправке сообщения во frontend.
    /// Параметр — JSON-строка, готовая к передаче через механизм Web-сообщений.
    /// </summary>
    public event Action<string>? OnMessageEmitted;

    /// <summary>
    /// Настройки сериализации JSON для формирования сообщений.
    /// Обеспечивает использование camelCase и корректное отображение кириллицы.
    /// </summary>
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        // camelCase для имен свойств (type, payload)
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
        // Чтобы русский текст и спецсимволы в payload не превращались в \uXXXX
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    /// <summary>
    /// Асинхронно загружает FB2-файл по указанному пути, преобразует его содержимое в JSON и отправляет во frontend.
    /// Метод не вызывает диалог выбора файла — используется, когда путь уже известен.
    /// В случае ошибки или отсутствия файла отправляет сообщение об ошибке.
    /// </summary>
    /// <param name="filePath">Полный путь к файлу на диске (поддерживает .fb2 и .fb2.zip).</param>
    /// <returns>Задача, представляющая асинхронную операцию загрузки и конвертации.</returns>
    public async Task<string> LoadFileByPathAsync(string filePath)
    {
        string fileName = Path.GetFileName(filePath);

        // Используем обычный FileStream, так как у нас есть прямой путь
        await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

        // Парсинг в фоновом потоке
        return await Task.Run(() => _fb2Converter.LoadAndConvertToJson(stream, fileName));

    }

    /// <summary>
    /// Асинхронно открывает диалог выбора изображения (JPG, PNG) для вставки в редактор.
    /// Метод принимает JSON-строку с параметрами отображения и определяет тип вставки (block/inline).
    /// После выбора файла изображение преобразуется в Data URL и отправляется во frontend.
    /// </summary>
    /// <param name="payload">JSON-строка, содержащая параметры вставки изображения. 
    /// Ожидается свойство "type" со значением "block" или "inline". Если пусто или невалидно — используется значение по умолчанию.</param>
    /// <returns>Задача, представляющая асинхронную операцию выбора и подготовки изображения.</returns>
    public async Task SelectImageAsync(string payload)
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

        // 1. Используем тот же подход с путями, что и при открытии книги
        string defaultPath = !string.IsNullOrEmpty(_lastUsedPath)
            ? _lastUsedPath
            : Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);

        var filters = new (string Name, string[] Extensions)[]
        {
        ("Изображения", ["jpg", "jpeg", "png"])
        };

        // 2. Нативный диалог Photino
        string[] result = await _window.ShowOpenFileAsync(
            title: "Выберите изображение",
            defaultPath: defaultPath,
            multiSelect: false,
            filters: filters
        );

        var localPath = result?.FirstOrDefault();

        if (string.IsNullOrEmpty(localPath))
        {
            Emit("cancel-loading", string.Empty);
            return;
        }

        // Сохраняем путь для удобства пользователя
        _lastUsedPath = Path.GetDirectoryName(localPath);

        try
        {
            // 3. Читаем файл (File.ReadAllBytesAsync — самый быстрый путь для небольших картинок)
            byte[] imageBytes = await File.ReadAllBytesAsync(localPath);
            string base64Image = Convert.ToBase64String(imageBytes);

            // Определяем расширение
            string ext = Path.GetExtension(localPath).ToLower().TrimStart('.');
            if (ext == "jpeg") ext = "jpg";

            string dataUrl = $"data:image/{ext};base64,{base64Image}";

            // 4. Сериализация через Source Generator (EmitContext)
            var imageInfo = JsonSerializer.Serialize(
                new ImageInfoMessage(
                    Data: dataUrl,
                    Display: displayType,
                    Href: $"#{Guid.NewGuid()}"
                ),
                typeof(ImageInfoMessage),
                EmitContext.Default
            );

            Emit("image-selected", imageInfo);
        }
        catch (Exception ex)
        {
            Emit("error", $"Не удалось загрузить изображение: {ex.Message}");
        }
    }

    /// <summary>
    /// Асинхронно сохраняет JSON-представление документа обратно в FB2-файл или ZIP-архив.
    /// Позволяет пользователю выбрать путь и формат сохранения.
    /// </summary>
    /// <param name="jsonContent">JSON-строка с данными редактора, подлежащая конвертации в FB2.</param>
    /// <returns>Задача, представляющая асинхронную операцию.</returns>
    public async Task SaveFileAsync(string jsonContent)
    {
        // 1. Определяем начальный путь и имя файла
        string defaultPath = !string.IsNullOrEmpty(_lastUsedPath)
            ? _lastUsedPath
            : Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

        var filters = new (string Name, string[] Extensions)[]
        {
        ("Книга FB2", ["fb2"]),
        ("Архив FB2.ZIP", ["fb2.zip"])
        };

        // 2. Нативный диалог сохранения Photino
        // Метод обычно возвращает строку с выбранным путем или null/empty при отмене
        string localPath = await _window.ShowSaveFileAsync(
            "Сохранить книгу",
            defaultPath,
            filters
        );

        if (string.IsNullOrEmpty(localPath))
        {
            Emit("cancel-loading", string.Empty);
            return;
        }

        // Сохраняем папку для будущих операций
        _lastUsedPath = Path.GetDirectoryName(localPath);
        string fileName = Path.GetFileName(localPath);

        Emit("start-saving", fileName);

        try
        {
            // 3. Открываем поток файла и выполняем конвертацию
            // В .NET 10 File.Create — самый надежный способ получить FileStream
            await using (var stream = File.Create(localPath))
            {
                // Выполняем тяжелую конвертацию в фоновом потоке
                await Task.Run(() => _fb2Converter.SaveJsonToFb2(stream, fileName, jsonContent));
            }

            Emit("save-success", fileName);
        }
        catch (Exception ex)
        {
            Emit("error", $"Ошибка при сохранении: {ex.Message}");
        }
    }

    /// <summary>
    /// Вспомогательный метод для формирования и отправки JSON-сообщения через событие <see cref="OnMessageEmitted"/>.
    /// </summary>
    /// <param name="type">Тип сообщения (например, "fb2-content", "error", "start-loading").</param>
    /// <param name="payload">Полезная нагрузка сообщения в виде строки (может быть JSON).</param>
    public void Emit(string type, string payload)
    {
        var message = JsonSerializer.Serialize(
            new EmitMessage(type, payload),
            EmitContext.Default.EmitMessage
        );

        OnMessageEmitted?.Invoke(message);
    }
}
