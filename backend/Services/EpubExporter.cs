using System.IO.Compression;
using System.Net;
using System.Text;
using System.Xml.Linq;
using FB2Writer.Models;

namespace FB2Writer.Services;

/*https://github.com/fb2kindle/fb2kindle/*/

public class EpubExporter
{
    private readonly XNamespace _dc = "http://purl.org";
    private readonly XNamespace _opf = "http://idpf.org";

    public async Task<byte[]> ExportAsync(Fb2BookExport book)
    {
        using var ms = new MemoryStream();
        // Используем LeaveOpen: true, чтобы MemoryStream не закрылся раньше времени
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
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
                sw.Write(@"
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
                span.dc2{text-shadow:1px 1px #505050;}");
            }

            var manifestItems = new List<(string id, string href, string mime)>();
            var navItems = new List<(string id, string href, string title)>();

            // 2. ОБРАБОТКА ВСЕХ КАРТИН (включая обложку)
            // Допустим, у вас есть Dictionary<string, string> Images в book, где Key - id, Value - Base64
            // Если картинки лежат в другом месте, адаптируйте этот блок:
            var allImages = ExtractImagesFromBook(book); // Метод для сбора всех Base64 из данных

            foreach (var img in allImages)
            {
                try
                {
                    // Определяем формат ДО очистки строки
                    var (ext, mime) = GetImageInfo(img.Value);

                    // Очищаем и декодируем
                    string base64Pure = img.Value.Contains(",") ? img.Value.Split(',')[1] : img.Value;
                    byte[] imageBytes = Convert.FromBase64String(base64Pure);

                    var imgHref = $"images/{img.Key}.{ext}";
                    var entry = archive.CreateEntry($"OEBPS/{imgHref}");
                    using (var os = entry.Open())
                    {
                        os.Write(imageBytes, 0, imageBytes.Length);
                    }

                    // ВАЖНО: передаем mime-type в манифест
                    bool isCover = img.Key == book.Metadata.TitleInfo?.CoverPage;
                    manifestItems.Add((
                        id: isCover ? "cover-img" : $"img_{img.Key}",
                        href: imgHref,
                        mime: mime // Сохраните это значение для GenerateOpf
                    ));
                }
                catch { /* Пропустить битую картинку */ }
            }

            var sections = book.Content.Content ?? new();
            for (int i = 0; i < sections.Count; i++)
            {
                var fileName = $"chapter_{i}.xhtml";
                var bodyHtml = TipTapToHtml.ToHtml(sections[i]);
                var finalHtml = WrapInXhtml($"Глава {i + 1}", ApplyDropCap(bodyHtml) + GenerateFootnotesHtml(bodyHtml, book.Footnotes));

                var entry = archive.CreateEntry($"OEBPS/{fileName}");
                using (var sw = new StreamWriter(entry.Open())) sw.Write(finalHtml);

                manifestItems.Add(($"ch_{i}", fileName, mime: "application/xhtml+xml"));
                navItems.Add(($"ch_{i}", fileName, $"Глава {i + 1}"));
            }

            // 4. НАВИГАЦИЯ И OPF
            archive.CreateEntry("OEBPS/nav.xhtml"); // + запись контента через GenerateNav
            manifestItems.Add(("nav", "nav.xhtml", mime: "application/xhtml+xml"));

            // 1. Генерируем NCX контент
            var ncxContent = GenerateNcx(book, navItems);
            var ncxEntry = archive.CreateEntry("OEBPS/toc.ncx");
            using (var sw = new StreamWriter(ncxEntry.Open())) sw.Write(ncxContent);

            // 2. Добавляем в manifestItems
            manifestItems.Add((id: "ncx", href: "toc.ncx", mime: "application/x-dtbncx+xml"));

            var opfEntry = archive.CreateEntry("OEBPS/content.opf");
            using (var sw = new StreamWriter(opfEntry.Open()))
                sw.Write(GenerateOpf(book, manifestItems, book.Metadata.TitleInfo?.CoverPage != null ? "images/cover.jpg" : null));
        }
        return ms.ToArray();
    }

    private string WrapInXhtml(string title, string body) =>
        $@"<?xml version=""1.0"" encoding=""utf-8""?>
    <html xmlns=""http://w3.org"" xmlns:epub=""http://idpf.org"">
    <head>
        <title>{WebUtility.HtmlEncode(title)}</title>
        <link rel=""stylesheet"" type=""text/css"" href=""style.css"" />
    </head>
    <body>
        <div class=""book"">
            {body}
        </div>
    </body></html>";

    private string GenerateOpf(Fb2BookExport book, List<(string id, string href, string mime)> items, string? coverFileName)
    {
        var info = book.Metadata.TitleInfo;
        var docInfo = book.Metadata.DocumentInfo;

        var authorsList = info?.Authors?.Select(a => $"{a.FirstName} {a.LastName}".Trim())
                          ?? new[] { "Unknown Author" };
        var authors = string.Join(", ", authorsList.Where(s => !string.IsNullOrEmpty(s)));

        var opf = new XElement(_opf + "package",
            new XAttribute("version", "3.0"),
            new XAttribute("unique-identifier", "pub-id"),
            new XAttribute("xmlns", _opf.NamespaceName),

            new XElement(_opf + "metadata",
                new XAttribute(XNamespace.Xmlns + "dc", _dc.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "opf", _opf.NamespaceName),

                new XElement(_dc + "title", info?.Title ?? "Untitled Book"),
                new XElement(_dc + "language", info?.Lang ?? "ru"),
                new XElement(_dc + "creator", new XAttribute("id", "creator"), authors),
                new XElement(_dc + "identifier", new XAttribute("id", "pub-id"), docInfo?.Id ?? Guid.NewGuid().ToString()),
                new XElement(_opf + "meta", new XAttribute("property", "dcterms:modified"), DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")),

                // Метаданные обложки для старых устройств
                coverFileName != null ? new XElement(_opf + "meta", new XAttribute("name", "cover"), new XAttribute("content", "cover-img")) : null
            ),

            new XElement(_opf + "manifest",
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
            ),
                new XElement(_opf + "spine",
                    new XAttribute("toc", "ncx"), // Указываем ID файла NCX из манифеста
                    items.Where(x => x.href.EndsWith(".xhtml")).Select(x => new XElement(_opf + "itemref", new XAttribute("idref", x.id))))
        );

        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" + opf.ToString();
    }
    private string GenerateNav(List<(string id, string href, string title)> chapters)
    {
        var listItems = string.Join("\n", chapters.Select(c =>
            $"<li><a href=\"{c.href}\">{WebUtility.HtmlEncode(c.title)}</a></li>"));

        return $@"<?xml version=""1.0"" encoding=""utf-8""?>
                    <html xmlns=""http://w3.org"" xmlns:epub=""http://idpf.org"">
                    <head><title>Table of Contents</title></head>
                    <body>
                        <nav epub:type=""toc"" id=""toc"">
                            <h1>Оглавление</h1>
                            <ol>
                                {listItems}
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

    private Dictionary<string, string> ExtractImagesFromBook(Fb2BookExport book)
    {
        var images = new Dictionary<string, string>();

        // 1. Ищем картинки в основном контенте
        if (book.Content.Content != null)
        {
            foreach (var node in book.Content.Content)
            {
                FindImageNodes(node, images);
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
                        FindImageNodes(node, images);
                    }
                }
            }
        }

        return images;
    }

    private void FindImageNodes(TipTapNode node, Dictionary<string, string> images)
    {
        // Если узел — картинка, извлекаем данные
        if (node.Type == "image" && node.Attrs != null)
        {
            // В TipTap данные обычно в 'src' (Base64) или в 'id'
            if (node.Attrs.TryGetValue("src", out var src) && src != null)
            {
                // Генерируем ID, если его нет в атрибутах
                if (!node.Attrs.TryGetValue("id", out var id) || id == null)
                {
                    id = Guid.NewGuid().ToString("N").Substring(0, 8);
                }

                if (!images.ContainsKey(id))
                {
                    images.Add(id, src);
                }
            }
        }

        // Рекурсивно идем вглубь
        if (node.Content != null)
        {
            foreach (var child in node.Content)
            {
                FindImageNodes(child, images);
            }
        }
    }

    private (string ext, string mime) GetImageInfo(string base64OrHeader)
    {
        // 1. Проверка по префиксу data URI
        if (base64OrHeader.StartsWith("data:image/png", StringComparison.OrdinalIgnoreCase)) return ("png", "image/png");
        if (base64OrHeader.StartsWith("data:image/jpeg", StringComparison.OrdinalIgnoreCase)) return ("jpg", "image/jpeg");
        if (base64OrHeader.StartsWith("data:image/gif", StringComparison.OrdinalIgnoreCase)) return ("gif", "image/gif");
        if (base64OrHeader.StartsWith("data:image/webp", StringComparison.OrdinalIgnoreCase)) return ("webp", "image/webp");

        // 2. Если префикса нет, анализируем первые символы самой строки Base64
        // iVBOR... - PNG
        // /9j/4... - JPEG
        // R0lG... - GIF
        if (base64OrHeader.StartsWith("iVBOR")) return ("png", "image/png");
        if (base64OrHeader.StartsWith("/9j/4")) return ("jpg", "image/jpeg");
        if (base64OrHeader.StartsWith("R0lG")) return ("gif", "image/gif");
        if (base64OrHeader.StartsWith("UklG")) return ("webp", "image/webp");

        return ("jpg", "image/jpeg"); // По умолчанию
    }

    private string GenerateNcx(Fb2BookExport book, List<(string id, string href, string title)> chapters)
    {
        XNamespace ns = "http://daisy.org";
        var info = book.Metadata.TitleInfo;

        var navPoints = chapters.Select((c, index) =>
            new XElement(ns + "navPoint",
                new XAttribute("id", c.id),
                new XAttribute("playOrder", index + 1),
                new XElement(ns + "navLabel", new XElement(ns + "text", c.title)),
                new XElement(ns + "content", new XAttribute("src", c.href))
            )
        );

        var ncx = new XElement(ns + "ncx",
            new XAttribute("version", "2005-1"),
            new XElement(ns + "head",
                new XElement(ns + "meta", new XAttribute("name", "dtb:uid"), new XAttribute("content", book.Metadata.DocumentInfo?.Id ?? Guid.NewGuid().ToString())),
                new XElement(ns + "meta", new XAttribute("name", "dtb:depth"), new XAttribute("content", "1")),
                new XElement(ns + "meta", new XAttribute("name", "dtb:totalPageCount"), new XAttribute("content", "0")),
                new XElement(ns + "meta", new XAttribute("name", "dtb:maxPageNumber"), new XAttribute("content", "0"))
            ),
            new XElement(ns + "docTitle",
                new XElement(ns + "text", info?.Title ?? "Untitled")
            ),
            new XElement(ns + "navMap", navPoints)
        );

        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" + ncx.ToString();
    }

}
