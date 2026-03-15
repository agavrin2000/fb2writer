using System.Xml.Linq;
using System.Text;
using Newtonsoft.Json;
using System.IO.Compression;

namespace FB2Editor;

public class Fb2Service
{
    private readonly Dictionary<string, string> _binaryCache = [];

    public static string LoadAndConvertToJson(Stream fileStream, string fileName)
    {
        // Обязательно для поддержки русских кодировок (windows-1251) в FB2
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

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
        // ВАЖНО: Используем LocalName, чтобы игнорировать ошибки префиксов в разных файлах
        XNamespace ns = doc.Root?.GetDefaultNamespace() ?? XNamespace.None; ;
        XNamespace xlink = "http://www.w3.org";

        // 1. Собираем все картинки (ID -> Base64)
        // Очищаем Base64 от переносов строк, иначе браузер их не поймет
        var binaryCache = doc.Descendants()
            .Where(x => x.Name.LocalName == "binary")
            .ToDictionary(
                x => x.Attribute("id")?.Value?.ToLower() ?? "",
                x => x.Value.Trim().Replace("\n", "").Replace("\r", ""),
                StringComparer.OrdinalIgnoreCase
            );

        // 2. Извлекаем примечания (второй body)
        // В FB2 сноски лежат в секциях внутри второго body
        var notesBody = doc.Descendants().Where(x => x.Name.LocalName == "body").Skip(1).FirstOrDefault();
        var footnotes = new Dictionary<string, string>();

        if (notesBody != null)
        {
            foreach (var section in notesBody.Elements().Where(e => e.Name.LocalName == "section"))
            {
                string id = section.Attribute("id")?.Value ?? "";
                // Текст сноски обычно в первом <p> или <title>
                string text = section.Descendants().FirstOrDefault(e => e.Name.LocalName == "p")?.Value ?? "";
                if (!string.IsNullOrEmpty(id)) footnotes[id] = text;
            }
        }

        var contentNodes = new List<object>();
        var body = doc.Descendants().FirstOrDefault(x => x.Name.LocalName == "body");

        if (body != null)
        {
            ParseElement(body, ns, xlink, binaryCache, contentNodes);
        }


        return JsonConvert.SerializeObject(new
        {
            Meta = new { Title = "Книга", Author = "Автор" }, // Упростил для примера
            EditorContent = new { type = "doc", content = contentNodes },
            Footnotes = footnotes // Передаем словарь сносок отдельно
        });
    }

    private static void ParseElement(XElement container, XNamespace ns, XNamespace xlink, Dictionary<string, string> binaryCache, List<object> nodes)
    {
        foreach (var el in container.Elements())
        {
            string name = el.Name.LocalName;

            if (name == "section")
            {
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
                    attrs = new { level = level },
                    content = sectionContent.ToArray()
                });
            }
            else if (name == "title")
            {
                // Считаем количество родительских тегов <section>
                int depth = el.Ancestors().Count(x => x.Name.LocalName == "section");
                // Уровень заголовка (минимум 1)
                int level = Math.Clamp(depth, 1, 6);
                // Формируем список объектов для поля content
                var contentList = new List<object>();
                // Рекурсивно наполняем его (заголовки, p, вложенные секции пойдут сюда)
                ParseElement(el, ns, xlink, binaryCache, contentList);
                // Добавляем всю секцию как единый блок в общий список
                nodes.Add(new
                {
                    type = "fb2Title",
                    content = contentList.ToArray(),
                    attrs = new { level = level }
                });
            }
            else if (name == "epigraph")
            {
                // Формируем список объектов для поля content
                var contentList = new List<object>();
                // Рекурсивно наполняем его (заголовки, p, вложенные секции пойдут сюда)
                ParseElement(el, ns, xlink, binaryCache, contentList);
                // Добавляем всю секцию как единый блок в общий список
                nodes.Add(new
                {
                    type = "fb2Epigraph",
                    content = contentList.ToArray()
                });
            }
            else if (name == "cite")
            {
                // Формируем список объектов для поля content
                var contentList = new List<object>();
                // Рекурсивно наполняем его (заголовки, p, вложенные секции пойдут сюда)
                ParseElement(el, ns, xlink, binaryCache, contentList);
                // Добавляем всю секцию как единый блок в общий список
                nodes.Add(new
                {
                    type = "fb2Cite",
                    content = contentList.ToArray()
                });
            }
            else if (name == "text-author")
            {
                var inlineContent = new List<object>();
                foreach (var node in el.Nodes())
                {
                    if (node is XText textNode)
                    {
                        inlineContent.Add(new { type = "text", text = textNode.Value });
                    }
                    else if (node is XElement child && child.Name.LocalName == "a")
                    {
                        var hrefAttr = child.Attributes().FirstOrDefault(a => a.Name.LocalName == "href");
                        inlineContent.Add(new
                        {
                            type = "text",
                            text = child.Value,
                            marks = new[] { new { type = "link", attrs = new { href = hrefAttr?.Value ?? "", target = "_blank", rel = "footnote" } } }
                        });
                    }
                }
                if (inlineContent.Count == 0) inlineContent.Add(new { type = "text", text = "" });
                nodes.Add(new { type = "fb2TextAuthor", content = inlineContent });
            }
            else if (name == "subtitle")
            {
                var inlineContent = new List<object>();
                foreach (var node in el.Nodes())
                {
                    if (node is XText textNode)
                    {
                        inlineContent.Add(new { type = "text", text = textNode.Value });
                    }
                    else if (node is XElement child && child.Name.LocalName == "a")
                    {
                        var hrefAttr = child.Attributes().FirstOrDefault(a => a.Name.LocalName == "href");
                        inlineContent.Add(new
                        {
                            type = "text",
                            text = child.Value,
                            marks = new[] { new { type = "link", attrs = new { href = hrefAttr?.Value ?? "", target = "_blank", rel = "footnote" } } }
                        });
                    }
                }
                if (inlineContent.Count == 0) inlineContent.Add(new { type = "text", text = "" });
                nodes.Add(new { type = "fb2Subtitle", content = inlineContent });
            }
            else if (name == "p")
            {
                var inlineContent = new List<object>();

                // Рекурсивная функция для сбора текста и накопления стилей (marks)
                void ProcessInline(XNode node, List<object> activeMarks)
                {
                    if (node is XText textNode)
                    {
                        // Добавляем текстовый узел только если есть текст
                        if (!string.IsNullOrEmpty(textNode.Value))
                        {
                            inlineContent.Add(new
                            {
                                type = "text",
                                text = textNode.Value,
                                marks = activeMarks.Count > 0 ? activeMarks.ToArray() : null
                            });
                        }
                    }
                    else if (node is XElement element)
                    {
                        var newMarks = new List<object>(activeMarks);
                        var localName = element.Name.LocalName.ToLower();

                        // Маппинг тегов XML на типы марок в TipTap/ProseMirror
                        switch (localName)
                        {
                            case "emphasis":
                                newMarks.Add(new { type = "italic" });
                                break;
                            case "strong":
                                newMarks.Add(new { type = "bold" });
                                break;
                            case "sub":
                                newMarks.Add(new { type = "subscript" });
                                break;
                            case "sup":
                                newMarks.Add(new { type = "superscript" });
                                break;
                            case "code":
                                newMarks.Add(new { type = "code" });
                                break;
                            case "a":
                                var href = element.Attribute("href")?.Value ?? "";
                                newMarks.Add(new
                                {
                                    type = "link",
                                    attrs = new { href, target = "_blank", rel = "footnote" }
                                });
                                break;
                        }

                        // Идем глубже по дереву
                        foreach (var childNode in element.Nodes())
                        {
                            ProcessInline(childNode, newMarks);
                        }
                    }
                }

                foreach (var node in el.Nodes()) ProcessInline(node, new List<object>());

                if (inlineContent.Count == 0) inlineContent.Add(new { type = "text", text = "" });

                nodes.Add(new { type = "paragraph", content = inlineContent });
            }
            else if (name == "empty-line")
            {
                nodes.Add(new { type = "paragraph", text = "" });
            }
            else if (name == "image")
            {
                var hrefAttr = el.Attributes().FirstOrDefault(a => a.Name.LocalName == "href");
                string href = hrefAttr?.Value?.Replace("#", "").ToLower() ?? string.Empty;
                if (!string.IsNullOrEmpty(href) && binaryCache.TryGetValue(href, out string? base64) && base64 != null)
                {
                    nodes.Add(new { type = "image", attrs = new { src = $"data:image/jpeg;base64,{base64}" } });
                }
            }
            else if (name == "body")
            {
                // Для body продолжаем наполнять текущий список (обычно это корень)
                ParseElement(el, ns, xlink, binaryCache, nodes);
            }
        }
    }


    private string ExtractAuthor(XElement titleInfo, XNamespace ns)
    {
        var auth = titleInfo?.Element(ns + "author");
        if (auth == null) return "Неизвестен";
        string first = auth.Element(ns + "first-name")?.Value ?? "";
        string last = auth.Element(ns + "last-name")?.Value ?? "";
        return $"{first} {last}".Trim();
    }

    public void SaveJsonToFb2(string filePath, string jsonPayload)
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

        // 4. Сохраняем на диск
        doc.Save(filePath);
    }
}