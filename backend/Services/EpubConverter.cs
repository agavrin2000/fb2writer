using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using FB2Writer.Models;

namespace FB2Writer.Services;

/*https://github.com/fb2kindle/fb2kindle/
// https://www.w3.org/TR/epub/#sec-nav-intro
// */


public record Chapter(
    string id,
    string href,
    string title,
    List<Chapter> Children
);
public partial class EpubConverter
{
    /// <summary>
    /// Кэш для хранения бинарных данных изображений в формате Base64.
    /// Ключ — ID изображения (без #), значение — кортеж с Base64-строкой и MIME-типом.
    /// Используется регистронезависимое сравнение ключей.
    /// </summary>
    private readonly Dictionary<string, (string Base64, string ContentType)> _binaryCache = new(StringComparer.OrdinalIgnoreCase);
    private readonly XNamespace _dc = "http://purl.org/dc/elements/1.1/";
    private readonly XNamespace _opf = "http://www.idpf.org/2007/opf";
    private readonly XNamespace _daisy = "http://www.daisy.org/z3986/2005/ncx/";

    private int _chapterCounter = 1;

    private readonly string style = """
                p{margin-bottom: 1pt;margin-top: 1pt;margin-left: -1pt;margin-right: -1pt;font-size:100%;}
                p.text-name{text-indent:0;font-size:130%;font-weight:bolder;}
                p.text-author{text-indent:0;font-style:italic;font-weight:bold;text-align:right;}
                span.dc {
                    float: left;
                    font-size: 3.5em; 
                    line-height: 0.85;
                    margin-right: 0.1em;
                    font-family: 'Georgia', serif;
                    color: #903;
                    display: inline-block; 
                }
                div.text-author{text-indent:0;font-size:130%;font-weight:bold;}
                div.image{text-indent:0;text-align:center;}
                div.book{text-indent: 35px;page-break-before: always;}
                div.title{font-size: 130%;text-align:center;font-weight:bold;page-break-before:always;}
                div.epigraph{font-style:italic;margin-left:20%;width:80%}
                div.supertitle{text-align:center;}
                div.subtitle{font-style:italic;font-weight: bold;text-align:center;}
                div.cite{font-style:italic;font-size:95%;}
                div.poem{text-indent:0;font-style:italic;text-align:center;}
                ul{text-align:left;}
                sup{font-size: 60%;color:#555555;}
                span.dc2{text-shadow:1px 1px #505050;}
            """;

    public void ConvertJsonToEpub(Stream outputStream, JsonElement jsonContent)
    {
        //Fb2BookExport book = jsonContent.Deserialize<Fb2BookExport>()!;
        var book = JsonSerializer.Deserialize(jsonContent, EmitContext.Custom.Fb2BookExport) ?? throw new Exception("Ошибка формата книги");
        using var archive = new ZipArchive(outputStream, ZipArchiveMode.Create, true);
        // 1. mimetype (ОБЯЗАТЕЛЬНО ПЕРВЫМ И БЕЗ СЖАТИЯ)
        var mimeEntry = archive.CreateEntry("mimetype", CompressionLevel.NoCompression);
        using (var sw = new StreamWriter(mimeEntry.Open())) sw.Write("application/epub+zip");

        // 2. container.xml
        var containerEntry = archive.CreateEntry("META-INF/container.xml");
        using (var sw = new StreamWriter(containerEntry.Open()))
            sw.Write("<?xml version=\"1.0\"?><container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\"><rootfiles><rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/></rootfiles></container>");

        // 3. style.css
        var cssEntry = archive.CreateEntry("OEBPS/style.css");
        using (var sw = new StreamWriter(cssEntry.Open()))
        {
            sw.Write(style);
        }


        string bookId = Guid.NewGuid().ToString("N")[..8];
        var manifestItems = new List<(string id, string href, string mime)>();
        var navItems = new List<(string id, string href, string title)>();

        // 2. ОБРАБОТКА ВСЕХ ИЗОБРАЖЕНИЙ (включая обложку)
        ExtractImagesFromBook(book); // Метод для сбора всех Base64 из данных

        foreach (var img in _binaryCache)
        {
            try
            {
                var ext = img.Value.ContentType switch
                {
                    "image/jpeg" => "jpg",
                    "image/png" => "png",
                    _ => "jpg"
                };

                // Декодируем
                byte[] imageBytes = Convert.FromBase64String(img.Value.Base64);

                // Записываем в архив
                var imgHref = $"images/{img.Key}.{ext}";
                var entry = archive.CreateEntry($"OEBPS/{imgHref}");
                using (var os = entry.Open())
                {
                    os.Write(imageBytes, 0, imageBytes.Length);
                }

                // ВАЖНО: передаем mime-type в манифест
                bool isCover = img.Key == "cover";
                manifestItems.Add((
                    id: isCover ? "cover" : $"img_{img.Key}",
                    href: imgHref,
                    mime: img.Value.ContentType
                ));
            }
            catch { /* Пропустить битую картинку */ }
        }


        // 1. Строим дерево навигации
        _chapterCounter = 1;
        var chapterTree = MapTipTapToChapters(book.Content.Content?[0].Content ?? []);

        // 2. Плоский список для Манифеста/Spine
        var flatChapters = new List<Chapter>();

        // Рекурсивный метод для сохранения файлов
        void ProcessTipTapNode(Chapter chapter, TipTapNode node)
        {
            flatChapters.Add(chapter);

            // Конвертируем TipTap ноду в HTML (ваш существующий конвертер)
            var bodyHtml = TipTapToHtml.ToHtml(node);
            var finalHtml = WrapInXhtml(chapter.title, ApplyDropCap(bodyHtml) + GenerateFootnotesHtml(bodyHtml, book.Footnotes));

            // Пишем в ZIP
            var entry = archive.CreateEntry($"OEBPS/{chapter.href}");
            using (var sw = new StreamWriter(entry.Open())) sw.Write(finalHtml);

            // В манифест
            manifestItems.Add((chapter.id, chapter.href, "application/xhtml+xml"));

            // Идем вглубь по дереву, если есть дети
            if (node.Content != null && chapter.Children.Any())
            {
                // Сопоставляем вложенные главы
                var childSections = node.Content.Where(n => n.Type == "fb2Section").ToList();
                for (int i = 0; i < chapter.Children.Count; i++)
                {
                    ProcessTipTapNode(chapter.Children[i], childSections[i]);
                }
            }
        }

        // Формирование дерева глав
        var rootSections = book.Content.Content?[0].Content?.Where(n => n.Type == "fb2Section").ToList() ?? [];
        for (int i = 0; i < chapterTree.Count; i++)
        {
            ProcessTipTapNode(chapterTree[i], rootSections[i]);
        }

        /* Генерация файлов глав
        for (int i = 0; i < rootSections.Count; i++)
        {
            var fileName = $"chapter_{i + 1}.xhtml";
            var bodyHtml = TipTapToHtml.ToHtml(rootSections[i]);
            var finalHtml = WrapInXhtml($"Глава {i + 1}", ApplyDropCap(bodyHtml) + GenerateFootnotesHtml(bodyHtml, book.Footnotes));

            var entry = archive.CreateEntry($"OEBPS/{fileName}");
            using (var sw = new StreamWriter(entry.Open())) sw.Write(finalHtml);

            manifestItems.Add(($"ch_{i}", fileName, mime: "application/xhtml+xml"));
            navItems.Add(($"ch_{i}", fileName, $"Глава {i + 1}"));
        }*/

        // Генерация файлов навигации и добавляем в manifestItems
        var navEntry = archive.CreateEntry("OEBPS/nav.xhtml"); // + запись контента через GenerateNav
        using (var sw = new StreamWriter(navEntry.Open())) sw.Write(GenerateNav(chapterTree));
        manifestItems.Add(("nav", "nav.xhtml", mime: "application/xhtml+xml"));

        // Генерируем NCX контент и добавляем в manifestItems
        var ncxEntry = archive.CreateEntry("OEBPS/toc.ncx");
        using (var sw = new StreamWriter(ncxEntry.Open())) sw.Write(GenerateNcx(book, chapterTree, bookId));
        manifestItems.Add((id: "ncx", href: "toc.ncx", mime: "application/x-dtbncx+xml"));

        // Формирует OPF
        var opfEntry = archive.CreateEntry("OEBPS/content.opf");
        using (var sw = new StreamWriter(opfEntry.Open()))
            sw.Write(GenerateOpf(book, manifestItems, bookId));
        return;
    }

    private static string WrapInXhtml(string title, string body) =>
        $@"<?xml version=""1.0"" encoding=""utf-8""?>
    <html xmlns:xlink=""http://www.w3.org/1999/xlink"" xmlns:fb=""http://www.gribuser.ru/xml/fictionbook/2.0"" xmlns=""http://www.w3.org/1999/xhtml"">
    <head>
        <title>{WebUtility.HtmlEncode(title)}</title>
        <link rel=""stylesheet"" type=""text/css"" href=""style.css"" />
    </head>
    <body>
        <div class=""book"">
            {body}
        </div>
    </body></html>";

    private XDocument GenerateOpf(Fb2BookExport book, List<(string id, string href, string mime)> items, string id)
    {

        void AddPersons(XElement metadata, List<PersonInfo>? persons, string prefix, string role)
        {
            if (persons == null) return;

            for (int i = 0; i < persons.Count; i++)
            {
                string fn = persons[i].FirstName?.Trim() ?? "";
                string mn = persons[i].MiddleName?.Trim() ?? "";
                string ln = persons[i].LastName?.Trim() ?? "";

                string fullName = $"{fn} {ln}".Trim();

                // КРИТИЧНО: Если имени нет совсем, пропускаем итерацию
                if (string.IsNullOrWhiteSpace(fullName)) continue;

                string id = $"{prefix}{i}";

                // Исправленное формирование fileAs (Фамилия, Имя Отчество)
                string namePart = $"{fn} {mn}".Trim();
                string fileAs = string.IsNullOrWhiteSpace(ln)
                    ? namePart
                    : (string.IsNullOrWhiteSpace(namePart) ? ln : $"{ln}, {namePart}");

                // 1. Основной элемент
                metadata.Add(new XElement(_dc + "creator",
                    new XAttribute("id", id),
                    fullName));

                // 2. Роль
                metadata.Add(new XElement(_opf + "meta",
                    new XAttribute("refines", "#" + id),
                    new XAttribute("property", "role"),
                    new XAttribute("scheme", "marc:relators"),
                    role));

                // 3. Сортировка (file-as)
                if (!string.IsNullOrWhiteSpace(fileAs))
                {
                    metadata.Add(new XElement(_opf + "meta",
                        new XAttribute("refines", "#" + id),
                        new XAttribute("property", "file-as"),
                        fileAs));
                }
            }
        }

        var opf = new XElement(_opf + "package",
            new XAttribute("version", "3.0"),
            new XAttribute("unique-identifier", "pub-id"),
            new XAttribute("xmlns", _opf.NamespaceName));

        var info = book.Metadata.TitleInfo;
        var docInfo = book.Metadata.DocumentInfo;
        var title = info?.Title ?? "Untitled Book";

        var metadata = new XElement(_opf + "metadata",
             new XAttribute(XNamespace.Xmlns + "dc", _dc.NamespaceName),

             new XElement(_dc + "title", title),
             new XElement(_dc + "language", info?.Lang ?? "ru"),
             new XElement(_dc + "identifier", new XAttribute("id", "pub-id"), id),
             new XElement(_opf + "meta", new XAttribute("property", "dcterms:modified"), DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")),

             // Метаданные обложки для старых устройств
             new XElement(_opf + "meta", new XAttribute("name", "cover"), new XAttribute("content", "cover-img"))
         );
        // Авторы и переводчики
        AddPersons(metadata, info?.Authors, "aut", "aut");
        AddPersons(metadata, info?.Translators, "trs", "trs");

        // Жанры
        foreach (var genre in info?.Genres ?? [])
            metadata.Add(new XElement(_dc + "subject", genre));

        // Аннотация
        var annotation = "";
        foreach (var node in info?.Annotation?.Content ?? [])
        {
            annotation += TipTapToHtml.ToHtml(node);
        }
        if (!string.IsNullOrWhiteSpace(annotation))
        {
            metadata.Add(new XElement(_dc + "description", info?.Annotation));
        }
        opf.Add(metadata);

        // MANIFEST
        var manifest = new XElement(_opf + "manifest",
            // 1. Стили
            new XElement(_opf + "item",
                new XAttribute("id", "style"),
                new XAttribute("href", "style.css"),
                new XAttribute("media-type", "text/css")),

            // 2. Все файлы из списка (картинки, главы, навигация)
            items.Select(x =>
            {
                var item = new XElement(_opf + "item",
                    new XAttribute("id", x.id),
                    new XAttribute("href", x.href),
                    new XAttribute("media-type", x.mime));

                // Спец-свойства EPUB 3
                if (x.id == "nav") item.Add(new XAttribute("properties", "nav"));
                if (x.id == "cover-img") item.Add(new XAttribute("properties", "cover-image"));

                return item;
            })
        );
        opf.Add(manifest);

        // SPINE
        var spine = new XElement(_opf + "spine",
            new XAttribute("toc", "ncx"),

            // 1. Навигация (теперь без linear="no", чтобы не было ошибки валидации)
            items.Where(x => x.id == "nav")
                 .Select(x => new XElement(_opf + "itemref", new XAttribute("idref", x.id)))
                 .ToArray(),

            // 2. Все остальные XHTML страницы
            items.Where(x => x.href.EndsWith(".xhtml") && x.id != "nav")
                 .Select(x => new XElement(_opf + "itemref", new XAttribute("idref", x.id)))
                 .ToArray()
        );
        opf.Add(spine);

        return new XDocument(new XDeclaration("1.0", "utf-8", null), opf);
    }

    private static string GenerateNav(List<Chapter> chapters)
    {
        string RenderChapters(List<Chapter> items)
        {
            var html = items.Select(c =>
            {
                var li = $"<li><a href=\"{c.href}\">{WebUtility.HtmlEncode(c.title)}</a>";
                if (c.Children.Count != 0)
                {
                    li += $"\n<ol>\n{RenderChapters(c.Children)}\n</ol>\n";
                }
                li += "</li>";
                return li;
            });
            return string.Join("\n", html);
        }

        return $@"<!DOCTYPE html>
<html xmlns=""http://www.w3.org/1999/xhtml"" xmlns:epub=""http://www.idpf.org/2007/ops"">
<head><title>Table of Contents</title></head>
<body>
    <nav epub:type=""toc"" id=""toc"">
        <h1>Оглавление</h1>
        <ol>
            {RenderChapters(chapters)}
        </ol>
    </nav>
</body>
</html>";
    }
    private static string GenerateFootnotesHtml(string chapterHtml, Dictionary<string, TipTapDoc>? allFootnotes)
    {
        if (allFootnotes == null || allFootnotes.Count == 0) return "";

        var foundFootnotes = new StringBuilder();

        foreach (var note in allFootnotes)
        {
            // Проверяем, есть ли ссылка на эту сноску в текущем HTML главы
            if (chapterHtml.Contains($"href=\"#{note.Key}\""))
            {
                var noteContent = string.Join("", note.Value.Content?.Select(TipTapToHtml.ToHtml) ?? Array.Empty<string>());
                foundFootnotes.Append($@"
                <aside id=""{note.Key}"" epub:type=""footnote"">
                    {noteContent}
                </aside>");
            }
        }

        if (foundFootnotes.Length == 0) return "";

        return $@"<section class=""footnotes"" epub:type=""footnotes"">
                <hr/>
                {foundFootnotes}
              </section>";
    }

    private string ApplyDropCap(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return html;

        // Ищем начало первого параграфа
        int pIndex = html.IndexOf("<p>");
        if (pIndex == -1) return html;

        int textStart = pIndex + 3;
        if (textStart >= html.Length) return html;

        // Список возможных открывающих кавычек
        string quotes = "«\"'„";
        string firstChar = html[textStart].ToString();

        // Если первая — кавычка, пробуем захватить и следующий за ней символ
        if (quotes.Contains(firstChar) && textStart + 1 < html.Length)
        {
            string pair = html.Substring(textStart, 2);
            return html.Substring(0, textStart) +
                   $"<span class=\"dc\">{pair}</span>" +
                   html.Substring(textStart + 2);
        }

        // Если просто буква
        return html.Substring(0, textStart) +
               $"<span class=\"dc\">{firstChar}</span>" +
               html.Substring(textStart + 1);
    }

    private void ExtractImagesFromBook(Fb2BookExport book)
    {
        // 1. Ищем картинки в основном контенте
        if (book.Content.Content != null)
        {
            foreach (var node in book.Content.Content)
            {
                FindImageNodes(node);
            }
        }

        // 2. Ищем картинки в сносках
        if (book.Footnotes != null)
        {
            foreach (var note in book.Footnotes.Values)
            {
                if (note.Content != null)
                {
                    foreach (var node in note.Content)
                    {
                        FindImageNodes(node);
                    }
                }
            }
        }

        // 3. Добавляем обложку
        AddImage("cover", book.Metadata.TitleInfo?.CoverPage);
    }

    private void FindImageNodes(TipTapNode node)
    {
        // Если узел — картинка, извлекаем данные
        if ((node.Type == "fb2BlockImage" || node.Type == "fb2InlineImage") && node.Attrs != null)
        {
            // В TipTap данные обычно в 'src' (Base64) или в 'id'
            if (node.Attrs.TryGetValue("src", out var src) && src != null)
            {
                // Генерируем ID, если его нет в атрибутах
                if (!node.Attrs.TryGetValue("id", out var id) || id == null)
                {
                    id = Guid.NewGuid().ToString("N").Substring(0, 8);
                }
                AddImage(id, src);
            }
        }

        // Рекурсивно идем вглубь
        if (node.Content != null)
        {
            foreach (var child in node.Content)
            {
                FindImageNodes(child);
            }
        }
    }

    private void AddImage(string id, string? base64OrHeader)
    {

        if (string.IsNullOrEmpty(base64OrHeader)) return;

        // 2. Парсинг Data URL
        string base64Only;
        string contentType = "image/jpeg"; // Default

        if (base64OrHeader.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            int commaIndex = base64OrHeader.IndexOf(',');
            if (commaIndex == -1) return;

            string header = base64OrHeader[..commaIndex]; // data:image/png;base64
            base64Only = base64OrHeader[(commaIndex + 1)..];

            // Более надежное извлечение mime-type
            var match = System.Text.RegularExpressions.Regex.Match(header, @"data:([^;]+)");
            if (match.Success)
            {
                contentType = match.Groups[1].Value;
            }
        }
        else
        {
            base64Only = base64OrHeader;
        }
        // Очищаем base64 от мусора (переносы строк, пробелы)
        base64Only = base64Only.Trim();

        // 3. Запись в кэш
        _binaryCache.TryAdd(id, (base64Only, contentType));
    }

    private XDocument GenerateNcx(Fb2BookExport book, List<Chapter> chapters, string id)
    {
        int playOrder = 1;

        // Рекурсивная функция для создания navPoint
        IEnumerable<XElement> CreateNavPoints(List<Chapter> items)
        {
            foreach (var c in items)
            {
                var navPoint = new XElement(_daisy + "navPoint",
                    new XAttribute("id", c.id),
                    new XAttribute("playOrder", playOrder++),
                    new XElement(_daisy + "navLabel", new XElement(_daisy + "text", c.title)),
                    new XElement(_daisy + "content", new XAttribute("src", c.href))
                );

                if (c.Children.Count != 0)
                {
                    navPoint.Add(CreateNavPoints(c.Children));
                }

                yield return navPoint;
            }
        }

        var ncx = new XElement(_daisy + "ncx",
            new XAttribute("version", "2005-1"),
            new XElement(_daisy + "head",
                new XElement(_daisy + "meta", new XAttribute("name", "dtb:uid"), new XAttribute("content", id)),
                new XElement(_daisy + "meta", new XAttribute("name", "dtb:depth"), new XAttribute("content", "2")), // Увеличьте, если вложенность глубже
                new XElement(_daisy + "meta", new XAttribute("name", "dtb:totalPageCount"), new XAttribute("content", "0")),
                new XElement(_daisy + "meta", new XAttribute("name", "dtb:maxPageNumber"), new XAttribute("content", "0"))
            ),
            new XElement(_daisy + "docTitle", new XElement(_daisy + "text", book.Metadata.TitleInfo?.Title ?? "Untitled")),
            new XElement(_daisy + "navMap", CreateNavPoints(chapters))
        );

        return new XDocument(new XDeclaration("1.0", "utf-8", null), ncx);
    }

    public List<Chapter> MapTipTapToChapters(List<TipTapNode> nodes)
    {
        var chapters = new List<Chapter>();

        // Фильтруем только узлы-контейнеры (секции)
        foreach (var node in nodes.Where(n => n.Type == "fb2Section"))
        {
            // Вызываем поиск заголовка в дочерних узлах
            string title = GetTitleFromContent(node, _chapterCounter);

            string id = $"ch{_chapterCounter}";
            string href = $"chapter_{_chapterCounter}.xhtml";
            _chapterCounter++;

            var chapter = new Chapter(id, href, title, new List<Chapter>());

            // Рекурсия для вложенных секций
            if (node.Content != null)
            {
                chapter.Children.AddRange(MapTipTapToChapters(node.Content));
            }

            chapters.Add(chapter);
        }

        return chapters;
    }
    private string GetTitleFromContent(TipTapNode node, int fallbackIndex)
    {
        // 1. Ищем узел заголовка
        var headingNode = node.Content?.FirstOrDefault(n => n.Type == "fb2Title");

        if (headingNode != null)
        {
            // Выбираем весь текст из всех вложенных узлов любого уровня
            var text = ExtractAllText(headingNode);

            if (!string.IsNullOrWhiteSpace(text))
                return text.Trim();
        }

        // 2. Запасной вариант
        return $"Глава {fallbackIndex}";
    }

    // Вспомогательный метод для глубокого сбора текста
    private string ExtractAllText(TipTapNode node)
    {
        if (node == null) return "";

        // Если это текстовый узел — возвращаем текст
        if (node.Type == "text") return node.Text ?? "";

        // Если есть вложенные узлы — собираем текст из них рекурсивно
        if (node.Content != null && node.Content.Count > 0)
        {
            return string.Join("", node.Content.Select(ExtractAllText));
        }

        return "";
    }

    [System.Text.RegularExpressions.GeneratedRegex(@"data:([^;]+)")]
    private static partial System.Text.RegularExpressions.Regex MyRegex();
}
