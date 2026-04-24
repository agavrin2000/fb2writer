using System.Xml.Linq;
using System.Text;
using System.Xml.Schema;
using System.Text.Json;
using FB2Writer.Models;
using System.Xml;

namespace FB2Writer.Services;

/// <summary>
/// Вспомогательный класс, содержащий методы расширения для коллекций.
/// </summary>
public static class EnumerableExtensions
{
    /// <summary>
    /// Преобразует перечисляемую последовательность в список или возвращает null, если последовательность пуста или равна null.
    /// </summary>
    /// <typeparam name="T">Тип элементов в последовательности.</typeparam>
    /// <param name="source">Исходная перечисляемая последовательность.</param>
    /// <returns>Список элементов или null, если последовательность пуста или равна null.</returns>
    public static List<T>? ToListOrNull<T>(this IEnumerable<T>? source) // Добавлен ?
    {
        if (source == null) return null;

        using var enumerator = source.GetEnumerator();
        if (!enumerator.MoveNext()) return null;

        return [.. source];
    }
}

/// <summary>
/// Сервис для обработки FB2-документов: загрузка, парсинг, валидация и сохранение.
/// Обеспечивает двустороннее преобразование между FB2-файлом и JSON-структурой для frontend.
/// </summary>
public class Fb2Service
{
    /// <summary>
    /// Кэш для хранения бинарных данных изображений в формате Base64.
    /// Ключ — ID изображения (без #), значение — кортеж с Base64-строкой и MIME-типом.
    /// Используется регистронезависимое сравнение ключей.
    /// </summary>
    private readonly Dictionary<string, (string Base64, string ContentType)> _binaryCache = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Пространство имён по умолчанию для FictionBook 2.0.
    /// </summary>
    private static readonly XNamespace ns = "http://www.gribuser.ru/xml/fictionbook/2.0";

    /// <summary>
    /// Пространство имён для XLink, используемое для ссылок на изображения.
    /// </summary>
    private static readonly XNamespace xlink = "http://www.w3.org/1999/xlink";

    /// <summary>
    /// Заполняет внутренний кэш изображений на основе XML-документа FB2.
    /// Собирает все элементы &lt;binary&gt; и сохраняет их содержимое в Base64 без лишних символов.
    /// </summary>
    /// <param name="doc">XML-документ FB2, из которого извлекаются бинарные данные.</param>
    private void FillBinaryCache(XDocument doc)
    {
        _binaryCache.Clear();

        // 1. Используем явное пространство имен для скорости и точности
        foreach (var bin in doc.Descendants(ns + "binary"))
        {
            // 2. ID в теге <binary> не должен содержать #. 
            // Регистр в XML важен, поэтому оставляем как есть.
            var id = bin.Attribute("id")?.Value?.Trim();
            if (string.IsNullOrWhiteSpace(id)) continue;

            var mime = bin.Attribute("content-type")?.Value ?? "image/jpeg";

            // 3. Оптимизированная очистка Base64. 
            // string.Concat + Where — это "убийца" производительности на больших фото.
            // Replace на конкретные символы переноса работает в разы быстрее.
            var base64 = bin.Value
                .Replace("\r", "")
                .Replace("\n", "")
                .Replace(" ", "")
                .Replace("\t", "");

            // 4. TryAdd гарантирует, что мы берем ПЕРВЫЙ встреченный объект с таким ID
            // и не тратим ресурсы на перезапись, если ID дублируются.
            _binaryCache.TryAdd(id, (base64, mime));
        }
    }

    /// <summary>
    /// Получает строку data URL для изображения по его ссылке (href).
    /// </summary>
    /// <param name="href">Ссылка на изображение вида #cover.jpg.</param>
    /// <returns>Строка data URL или пустая строка, если изображение не найдено.</returns>
    private string GetImage(string? href)
    {
        if (string.IsNullOrWhiteSpace(href))
            return string.Empty;

        // 1. Чистим ключ. Важно: регистр должен совпадать с тем, что в FillBinaryCache!
        var key = href.Trim().TrimStart('#');

        // 2. Если в словаре используется OrdinalIgnoreCase, то ToLower не нужен.
        // Если же словарь чувствителен к регистру, используйте тот же трансформ, что и при заполнении.
        if (_binaryCache.TryGetValue(key, out var data))
        {
            // 3. Используем интерполяцию. 
            // Если памяти мало, рассмотрите кэширование всей строки dataUri заранее.
            return $"data:{data.ContentType};base64,{data.Base64}";
        }

        return string.Empty;
    }

    /// <summary>
    /// Загружает FB2-документ (из файла или ZIP-архива), парсит его и конвертирует в JSON для передачи во frontend.
    /// Выполняет валидацию документа перед обработкой.
    /// </summary>
    /// <param name="fileStream">Поток, содержащий данные FB2 или ZIP-архива.</param>
    /// <param name="fileName">Имя файла, определяющее формат (FB2 или ZIP).</param>
    /// <returns>JSON-строка с метаданными, контентом, сносками и путём к файлу.</returns>
    /// <exception cref="Exception">Выбрасывается при ошибках валидации, отсутствии FB2 внутри архива или других критических ошибках.</exception>
    public Fb2BookExport ConvertXMLToJson(Stream fileStream, string fileName)
    {
        // Обязательно для поддержки русских кодировок (windows-1251) в FB2
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        // Получаем xml-документ либо из zip-архива, либо напрямую
        XDocument doc = XDocument.Load(fileStream);

        ValidateFb2(doc);

        // Локальная функция для парсинга авторов\переводчиков
        var parseAuthor = new Func<XElement, PersonInfo>(a =>
        {
            return new PersonInfo(
                FirstName: a.Element(ns + "first-name")?.Value,
                LastName: a.Element(ns + "last-name")?.Value,
                MiddleName: a.Element(ns + "middle-name")?.Value,
                Nickname: a.Element(ns + "nickname")?.Value,
                HomePages: a.Elements(ns + "home-page").Select(x => x.Value).ToListOrNull(),
                Emails: a.Elements(ns + "email").Select(x => x.Value).ToListOrNull(),
                Id: a.Element(ns + "id")?.Value
            );
        });

        // Локальная функция для парсинга структуры узлов
        List<TipTapNode> ParseNodes(XElement? parent, XName name)
        {
            // Ранний выход при отсутствии родителя или если у него нет дочерних элементов
            if (parent == null || !parent.HasElements)
                return [];

            var target = parent.Element(name);
            if (target == null)
                return []; // Возвращаем пустой список, если целевой элемент не найден

            List<TipTapNode> nodes = [];
            ParseElement(target, nodes); // Предполагается, что ns и xlink доступны в контексте
            return nodes;
        }

        // --- ПАРСИНГ МЕТАИНФОРМАЦИИ ---
        var description = doc.Descendants().FirstOrDefault(x => x.Name.LocalName == "description");

        // 2. Title Info (информация о произведении)
        var titleInfo = description?.Elements().FirstOrDefault(x => x.Name.LocalName == "title-info");
        var srcTitleInfo = description?.Elements().FirstOrDefault(x => x.Name.LocalName == "src-title-info");
        var docInfo = description?.Elements().FirstOrDefault(x => x.Name.LocalName == "document-info");
        var pubInfo = description?.Elements().FirstOrDefault(x => x.Name.LocalName == "publish-info");
        var customInfo = description?.Elements().FirstOrDefault(x => x.Name.LocalName == "custom-info");


        // --- ПАРСИНГ АННОТАЦИЙ И ИСТОРИИ СОЗДАНИЯ ---
        var annotationNodes = ParseNodes(titleInfo, ns + "annotation");
        var srcTitleInfoAnnotationNodes = ParseNodes(srcTitleInfo, ns + "annotation");
        var historyNodes = ParseNodes(docInfo, ns + "history");

        // --- ПАРСИНГ ПРИМЕЧАНИЙ ---
        var notesBody = doc.Descendants(ns + "body")
            .FirstOrDefault(x => x.Attribute("name")?.Value.ToLower() == "notes");

        var footnotesList = new Dictionary<string, TipTapDoc>();

        if (notesBody != null)
        {
            foreach (var section in notesBody.Elements(ns + "section"))
            {
                var id = section.Attribute("id")?.Value;
                if (string.IsNullOrEmpty(id)) continue;

                var notesNodes = new List<TipTapNode>();
                ParseElement(section, notesNodes);

                footnotesList[id] = new TipTapDoc(Type: "doc", Content: notesNodes);
            }
        }

        // --- ПАРСИНГ КОНТЕНТА И КАРТИНОК ---
        FillBinaryCache(doc);

        // Извлекаем контент
        var contentNodes = new List<TipTapNode>();
        var body = doc.Descendants().FirstOrDefault(x => x.Name.LocalName == "body");

        if (body != null)
        {
            // Мы создаем узел body вручную и вызываем парсинг его контента
            var bodyContent = new List<TipTapNode>
            {
                // add placeholder для возможности изменения секции body
                new( Type : "fb2Placeholder")
            };

            ParseElement(body, bodyContent);

            contentNodes.Add(new TipTapNode(
                Type: "fb2BodySection",
                Attrs: new Dictionary<string, string?>
                {
                    ["level"] = "1", // Значения должны быть строками, так как Dictionary<string, string>
                    ["sectionId"] = Guid.NewGuid().ToString()
                }, Content: bodyContent
            ));
        }

        var exportData = new Fb2BookExport(
                        Metadata: new Fb2Metadata(
                            TitleInfo: new Fb2TitleInfo(// Данные о произведении
                                Genres: titleInfo?.Elements().Where(x => x.Name.LocalName == "genre").Select(x => x.Value).ToListOrNull(),
                                Authors: titleInfo?.Elements().Where(x => x.Name.LocalName == "author").Select(parseAuthor).ToListOrNull(),
                                Title: (string?)titleInfo?.Element(ns + "book-title"),
                                Annotation: (annotationNodes?.Count ?? 0) > 0 ? new TipTapDoc(Type: "doc", Content: annotationNodes) : null, // Аннотация возвращается в формате TipTap JSON
                                Keywords: (string?)titleInfo?.Element(ns + "keywords"),
                                Date: (string?)titleInfo?.Element(ns + "date"),
                                DateValue: (string?)titleInfo?.Element(ns + "date")?.Attribute("value")?.Value,
                                CoverPage: GetImage(titleInfo?.Element(ns + "coverpage")?.Element(ns + "image")?.Attribute(xlink + "href")?.Value),
                                Lang: (string?)titleInfo?.Element(ns + "lang"),
                                SrcLang: (string?)titleInfo?.Element(ns + "src-lang"),
                                Translators: titleInfo?.Elements(ns + "translator").Select(parseAuthor).ToListOrNull(),
                                Sequence: titleInfo?.Elements(ns + "sequence").Select(x => new Fb2Sequence(
                                    Name: (string?)x.Attribute("name"),
                                    Number: (string?)x.Attribute("number")
                                )).ToListOrNull()
                            ),
                            SrcTitleInfo: new Fb2TitleInfo(// Данные о произведении на языке оригинала
                                Genres: srcTitleInfo?.Elements(ns + "genre").Select(x => x.Value).ToListOrNull(),
                                Authors: srcTitleInfo?.Elements(ns + "author").Select(parseAuthor).ToListOrNull(),
                                Title: (string?)srcTitleInfo?.Element(ns + "book-title"),
                                Annotation: (srcTitleInfoAnnotationNodes?.Count ?? 0) > 0 ? new TipTapDoc(Type: "doc", Content: srcTitleInfoAnnotationNodes) : null,// Аннотация возвращается в формате TipTap JSON
                                Keywords: (string?)srcTitleInfo?.Element(ns + "keywords"),
                                Date: (string?)srcTitleInfo?.Element(ns + "date"),
                                DateValue: srcTitleInfo?.Element(ns + "date")?.Attribute("value")?.Value,
                                CoverPage: GetImage(srcTitleInfo?.Element(ns + "coverpage")?.Element(ns + "image")?.Attribute(xlink + "href")?.Value),
                                Lang: (string?)srcTitleInfo?.Element(ns + "lang"),
                                SrcLang: (string?)srcTitleInfo?.Element(ns + "src-lang"),
                                Translators: srcTitleInfo?.Elements(ns + "translator").Select(parseAuthor).ToListOrNull(),
                                Sequence: srcTitleInfo?.Elements(ns + "sequence").Select(x => new Fb2Sequence(
                                        Name: (string?)x.Attribute("name"),
                                        Number: (string?)x.Attribute("number")
                                    )).ToListOrNull()
                            ),
                            DocumentInfo: new Fb2DocumentInfo(// Данные о документе
                                Authors: docInfo?.Elements(ns + "author").Select(parseAuthor).ToListOrNull(),
                                Program: (string?)docInfo?.Element(ns + "program-used"),
                                Date: (string?)docInfo?.Element(ns + "date"),
                                DateValue: (string?)docInfo?.Element(ns + "date")?.Attribute("value"),
                                Id: (string?)docInfo?.Element(ns + "id"),
                                SrcUrl: (string?)docInfo?.Element(ns + "src-url"),
                                SrcOcr: (string?)docInfo?.Element(ns + "src-ocr"),
                                Version: (string?)docInfo?.Element(ns + "version"),
                                History: (historyNodes?.Count ?? 0) > 0 ? new TipTapDoc(Type: "doc", Content: historyNodes) : null
                            ),
                            PublishInfo: new Fb2PublishInfo(// Данные об издательстве
                                BookName: (string?)pubInfo?.Element(ns + "book-name"),
                                Publisher: (string?)pubInfo?.Element(ns + "publisher"),
                                City: (string?)pubInfo?.Element(ns + "city"),
                                Year: (string?)pubInfo?.Element(ns + "year"),
                                ISBN: (string?)pubInfo?.Element(ns + "isbn"),
                                Sequence: pubInfo?.Elements(ns + "sequence").Select(x => new Fb2Sequence(
                                            Name: (string?)x.Attribute("name"),
                                            Number: (string?)x.Attribute("number")
                                        )).ToListOrNull()
                            ),
                            // Произвольная информация
                            CustomInfo: new Fb2CustomInfo(
                                CustomItems: description?.Elements().Where(x => x.Name.LocalName == "custom-info").Select(x => new Fb2CustomItem(
                                    InfoType: (string?)x.Attribute("info-type"),
                                    Value: x.Value
                                )).ToListOrNull()
                            )
                        ),
                    Content: new TipTapDoc(Type: "doc", Content: contentNodes), // Контент, включая картинки
                    Footnotes: footnotesList, // Передаем список сносок отдельно
                    FilePath: fileName // Полный путь к файлу для сохранения
        );
        return exportData;
    }

    /// <summary>
    /// Ленивый кэш набора XSD-схем для валидации FB2-документов.
    /// Схемы загружаются один раз при первом обращении.
    /// </summary>
    private static readonly Lazy<XmlSchemaSet> _schemaCache = new(() =>
    {
        var schemas = new XmlSchemaSet();
        var assembly = typeof(Program).Assembly;
        // ВАЖНО: Проверьте префикс ресурсов. Обычно это [ИмяПроекта].Schemas.[ИмяФайла].xsd
        string resPrefix = "FB2Writer.Schemas.";

        try
        {
            // Вспомогательный метод для загрузки схемы из ресурса
            void AddSchema(string? ns, string fileName)
            {
                using var stream = assembly.GetManifestResourceStream(resPrefix + fileName) ?? throw new FileNotFoundException($"Ресурс {fileName} не найден.");
                using var reader = XmlReader.Create(stream);
                schemas.Add(ns, reader);
            }

            AddSchema(null, "xlink.xsd");
            AddSchema("http://www.w3.org/XML/1998/namespace", "FictionBookLang.xsd");
            AddSchema("http://www.gribuser.ru/xml/fictionbook/2.0/genres", "FictionBookGenres.xsd");
            AddSchema(null, "FictionBook.xsd");

            schemas.Compile();
            return schemas;
        }
        catch (Exception ex)
        {
            throw new Exception("Ошибка при загрузке XSD схем из ресурсов сборки.", ex);
        }
    });

    /// <summary>
    /// Выполняет валидацию XML-документа FB2 с использованием предопределённых XSD-схем.
    /// При обнаружении ошибок собирает их и выбрасывает исключение.
    /// </summary>
    /// <param name="doc">XML-документ FB2 для валидации.</param>
    /// <exception cref="Exception">Выбрасывается при наличии ошибок валидации.</exception>
    private static void ValidateFb2(XDocument doc)
    {
        List<string> errors = [];

        // Валидация через кэшированный набор схем
        doc.Validate(_schemaCache.Value, (o, e) =>
        {
            if (e.Severity == XmlSeverityType.Error)
            {
                errors.Add($"Строка {e.Exception.LineNumber}: {e.Message}");
            }
        });

        if (errors.Count != 0)
        {
            var summary = string.Join(Environment.NewLine, errors.Take(10)); // Берем первые 10 ошибок
            if (errors.Count > 10) summary += "\n... и другие ошибки.";
            throw new Exception($"FB2 не валиден:\n{summary}");
        }
    }

    /// <summary>
    /// Рекурсивно парсит структуру FB2-документа и преобразует её в объектную модель, совместимую с TipTap.
    /// Обрабатывает секции, заголовки, абзацы, цитаты, стихи и изображения.
    /// </summary>
    /// <param name="container">Корневой элемент XML, с которого начинается обход.</param>
    /// <param name="ns">Пространство имён FB2.</param>
    /// <param name="xlink">Пространство имён XLink.</param>
    /// <param name="binarySaveCache">Кэш для хранения данных изображений.</param>
    /// <param name="nodes">Список, в который добавляются преобразованные узлы.</param>
    private void ParseElement(XElement container, List<TipTapNode> nodes)
    {
        foreach (var el in container.Elements())
        {
            string name = el.Name.LocalName;
            Dictionary<string, string?> attrs = el.Attributes()
                .ToDictionary(a => a.Name.LocalName, a => (string?)a.Value);
            if (name == "section")
            {
                if (!el.Elements().Any())
                {
                    continue; // Пропускаем пустую секцию
                }
                int depth = el.Ancestors().Count(x => x.Name.LocalName == "section") + 1;
                int level = Math.Clamp(depth, 1, 6);

                // Создаем список для внутреннего контента ЭТОЙ секции
                var sectionContent = new List<TipTapNode>();

                // Рекурсивно наполняем его (заголовки, p, вложенные секции пойдут сюда)
                ParseElement(el, sectionContent);

                // Добавляем всю секцию как единый блок в общий список
                nodes.Add(new TipTapNode(
                    Type: "fb2Section",
                      Attrs: new Dictionary<string, string?>
                      {
                          ["level"] = (level + 1).ToString(), // Значения должны быть строками, так как Dictionary<string, string>
                          ["sectionId"] = Guid.NewGuid().ToString(),
                          ["elementId"] = el.Attribute("id")?.Value
                      },
                    Content: sectionContent
                ));
            }
            else if (name is "title" or "epigraph" or "cite" or "poem" or "stanza")
            {
                var contentList = new List<TipTapNode>();
                ParseElement(el, contentList);
                // Сопоставляем имя тега с типом в TipTap
                string type = name switch
                {
                    "title" => "fb2Title",
                    "epigraph" => "fb2Epigraph",
                    "cite" => "fb2Cite",
                    "poem" => "fb2Poem",
                    "stanza" => "fb2Stanza",
                    "annotation" => "fb2Annotation",
                    _ => "fb2Title"
                };

                nodes.Add(new TipTapNode(
                    Type: type,
                    Attrs: attrs.Count > 0 ? attrs : null,
                    Content: contentList
                ));
            }
            else if (name is "text-author" or "subtitle" or "p" or "v")
            {
                var inlineContent = new List<TipTapNode>();
                foreach (var node in el.Nodes())
                {
                    ProcessInline(node, inlineContent, []);
                }
                // Сопоставляем имя тега с типом в TipTap
                string type = name switch
                {
                    "p" => "paragraph",
                    "text-author" => "fb2TextAuthor",
                    "subtitle" => "fb2Subtitle",
                    "v" => "fb2V",
                    _ => "paragraph"
                };

                nodes.Add(new TipTapNode(
                    Type: type,
                    Attrs: attrs.Count > 0 ? attrs : null,
                    Content: inlineContent
                ));
            }
            else if (name == "empty-line")
            {
                nodes.Add(new TipTapNode(
                    Type: "paragraph",
                    Text: ""
                ));
            }
            else if (name == "image")
            {
                var hrefAttr = el.Attribute(xlink + "href");
                if (hrefAttr != null)
                {
                    string base64 = GetImage(hrefAttr.Value);
                    if (!string.IsNullOrEmpty(base64))
                    {
                        nodes.Add(new TipTapNode(
                            Type: "fb2BlockImage",
                              Attrs: new Dictionary<string, string?>
                              {
                                  ["src"] = base64,
                                  ["title"] = el.Attribute(ns + "title")?.Value,
                                  ["href"] = hrefAttr.Value
                              }
                        ));
                    }
                }
            }
        }
    }

    /// <summary>
    /// Рекурсивно обрабатывает инлайновые элементы (текст, стили, ссылки, изображения).
    /// Применяет текстовые метки (жирный, курсив и т.д.) и преобразует их в соответствующие XML-теги.
    /// </summary>
    /// <param name="node">Текущий XML-узел (XNode).</param>
    /// <param name="container">Список, в который добавляется результат обработки.</param>
    /// <param name="activeMarks">Список активных текстовых стилей (меток), применяемых к текущему тексту.</param>
    private void ProcessInline(XNode node, List<TipTapNode> container, List<TipTapMark> activeMarks)
    {
        if (node is XText textNode)
        {
            string val = textNode.Value;
            if (!string.IsNullOrWhiteSpace(val))
            {
                var textElement = new TipTapNode(
                    Type: "text",
                    Text: val,
                    // Если есть марки, создаем новый список (копию текущих активных марок)
                    Marks: activeMarks.Count > 0 ? [.. activeMarks] : null
                );

                container.Add(textElement);
            }
        }
        else if (node is XElement el)
        {
            string localName = el.Name.LocalName.ToLower();

            if (localName == "image")
            {
                var hrefAttr = el.Attribute(xlink + "href");
                if (hrefAttr != null)
                {
                    string base64 = GetImage(hrefAttr.Value);
                    if (!string.IsNullOrEmpty(base64))
                    {
                        container.Add(new TipTapNode(
                            Type: "fb2InlineImage",
                            Attrs: new Dictionary<string, string?>
                            {
                                ["src"] = base64,
                                ["href"] = hrefAttr.Value
                            }
                        ));
                    }
                }
                return;
            }

            TipTapMark? mark = localName switch
            {
                "emphasis" => new TipTapMark(Type: "italic"),
                "strong" => new TipTapMark(Type: "bold"),
                "sub" => new TipTapMark(Type: "subscript"),
                "sup" => new TipTapMark(Type: "superscript"),
                "code" => new TipTapMark(Type: "code"),
                "a" => new TipTapMark(
                    Type: "link",
                    Attrs: new Dictionary<string, string?>
                    {
                        ["href"] = el.Attribute(xlink + "href")?.Value ?? "",
                        ["target"] = "_blank", // Стандарт для ссылок
                        ["rel"] = (el.Attribute("type")?.Value == "note") ? "footnote" : "noreferrer"
                    }
                ),
                _ => null
            };

            // Создаем новый список марок для вложенных элементов
            var nextMarks = mark != null
                ? [.. activeMarks, mark]
                : activeMarks;

            foreach (var child in el.Nodes())
            {
                ProcessInline(child, container, nextMarks);
            }
        }
    }

    //--------------------------------------------------------------------------------------------
    // Формирование и сохранение XML-документа из JSON-строки, полученной из frontend   
    //--------------------------------------------------------------------------------------------
    /// <summary>
    /// Сохраняет JSON-представление документа обратно в FB2-формат (XML) и записывает в поток.
    /// Поддерживает экспорт в обычный FB2-файл или упаковку в ZIP-архив.
    /// </summary>
    /// <param name="outputStream">Выходной поток, в который будет записан результат.</param>
    /// <param name="fileName">Имя файла, определяющее формат выхода (FB2 или ZIP).</param>
    /// <param name="jsonContent">JSON-строка с данными редактора (метаданные, контент, сноски).</param>
    public void ConvertJsonToFb2(Stream outputStream, JsonElement jsonContent)
    {
        try
        {
            ProcessData(jsonContent, outputStream);
        }
        catch (JsonException ex)
        {
            throw new Exception($"Некорректный формат JSON: {ex.Message}", ex);
        }
        catch (Exception ex)
        {
            throw new Exception($"Ошибка конвертации: {ex.Message}", ex);
        }
    }

    // <summary>
    /// Обрабатывает JSON-данные и формирует из них FB2-документ.
    /// Вызывается из <see cref="SaveJsonToFb2"/> после парсинга JSON.
    /// </summary>
    /// <param name="data">Корневой элемент JSON-документа.</param>
    /// <param name="outputStream">Поток для записи результата.</param>
    /// <param name="fileName">Имя файла для определения формата сохранения.</param>
    private void ProcessData(JsonElement data, Stream outputStream)
    {
        // Извлекаем элементы (используем GetProperty или TryGetProperty)
        // Если элемента нет, передаем "пустой" JsonElement (ValueKind == Undefined)
        data.TryGetProperty("content", out JsonElement content);
        data.TryGetProperty("metadata", out JsonElement metadata);
        data.TryGetProperty("footnotes", out JsonElement footnotes);

        // Очищаем кэш перед каждой сборкой
        _binaryCache.Clear();

        // 1. Создаем корневой элемент
        XElement rootElement = new(ns + "FictionBook",
            new XAttribute(XNamespace.Xmlns + "xlink", xlink.NamespaceName),
            new XAttribute(XNamespace.Xml + "lang", "ru"),
            BuildDescription(metadata), // Эти методы теперь должны принимать JsonElement
            BuildBody(content),
            BuildNotesBody(footnotes)
        );

        // 2. Добавляем бинарные данные из кэша
        foreach (var item in _binaryCache)
        {
            XElement binaryEl = new(ns + "binary",
                new XAttribute("id", item.Key),
                new XAttribute("content-type", item.Value.ContentType),
                item.Value.Base64 // Значение элемента
            );
            rootElement.Add(binaryEl);
        }

        // 3. Формируем финальный документ
        XDocument fb2Doc = new(
            new XDeclaration("1.0", "utf-8", null),
            rootElement
        );

        ValidateFb2(fb2Doc);

        var settings = new XmlWriterSettings
        {
            Indent = true,
            Encoding = new System.Text.UTF8Encoding(false), // UTF-8 без BOM для лучшей совместимости
            CheckCharacters = false // Важно, если в тексте могут быть спецсимволы
        };
        using var writer = XmlWriter.Create(outputStream, settings);
        fb2Doc.Save(writer);
    }

    /// <summary>
    /// Проверяет обязательные поля в элементе &lt;description&gt; перед сохранением.
    /// Гарантирует соответствие FB2-стандарту.
    /// </summary>
    /// <param name="description">Элемент &lt;description&gt;, подлежащий проверке.</param>
    /// <exception cref="InvalidOperationException">Выбрасывается при отсутствии обязательных полей.</exception>
    private static void ValidateDescription(XElement? description)
    {
        // Вспомогательная функция для проверки title-info и src-title-info
        static void ValidateTitleInfo(XElement element, string context)
        {
            // Обязательные поля для любого title-info типа:

            // Жанр (минимум один)
            if (!element.Elements(ns + "genre").Any())
                throw new InvalidOperationException($"<{context}> должен содержать хотя бы один жанр (<genre>).");

            // Автор (минимум один)
            var authors = element.Elements(ns + "author");
            if (!authors.Any())
                throw new InvalidOperationException($"<{context}> должен содержать хотя бы одного автора (<author>).");

            // У автора должно быть имя/фамилия ИЛИ никнейм
            foreach (var author in authors)
            {
                bool hasName = author.Element(ns + "first-name") != null || author.Element(ns + "last-name") != null;
                bool hasNickname = author.Element(ns + "nickname") != null;
                if (!hasName && !hasNickname)
                    throw new InvalidOperationException($"В <{context}> у автора должен быть указан nickname или имя/фамилия.");
            }

            // Название книги
            if (element.Element(ns + "book-title") == null)
                throw new InvalidOperationException($"<{context}> должен содержать назввние книги (<book-title>).");

            // Язык
            if (element.Element(ns + "lang") == null)
                throw new InvalidOperationException($"<{context}> должен содержать язык книги (<lang>).");
        }

        if (description == null)
            throw new InvalidOperationException("Элемент <description> отсутствует.");

        // 1. Проверка title-info (ОБЯЗАТЕЛЬНО)
        var titleInfo = description.Element(ns + "title-info") ?? throw new InvalidOperationException("<description> должен содержать <title-info>.");
        ValidateTitleInfo(titleInfo, "title-info");

        // 2. Проверка src-title-info (ОПЦИОНАЛЬНО, но если есть — должен быть валидным)
        var srcTitleInfo = description.Element(ns + "src-title-info");
        if (srcTitleInfo != null)
        {
            ValidateTitleInfo(srcTitleInfo, "src-title-info");
        }

        // 3. Проверка document-info (ОБЯЗАТЕЛЬНО по стандартной схеме)
        var docInfo = description.Element(ns + "document-info") ?? throw new InvalidOperationException("<description> должен содержать <document-info>.");

        if (docInfo.Element(ns + "id") == null)
            throw new InvalidOperationException("<document-info> должен содержать уникальный ID документа (<id>).");

        if (docInfo.Element(ns + "date") == null)
            throw new InvalidOperationException("<document-info> должен содержать дату документа (<date>).");

        if (docInfo.Element(ns + "version") == null)
            throw new InvalidOperationException("<document-info> должен содержать версию документа (<version>).");

        // Автор (минимум один)
        var authors = docInfo.Elements(ns + "author");
        if (!authors.Any())
            throw new InvalidOperationException($"<document-info> должен содержать хотя бы одного автора (<author>).");

        // У автора должно быть имя/фамилия ИЛИ никнейм
        foreach (var author in authors)
        {
            bool hasName = author.Element(ns + "first-name") != null || author.Element(ns + "last-name") != null;
            bool hasNickname = author.Element(ns + "nickname") != null;
            if (!hasName && !hasNickname)
                throw new InvalidOperationException($"В <document-info> у автора должен быть указан nickname или имя/фамилия.");
        }
    }

    /// <summary>
    /// Создаёт XML-элемент &lt;description&gt;, содержащий основные метаданные книги в FB2-документе.
    /// Включает информацию о заглавии, документе, издательстве и пользовательские поля.
    /// </summary>
    /// <param name="meta">JSON-элемент, содержащий метаданные из frontend.</param>
    /// <returns>Элемент &lt;description&gt; со всеми вложенными тегами.</returns>
    private XElement BuildDescription(JsonElement meta)
    {
        var description = new XElement(ns + "description");

        // 1 & 2. Обработка TitleInfo и SrcTitleInfo
        // Если свойства нет, передаем пустой JsonElement (ValueKind.Undefined)
        meta.TryGetProperty("titleInfo", out var titleInfoNode);
        description.Add(BuildTitleInfo(ns + "title-info", titleInfoNode));

        meta.TryGetProperty("srcTitleInfo", out var srcTitleInfoNode);
        if (srcTitleInfoNode.ValueKind != JsonValueKind.Undefined)
            description.Add(BuildTitleInfo(ns + "src-title-info", srcTitleInfoNode));

        // 3. Document Info
        if (meta.TryGetProperty("documentInfo", out var docInfoNode))
        {
            var docInfo = new XElement(ns + "document-info");

            docInfoNode.TryGetProperty("authors", out var docAuthors);
            AddPersons(docInfo, ns + "author", docAuthors);

            docInfoNode.TryGetProperty("program", out var program);
            AddTo(docInfo, ns + "program-used", program);

            docInfoNode.TryGetProperty("date", out var date);
            docInfoNode.TryGetProperty("dateValue", out var dateVal);
            AddDate(docInfo, ns + "date", date, dateVal);

            docInfoNode.TryGetProperty("srcUrl", out var srcUrl);
            AddMultipleTo(docInfo, ns + "src-url", srcUrl);

            docInfoNode.TryGetProperty("srcOcr", out var srcOcr);
            AddTo(docInfo, ns + "src-ocr", srcOcr);

            docInfoNode.TryGetProperty("id", out var docId);
            AddTo(docInfo, ns + "id", docId);

            docInfoNode.TryGetProperty("version", out var version);
            AddTo(docInfo, ns + "version", version);

            docInfoNode.TryGetProperty("history", out var history);
            AddRichText(docInfo, ns + "history", history);

            if (docInfo.HasElements) description.Add(docInfo);
        }

        // 4. Publish Info
        if (meta.TryGetProperty("publishInfo", out var pubNode))
        {
            var pubInfo = new XElement(ns + "publish-info");

            pubNode.TryGetProperty("bookName", out var bName);
            AddTo(pubInfo, ns + "book-name", bName);

            pubNode.TryGetProperty("publisher", out var publr);
            AddTo(pubInfo, ns + "publisher", publr);

            pubNode.TryGetProperty("city", out var city);
            AddTo(pubInfo, ns + "city", city);

            pubNode.TryGetProperty("year", out var year);
            AddTo(pubInfo, ns + "year", year);

            pubNode.TryGetProperty("isbn", out var isbn);
            AddTo(pubInfo, ns + "isbn", isbn);

            pubNode.TryGetProperty("sequence", out var seq);
            AddSequences(pubInfo, ns + "sequence", seq);

            if (pubInfo.HasElements) description.Add(pubInfo);
        }

        // 5. Custom Info
        if (meta.TryGetProperty("customInfo", out var customArray) && customArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in customArray.EnumerateArray())
            {
                item.TryGetProperty("infoType", out var infoType);
                item.TryGetProperty("value", out var val);

                string? typeStr = infoType.GetString();
                if (!string.IsNullOrEmpty(typeStr))
                {
                    description.Add(new XElement(ns + "custom-info",
                        new XAttribute("info-type", typeStr),
                        val.GetString()));
                }
            }
        }

        return description;
    }

    /// <summary>
    /// Создаёт элемент &lt;title-info&gt; или &lt;src-title-info&gt; на основе переданных данных.
    /// Содержит жанры, авторов, название, аннотацию и другую информацию о произведении.
    /// </summary>
    /// <param name="name">Имя элемента: <c>title-info</c> или <c>src-title-info</c>.</param>
    /// <param name="node">JSON-узел с данными для заполнения.</param>
    /// <returns>Готовый элемент XML или <see langword="null"/>, если данные отсутствуют.</returns>
    private XElement? BuildTitleInfo(XName name, JsonElement node)
    {
        // Проверка, существует ли узел
        if (node.ValueKind == JsonValueKind.Undefined || node.ValueKind == JsonValueKind.Null) return null;

        var el = new XElement(name);

        node.TryGetProperty("genres", out var genres);
        AddMultipleTo(el, ns + "genre", genres);

        node.TryGetProperty("authors", out var authors);
        AddPersons(el, ns + "author", authors);

        // Обработка разных ключей (Title или BookTitle)
        if (node.TryGetProperty("title", out var title) || node.TryGetProperty("bookTitle", out title))
            AddTo(el, ns + "book-title", title);

        node.TryGetProperty("annotation", out var annotation);
        AddRichText(el, ns + "annotation", annotation);

        node.TryGetProperty("keywords", out var keywords);
        AddTo(el, ns + "keywords", keywords);

        node.TryGetProperty("date", out var date);
        node.TryGetProperty("dateValue", out var dateVal);
        AddDate(el, ns + "date", date, dateVal);

        // Обложка
        var coverId = (name == ns + "title-info") ? "cover.jpg" : "src-cover.jpg";
        if (node.TryGetProperty("coverPage", out var coverNode) && coverNode.ValueKind != JsonValueKind.Null)
        {
            JsonElement finalCoverNode = coverNode;

            // НОРМАЛИЗАЦИЯ: если пришла строка, создаем временный документ с нужной структурой
            if (coverNode.ValueKind == JsonValueKind.String)
            {
                var rawJson = $"{{\"attrs\": {{\"src\": \"{coverNode.GetString()}\" }} }}";
                finalCoverNode = JsonDocument.Parse(rawJson).RootElement;
            }

            var img = CreateImage(finalCoverNode, coverId);
            if (img != null)
            {
                el.Add(new XElement(ns + "coverpage", img));
            }
        }

        node.TryGetProperty("lang", out var lang);
        AddTo(el, ns + "lang", lang);

        node.TryGetProperty("srcLang", out var srcLang);
        AddTo(el, ns + "src-lang", srcLang);

        node.TryGetProperty("translators", out var translators);
        AddPersons(el, ns + "translator", translators);

        node.TryGetProperty("sequence", out var sequence);
        AddSequences(el, ns + "sequence", sequence);

        return el.HasElements ? el : null;
    }

    /// <summary>
    /// Добавляет форматированный текст (например, аннотацию или историю) как дочерний элемент.
    /// Поддерживает сложную структуру с абзацами, стилями и вложениями.
    /// </summary>
    /// <param name="parent">Родительский XML-элемент, к которому добавляется содержимое.</param>
    /// <param name="name">Имя создаваемого элемента (например, <c>annotation</c>).</param>
    /// <param name="node">JSON-представление rich-текста.</param>
    private void AddRichText(XElement parent, XName name, JsonElement node)
    {
        if (node.ValueKind == JsonValueKind.Undefined || node.ValueKind == JsonValueKind.Null) return;

        // Для RichText (который может быть сложным объектом или массивом) 
        // логика пустой строки обычно проверяется внутри ConvertNode или по ValueKind
        if (node.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(node.GetString())) return;

        var converted = ConvertNode(node);

        if (converted is XElement tempEl)
        {
            bool hasContent = tempEl.HasElements || !string.IsNullOrWhiteSpace(tempEl.Value);

            if (hasContent)
            {
                var content = tempEl.Name == "temp" ? tempEl.Nodes() : (object)tempEl;
                parent.Add(new XElement(name, content));
            }
        }
    }

    /// <summary>
    /// Создаёт корневой элемент &lt;body&gt; документа на основе JSON-структуры контента.
    /// Используется для восстановления основного текста книги.
    /// </summary>
    /// <param name="content">JSON-элемент, представляющий структуру контента.</param>
    /// <returns>Элемент &lt;body&gt; с вложенной структурой разделов и параграфов.</returns>
    private XElement BuildBody(JsonElement content)
    {
        // В System.Text.Json проверяем наличие свойства и что это массив
        if (content.TryGetProperty("content", out var nodes) &&
            nodes.ValueKind == JsonValueKind.Array &&
            nodes.GetArrayLength() > 0)
        {
            // EnumerateArray().First() — аналог nodes[0]
            return (XElement?)ConvertNode(nodes.EnumerateArray().First()) ?? new XElement(ns + "body");
        }

        return new XElement(ns + "body");
    }

    /// <summary>
    /// Рекурсивно преобразует узел JSON в соответствующий XML-элемент FB2.
    /// Обрабатывает блоки, инлайны, стили, изображения и другие типы контента.
    /// </summary>
    /// <param name="node">Текущий JSON-узел для преобразования.</param>
    /// <returns>Соответствующий XML-элемент или массив элементов, либо <see langword="null"/>.</returns>
    private object? ConvertNode(JsonElement node)
    {
        // 1. Проверка на пустоту
        if (node.ValueKind == JsonValueKind.Undefined || node.ValueKind == JsonValueKind.Null)
            return null;

        // 2. Если пришел МАССИВ, обрабатываем элементы рекурсивно
        if (node.ValueKind == JsonValueKind.Array)
        {
            var items = new List<object>(node.GetArrayLength());
            foreach (var item in node.EnumerateArray())
            {
                var converted = ConvertNode(item);
                if (converted != null) ExtractContent(items, converted);
            }
            return items;
        }

        // 3. Извлекаем тип узла
        node.TryGetProperty("type", out var typeProp);
        string type = typeProp.GetString() ?? "";

        // 4. Собираем отфильтрованные дочерние узлы
        List<object> children = [];
        if (node.TryGetProperty("content", out var rawChildNodes) && rawChildNodes.ValueKind == JsonValueKind.Array)
        {
            children.Capacity = rawChildNodes.GetArrayLength();
            foreach (var childNode in rawChildNodes.EnumerateArray())
            {
                var converted = ConvertNode(childNode);
                if (converted != null) ExtractContent(children, converted);
            }
        }

        return type switch
        {
            "doc" => new XElement("temp", children),
            "paragraph" => CreateParagraph(node, [.. children]),
            "text" => WrapTextWithMarks(node),
            "fb2Section" => CreateElementWithId("section", node, children.ToArray()),
            "fb2BodySection" => new XElement(ns + "body", children),
            "fb2Annotation" => CreateElementWithId("annotation", node, children.ToArray()),
            "fb2Title" => new XElement(ns + "title", children),
            "fb2Cite" => CreateElementWithId("cite", node, children.ToArray()),
            "fb2Epigraph" => CreateElementWithId("epigraph", node, children.ToArray()),
            "fb2TextAuthor" => CreateElementWithId("text-author", node, children.ToArray()),
            "fb2Poem" => CreateElementWithId("poem", node, children.ToArray()),
            "fb2Stanza" => new XElement(ns + "stanza", children),
            "fb2V" => CreateElementWithId("v", node, children.ToArray()),
            "fb2Subtitle" => CreateElementWithId("subtitle", node, children.ToArray()),
            "fb2Date" => CreateDate(node),
            "fb2BlockImage" => CreateImage(node),
            "fb2InlineImage" => CreateImage(node),
            _ => null
        };
    }

    /// <summary>
    /// Безопасно добавляет контент в указанный список, корректно обрабатывая строки, коллекции и отдельные объекты.
    /// Если контент является перечисляемой коллекцией (например, массивом или списком), его элементы добавляются по одному.
    /// В противном случае — объект добавляется целиком.
    /// </summary>
    /// <param name="list">Список, в который будет добавлен контент.</param>
    /// <param name="content">Контент для добавления: строка, коллекция или одиночный объект.</param>
    private static void ExtractContent(List<object> list, object content)
    {
        // Если это строка — добавляем как есть (текстовый узел)
        if (content is string)
        {
            list.Add(content);
        }
        // Если это коллекция (массив/список от рекурсии) — разворачиваем
        else if (content is System.Collections.IEnumerable collection)
        {
            foreach (var item in collection)
            {
                if (item != null) list.Add(item);
            }
        }
        // В остальных случаях (XElement, XText и т.д.) — просто добавляем
        else
        {
            list.Add(content);
        }
    }

    /// <summary>
    /// Создаёт XML-элемент абзаца &lt;p&gt; с дочерними элементами или пустую строку &lt;empty-line&gt;, если контент отсутствует.
    /// Также устанавливает атрибуты id и style из JSON-узла, если они присутствуют.
    /// </summary>
    /// <param name="node">Исходный JSON-узел, содержащий данные, включая атрибуты.</param>
    /// <param name="children">Коллекция дочерних элементов (текст, теги), которые будут вложены в абзац.</param>
    /// <returns>Элемент &lt;p&gt; с содержимым или &lt;empty-line&gt; при отсутствии контента.</returns>
    private static XElement CreateParagraph(JsonElement node, IEnumerable<object> children)
    {
        var p = children.GetEnumerator().MoveNext()
            ? new XElement(ns + "p", children)
            : new XElement(ns + "empty-line");

        if (p.Name == ns + "p" && node.TryGetProperty("attrs", out var attrs))
        {
            SetAttr(p, "id", attrs);
            SetAttr(p, "style", attrs);
        }

        return p;
    }

    /// <summary>
    /// Создаёт XML-элемент с заданным именем и присваивает ему атрибут ID на основе данных из JSON.
    /// Для элемента типа "section" атрибут ID извлекается под ключом "elementId" и сохраняется как "id".
    /// Для других элементов используется стандартный ключ "id".
    /// </summary>
    /// <param name="nodeName">Имя создаваемого XML-элемента (например, "section", "title").</param>
    /// <param name="node">JSON-узел, содержащий атрибуты в поле "attrs".</param>
    /// <param name="children">Дочерние элементы, которые будут вложены в созданный элемент.</param>
    /// <returns>Новый XML-элемент с заданным именем, содержимым и атрибутом ID (если указан).</returns>
    private static XElement CreateElementWithId(string nodeName, JsonElement node, IEnumerable<object> children)
    {
        var el = new XElement(ns + nodeName, children);

        if (node.TryGetProperty("attrs", out var attrs))
        {
            if (nodeName == "section")
                SetAttr(el, "elementId", attrs, "id");
            else
                SetAttr(el, "id", attrs);
        }

        return el;
    }

    /// <summary>
    /// Устанавливает значение атрибута XML-элемента на основе свойства из JSON-объекта атрибутов.
    /// Поддерживает переопределение имени атрибута через параметр <paramref name="targetName"/>.
    /// Значение обрезается и проверяется на пустоту перед установкой.
    /// </summary>
    /// <param name="el">Целевой XML-элемент, которому будет добавлен атрибут.</param>
    /// <param name="name">Ключ, по которому ищется значение в JSON-объекте атрибутов.</param>
    /// <param name="attrs">JSON-объект, содержащий атрибуты (обычно из поля "attrs" узла).</param>
    /// <param name="targetName">Опциональное имя атрибута в результирующем XML. Если не задано, используется значение <paramref name="name"/>.</param>
    private static void SetAttr(XElement el, string name, JsonElement attrs, string targetName = "")
    {
        if (attrs.ValueKind != JsonValueKind.Object) return;

        if (attrs.TryGetProperty(name, out var prop))
        {
            // Используем GetRawText() и Trim, если это не строка, 
            // или GetString(), если это строка, чтобы избежать кавычек.
            string? val = prop.ValueKind == JsonValueKind.String
                ? prop.GetString()
                : prop.GetRawText();

            if (!string.IsNullOrWhiteSpace(val))
            {
                // Определяем имя атрибута только при наличии значения
                string finalName = string.IsNullOrWhiteSpace(targetName)
                    ? name
                    : targetName.Trim();

                el.SetAttributeValue(finalName, val.Trim());
            }
        }
    }

    /// <summary>
    /// Оборачивает текстовые узлы с учётом применённых стилей (жирный, курсив, ссылки и т.д.).
    /// Преобразует массив меток в цепочку вложенных XML-тегов.
    /// </summary>
    /// <param name="node">JSON-узел с текстом и массивом меток (marks).</param>
    /// <returns>Объект (обычно строка или XElement), обёрнутый в соответствующие теги стилей.</returns>
    private static object WrapTextWithMarks(JsonElement node)
    {
        node.TryGetProperty("text", out var textProp);
        string textValue = textProp.GetString() ?? "";

        if (!node.TryGetProperty("marks", out var marks) || marks.ValueKind != JsonValueKind.Array)
            return textValue;

        object result = textValue;

        foreach (var mark in marks.EnumerateArray())
        {
            mark.TryGetProperty("type", out var markTypeProp);
            string markType = markTypeProp.GetString() ?? "";
            mark.TryGetProperty("attrs", out var attrs);

            result = markType switch
            {
                "bold" => new XElement(ns + "strong", result),
                "italic" => new XElement(ns + "emphasis", result),
                "strikethrough" => new XElement(ns + "strikethrough", result),
                "code" => new XElement(ns + "code", result),
                "sub" => new XElement(ns + "sub", result),
                "sup" => new XElement(ns + "sup", result),
                "link" => CreateLinkFromMark(result, attrs), // attrs здесь JsonElement
                _ => result
            };
        }
        return result;
    }

    /// <summary>
    /// Создаёт секцию &lt;body name="notes"&gt;, содержащую все сноски книги.
    /// Каждая сноска добавляется как &lt;section&gt; с уникальным ID.
    /// </summary>
    /// <param name="footnotes">JSON-объект, где ключ — ID сноски, значение — её содержимое.</param>
    /// <returns>Элемент &lt;body&gt; с именем "notes" и вложенными сносками, или <see langword="null"/>, если нет данных.</returns>
    private XElement? BuildNotesBody(JsonElement footnotes)
    {
        // Проверка: footnotes должен быть объектом с полями
        if (footnotes.ValueKind != JsonValueKind.Object) return null;

        var notesBody = new XElement(ns + "body", new XAttribute("name", "notes"));

        notesBody.Add(new XElement(ns + "title",
            new XElement(ns + "p", "Примечания")
        ));

        bool hasAddedAnyContent = false;

        // EnumerateObject() заменяет footnotes.Properties()
        foreach (var property in footnotes.EnumerateObject())
        {
            string id = property.Name;
            JsonElement noteContent = property.Value;

            var section = new XElement(ns + "section", new XAttribute("id", id));

            var converted = ConvertNode(noteContent);
            if (converted != null)
            {
                var content = (converted is XElement temp && temp.Name == "temp")
                    ? temp.Nodes()
                    : (object)converted;

                section.Add(content);
                notesBody.Add(section);
                hasAddedAnyContent = true;
            }
        }

        return hasAddedAnyContent ? notesBody : null;
    }

    /// <summary>
    /// Добавляет один XML-элемент с текстовым содержимым, если значение не пустое.
    /// Используется для простых полей вроде &lt;title&gt;, &lt;publisher&gt; и т.п.
    /// </summary>
    /// <param name="parent">Родительский контейнер, в который добавляется элемент.</param>
    /// <param name="name">Имя создаваемого элемента.</param>
    /// <param name="token">Значение элемента в виде JSON-узла.</param>
    private static void AddTo(XContainer parent, XName name, JsonElement token)
    {
        if (token.ValueKind == JsonValueKind.Undefined || token.ValueKind == JsonValueKind.Null) return;

        var val = token.ToString()?.Trim();
        if (!string.IsNullOrWhiteSpace(val)) parent.Add(new XElement(name, val));
    }

    /// <summary>
    /// Добавляет один или несколько элементов, в зависимости от типа значения (массив или скаляр).
    /// Используется для полей, которые могут повторяться, например &lt;home-page&gt;.
    /// </summary>
    /// <param name="parent">Родительский контейнер.</param>
    /// <param name="name">Имя добавляемых элементов.</param>
    /// <param name="token">JSON-значение (массив или одиночное значение).</param>
    private static void AddMultipleTo(XContainer parent, XName name, JsonElement token)
    {
        if (token.ValueKind == JsonValueKind.Undefined || token.ValueKind == JsonValueKind.Null) return;

        if (token.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in token.EnumerateArray())
                AddTo(parent, name, item);
        }
        else
        {
            AddTo(parent, name, token);
        }
    }

    /// <summary>
    /// Добавляет один или несколько элементов &lt;sequence&gt; в указанный контейнер.
    /// Поддерживает как массив серий, так и одиночный объект.
    /// </summary>
    /// <param name="parent">Родительский элемент (например, &lt;title-info&gt;).</param>
    /// <param name="tagName">Имя тега, по умолчанию &lt;sequence&gt;.</param>
    /// <param name="token">JSON-данные о серии или массиве серий.</param>
    private static void AddSequences(XContainer parent, XName tagName, JsonElement token)
    {
        if (token.ValueKind == JsonValueKind.Undefined || token.ValueKind == JsonValueKind.Null) return;

        if (token.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in token.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.Object)
                    AddSingleSequence(parent, tagName, item);
            }
        }
        else if (token.ValueKind == JsonValueKind.Object)
        {
            AddSingleSequence(parent, tagName, token);
        }
    }

    /// <summary>
    /// Добавляет один элемент &lt;sequence&gt; с атрибутами name и number.
    /// Используется внутренне методом <see cref="AddSequences"/>.
    /// </summary>
    /// <param name="parent">Контейнер, в который добавляется серия.</param>
    /// <param name="name">Имя тега, обычно &lt;sequence&gt;.</param>
    /// <param name="token">JSON-объект с полями name и number.</param>
    private static void AddSingleSequence(XContainer parent, XName name, JsonElement token)
    {
        if (token.ValueKind != JsonValueKind.Object) return;

        // Извлекаем имя (name в FB2 — обязательный атрибут)
        token.TryGetProperty("name", out var nameProp);
        var seqName = nameProp.GetString()?.Trim();

        if (string.IsNullOrWhiteSpace(seqName)) return;

        var seqElement = new XElement(name, new XAttribute("name", seqName));

        // Номер серии
        if (token.TryGetProperty("number", out var numProp))
        {
            // Пробуем достать как число, если не вышло — как строку
            string? numStr = numProp.ValueKind == JsonValueKind.Number
                ? numProp.GetInt32().ToString()
                : numProp.GetString()?.Trim();

            if (!string.IsNullOrWhiteSpace(numStr) && int.TryParse(numStr, out int number))
            {
                seqElement.Add(new XAttribute("number", number));
            }
        }
        parent.Add(seqElement);
    }

    /// <summary>
    /// Универсальный метод для добавления персон (авторов, переводчиков) в указанный элемент.
    /// Поддерживает как одиночные объекты, так и массивы.
    /// </summary>
    /// <param name="parent">Родительский элемент (например, &lt;title-info&gt;).</param>
    /// <param name="tagName">Имя тега персоны: &lt;author&gt;, &lt;translator&gt;.</param>
    /// <param name="token">JSON-данные о персоне или массиве персон.</param>
    private static void AddPersons(XContainer parent, XName tagName, JsonElement token)
    {
        if (token.ValueKind == JsonValueKind.Undefined || token.ValueKind == JsonValueKind.Null) return;

        // Создаем список элементов для итерации
        var persons = token.ValueKind == JsonValueKind.Array
            ? (IEnumerable<JsonElement>)token.EnumerateArray()
            : [token]; // Массив эффективнее, чем List, для одного элемента
        foreach (var p in persons)
        {
            if (p.ValueKind != JsonValueKind.Object) continue;

            var personEl = new XElement(tagName);

            p.TryGetProperty("firstName", out var fn);
            AddTo(personEl, ns + "first-name", fn);

            p.TryGetProperty("middleName", out var mn);
            AddTo(personEl, ns + "middle-name", mn);

            p.TryGetProperty("lastName", out var ln);
            AddTo(personEl, ns + "last-name", ln);

            p.TryGetProperty("nickname", out var nn);
            AddTo(personEl, ns + "nickname", nn);

            p.TryGetProperty("homePage", out var hp);
            AddMultipleTo(personEl, ns + "home-page", hp);

            p.TryGetProperty("email", out var em);
            AddMultipleTo(personEl, ns + "email", em);

            p.TryGetProperty("id", out var idNode);
            AddTo(personEl, ns + "id", idNode);

            // Добавляем, если есть хоть какой-то текст внутри
            if (personEl.Elements().Any(e => !string.IsNullOrWhiteSpace(e.Value)))
            {
                // Атрибут id (если есть в объекте)
                if (idNode.ValueKind == JsonValueKind.String)
                {
                    var idVal = idNode.GetString();
                    if (!string.IsNullOrWhiteSpace(idVal))
                        personEl.Add(new XAttribute("id", idVal));
                }
                parent.Add(personEl);
            }
        }
    }

    /// <summary>
    /// Добавляет элемент &lt;date&gt; с текстовым значением и опциональным машинным атрибутом value.
    /// Используется в &lt;title-info&gt;, &lt;document-info&gt; и &lt;poem&gt;.
    /// </summary>
    /// <param name="parent">Родительский элемент.</param>
    /// <param name="name">Имя создаваемого тега, обычно &lt;date&gt;.</param>
    /// <param name="textToken">Отображаемое значение даты.</param>
    /// <param name="valueToken">Машинно-читаемое значение (ISO-формат).</param>
    private static void AddDate(XContainer parent, XName name, JsonElement textToken, JsonElement valueToken)
    {
        var dateText = textToken.ValueKind != JsonValueKind.Undefined ? textToken.ToString()?.Trim() : null;
        var dateValue = valueToken.ValueKind != JsonValueKind.Undefined ? valueToken.ToString()?.Trim() : null;

        bool hasText = !string.IsNullOrWhiteSpace(dateText);
        bool hasValue = !string.IsNullOrWhiteSpace(dateValue);

        if (!hasText && !hasValue) return;

        string content = hasText ? dateText! : dateValue!;
        var dateEl = new XElement(name, content);

        if (hasValue)
        {
            dateEl.Add(new XAttribute("value", dateValue!));
        }

        parent.Add(dateEl);
    }

    /// <summary>
    /// Создаёт элемент &lt;date&gt; внутри стихотворения с возможностью вложенного форматирования.
    /// Поддерживает как простой текст, так и rich-контент.
    /// </summary>
    /// <param name="node">JSON-узел с данными о дате.</param>
    /// <returns>Элемент &lt;date&gt; с атрибутом value и содержимым.</returns>
    private XElement CreateDate(JsonElement node)
    {
        // 1. Безопасно достаем атрибут value
        node.TryGetProperty("attrs", out var attrs);
        attrs.TryGetProperty("value", out var valueProp);
        string dateValue = valueProp.GetString()?.Trim() ?? "";

        // 2. Обрабатываем дочерние узлы
        object[] children = [];
        if (node.TryGetProperty("content", out var rawContent) && rawContent.ValueKind == JsonValueKind.Array)
        {
            children = rawContent.EnumerateArray()
                .Select(n => ConvertNode(n))
                .Where(x => x != null)
                .Cast<object>()
                .ToArray();
        }

        // 3. Создаем элемент. Если контента нет, используем дату как текст (fallback)
        object dateContent = children.Length > 0 ? children : dateValue;
        var dateEl = new XElement(ns + "date", dateContent);

        // 4. Добавляем машиночитаемый атрибут
        if (!string.IsNullOrWhiteSpace(dateValue))
        {
            dateEl.Add(new XAttribute("value", dateValue));
        }

        return dateEl;
    }

    /// <summary>
    /// Создаёт элемент &lt;image&gt; с ссылкой на бинарные данные через xlink:href.
    /// Автоматически извлекает Base64-данные и сохраняет их в кэш.
    /// </summary>
    /// <param name="node">JSON-узел с атрибутами изображения (src, href, title).</param>
    /// <param name="forcedId">Опциональный ID изображения, переопределяющий href.</param>
    /// <returns>Элемент &lt;image&gt; или комментарий при ошибке.</returns>
    private object? CreateImage(JsonElement node, string? forcedId = null)
    {
        if (node.ValueKind != JsonValueKind.Object) return null;

        // Tiptap обычно вкладывает всё в attrs.
        if (!node.TryGetProperty("attrs", out var attrs))
        {
            attrs = node;
        }

        attrs.TryGetProperty("src", out var srcProp);
        attrs.TryGetProperty("href", out var hrefProp);
        attrs.TryGetProperty("title", out var titleProp);
        attrs.TryGetProperty("id", out var idProp);

        string? rawData = srcProp.GetString();
        string? rawHref = hrefProp.GetString();
        string? title = titleProp.GetString();
        string? id = idProp.GetString();

        // 1. Очистка ID
        string lookupId = (rawHref ?? "").Replace("#", "").Trim();
        string finalId = (forcedId ?? lookupId).Trim();

        if (string.IsNullOrEmpty(finalId))
            return new XComment(" Image identifier is empty ");

        if (string.IsNullOrEmpty(rawData)) return null;

        // 2. Парсинг Data URL
        string base64Only;
        string contentType = "image/jpeg";

        if (rawData.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            int commaIndex = rawData.IndexOf(',');
            if (commaIndex == -1) return new XComment(" Invalid Data URL: comma missing ");

            string header = rawData[..commaIndex];
            base64Only = rawData[(commaIndex + 1)..];

            int semiColonIndex = header.IndexOf(';');
            if (semiColonIndex > 5)
            {
                contentType = header.Substring(5, semiColonIndex - 5);
            }
        }
        else
        {
            base64Only = rawData;
        }

        // 3. Запись в кэш
        _binaryCache.TryAdd(finalId, (base64Only, contentType));

        // 4. Формирование XML
        var img = new XElement(ns + "image",
            new XAttribute(XNamespace.Xmlns + "xlink", xlink.NamespaceName),
            new XAttribute(xlink + "href", "#" + finalId)
        );

        if (!string.IsNullOrWhiteSpace(title))
            img.Add(new XAttribute("alt", title));

        if (!string.IsNullOrWhiteSpace(id))
            img.Add(new XAttribute("id", id));

        return img;
    }

    /// <summary>
    /// Создаёт гиперссылку &lt;a&gt; на основе данных из JSON.
    /// Поддерживает обычные ссылки и сноски (через rel="footnote").
    /// </summary>
    /// <param name="content">Содержимое ссылки (текст или вложенные элементы).</param>
    /// <param name="attrs">Атрибуты ссылки: href, rel, target.</param>
    /// <returns>Элемент &lt;a&gt; с соответствующими атрибутами и содержимым.</returns>
    private static object CreateLinkFromMark(object content, JsonElement attrs)
    {
        if (attrs.ValueKind == JsonValueKind.Undefined || attrs.ValueKind == JsonValueKind.Null)
            return content;

        attrs.TryGetProperty("href", out var hrefProp);
        string href = hrefProp.GetString()?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(href))
            return content;

        var linkEl = new XElement(ns + "a");

        // Определяем тип ссылки
        attrs.TryGetProperty("rel", out var relProp);
        bool isFootnote = relProp.GetString() == "footnote";

        if (isFootnote)
        {
            var internalHref = href.StartsWith('#') ? href : "#" + href;
            linkEl.Add(new XAttribute(xlink + "href", internalHref));
            linkEl.Add(new XAttribute("type", "note"));
        }
        else
        {
            linkEl.Add(new XAttribute(xlink + "href", href));
        }

        linkEl.Add(content);
        return linkEl;
    }

}