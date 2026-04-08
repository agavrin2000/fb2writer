namespace FB2Editor.Services;

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
    public static async Task<string> SelectImageAsync(string localPath)
    {
        byte[] imageBytes = await File.ReadAllBytesAsync(localPath);
        string base64Image = Convert.ToBase64String(imageBytes);

        // Определяем расширение
        string ext = Path.GetExtension(localPath).ToLower().TrimStart('.');
        if (ext == "jpeg") ext = "jpg";

        return $"data:image/{ext};base64,{base64Image}";
    }

    /// <summary>
    /// Асинхронно сохраняет JSON-представление документа обратно в FB2-файл или ZIP-архив.
    /// Позволяет пользователю выбрать путь и формат сохранения.
    /// </summary>
    /// <param name="jsonContent">JSON-строка с данными редактора, подлежащая конвертации в FB2.</param>
    /// <returns>Задача, представляющая асинхронную операцию.</returns>
    public async Task SaveFileAsync(string jsonContent, string localPath)
    {
        await using var stream = File.Create(localPath);
        // Выполняем тяжелую конвертацию в фоновом потоке
        await Task.Run(() => _fb2Converter.SaveJsonToFb2(stream, Path.GetFileName(localPath), jsonContent));

        return;
    }
}
