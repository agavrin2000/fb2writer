using System.Text.Json;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using FB2Writer.Models;

namespace FB2Writer;

/// <summary>
/// Представляет базовое сообщение, отправляемое из C#-кода во frontend.
/// Содержит тип события и полезную нагрузку в виде строки (обычно JSON).
/// Используется для маршрутизации событий в веб-интерфейсе.
/// </summary>
/// <param name="Type">Тип сообщения (например, "fb2-content", "error", "app-info").</param>
/// <param name="Payload">Полезная нагрузка сообщения, сериализованная в строку.</param>
public record EmitMessage(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("payload")] object? Payload);
/// <summary>
/// Содержит информацию о выбранном изображении для вставки в редактор.
/// Включает данные изображения, способ отображения и уникальный идентификатор ссылки.
/// </summary>
/// <param name="Data">Строка в формате Data URL (data:image/...;base64,...), представляющая содержимое изображения.</param>
/// <param name="Display">Тип отображения: "block" (как блок) или "inline" (встроенный).</param>
/// <param name="Href">Уникальный идентификатор ссылки, используемый в HTML-атрибуте href.</param>
public record ImageInfoMessage(
    [property: JsonPropertyName("data")] string Data,
    [property: JsonPropertyName("display")] string Display,
    [property: JsonPropertyName("href")] string Href
);
/// <summary>
/// Содержит основные сведения о приложении: отображаемое имя и версию.
/// Отправляется frontend при запуске для отображения информации о программе.
/// </summary>
/// <param name="Name">Отображаемое имя приложения (значение атрибута &lt;Product&gt;).</param>
/// <param name="Version">Версия приложения в формате Major.Minor.Build.</param>
public record AppDetails(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("version")] string Version
);

/// <summary>
/// Контекст сериализации JSON, основанный на Source Generator (.NET 8+), 
/// который предварительно генерирует код для эффективной и безопасной сериализации/десериализации типов.
/// Включает все необходимые типы, используемые при обмене сообщениями между C# и frontend (JavaScript).
/// </summary>
[JsonSerializable(typeof(EmitMessage))]
[JsonSerializable(typeof(AppDetails))]
[JsonSerializable(typeof(ImageInfoMessage))]
[JsonSerializable(typeof(Fb2BookExport))]
[JsonSerializable(typeof(PersonInfo))]
[JsonSerializable(typeof(List<PersonInfo>))]
[JsonSerializable(typeof(List<object>))]
[JsonSerializable(typeof(System.Dynamic.ExpandoObject))] // На всякий случай, если есть dynamic
[JsonSerializable(typeof(object))] // Нужно для базовой поддержки
[JsonSerializable(typeof(TipTapNode))]         // Для одиночных узлов
[JsonSerializable(typeof(int))]   
[JsonSerializable(typeof(string))]
[JsonSerializable(typeof(List<TipTapNode>))]   // Для массивов узлов
[JsonSerializable(typeof(Dictionary<string, List<object>>))] // Добавляем поддержку словаря со списками объектов внутри
[JsonSerializable(typeof(Dictionary<string, object>))] // Для атрибутов (attrs)
internal partial class EmitContext : JsonSerializerContext
{
    public static readonly EmitContext Custom = new(CustomOptions);
    private static JsonSerializerOptions? _customOptions;

    /// <summary>
    /// Возвращает общие настройки сериализации JSON, используемые в приложении.
    /// Обеспечивает:
    /// - Использование camelCase для имён свойств;
    /// - Подавление записи значений null;
    /// - Минимизацию вывода (без отступов);
    /// - Поддержку кириллицы и спецсимволов через небезопасный энкодер;
    /// - Привязку к этому контексту через TypeInfoResolver для работы Source Generator.
    /// </summary>
    public static JsonSerializerOptions CustomOptions => _customOptions ??= new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        TypeInfoResolver = Default, // Важно для работы Source Generation
    };
}

