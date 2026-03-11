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
        if (topLevel == null) return;

        var files = await topLevel.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Открыть книгу FB2",
            FileTypeFilter = [new FilePickerFileType("FB2") { Patterns = ["*.fb2", "*.fb2.zip"] }]
        });

        if (files.Count == 0)
        {
            Emit("cancel-loading", "");
            return;
        }

        using var file = files[0];

        string? localPath = file.TryGetLocalPath();
        if (string.IsNullOrEmpty(localPath)) return;

        Emit("start-loading", file.Name);

        try
        {
            string json = Fb2Service.LoadAndConvertToJson(file.Path.LocalPath);
            Emit("fb2-content", json);
        }
        catch (Exception ex)
        {
            Emit("error", ex.Message);
        }
    }


    /// <summary>
    /// Open image file
    /// </summary>
    /// <returns></returns>
    public async Task SelectImageAsync()
    {
        var topLevel = GetTopLevel();
        if (topLevel == null) return;

        var files = await topLevel.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Открыть картинку",
            FileTypeFilter = [new FilePickerFileType("FB2") { Patterns = ["*.jpg", "*.png"] }]
        });

        if (files.Count == 0)
        {
            return;
        }

        using var file = files[0];

        try
        {
            byte[] imageArray = File.ReadAllBytes(file.Name);
            string base64Image = Convert.ToBase64String(imageArray);
            string extension = Path.GetExtension(file.Name).Replace(".", "");

            // Формируем Data URL для отображения в браузере
            string dataUrl = $"data:image/{extension};base64,{base64Image}";

            string json = Fb2Service.LoadAndConvertToJson(file.Path.LocalPath);
            Emit("insert-image", dataUrl);
        }
        catch (Exception ex)
        {
            Emit("error", ex.Message);
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
        if (topLevel == null) return;

        var file = await topLevel.StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Сохранить FB2",
            DefaultExtension = "fb2"
        });

        if (file != null)
        {
            try
            {
                _fb2Converter.SaveJsonToFb2(file.Path.LocalPath, jsonContent);
                Emit("save-success", file.Name);
            }
            catch (Exception ex)
            {
                Emit("error", ex.Message);
            }
        }
    }

    // Вспомогательный метод для упаковки в JSON и генерации события
    private void Emit(string type, string payload)
    {
        var message = JsonConvert.SerializeObject(new { type, payload });
        OnMessageEmitted?.Invoke(message);
    }
}
