using Avalonia.Platform.Storage;
//using Newtonsoft.Json;
using System.Text.Json;
using System.Text.Encodings.Web;

namespace FB2Editor.Services;

/// <summary>
/// Сервис для работы с файлами: открытие, выбор изображений и сохранение FB2-документов.
/// Интегрируется с Avalonia через StorageProvider и взаимодействует с <see cref="Fb2Service"/> для конвертации форматов.
/// </summary>
public class FileService
{
    private readonly Fb2Service _fb2Converter = new();

    /// <summary>
    /// Событие, возникающее при отправке сообщения во frontend.
    /// Параметр — JSON-строка, готовая к передаче через механизм Web-сообщений.
    /// </summary>
    public event Action<string>? OnMessageEmitted;

    /// <summary>
    /// Возвращает главное окно приложения, используемое как владелец диалогов выбора файлов.
    /// </summary>
    /// <returns>Экземпляр главного окна или <see langword="null"/>, если не установлено.</returns>
    private static Avalonia.Controls.Window? GetTopLevel()
    {
        // Возвращаем наше окно-заглушку из Program
        return Program.DialogOwner;
    }

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
    /// Асинхронно открывает FB2-файл (или архив .fb2.zip), читает его содержимое и преобразует в JSON.
    /// Отправляет результат во frontend или уведомляет о cancell-событии и ошибках.
    /// </summary>
    /// <returns>Задача, представляющая асинхронную операцию.</returns>
    public async Task OpenFileAsync()
    {
        var topLevel = GetTopLevel();
        if (topLevel?.StorageProvider == null) return;

        var result = await topLevel.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Открыть книгу FB2",
            FileTypeFilter =
            [
                new FilePickerFileType("Книги FB2") { Patterns = ["*.fb2", "*.fb2.zip"] },
                new FilePickerFileType("Архивы FB2.ZIP") { Patterns = ["*.fb2.zip"] }
            ],
            AllowMultiple = false
        });

        // Используем FirstOrDefault, так как это безопаснее для списков
        var file = (result != null && result.Count > 0) ? result[0] : null;

        if (file == null)
        {
            // Cancel OpenFile dialog
            Emit("cancel-loading", string.Empty);
            return;
        }

        // Start of loading
        Emit("start-loading", file.Name);

        try
        {
            await using var stream = await file.OpenReadAsync();

            // Если файл большой, парсинг может занять время — выполняем в Task.Run, 
            // чтобы не блокировать UI-поток Avalonia
            string json = await Task.Run(() => _fb2Converter.LoadAndConvertToJson(stream, file.Name));

            // End of loading
            Emit("fb2-content", json);
        }
        catch (Exception ex)
        {
            Emit("error", $"Ошибка при чтении {file.Name}: {ex.Message}");
        }
    }

    /// <summary>
    /// Асинхронно открывает диалог выбора изображения (JPG, PNG) и возвращает его содержимое в формате Data URL.
    /// Используется для вставки изображений в редактор.
    /// </summary>
    /// <param name="DiplayType">Тип отображения изображения (например, "block" или "inline").</param>
    /// <returns>Задача, представляющая асинхронную операцию.</returns>
    public async Task SelectImageAsync(string DiplayType)
    {
        var topLevel = GetTopLevel();
        if (topLevel?.StorageProvider == null) return;

        var result = await topLevel.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Выберите изображение",
            FileTypeFilter =
            [
                new FilePickerFileType("Изображения") { Patterns = ["*.jpg", "*.jpeg", "*.png"] }
            ],
            AllowMultiple = false
        });

        if (result == null || result.Count == 0)
        {
            // Cancel OpenFile dialog
            Emit("cancel-loading", string.Empty);
            return;
        }

        var file = result[0];

        try
        {
            // Build base64 image
            await using var stream = await file.OpenReadAsync();

            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            byte[] imageBytes = ms.ToArray();

            string base64Image = Convert.ToBase64String(imageBytes);

            string ext = Path.GetExtension(file.Name).ToLower().TrimStart('.');
            if (ext == "jpeg") ext = "jpg";

            string dataUrl = $"data:image/{ext};base64,{base64Image}";

            var imageInfo = JsonSerializer.Serialize(new
            {
                data = dataUrl,
                display = DiplayType,
                href = $"#{Guid.NewGuid()}"
            });

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
        var topLevel = GetTopLevel();
        if (topLevel?.StorageProvider == null) return;

        var file = await topLevel.StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Сохранить книгу",
            // Позволяем пользователю выбрать формат сохранения
            FileTypeChoices =
            [
                new FilePickerFileType("Книга FB2") { Patterns = ["*.fb2"] },
                new FilePickerFileType("Архив FB2.ZIP") { Patterns = ["*.fb2.zip"] }
            ],
            DefaultExtension = "fb2",
            SuggestedFileName = "book"
        });

        if (file == null)
        {
            // Cancel SaveFile dialog
            Emit("cancel-loading", string.Empty);
            return;
        }

        // Start of saving
        Emit("start-saving", file.Name);

        try
        {
            await using var stream = await file.OpenWriteAsync();

            // Выполняем тяжелую конвертацию и запись в фоновом потоке
            await Task.Run(() => _fb2Converter.SaveJsonToFb2(stream, file.Name, jsonContent));

            Emit("save-success", file.Name);
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
    private void Emit(string type, string payload)
    {
        var message = JsonSerializer.Serialize(new { type, payload }, _jsonOptions);
        OnMessageEmitted?.Invoke(message);
    }
}
