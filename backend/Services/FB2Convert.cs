using System.Xml.Linq;
using System.Text;
using Newtonsoft.Json;
using System.IO.Compression;
using System.Xml.Schema;

namespace FB2Editor.Services;

public class Fb2Service
{
    private readonly Dictionary<string, string> _binaryCache = [];
    private XNamespace ns = "http://www.gribuser.ru/xml/fictionbook/2.0";
    private readonly XNamespace xlink = "http://www.w3.org/1999/xlink";

    // Метод для заполнения кеша (вызовите его при инициализации документа)
    // Собираем все картинки (ID -> Base64)
    // Очищаем Base64 от переносов строк, иначе браузер их не поймет
    private void FillBinaryCache(XDocument doc)
    {
        var binaries = doc.Descendants()
            .Where(x => x.Name.LocalName == "binary");

        foreach (var bin in binaries)
        {
            var id = bin.Attribute("id")?.Value?.TrimStart('#').ToLower();
            if (string.IsNullOrEmpty(id)) continue;

            var mime = bin.Attribute("content-type")?.Value ?? "image/jpeg";
            // Чистим base64 от всех пробельных символов и переносов
            var base64 = string.Concat(bin.Value.Where(c => !char.IsWhiteSpace(c)));

            _binaryCache[id] = $"data:{mime};base64,{base64}";
        }
    }

    // Получение контента изображения по ссылке
    private string GetImage(string? href)
    {
        if (string.IsNullOrWhiteSpace(href))
            return string.Empty;

        var key = href.TrimStart('#').ToLower();

        return _binaryCache.TryGetValue(key, out var base64Data)
            ? base64Data
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

        //ValidateFb2(doc);
        ns = doc.Root?.GetDefaultNamespace() ?? XNamespace.None; ;
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

        var binaryCache = doc.Descendants()
            .Where(x => x.Name.LocalName == "binary")
            .Select(x => new
            {
                Id = x.Attribute("id")?.Value?.ToLower() ?? "",
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

            ParseElement(body, ns, xlink, binaryCache, bodyContent);

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
                    Sequence = pubInfo?.Elements().Where(x => x.Name.LocalName == "sequence").Select(x => new
                    {
                        name = x.Attribute("name")?.Value ?? "",
                        number = (int?)x.Attribute("number") ?? 0
                    }).ToList() ?? []
                },
                SrcTitleInfo = new // Данные о произведении на языке оригинала
                {
                    Genres = srcTitleInfo?.Elements().Where(x => x.Name.LocalName == "genre").Select(x => x.Value).ToList() ?? [],
                    Authors = srcTitleInfo?.Elements().Where(x => x.Name.LocalName == "author").Select(parseAuthor).ToList() ?? [],
                    Title = srcTitleInfo?.Element(ns + "book-title")?.Value ?? "Без названия",
                    Annotation = srcTitleInfoAnnotationNodes, // Аннотация возвращается в формате TipTap JSON
                    Keywords = srcTitleInfo?.Element(ns + "keywords")?.Value ?? "",
                    Date = srcTitleInfo?.Element(ns + "date")?.Value ?? "",
                    DateValue = srcTitleInfo?.Element(ns + "date")?.Attribute("value")?.Value ?? "",
                    CoverPage = GetImage(srcTitleInfo?.Element(ns + "coverpage")?.Descendants(ns + "image").FirstOrDefault()?.Attribute(xlink + "href")?.Value),
                    Lang = srcTitleInfo?.Element(ns + "lang")?.Value ?? "ru",
                    SrcLang = srcTitleInfo?.Element(ns + "src-lang")?.Value ?? "",
                    Translators = srcTitleInfo?.Elements().Where(x => x.Name.LocalName == "translator").Select(parseAuthor).ToList() ?? [],
                    Sequence = srcTitleInfo?.Elements().Where(x => x.Name.LocalName == "sequence").Select(x => new
                    {
                        name = x.Attribute("name")?.Value ?? "",
                        number = (int?)x.Attribute("number") ?? 0
                    }).ToList() ?? []
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
        });
    }

    private static readonly Lazy<XmlSchemaSet> _schemaCache = new Lazy<XmlSchemaSet>(() =>
        {
            var schemas = new XmlSchemaSet();
            try
            {
                // Пути к файлам в папке приложения (убедитесь, что файлы копируются в Output Directory)
                string schemaPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Schemas");

                // 1. Добавляем XLink (обязателен для валидации атрибутов изображений)
                schemas.Add("http://www.w3.org/1999/xlink", Path.Combine(schemaPath, "xlink.xsd"));

                // 2. Добавляем обе версии FB2. Валидатор сам выберет нужную по xmlns в файле.
                schemas.Add("http://www.gribuser.ru/xml/fictionbook/2.0", Path.Combine(schemaPath, "FictionBook2.0.xsd"));
                schemas.Add("http://www.gribuser.ru/xml/fictionbook/2.1", Path.Combine(schemaPath, "FictionBook2.1.xsd"));

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
        var errors = new List<string>();

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
    private void ParseElement(XElement container, XNamespace ns, XNamespace xlink, Dictionary<string, string> binaryCache, List<object> nodes)
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
                ParseElement(el, ns, xlink, binaryCache, sectionContent);

                // Добавляем всю секцию как единый блок в общий список
                nodes.Add(new
                {
                    type = "fb2Section",
                    attrs = new { level = level + 1, sectionId = el.Attribute("id")?.Value ?? Guid.NewGuid().ToString() },
                    content = sectionContent
                });
            }
            else if (name is "title" or "epigraph" or "cite" or "poem" or "stanza")
            {
                var contentList = new List<object>();
                ParseElement(el, ns, xlink, binaryCache, contentList);
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
                        nodes.Add(new { type = "fb2BlockImage", attrs = new { src = base64 } });
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
                        container.Add(new { type = "fb2InlineImage", attrs = new { src = base64 }, display = "inline" });
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

    public void SaveJsonToFb2(Stream outputStream, string fileName, string jsonPayload)
    {
        // 1. Десериализуем данные из React
        dynamic? data = JsonConvert.DeserializeObject(jsonPayload);
        if (data == null)
        {
            return;
        }

        // Определение пространств имен (стандарт FB2)
        XNamespace ns = "http://www.gribuser.ru";
        XNamespace xlink = "http://www.w3.org";

        // Список для хранения бинарных данных (картинок)
        var binaryElements = new List<XElement>();
        int imgCounter = 1;

        // 2. Формируем тело книги (body -> section)
        var sectionElement = new XElement(ns + "section");

        if (data.EditorContent?.content != null)
        {
            foreach (var node in data.EditorContent.content)
            {
                string type = node.type;

                if (type == "paragraph")
                {
                    string text = node.content?[0]?.text ?? "";
                    sectionElement.Add(new XElement(ns + "p", text));
                }
                else if (type == "heading")
                {
                    string text = node.content?[0]?.text ?? "";
                    sectionElement.Add(new XElement(ns + "title", new XElement(ns + "p", text)));
                }
                else if (type == "image")
                {
                    // Извлекаем Base64 из data-url (например, data:image/jpeg;base64,xxxx)
                    string src = (string)node.attrs.src;
                    if (src.Contains("base64,"))
                    {
                        string base64Data = src.Split(new[] { "base64," }, StringSplitOptions.None)[1];
                        string imgId = $"img_{imgCounter++}.jpg";

                        // Добавляем ссылку на картинку в текст
                        sectionElement.Add(new XElement(ns + "image", new XAttribute(xlink + "href", "#" + imgId)));

                        // Добавляем сами данные в список binary
                        binaryElements.Add(new XElement(ns + "binary",
                            new XAttribute("id", imgId),
                            new XAttribute("content-type", "image/jpeg"),
                            base64Data
                        ));
                    }
                }
            }
        }

        // 3. Собираем финальный документ
        var doc = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(ns + "FictionBook",
                new XAttribute(XNamespace.Xmlns + "xlink", xlink.NamespaceName), // Регистрируем xlink
                new XElement(ns + "description",
                    new XElement(ns + "title-info",
                        new XElement(ns + "book-title", (string)data.Meta.Title),
                        new XElement(ns + "author",
                            new XElement(ns + "last-name", (string)data.Meta.Author)
                        )
                    )
                ),
                new XElement(ns + "body", sectionElement),
                binaryElements // Секции <binary> идут строго в конце
            )
        );

        if (fileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
        {
            using var archive = new ZipArchive(outputStream, ZipArchiveMode.Create, leaveOpen: true);
            // Берем имя, которое ввел пользователь (например, "WarAndPeace.zip")
            // и меняем его на "WarAndPeace.fb2" для файла ВНУТРИ архива
            string internalFileName = Path.GetFileNameWithoutExtension(fileName) + ".fb2";

            var entry = archive.CreateEntry(internalFileName, CompressionLevel.Optimal);

            using var entryStream = entry.Open();
            doc.Save(entryStream);
        }
        else
        {
            // Обычное сохранение в .fb2
            doc.Save(outputStream);
        }
    }
}