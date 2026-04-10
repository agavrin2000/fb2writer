using System.Text.Json.Serialization;

namespace FB2Editor.Models;

/// <summary>
/// Представляет полную структуру книги в формате FB2, готовую к экспорту или сохранению.
/// Содержит метаданные, основной контент, сноски и путь к файлу.
/// </summary>
/// <param name="Metadata">Метаданные книги: заголовок, авторы, издание и т.д.</param>
/// <param name="Content">Основное содержимое книги в формате документа TipTap.</param>
/// <param name="Footnotes">Опциональный словарь сносок, где ключ — идентификатор ссылки, а значение — список узлов TipTap.</param>
/// <param name="FilePath">Полный путь к файлу, в который будет сохранена книга (может быть .fb2 или .fb2.zip).</param>
public record Fb2BookExport(
    [property: JsonPropertyName("metadata")] Fb2Metadata Metadata,
    [property: JsonPropertyName("content")] TipTapDoc Content,
    [property: JsonPropertyName("footnotes")] Dictionary<string, List<TipTapNode>>? Footnotes,
    [property: JsonPropertyName("filePath")] string FilePath);

/// <summary>
/// Содержит все группы метаданных книги в формате FB2.
/// Объединяет информацию о заголовке, источнике, документе, издании и пользовательских полях.
/// </summary>
/// <param name="TitleInfo">Информация о заголовке книги: авторы, жанр, аннотация и т.д.</param>
/// <param name="SrcTitleInfo">Информация об исходном заголовке (если это перевод).</param>
/// <param name="DocumentInfo">Сведения о создании электронного документа: редактор, дата, история.</param>
/// <param name="PublishInfo">Издательская информация: название, город, год, ISBN.</param>
/// <param name="CustomInfo">Пользовательские поля, определённые в документе.</param>
public record Fb2Metadata(
    [property: JsonPropertyName("titleInfo")] Fb2TitleInfo? TitleInfo,
    [property: JsonPropertyName("srcTitleInfo")] Fb2TitleInfo? SrcTitleInfo,
    [property: JsonPropertyName("documentInfo")] Fb2DocumentInfo? DocumentInfo,
    [property: JsonPropertyName("publishInfo")] Fb2PublishInfo? PublishInfo,
    [property: JsonPropertyName("customInfo")] Fb2CustomInfo? CustomInfo);

/// <summary>
/// Описывает информацию о заголовке книги (title-info), включая основные библиографические данные.
/// Используется как для оригинальной, так и для переведённой версии.
/// </summary>
/// <param name="Genres">Список жанров книги (например, "sf", "detective").</param>
/// <param name="Authors">Список авторов книги.</param>
/// <param name="Title">Основное название книги.</param>
/// <param name="Annotation">Аннотация или краткое описание книги в формате TipTap.</param>
/// <param name="Keywords">Ключевые слова, разделённые запятыми.</param>
/// <param name="Date">Отображаемая дата (например, "2023-01-01").</param>
/// <param name="DateValue">Фактическая дата в формате YYYY-MM-DD.</param>
/// <param name="CoverPage">Ссылка на элемент обложки (например, "#cover").</param>
/// <param name="Lang">Язык оригинала книги (например, "ru").</param>
/// <param name="SrcLang">Язык оригинала, если книга является переводом.</param>
/// <param name="Translators">Список переводчиков книги.</param>
/// <param name="Sequence">Список серий, к которым принадлежит книга.</param>
public record Fb2TitleInfo(
    List<string>? Genres,
    List<PersonInfo>? Authors,
    string? Title,
    TipTapDoc? Annotation,
    string? Keywords,
    string? Date,
    string? DateValue,
    string? CoverPage,
    string? Lang,
    string? SrcLang,
    List<PersonInfo>? Translators,
    List<Fb2Sequence>? Sequence);

/// <summary>
/// Содержит информацию о создании электронного документа: кто, когда и в какой программе его подготовил.
/// Соответствует разделу &lt;document-info&gt; в FB2.
/// </summary>
/// <param name="Authors">Авторы электронной версии (не путать с авторами книги).</param>
/// <param name="Program">Название программы, использованной для создания документа.</param>
/// <param name="Date">Дата создания электронной версии (отображаемая).</param>
/// <param name="DateValue">Фактическая дата создания в формате YYYY-MM-DD.</param>
/// <param name="Id">Уникальный идентификатор документа.</param>
/// <param name="SrcUrl">URL исходного текста (если сканировался).</param>
/// <param name="SrcOcr">Программа, использованная для OCR.</param>
/// <param name="Version">Версия документа (например, "1.0").</param>
/// <param name="History">История правок в формате TipTap.</param>
public record Fb2DocumentInfo(
    List<PersonInfo>? Authors,
    string? Program,
    string? Date,
    string? DateValue,
    string? Id,
    string? SrcUrl,
    string? SrcOcr,
    string? Version,
    TipTapDoc? History);

/// <summary>
/// Описывает издательскую информацию о книге.
/// Используется при наличии данных об издании.
/// </summary>
/// <param name="BookName">Название книги, как указано при издании.</param>
/// <param name="Publisher">Издательство.</param>
/// <param name="City">Город издания.</param>
/// <param name="Year">Год издания.</param>
/// <param name="ISBN">Международный стандартный номер книги.</param>
/// <param name="Sequence">Серия, в которой издана книга.</param>
public record Fb2PublishInfo(
    string? BookName,
    string? Publisher,
    string? City,
    string? Year,
    string? ISBN,
    List<Fb2Sequence>? Sequence);

/// <summary>
/// Представляет серию книг, к которой может принадлежать произведение.
/// Книга может входить в несколько серий.
/// </summary>
/// <param name="Name">Название серии.</param>
/// <param name="Number">Порядковый номер книги в серии.</param>
public record Fb2Sequence(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("number")] int? Number);

/// <summary>
/// Содержит пользовательские поля, добавленные в документ.
/// Позволяет хранить дополнительную информацию, не охваченную стандартными тегами.
/// </summary>
/// <param name="CustomItems">Список пользовательских элементов.</param>
public record Fb2CustomInfo(
    [property: JsonPropertyName("customItems")] List<Fb2CustomItem>? CustomItems);

/// <summary>
/// Описывает одно пользовательское поле в документе.
/// Например, "rating", "tags" и т.д.
/// </summary>
/// <param name="InfoType">Тип пользовательской информации (ключ).</param>
/// <param name="Value">Значение поля.</param>
public record Fb2CustomItem(
    [property: JsonPropertyName("infoType")] string? InfoType,
    [property: JsonPropertyName("value")] string Value);

/// <summary>
/// Универсальный тип для представления документа в формате TipTap.
/// Является корневым элементом дерева контента редактора.
/// </summary>
/// <param name="Type">Тип узла. По умолчанию "doc".</param>
/// <param name="Content">Список дочерних узлов (параграфы, заголовки и т.д.).</param>
public record TipTapDoc(
    [property: JsonPropertyName("type")] string Type = "doc",
    [property: JsonPropertyName("content")] List<TipTapNode>? Content = null);

/// <summary>
/// Описывает персону: автора, переводчика или редактора.
/// Поддерживает полное имя, псевдоним, контактные данные и идентификатор.
/// </summary>
/// <param name="FirstName">Имя.</param>
/// <param name="LastName">Фамилия.</param>
/// <param name="MiddleName">Отчество.</param>
/// <param name="Nickname">Псевдоним или никнейм.</param>
/// <param name="HomePages">Список веб-сайтов.</param>
/// <param name="Emails">Список email-адресов.</param>
/// <param name="Id">Уникальный идентификатор персоны.</param>
public record PersonInfo(
    [property: JsonPropertyName("firstName")] string? FirstName,
    [property: JsonPropertyName("lastName")] string? LastName,
    [property: JsonPropertyName("middleName")] string? MiddleName,
    [property: JsonPropertyName("nickname")] string? Nickname,
    [property: JsonPropertyName("homePages")] List<string>? HomePages,
    [property: JsonPropertyName("emails")] List<string>? Emails,
    [property: JsonPropertyName("id")] string? Id);

/// <summary>
/// Представляет форматирование текста (выделение): жирный, курсив, ссылки и т.д.
/// Применяется к текстовому узлу и может быть вложенным.
/// </summary>
/// <param name="Type">Тип выделения: "bold", "italic", "link" и т.д.</param>
/// <param name="Attrs">Дополнительные атрибуты (например, URL для ссылки).</param>
public record TipTapMark(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("attrs")] Dictionary<string, string?>? Attrs = null);

/// <summary>
/// Базовый узел контента в формате TipTap.
/// Может представлять абзац, заголовок, цитату, список и т.д., включая текстовые фрагменты.
/// Поддерживает вложенность и применение выделений.
/// </summary>
/// <param name="Type">Тип узла: "paragraph", "heading", "text" и т.д.</param>
/// <param name="Attrs">Атрибуты узла (например, id, style, уровень заголовка).</param>
/// <param name="Content">Список дочерних узлов (для контейнеров).</param>
/// <param name="Text">Текстовое содержимое (для текстовых узлов).</param>
/// <param name="Marks">Список выделений, применённых к тексту.</param>
public record TipTapNode(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("attrs")] Dictionary<string, string?>? Attrs = null,
    [property: JsonPropertyName("content")] List<TipTapNode>? Content = null,
    [property: JsonPropertyName("text")] string? Text = null,
    [property: JsonPropertyName("marks")] List<TipTapMark>? Marks = null);