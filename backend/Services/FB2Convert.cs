using System.Xml.Linq;
using System.Text;
using Newtonsoft.Json;
using System.IO.Compression;
using System.Xml.Schema;
using Newtonsoft.Json.Linq;

namespace FB2Editor.Services;

public class Fb2Service
{

    private readonly Dictionary<string, string> _binaryCache = [];
    private readonly Dictionary<string, (string Base64, string ContentType)> _binarySaveCache = [];

    private static readonly XNamespace ns = "http://www.gribuser.ru/xml/fictionbook/2.0";
    private static readonly XNamespace xlink = "http://www.w3.org/1999/xlink";

    // Метод для заполнения кеша (вызовите его при инициализации документа)
    // Собираем все картинки (ID -> Base64)
    // Очищаем Base64 от переносов строк, иначе браузер их не поймет
    private void FillBinaryCache(XDocument doc)
    {
        _binarySaveCache.Clear();
        var binaries = doc.Descendants()
            .Where(x => x.Name.LocalName == "binary");

        foreach (var bin in binaries)
        {
            var id = bin.Attribute("id")?.Value?.TrimStart('#').ToLower();
            if (string.IsNullOrEmpty(id)) continue;

            var mime = bin.Attribute("content-type")?.Value ?? "image/jpeg";
            // Чистим base64 от всех пробельных символов и переносов
            var base64 = string.Concat(bin.Value.Where(c => !char.IsWhiteSpace(c)));

            //_binaryCache[id] = $"data:{mime};base64,{base64}";
            _binarySaveCache[id] = (base64, mime);
        }
    }

    // Получение контента изображения по ссылке
    private string GetImage(string? href)
    {
        if (string.IsNullOrWhiteSpace(href))
            return string.Empty;

        var key = href.TrimStart('#').ToLower();

        return _binarySaveCache.TryGetValue(key, out var data)
            ? $"data:{data.ContentType};base64,{data.Base64}"
            : string.Empty;
    }
    /// <summary>
    /// загрузка книги и конвертация для передачи во frontend
    /// </summary>
    /// <param name="fileStream"></param>
    /// <param name="fileName"></param>
    /// <returns></returns>
    /// <exception cref="Exception"></exception>
    public string LoadAndConvertToJson(Stream fileStream, string fileName)
    {
        // Обязательно для поддержки русских кодировок (windows-1251) в FB2
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        // Получаем xml-документ либо из zip-архива, либо напрямую
        XDocument doc;

        if (fileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
        {
            // Используем LeaveOpen: true, чтобы не закрыть основной поток раньше времени
            using var archive = new ZipArchive(fileStream, ZipArchiveMode.Read, leaveOpen: true);
            var entry = archive.Entries.FirstOrDefault(e => e.FullName.EndsWith(".fb2", StringComparison.OrdinalIgnoreCase)) ?? throw new Exception("Файл .fb2 не найден внутри архива.");
            using var entryStream = entry.Open();
            doc = XDocument.Load(entryStream);
        }
        else
        {
            doc = XDocument.Load(fileStream);
        }

        ValidateFb2(doc);
        //ns = doc.Root?.GetDefaultNamespace() ?? XNamespace.None; ;
        XNamespace xlink = "http://www.w3.org/1999/xlink";

        // Локальная функция для парсинга авторов, переводчиков
        var parseAuthor = new Func<XElement, object>(a =>
        {
            var first = a.Element(ns + "first-name")?.Value ?? "";
            var middle = a.Element(ns + "middle-name")?.Value ?? "";
            var last = a.Element(ns + "last-name")?.Value ?? "";
            var nickname = a.Element(ns + "nickname")?.Value ?? "";
            var emails = a.Elements(ns + "email").Select(x => x.Value).ToList();
            var homePages = a.Elements(ns + "home-page").Select(x => x.Value).ToList();

            return new
            {
                FirstName = first,
                LastName = last,
                MiddleName = middle,
                Nickname = nickname,
                Emails = emails,
                HomePages = homePages,
            };
        });

        // Локальная функция для парсинга структуры узлов
        List<object> ParseNodes(XElement? parent, XName name)
        {
            var nodes = new List<object>();
            var target = parent?.Element(name);
            if (target != null)
            {
                ParseElement(target, ns, xlink, [], nodes);
            }
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
        var notesBody = doc.Descendants()
            .FirstOrDefault(x => x.Name.LocalName == "body" && x.Attribute("name")?.Value.ToLower() == "notes");

        var footnotesList = new Dictionary<string, List<object>>();
        var sections = notesBody?.Elements().Where(e => e.Name.LocalName == "section") ?? [];

        foreach (var section in sections)
        {
            var id = section.Attribute("id")?.Value;
            if (string.IsNullOrEmpty(id)) continue;

            var notesNodes = new List<object>();
            ParseElement(section, ns, xlink, [], notesNodes);

            // Безопасное добавление (на случай дублей id в XML)
            footnotesList[id] = notesNodes;
        }

        // --- ПАРСИНГ КОНТЕНТА И КАРТИНОК ---
        FillBinaryCache(doc);
        /*
                var binaryCache = doc.Descendants()
                    .Where(x => x.Name.LocalName == "binary")
                    .Select(x => new
                    {
                        Id = x.Attribute("id")?.Value ?? "",
                        Title = x.Attribute("title")?.Value ?? "",
                        Mime = x.Attribute("content-type")?.Value ?? "image/jpeg",
                        // Эффективная очистка от всех пробельных символов
                        Data = string.Concat(x.Value.Where(c => !char.IsWhiteSpace(c)))
                    })
                    .Where(x => !string.IsNullOrEmpty(x.Id))
                    .ToDictionary(
                        x => x.Id,
                        x => $"data:{x.Mime};base64,{x.Data}",
                        StringComparer.OrdinalIgnoreCase
                    );
        */
        // Извлекаем контент
        var contentNodes = new List<object>();
        var body = doc.Descendants().FirstOrDefault(x => x.Name.LocalName == "body");

        if (body != null)
        {
            // Мы создаем узел body вручную и вызываем парсинг его контента
            var bodyContent = new List<object>
            {
                // add placeholder для возможности изменения секции body
                new { type = "fb2Placeholder" }
            };

            ParseElement(body, ns, xlink, _binarySaveCache, bodyContent);

            contentNodes.Add(new
            {
                type = "fb2BodySection",
                attrs = new { level = 1, sectionId = Guid.NewGuid().ToString() },
                content = bodyContent
            });
        }


        return JsonConvert.SerializeObject(new
        {
            Meta = new
            {
                TitleInfo = new // Данные о произведении
                {
                    Genres = titleInfo?.Elements().Where(x => x.Name.LocalName == "genre").Select(x => x.Value).ToList() ?? [],
                    Authors = titleInfo?.Elements().Where(x => x.Name.LocalName == "author").Select(parseAuthor).ToList() ?? [],
                    Title = titleInfo?.Element(ns + "book-title")?.Value ?? "Без названия",
                    Annotation = annotationNodes, // Аннотация возвращается в формате TipTap JSON
                    Keywords = titleInfo?.Element(ns + "keywords")?.Value ?? "",
                    Date = titleInfo?.Element(ns + "date")?.Value ?? "",
                    DateValue = titleInfo?.Element(ns + "date")?.Attribute("value")?.Value ?? "",
                    CoverPage = GetImage(titleInfo?.Element(ns + "coverpage")?.Descendants(ns + "image").FirstOrDefault()?.Attribute(xlink + "href")?.Value),
                    Lang = titleInfo?.Element(ns + "lang")?.Value ?? "ru",
                    SrcLang = titleInfo?.Element(ns + "src-lang")?.Value ?? "",
                    Translators = titleInfo?.Elements().Where(x => x.Name.LocalName == "translator").Select(parseAuthor).ToList() ?? [],
                    Sequence = titleInfo?.Elements().Where(x => x.Name.LocalName == "sequence").Select(x => new
                    {
                        name = x.Attribute("name")?.Value ?? "",
                        number = (int?)x.Attribute("number") ?? 0
                    }).ToList() ?? []
                },
                SrcTitleInfo = new // Данные о произведении на языке оригинала
                {
                    Genres = srcTitleInfo?.Elements().Where(x => x.Name.LocalName == "genre").Select(x => x.Value).ToList() ?? [],
                    Authors = srcTitleInfo?.Elements().Where(x => x.Name.LocalName == "author").Select(parseAuthor).ToList() ?? [],
                    Title = srcTitleInfo?.Element(ns + "book-title")?.Value,
                    Annotation = srcTitleInfoAnnotationNodes, // Аннотация возвращается в формате TipTap JSON
                    Keywords = srcTitleInfo?.Element(ns + "keywords")?.Value,
                    Date = srcTitleInfo?.Element(ns + "date")?.Value,
                    DateValue = srcTitleInfo?.Element(ns + "date")?.Attribute("value")?.Value,
                    CoverPage = GetImage(srcTitleInfo?.Element(ns + "coverpage")?.Descendants(ns + "image").FirstOrDefault()?.Attribute(xlink + "href")?.Value),
                    Lang = srcTitleInfo?.Element(ns + "lang")?.Value,
                    SrcLang = srcTitleInfo?.Element(ns + "src-lang")?.Value,
                    Translators = srcTitleInfo?.Elements().Where(x => x.Name.LocalName == "translator").Select(parseAuthor).ToList(),
                    Sequence = srcTitleInfo?.Elements().Where(x => x.Name.LocalName == "sequence").Select(x => new
                    {
                        name = x.Attribute("name")?.Value,
                        number = (int?)x.Attribute("number")
                    }).ToList()
                },
                DocumentInfo = new // Данные о документе
                {
                    Authors = docInfo?.Elements().Where(x => x.Name.LocalName == "author").Select(parseAuthor).ToList() ?? [],
                    Program = docInfo?.Element(ns + "program-used")?.Value ?? "",
                    Date = docInfo?.Element(ns + "date")?.Value ?? "",
                    DateValue = docInfo?.Element(ns + "date")?.Attribute("value")?.Value ?? "",
                    Id = docInfo?.Element(ns + "id")?.Value ?? "",
                    SrcUrl = docInfo?.Element(ns + "src-url")?.Value ?? "",
                    SrcOcr = docInfo?.Element(ns + "src-ocr")?.Value ?? "",
                    Version = docInfo?.Element(ns + "version")?.Value ?? "1.0",
                    History = historyNodes,
                },
                PublishInfo = new // Данные об издательстве
                {
                    BookName = pubInfo?.Element(ns + "book-name")?.Value ?? "",
                    Publisher = pubInfo?.Element(ns + "publisher")?.Value ?? "",
                    City = pubInfo?.Element(ns + "city")?.Value ?? "",
                    Year = pubInfo?.Element(ns + "year")?.Value ?? "",
                    ISBN = pubInfo?.Element(ns + "isbn")?.Value ?? "",
                    Sequence = pubInfo?.Elements().Where(x => x.Name.LocalName == "sequence").Select(x => new
                    {
                        name = x.Attribute("name")?.Value ?? "",
                        number = (int?)x.Attribute("number") ?? 0
                    }).ToList() ?? [],
                },
                // Произвольная информация
                CustomInfo = new
                {
                    customItems = description?.Elements().Where(x => x.Name.LocalName == "custom-info").Select(x => new
                    {
                        infoType = x.Attribute("info-type")?.Value ?? "",
                        value = x.Value
                    }).ToList() ?? [],
                }
            },
            EditorContent = new { type = "doc", content = contentNodes }, // Контент, включая картинки
            Footnotes = footnotesList, // Передаем список сносок отдельно
            FilePath = fileName, // Полный путь к файлу для сохранения
        }, new JsonSerializerSettings
        {
            // Игнорировать свойства со значением null
            NullValueHandling = NullValueHandling.Ignore,
        });
    }

    private static readonly Lazy<XmlSchemaSet> _schemaCache = new(() =>
        {
            var schemas = new XmlSchemaSet();
            try
            {
                // Пути к файлам в папке приложения (убедитесь, что файлы копируются в Output Directory)
                string schemaPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Schemas");

                // 1. Добавляем XLink (обязателен для валидации атрибутов изображений)
                schemas.Add(null, Path.Combine(schemaPath, "xlink.xsd"));
                schemas.Add("http://www.w3.org/XML/1998/namespace", Path.Combine(schemaPath, "FictionBookLang.xsd"));
                schemas.Add("http://www.gribuser.ru/xml/fictionbook/2.0/genres", Path.Combine(schemaPath, "FictionBookGenres.xsd"));
                // 2. Добавляем обе версии FB2. Валидатор сам выберет нужную по xmlns в файле.
                schemas.Add(null, Path.Combine(schemaPath, "FictionBook2.1.xsd"));

                schemas.Compile();
                return schemas;
            }
            catch (Exception ex)
            {
                throw new Exception("Критическая ошибка при загрузке XSD схем из папки Schemas.", ex);
            }
        });
    /// <summary>
    /// Валидация fb2 документа на основе xsd-схем
    /// </summary>
    /// <param name="doc"></param>
    /// <exception cref="Exception"></exception>
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

        if (errors.Any())
        {
            var summary = string.Join(Environment.NewLine, errors.Take(10)); // Берем первые 10 ошибок
            if (errors.Count > 10) summary += "\n... и другие ошибки.";
            throw new Exception($"FB2 не валиден:\n{summary}");
        }
    }

    // Парсинг fb2-элементов
    private void ParseElement(XElement container, XNamespace ns, XNamespace xlink, Dictionary<string, (string Base64, string ContentType)> binarySaveCache, List<object> nodes)
    {
        foreach (var el in container.Elements())
        {
            string name = el.Name.LocalName;

            if (name == "section")
            {
                if (!el.Elements().Any())
                {
                    continue; // Пропускаем пустую секцию
                }
                int depth = el.Ancestors().Count(x => x.Name.LocalName == "section") + 1;
                int level = Math.Clamp(depth, 1, 6);

                // Создаем список для внутреннего контента ЭТОЙ секции
                var sectionContent = new List<object>();

                // Рекурсивно наполняем его (заголовки, p, вложенные секции пойдут сюда)
                ParseElement(el, ns, xlink, binarySaveCache, sectionContent);

                // Добавляем всю секцию как единый блок в общий список
                nodes.Add(new
                {
                    type = "fb2Section",
                    attrs = new { level = level + 1, sectionId = Guid.NewGuid().ToString(), elementId = el.Attribute("id")?.Value },
                    content = sectionContent
                });
            }
            else if (name is "title" or "epigraph" or "cite" or "poem" or "stanza")
            {
                var contentList = new List<object>();
                ParseElement(el, ns, xlink, binarySaveCache, contentList);
                // Сопоставляем имя тега с типом в TipTap
                string type = name switch
                {
                    "title" => "fb2Title",
                    "epigraph" => "fb2Epigraph",
                    "cite" => "fb2Cite",
                    "poem" => "fb2Poem",
                    "stanza" => "fb2Stanza",
                    _ => "fb2Title"
                };

                nodes.Add(new { type, content = contentList });
            }
            else if (name is "text-author" or "subtitle" or "p" or "v")
            {
                var inlineContent = new List<object>();
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

                nodes.Add(new { type, content = inlineContent });
            }
            else if (name == "empty-line")
            {
                nodes.Add(new { type = "paragraph", text = new List<object>() });
            }
            else if (name == "image")
            {
                var hrefAttr = el.Attribute(xlink + "href");
                if (hrefAttr != null)
                {
                    string base64 = GetImage(hrefAttr.Value);
                    if (!string.IsNullOrEmpty(base64))
                    {
                        nodes.Add(new { type = "fb2BlockImage", attrs = new { src = base64, title = el.Attribute(ns + "title")?.Value, id = el.Attribute(ns + "id")?.Value, href = hrefAttr.Value } });
                    }
                }
            }
        }
    }

    // Рекурсивная функция для обработки inline элементов
    private void ProcessInline(XNode node, List<object> container, List<object> activeMarks)
    {
        if (node is XText textNode)
        {
            string val = textNode.Value;
            if (!string.IsNullOrEmpty(val))
            {
                var textElement = new Dictionary<string, object>
                {
                    { "type", "text" },
                    { "text", val }
                };

                if (activeMarks.Count > 0)
                {
                    textElement.Add("marks", activeMarks.ToArray());
                }

                container.Add(textElement);
            }
        }
        else if (node is XElement el)
        {
            string localName = el.Name.LocalName.ToLower();
            // Обработка изображений как атомарных узлов
            if (localName == "image")
            {

                var hrefAttr = el.Attribute(xlink + "href");
                if (hrefAttr != null)
                {
                    string base64 = GetImage(hrefAttr.Value);
                    if (!string.IsNullOrEmpty(base64))
                    {
                        container.Add(new { type = "fb2InlineImage", attrs = new { src = base64 }, display = "inline", href = hrefAttr.Value });
                    }
                }
                return; // Изображения не имеют вложенных узлов в FB2
            }
            // Маппинг тегов XML на типы марок в TipTap/ProseMirror
            object? mark = el.Name.LocalName.ToLower() switch
            {
                "emphasis" => new { type = "italic" },
                "strong" => new { type = "bold" },
                "sub" => new { type = "subscript" },
                "sup" => new { type = "superscript" },
                "code" => new { type = "code" },
                "a" => new
                {
                    type = "link",
                    attrs = new
                    {
                        href = el.Attribute(xlink + "href")?.Value ?? "",
                        rel = (el.Attribute("type")?.Value == "note") ? "footnote" : "noreferrer" // Если это примечание, оставляем footnote, иначе — обычная ссылка
                    }
                },
                _ => null
            };
            //            var nextMarks = mark != null ? activeMarks.Concat(new[] { mark }).ToList() : activeMarks;
            // Если нашли марку — создаем новый список, если нет — используем текущий
            var nextMarks = mark != null ? [.. activeMarks, mark] : activeMarks;
            // Идем глубже по дереву
            foreach (var child in el.Nodes())
            {
                ProcessInline(child, container, nextMarks);
            }
        }
    }




    //--------------------------------------------------------------------------------------------
    /// <summary>
    /// Convert json to FB2-content
    /// </summary>
    /// <param name="stream"></param>
    /// <param name="fileName"></param>
    /// <param name="jsonContent"></param>
    public void SaveJsonToFb2(Stream outputStream, string fileName, string jsonContent)
    {
        using var sr = new StringReader(jsonContent);
        using var reader = new JsonTextReader(sr);
        var data = JToken.ReadFrom(reader);

        if (data.Type == JTokenType.String)
        {
            using var innerSr = new StringReader(data.ToString());
            using var innerReader = new JsonTextReader(innerSr);
            data = JToken.ReadFrom(innerReader);
        }

        var content = data["content"];
        var metadata = data["metadata"];
        var footnotes = data["footnotes"] as JObject;

        // Очищаем кэш перед каждой сборкой
        _binarySaveCache.Clear();

        // 1. Создаем корневой элемент
        XElement rootElement = new XElement(ns + "FictionBook",
            new XAttribute(XNamespace.Xmlns + "xlink", xlink.NamespaceName), // Добавляем объявление xlink
            new XAttribute(XNamespace.Xml + "lang", "ru"),
            BuildDescription(metadata),
            BuildBody(content, "main"),
            BuildNotesBody(footnotes)
        );

        // 2. ПОСЛЕ того как отработал BuildBody и ConvertNode, 
        // в _binarySaveCache уже лежат все найденные картинки. Добавляем их.
        foreach (var item in _binarySaveCache)
        {
            var binaryEl = new XElement(ns + "binary", item.Value.Base64);
            binaryEl.Add(new XAttribute("id", item.Key));
            binaryEl.Add(new XAttribute("content-type", item.Value.ContentType));
            rootElement.Add(binaryEl);
        }

        // 3. Формируем финальный документ
        XDocument doc = new(
            new XDeclaration("1.0", "utf-8", null),
            rootElement
        );

        using var writer = new StreamWriter(outputStream, System.Text.Encoding.UTF8);
        doc.Save(writer);
    }

    private XElement BuildDescription(JToken? meta)
    {
        var description = new XElement(ns + "description");

        // 1 & 2. Обработка TitleInfo и SrcTitleInfo через один метод
        description.Add(BuildTitleInfo(ns + "title-info", meta?["TitleInfo"]));
        description.Add(BuildTitleInfo(ns + "src-title-info", meta?["SrcTitleInfo"]));

        // 3. Document Info
        var docInfoNode = meta?["DocumentInfo"];
        if (docInfoNode != null)
        {
            var docInfo = new XElement(ns + "document-info");
            AddPersons(docInfo, ns + "author", docInfoNode["Authors"]);
            AddTo(docInfo, ns + "program-used", docInfoNode["Program"]);
            AddDate(docInfo, ns + "date", docInfoNode["Date"], docInfoNode["DateValue"]);
            AddMultipleTo(docInfo, ns + "src-url", docInfoNode["SrcUrl"]);
            AddTo(docInfo, ns + "src-ocr", docInfoNode["SrcOcr"]);
            AddTo(docInfo, ns + "id", docInfoNode["Id"]);
            AddTo(docInfo, ns + "version", docInfoNode["Version"]);
            AddRichText(docInfo, ns + "history", docInfoNode["History"]);

            if (docInfo.HasElements) description.Add(docInfo);
        }

        // 4. Publish Info
        var pubNode = meta?["PublishInfo"];
        if (pubNode != null)
        {
            var pubInfo = new XElement(ns + "publish-info");
            AddTo(pubInfo, ns + "book-name", pubNode["BookName"]);
            AddTo(pubInfo, ns + "publisher", pubNode["Publisher"]);
            AddTo(pubInfo, ns + "city", pubNode["City"]);
            AddTo(pubInfo, ns + "year", pubNode["Year"]);
            AddTo(pubInfo, ns + "isbn", pubNode["ISBN"]);
            AddSequences(pubInfo, ns + "sequence", pubNode["Sequence"]);

            if (pubInfo.HasElements) description.Add(pubInfo);
        }

        // 5. Custom Info
        if (meta?["CustomInfo"] is JArray customInfoArray)
        {
            foreach (var item in customInfoArray)
            {
                var type = item["infoType"]?.ToString();
                if (!string.IsNullOrEmpty(type))
                    description.Add(new XElement(ns + "custom-info", new XAttribute("info-type", type), item["value"]?.ToString()));
            }
        }

        return description;
    }

    // Создание title-info и src-title-info
    private XElement? BuildTitleInfo(XName name, JToken? node)
    {
        if (node == null) return null;
        var el = new XElement(name);
        AddMultipleTo(el, ns + "genre", node["Genres"]);
        AddPersons(el, ns + "author", node["Authors"]);
        AddTo(el, ns + "book-title", node["Title"] ?? node["BookTitle"]); // Обработка разных ключей
        AddRichText(el, ns + "annotation", node["Annotation"]);

        var coverTitle = (name == ns + "title-info") ? "cover.jpg" : "src-cover.jpg";
        var coverNode = node["CoverPage"];
        if (coverNode != null && coverNode.Type != JTokenType.Null)
        {
            var img = CreateImage(coverNode, coverTitle);
            if (img != null)
            {
                el.Add(new XElement(ns + "coverpage", img));
            }
        }

        AddTo(el, ns + "lang", node["Lang"]);
        AddTo(el, ns + "src-lang", node["SrcLang"]);
        AddTo(el, ns + "keywords", node["Keywords"]);
        AddDate(el, ns + "date", node["Date"], node["DateValue"]);
        AddPersons(el, ns + "translator", node["Translators"]);
        AddSequences(el, ns + "sequence", node["Sequence"]);

        return el.HasElements ? el : null;
    }

    // Создание узла аннотаций/истории
    private void AddRichText(XElement parent, XName name, JToken? node)
    {
        // 1. Проверяем на физический null и на JSON null ("key": null)
        if (node == null || node.Type == JTokenType.Null) return;

        // 2. Если это просто пустая строка или пробелы, ничего не создаем
        var nodeValue = node.ToString();
        if (string.IsNullOrWhiteSpace(nodeValue)) return;

        var converted = ConvertNode(node);

        if (converted is XElement tempEl)
        {
            // Проверяем, есть ли внутри хоть какой-то контент (элементы или текст)
            bool hasContent = tempEl.HasElements || !string.IsNullOrWhiteSpace(tempEl.Value);

            if (hasContent)
            {
                // Если это был временный контейнер "temp", берем только его детей
                var content = tempEl.Name == "temp" ? tempEl.Nodes() : (object)tempEl;
                parent.Add(new XElement(name, content));
            }
        }
    }

    private XElement BuildBody(JToken? content, string name)
    {
        var body = new XElement(ns + "body");

        // В FB2 name="notes" обычно используется для секции сносок
        if (!string.IsNullOrEmpty(name) && name != "main")
        {
            body.Add(new XAttribute("name", name));
        }

        // Извлекаем массив узлов из "content"
        if (content?["content"] is JArray nodes)
        {
            foreach (var node in nodes)
            {
                var converted = ConvertNode(node);
                if (converted != null)
                {
                    // Добавляем результат. Если это массив (object[]), 
                    // XElement.Add автоматически добавит каждый элемент массива.
                    body.Add(converted);
                }
            }
        }

        return body;
    }

    private object? ConvertNode(JToken node)
    {
        if (node == null || node.Type == JTokenType.Null) return null;

        // 1. Если пришел МАССИВ (JArray), обрабатываем каждый элемент рекурсивно
        if (node is JArray array)
        {
            return array.Select(ConvertNode).Where(x => x != null).ToArray();
        }
        string type = node["type"]?.ToString() ?? "";

        // 1. Сначала определяем, были ли в JSON вообще какие-то дети до фильтрации
        var rawChildNodes = node["content"] as JArray;
        bool hadJsonChildren = rawChildNodes != null && rawChildNodes.Count > 0;

        // 2. Собираем отфильтрованные дети (где hardBreak вернет null)
        var children = rawChildNodes != null
            ? rawChildNodes.Select(ConvertNode).Where(x => x != null).Cast<object>().ToArray()
            : [];

        return type switch
        {
            // "doc" возвращает временный контейнер (XElement)
            "doc" => new XElement("temp", children),
            "hardBreak" => null,
            "paragraph" => children.Length > 0
                    ? new XElement(ns + "p", children) // Есть полезный контент
                    : (hadJsonChildren ? null : new XElement(ns + "empty-line")), // Если были дети (br), но отфильтровались — null. Если детей не было вообще — empty-line.
            "text" => WrapTextWithMarks(node), // Возвращает XText или XElement (если есть марки)

            "fb2Section" => new XElement(ns + "section", children),
            "fb2BodySection" => new XElement(ns + "section", children),
            "fb2Annotation" => new XElement(ns + "annotation", children),
            "fb2Title" => new XElement(ns + "title", children),
            "fb2Cite" => new XElement(ns + "cite", children),
            "fb2Epigraph" => new XElement(ns + "epigraph", children),
            "fb2TextAuthor" => new XElement(ns + "text-author", children),
            "fb2Poem" => new XElement(ns + "poem", children),
            "fb2Stanza" => new XElement(ns + "stanza", children),
            "fb2V" => new XElement(ns + "v", children),
            "fb2Subtitle" => new XElement(ns + "subtitle", children),
            "fb2Date" => CreateDate(node),
            "fb2BlockImage" => CreateImage(node),
            "fb2InlineImage" => CreateImage(node),
            _ => !string.IsNullOrEmpty(type)
            ? new XComment($"Unknown type: {type}")
            : null
        };
    }

    private object WrapTextWithMarks(JToken node) // Возвращаем object для гибкости
    {
        var textValue = node["text"]?.ToString() ?? "";
        // Начинаем с обычного текста (string или XText)
        object result = textValue;

        if (node["marks"] is JArray marks)
        {
            foreach (var mark in marks)
            {
                string markType = mark["type"]?.ToString() ?? "";
                var attrs = mark["attrs"];

                result = markType switch
                {
                    "bold" => new XElement(ns + "strong", result),
                    "italic" => new XElement(ns + "emphasis", result),
                    // В FB2 подчеркивание часто делается через стили, если схема поддерживает
                    "underline" => new XElement(ns + "style", new XAttribute("builtin", "underline"), result),
                    "strikethrough" => new XElement(ns + "strikethrough", result), // Исправлено имя
                    "code" => new XElement(ns + "code", result),
                    "sub" => new XElement(ns + "sub", result),
                    "sup" => new XElement(ns + "sup", result),
                    "link" => CreateLinkFromMark(result, attrs),
                    _ => result
                };
            }
        }
        return result;
    }

    private XElement? BuildNotesBody(JObject? footnotes)
    {
        if (footnotes == null || !footnotes.Properties().Any())
        {
            return null;
        }
        var notesBody = new XElement(ns + "body", new XAttribute("name", "notes"));

        // 2. Добавляем общий заголовок всей секции примечаний
        notesBody.Add(new XElement(ns + "title",
            new XElement(ns + "p", "Примечания")
        ));

        bool hasAddedAnyContent = false;

        foreach (var property in footnotes.Properties())
        {
            string id = property.Name;
            var noteContent = property.Value;

            var section = new XElement(ns + "section", new XAttribute("id", id));

            // Заголовок конкретной сноски (например, "2")
            //var titleId = id.Contains("_") ? id.Split('_').Last() : id;
            //section.Add(new XElement(ns + "title", new XElement(ns + "p", titleId)));

            // Контент сноски (параграфы и форматирование)
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

        // Возвращаем body, только если в него реально добавились секции со сносками
        return hasAddedAnyContent ? notesBody : null;
    }

    // Добавляет один элемент, если значение не пустое
    private static void AddTo(XContainer parent, XName name, JToken? token)
    {
        var val = token?.ToString();
        if (!string.IsNullOrWhiteSpace(val))
            parent.Add(new XElement(name, val));
    }

    // Добавляет один или несколько элементов (если это массив)
    private static void AddMultipleTo(XContainer parent, XName name, JToken? token)
    {
        if (token == null) return;

        if (token is JArray arr)
        {
            foreach (var item in arr)
                AddTo(parent, name, item);
        }
        else
        {
            AddTo(parent, name, token);
        }
    }
    // --- УНИВЕРСАЛЬНЫЙ МЕТОД ДЛЯ СЕРИЙ ---

    private static void AddSequences(XContainer parent, XName name, JToken? token)
    {
        if (token == null) return;

        if (token is JArray arr)
        {
            foreach (var item in arr)
                AddSingleSequence(parent, name, item);
        }
        else
        {
            AddSingleSequence(parent, name, token);
        }
    }

    private static void AddSingleSequence(XContainer parent, XName name, JToken token)
    {
        var seqName = token["Name"]?.ToString();
        if (string.IsNullOrWhiteSpace(seqName)) return;

        var seqElement = new XElement(name, new XAttribute("name", seqName));

        // Номер серии (опционально)
        var seqNumber = token["Number"]?.ToString();
        if (!string.IsNullOrWhiteSpace(seqNumber))
        {
            seqElement.Add(new XAttribute("number", seqNumber));
        }

        parent.Add(seqElement);
    }

    // --- УНИВЕРСАЛЬНЫЙ МЕТОД ДЛЯ ПЕРСОН ---

    private static void AddPersons(XContainer parent, XName tagName, JToken? token)
    {
        if (token == null) return;

        // Превращаем в массив, если пришел одиночный объект
        var persons = token is JArray arr ? arr : new JArray(token);

        foreach (var p in persons)
        {
            var personEl = new XElement(tagName);

            AddTo(personEl, ns + "first-name", p["FirstName"]);
            AddTo(personEl, ns + "middle-name", p["MiddleName"]);
            AddTo(personEl, ns + "last-name", p["LastName"]);
            AddTo(personEl, ns + "nickname", p["Nickname"]);

            // Массивы (используем ранее созданный AddMultipleTo)
            AddMultipleTo(personEl, ns + "email", p["Email"]);
            AddMultipleTo(personEl, ns + "home-page", p["HomePage"]);

            // Добавляем персону только если в ней есть хоть одно заполненное поле
            if (personEl.HasElements)
                parent.Add(personEl);
        }
    }
    private static void AddDate(XContainer parent, XName name, JToken? textToken, JToken? valueToken)
    {
        var dateText = textToken?.ToString();
        var dateValue = valueToken?.ToString();

        // Если нет ни текста, ни значения для атрибута — ничего не создаем
        if (string.IsNullOrWhiteSpace(dateText) && string.IsNullOrWhiteSpace(dateValue))
            return;

        // Создаем элемент. Если текста нет, используем значение атрибута как текст
        var dateEl = new XElement(name, !string.IsNullOrWhiteSpace(dateText) ? dateText : dateValue);

        // Добавляем атрибут value, если он есть
        if (!string.IsNullOrWhiteSpace(dateValue))
        {
            dateEl.Add(new XAttribute("value", dateValue));
        }

        parent.Add(dateEl);
    }
    // Вспомогательный метод для формирования ссылки
    private static XElement CreateDate(JToken node)
    {
        var dateEl = new XElement(ns + "date");
        var dateValue = node["value"]?.ToString() ?? "";
        dateEl.Add(new XAttribute("value", dateValue));
        return dateEl;
    }

    private object CreateImage(JToken node, string? forcedId = null)
    {
        JToken? attrs = null;
        string? rawData = null;
        string? rawHref = null;
        string? title = null;

        if (node is JObject obj)
        {
            attrs = obj["attrs"] ?? obj;
            rawData = attrs["src"]?.ToString();
            rawHref = attrs["href"]?.ToString();
            title = attrs["title"]?.ToString();
        }
        else
        {
            rawData = node.ToString();
        }

        string lookupId = (rawHref ?? "").Replace("#", "").Trim();
        string finalId = (forcedId ?? lookupId).Trim();

        if (string.IsNullOrEmpty(finalId))
            return new XComment(" Image identifier is empty ");

        // --- ЛОГИКА ПАРСИНГА DATA URL ---
        if (!string.IsNullOrEmpty(rawData))
        {
            string base64Only = rawData;
            string contentType = "image/jpeg"; // Значение по умолчанию

            if (rawData.StartsWith("data:"))
            {
                // Формат: data:image/png;base64,iVBOR...
                var parts = rawData.Split(',');
                if (parts.Length > 1)
                {
                    base64Only = parts[1];
                    // Извлекаем тип: "data:image/png;base64" -> "image/png"
                    var meta = parts[0].Split(';');
                    contentType = meta[0].Replace("data:", "");
                }
            }

            _binarySaveCache[finalId] = (base64Only, contentType);
        }
        // -------------------------------

        var img = new XElement(ns + "image", new XAttribute(xlink + "href", "#" + finalId));
        if (!string.IsNullOrWhiteSpace(title)) img.Add(new XAttribute("alt", title));

        return img;
    }

    // Вспомогательный метод для создания ссылки из метки
    private static XElement CreateLinkFromMark(object content, JToken? attrs)
    {
        var linkEl = new XElement(ns + "a", content);
        var href = attrs?["href"]?.ToString() ?? "";

        if (!string.IsNullOrWhiteSpace(href))
        {
            // 1. Если это сноска, проверяем наличие '#' в начале href
            if (attrs?["rel"]?.ToString() == "footnote")
            {
                // FB2 ожидает внутреннюю ссылку: <a xlink:href="#note1" type="note">
                var internalHref = href.StartsWith("#") ? href : "#" + href;
                linkEl.Add(new XAttribute(xlink + "href", internalHref));
                linkEl.Add(new XAttribute("type", "note"));
            }
            else
            {
                // Обычная внешняя ссылка
                linkEl.Add(new XAttribute(xlink + "href", href));
            }
        }

        return linkEl;
    }

}