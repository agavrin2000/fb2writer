using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using System.Text;
using Newtonsoft.Json;


namespace FB2Editor;

public class Fb2Service
{
    private readonly Dictionary<string, string> _binaryCache = [];

    public static string LoadAndConvertToJson(string filePath)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        var doc = XDocument.Load(filePath);

        // ВАЖНО: Используем LocalName, чтобы игнорировать ошибки префиксов в разных файлах
        XNamespace ns = doc.Root.GetDefaultNamespace();
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

        if (name == "title")
        {
            int depth = el.Ancestors().Count(x => x.Name.LocalName == "section");
            // FB2 Title может содержать <p>, извлекаем чистый текст
            string titleText = string.Join(" ", el.Descendants(ns + "p").Select(p => p.Value));
            if (string.IsNullOrWhiteSpace(titleText)) titleText = el.Value;

            nodes.Add(new { 
                type = "heading", 
                attrs = new { level = Math.Clamp(depth > 0 ? depth : 1, 1, 6) }, 
                content = new[] { new { type = "text", text = titleText.Trim() } } 
            });
        }
        else if (name == "p")
        {
            // НОВАЯ ЛОГИКА: Парсим содержимое параграфа по частям (текст и ссылки)
            var inlineContent = new List<object>();

            foreach (var node in el.Nodes())
            {
                if (node is XText textNode)
                {
                    // Обычный текст
                    inlineContent.Add(new { type = "text", text = textNode.Value });
                }
                else if (node is XElement child && child.Name.LocalName == "a")
                {
                    // Ссылка-сноска
                    var hrefAttr = child.Attributes().FirstOrDefault(a => a.Name.LocalName == "href");
                    string href = hrefAttr?.Value ?? "";

                    inlineContent.Add(new { 
                        type = "text", 
                        text = child.Value,
                        marks = new[] { 
                            new { 
                                type = "link", 
                                attrs = new { 
                                    href = href,
                                    // Добавляем класс, чтобы React узнал сноску
                                    target = "_blank",
                                    rel = "footnote" 
                                } 
                            } 
                        }
                    });
                }
            }

            // Если параграф пустой, добавляем пустой текст (важно для TipTap)
            if (inlineContent.Count == 0) 
                inlineContent.Add(new { type = "text", text = "" });

            nodes.Add(new { type = "paragraph", content = inlineContent });
        }
        else if (name == "image")
        {
            var hrefAttr = el.Attributes().FirstOrDefault(a => a.Name.LocalName == "href");
            string href = hrefAttr?.Value?.Replace("#", "").ToLower();

            if (!string.IsNullOrEmpty(href) && binaryCache.TryGetValue(href, out string base64))
            {
                nodes.Add(new {
                    type = "image",
                    attrs = new { src = $"data:image/jpeg;base64,{base64}" }
                });
            }
        }
        else if (name == "section" || name == "body")
        {
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
        dynamic data = JsonConvert.DeserializeObject(jsonPayload);

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