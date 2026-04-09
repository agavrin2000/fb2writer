using System.Text.Json;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using FB2Editor.Models;

namespace FB2Editor;

public record EmitMessage(
    [property: JsonPropertyName("type")] string Type, 
    [property: JsonPropertyName("payload")] string Payload);
public record ImageInfoMessage(
    [property: JsonPropertyName("data")] string Data, 
    [property: JsonPropertyName("display")] string Display, 
    [property: JsonPropertyName("href")] string Href
);
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
[JsonSerializable(typeof(List<TipTapNode>))]   // Для массивов узлов
[JsonSerializable(typeof(Dictionary<string, List<object>>))] // Добавляем поддержку словаря со списками объектов внутри
[JsonSerializable(typeof(TipTapNode))]
[JsonSerializable(typeof(List<TipTapNode>))] // Для TipTap Content
[JsonSerializable(typeof(List<object>))]       // Для вложенного контента
[JsonSerializable(typeof(Dictionary<string, string>))] // Для атрибутов (attrs)
internal partial class EmitContext : JsonSerializerContext
{
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
        TypeInfoResolver = Default // Важно для работы Source Generation
    };
}

