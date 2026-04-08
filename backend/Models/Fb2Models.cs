using System.Text.Json.Serialization;

namespace FB2Editor.Models;

public record Fb2BookExport(
    [property: JsonPropertyName("metadata")] Fb2Metadata Metadata,
    [property: JsonPropertyName("content")] TipTapDoc Content,
    [property: JsonPropertyName("footnotes")] Dictionary<string, List<TipTapNode>>? Footnotes,
    [property: JsonPropertyName("filePath")] string FilePath
);

public record Fb2Metadata(
    [property: JsonPropertyName("titleInfo")] Fb2TitleInfo? TitleInfo,
    [property: JsonPropertyName("srcTitleInfo")] Fb2TitleInfo? SrcTitleInfo,
    [property: JsonPropertyName("documentInfo")] Fb2DocumentInfo? DocumentInfo,
    [property: JsonPropertyName("publishInfo")] Fb2PublishInfo? PublishInfo,
    [property: JsonPropertyName("customInfo")] Fb2CustomInfo? CustomInfo
);

public record Fb2TitleInfo(
    List<string>? Genres,
    List<PersonInfo>? Authors, // Если parseAuthor возвращает сложный объект, лучше создать для него record AuthorInfo
    string? Title,
    TipTapDoc? Annotation,
    string? Keywords,
    string? Date,
    string? DateValue,
    string? CoverPage,
    string? Lang,
    string? SrcLang,
    List<PersonInfo>? Translators,
    List<Fb2Sequence>? Sequence
);

public record Fb2DocumentInfo(
    List<PersonInfo>? Authors,
    string? Program,
    string? Date,
    string? DateValue,
    string? Id,
    string? SrcUrl,
    string? SrcOcr,
    string? Version,
    TipTapDoc? History
);

public record Fb2PublishInfo(
    string? BookName,
    string? Publisher,
    string? City,
    string? Year,
    string? ISBN,
    List<Fb2Sequence>? Sequence
);

public record Fb2Sequence(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("number")] int? Number
);

public record Fb2CustomInfo(
    [property: JsonPropertyName("customItems")] List<Fb2CustomItem>? CustomItems
);

public record Fb2CustomItem(
    [property: JsonPropertyName("infoType")] string? InfoType,
    [property: JsonPropertyName("value")] string Value
);

// Универсальный тип для аннотаций и контента в формате TipTap
public record TipTapDoc(
    [property: JsonPropertyName("type")] string Type = "doc",
    [property: JsonPropertyName("content")] List<TipTapNode>? Content = null
);

public record PersonInfo(
    [property: JsonPropertyName("firstName")] string? FirstName,
    [property: JsonPropertyName("lastName")] string? LastName,
    [property: JsonPropertyName("middleName")] string? MiddleName,
    [property: JsonPropertyName("nickname")] string? Nickname,
    [property: JsonPropertyName("homePages")] List<string>? HomePages,
    [property: JsonPropertyName("emails")] List<string>? Emails,
    [property: JsonPropertyName("id")] string? Id
);

public record TipTapMark(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("attrs")] Dictionary<string, string?>? Attrs = null
);

public record TipTapNode(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("attrs")] Dictionary<string, string?>? Attrs = null,
    [property: JsonPropertyName("content")] List<TipTapNode>? Content = null,
    [property: JsonPropertyName("text")] string? Text = null,
    [property: JsonPropertyName("marks")] List<TipTapMark>? Marks = null
);

