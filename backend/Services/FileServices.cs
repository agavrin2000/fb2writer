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
    private string? _lastUsedPath;

    private readonly PhotinoWindow _window = window;

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

    // 1. Универсальный метод загрузки по прямому пути (без диалога)
    public async Task LoadFileByPathAsync(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
        {
            Emit("error", "Файл не найден или путь пуст.");
            return;
        }

        string fileName = Path.GetFileName(filePath);

        // Начало загрузки
        Emit("start-loading", fileName);

        try
        {
            // Используем обычный FileStream, так как у нас есть прямой путь
            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

            // Парсинг в фоновом потоке
            string json = await Task.Run(() => _fb2Converter.LoadAndConvertToJson(stream, fileName));

            // Отправка контента во фронтенд
            Emit("fb2-content", json);
        }
        catch (Exception ex)
        {
            Emit("error", $"Ошибка при чтении {fileName}: {ex.Message}");
        }
    }

    /// <summary>
    /// Асинхронно открывает FB2-файл (или архив .fb2.zip), читает его содержимое и преобразует в JSON.
    /// Отправляет результат во frontend или уведомляет о cancell-событии и ошибках.
    /// </summary>
    /// <returns>Задача, представляющая асинхронную операцию.</returns>
    public async Task OpenFileAsync()
    {
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
            Emit("cancel-loading", string.Empty);
            return;
        }

        // 2. Сохраняем путь к папке (без имени файла) для следующего раза
        _lastUsedPath = Path.GetDirectoryName(localPath);

        await LoadFileByPathAsync(localPath);
    }

    /// <summary>
    /// Асинхронно открывает диалог выбора изображения (JPG, PNG) и возвращает его содержимое в формате Data URL.
    /// Используется для вставки изображений в редактор.
    /// </summary>
    /// <param name="DiplayType">Тип отображения изображения (например, "block" или "inline").</param>
    /// <returns>Задача, представляющая асинхронную операцию.</returns>
    public async Task SelectImageAsync(string displayType)
    {
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
