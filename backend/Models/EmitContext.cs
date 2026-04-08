using System.Text.Json.Serialization;

namespace FB2Editor.Models;

public record EmitMessage(
    [property: JsonPropertyName("type")] string Type, 
    [property: JsonPropertyName("payload")] string Payload);
public record ImageInfoMessage(
    [property: JsonPropertyName("data")] string Data, 
    [property: JsonPropertyName("display")] string Display, 
    [property: JsonPropertyName("href")] string Href
);

