using System.IO.Compression;
using System.Text.Json;
using FB2Writer.Models;

namespace FB2Writer.Services;

/// <summary>
/// Сервис для работы с файлами: открытие, выбор изображений и сохранение FB2-документов.
/// Интегрируется с Avalonia через StorageProvider и взаимодействует с <see cref="Fb2Service"/> для конвертации форматов.
/// </summary>
public class FileService
{
    /// <summary>
    /// Экземпляр сервиса конвертации FB2-файлов в JSON и обратно.
    /// Отвечает за парсинг FB2-документов (включая .fb2.zip) и их преобразование во внутреннее представление,
    /// а также за сохранение изменённого контента обратно в FB2-формат.
    /// Является потокобезопасным и инициализируется при создании экземпляра класса.
    /// </summary>
    private readonly Fb2Service _fb2Converter = new();

    private readonly EpubConverter _epubConverter = new();

    /// <summary>
    /// Асинхронно загружает FB2-файл по указанному пути, преобразует его содержимое в JSON и отправляет во frontend.
    /// Метод не вызывает диалог выбора файла — используется, когда путь уже известен.
    /// В случае ошибки или отсутствия файла отправляет сообщение об ошибке.
    /// </summary>
    /// <param name="filePath">Полный путь к файлу на диске </param>
    /// <returns>Задача, представляющая асинхронную операцию загрузки и конвертации. Результат — JSON-строка с содержимым книги.</returns>
    /// <exception cref="FileNotFoundException">Исключение, если файл по указанному пути не найден.</exception>
    public async Task<Fb2BookExport> LoadFileByPathAsync(string filePath)
    {
        bool isZip = filePath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase);

        await using var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

        // Если ZIP — ищем вход в архив, если нет — используем сам FileStream
        Stream targetStream = fs;
        ZipArchive? archive = null;

        if (isZip)
        {
            archive = new ZipArchive(fs, ZipArchiveMode.Read);
            var entry = archive.Entries.FirstOrDefault(e => e.FullName.EndsWith(".fb2", StringComparison.OrdinalIgnoreCase))
                        ?? throw new Exception("FB2 не найден в архиве.");
            targetStream = entry.Open();
        }

        try
        {
            // Выполняем тяжелую работу в Task.Run
            return await Task.Run(() => _fb2Converter.ConvertXMLToJson(targetStream, Path.GetFileName(filePath)));
        }
        finally
        {
            // Важно: если открывали архив или поток из него — чистим за собой
            if (isZip) targetStream.Dispose();
            archive?.Dispose();
        }
    }

    /// <summary>
    /// Асинхронно загружает файл изображения по указанному локальному пути и преобразует его содержимое в строку формата Data URL.
    /// Используется для подготовки изображений к вставке в редактор через base64-кодировку.
    /// </summary>
    /// <param name="localPath">Полный путь к файлу изображения на диске (поддерживает JPG, PNG и другие форматы).</param>
    /// <returns>Задача, представляющая асинхронную операцию. Результат — строка в формате data:image/...;base64,..., готовая к использованию в HTML/CSS.</returns>
    /// <exception cref="FileNotFoundException">Исключение, если файл по указанному пути не найден.</exception>
    public static async Task<string> SelectImageAsync(string localPath)
    {
        const int MaxSizeBytes = 300 * 1024; // 307 200 байт

        // Используем FileInfo для быстрой проверки размера файла перед чтением в память
        var fileInfo = new FileInfo(localPath);
        if (fileInfo.Length > MaxSizeBytes)
        {
            throw new Exception($"Файл изображения слишком большой ({(fileInfo.Length / 1024.0):F1} КБ). Максимальный размер: 300 КБ.");
        }

        byte[] imageBytes = await File.ReadAllBytesAsync(localPath);
        string base64Image = Convert.ToBase64String(imageBytes);

        string ext = Path.GetExtension(localPath).ToLower().TrimStart('.');
        if (ext == "jpeg") ext = "jpg";

        return $"data:image/{ext};base64,{base64Image}";
    }

    /// <summary>
    /// Асинхронно сохраняет JSON-представление документа в FB2-файл (или .fb2.zip).
    /// Использует временный файл для обеспечения атомарности операции: при ошибке исходный файл не повреждается.
    /// Поддерживает прямое сохранение в .fb2 и упаковку в ZIP-архив.
    /// </summary>
    /// <param name="jsonContent">JSON-строка с данными редактора, подлежащая конвертации в FB2.</param>
    /// <param name="filePath">Полный путь к файлу, куда необходимо сохранить документ.</param>
    /// <returns>Задача, представляющая асинхронную операцию сохранения.</returns>
    /// <exception cref="Exception">Выбрасывается в случае ошибки конвертации или записи файла, с описанием проблемы.</exception>
    public async Task SaveFileAsync(JsonElement jsonContent, string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return;

        // Создаем временный файл в той же папке для атомарности
        string tempPath = filePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        bool isZip = filePath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase);
        string fileName = Path.GetFileName(filePath);

        try
        {
            await Task.Run(() =>
            {
                // Используем обычный using, так как мы в Task.Run
                using (var fs = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    if (isZip)
                    {
                        // leaveOpen: true важен, чтобы закрытие архива не закрыло поток fs раньше времени
                        using var archive = new ZipArchive(fs, ZipArchiveMode.Create, leaveOpen: true);

                        // Определяем имя внутреннего файла (убираем .zip)
                        string entryName = fileName.EndsWith(".fb2.zip", StringComparison.OrdinalIgnoreCase)
                            ? fileName[..^4]
                            : Path.GetFileNameWithoutExtension(fileName) + ".fb2";

                        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
                        using var entryStream = entry.Open();

                        _fb2Converter.ConvertJsonToFb2(entryStream, jsonContent);
                    }
                    else
                    {
                        _fb2Converter.ConvertJsonToFb2(fs, jsonContent);
                    }
                    fs.Flush(); // Сбрасываем буферы на диск
                }

                // Атомарная замена (на Linux это системный вызов rename)
                File.Move(tempPath, filePath, overwrite: true);
            });
        }
        catch
        {
            // Очистка временного файла при ошибке
            if (File.Exists(tempPath)) File.Delete(tempPath);
            throw;
        }
    }
    /// <summary>
    /// Асинхронно сохраняет JSON-представление документа в FB2-файл (или .fb2.zip).
    /// Использует временный файл для обеспечения атомарности операции: при ошибке исходный файл не повреждается.
    /// Поддерживает прямое сохранение в .fb2 и упаковку в ZIP-архив.
    /// </summary>
    /// <param name="jsonContent">JSON-строка с данными редактора, подлежащая конвертации в FB2.</param>
    /// <param name="filePath">Полный путь к файлу, куда необходимо сохранить документ.</param>
    /// <returns>Задача, представляющая асинхронную операцию сохранения.</returns>
    /// <exception cref="Exception">Выбрасывается в случае ошибки конвертации или записи файла, с описанием проблемы.</exception>
    public async Task ExportEpubAsync(JsonElement jsonContent, string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return;

        // Создаем временный файл в той же папке для атомарности
        string tempPath = filePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        string fileName = Path.GetFileName(filePath);

        try
        {
            await Task.Run(async () =>
            {
                // Используем обычный using, так как мы в Task.Run
                using (var fs = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {        
                    using var ms = new MemoryStream();
                    // Используем LeaveOpen: true, чтобы MemoryStream не закрылся раньше времени

                    _epubConverter.ConvertJsonToEpub(ms, jsonContent);
                    ms.WriteTo(fs);
                    fs.Flush(); // Сбрасываем буферы на диск
                }

                // Атомарная замена (на Linux это системный вызов rename)
                File.Move(tempPath, filePath, overwrite: true);
            });
        }
        catch
        {
            // Очистка временного файла при ошибке
            if (File.Exists(tempPath)) File.Delete(tempPath);
            throw;
        }
    }

}