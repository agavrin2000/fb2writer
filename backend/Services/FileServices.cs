using Avalonia.Platform.Storage;
using Newtonsoft.Json;

namespace FB2Editor.Services;

public class FileService
{
    private readonly Fb2Service _fb2Converter = new();

    // Событие для отправки любых сообщений во фронтенд
    // Параметр string — это готовый JSON для отправки через SendWebMessage
    public event Action<string>? OnMessageEmitted;

    private static Avalonia.Controls.Window? GetTopLevel()
    {
        // Возвращаем наше окно-заглушку из Program
        return Program.DialogOwner;
    }

    /// <summary>
    /// Open fb2-filep
    /// </summary>
    /// <returns></returns>
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
            Emit("cancel-loading", string.Empty);
            return;
        }

        Emit("start-loading", file.Name);

        try
        {
            // Используем await using для асинхронных потоков (рекомендуется в .NET)
            await using var stream = await file.OpenReadAsync();

            // Если файл большой, парсинг может занять время — выполняем в Task.Run, 
            // чтобы не блокировать UI-поток Avalonia
            string json = await Task.Run(() => Fb2Service.LoadAndConvertToJson(stream, file.Name));

            Emit("fb2-content", json);
        }
        catch (Exception ex)
        {
            // Логируем или выводим более детальную ошибку
            Emit("error", $"Ошибка при чтении {file.Name}: {ex.Message}");
        }
    }


    /// <summary>
    /// Open image file
    /// </summary>
    /// <returns></returns>
    public async Task SelectImageAsync()
    {
        var topLevel = GetTopLevel();
        if (topLevel?.StorageProvider == null) return;

        var result = await topLevel.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Выберите изображение",
            FileTypeFilter =
            [
                new FilePickerFileType("Изображения") { Patterns = ["*.jpg", "*.jpeg", "*.png", "*.gif"] }
            ],
            AllowMultiple = false
        });

        if (result == null || result.Count == 0) return;
        var file = result[0];

        try
        {
            // Читаем данные напрямую из потока файла (работает везде, включая мобильные ОС и песочницы)
            await using var stream = await file.OpenReadAsync();

            // Используем MemoryStream для эффективного чтения в байты
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            byte[] imageBytes = ms.ToArray();

            string base64Image = Convert.ToBase64String(imageBytes);

            // Получаем расширение и нормализуем его (jpeg -> jpg для mime-type)
            string ext = Path.GetExtension(file.Name).ToLower().TrimStart('.');
            if (ext == "jpeg") ext = "jpg";

            string dataUrl = $"data:image/{ext};base64,{base64Image}";

            // Генерируем уникальный ID для бинарного объекта FB2 (опционально, если нужно для XML)
            // string binaryId = $"{Guid.NewGuid()}.{ext}";

            Emit("insert-image", dataUrl);
        }
        catch (Exception ex)
        {
            Emit("error", $"Не удалось загрузить изображение: {ex.Message}");
        }
    }

    /// <summary>
    /// Save fb2-file
    /// </summary>
    /// <param name="jsonContent"></param>
    /// <returns></returns>
    public async Task SaveFileAsync(string jsonContent)
    {
        var topLevel = GetTopLevel();
        if (topLevel?.StorageProvider == null) return;

        var file = await topLevel.StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Сохранить книгу",
            // Позволяем пользователю выбрать формат сохранения
            FileTypeChoices = new[]
            {
            new FilePickerFileType("Книга FB2") { Patterns = ["*.fb2"] },
            new FilePickerFileType("Архив FB2.ZIP") { Patterns = ["*.fb2.zip"] }
        },
            DefaultExtension = "fb2",
            SuggestedFileName = "book"
        });

        if (file == null) return;

        try
        {
            // Открываем поток на запись асинхронно
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


    // Вспомогательный метод для упаковки в JSON и генерации события
    private void Emit(string type, string payload)
    {
        var message = JsonConvert.SerializeObject(new { type, payload });
        OnMessageEmitted?.Invoke(message);
    }
}
