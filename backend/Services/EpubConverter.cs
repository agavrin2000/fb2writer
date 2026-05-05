using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using FB2Writer.Models;
using System.Text.RegularExpressions;

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
            var bodyHtml = ToHtml(node);
            var finalHtml = WrapInXhtml(chapter.title, bodyHtml + GenerateFootnotesHtml(bodyHtml, book.Footnotes));

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

    private static string WrapInXhtml(string title, string body)
    {
        // Очищаем body от недопустимых управляющих символов
        string cleanBody = StripInvalidXmlChars(body);

        return $@"<?xml version=""1.0"" encoding=""utf-8""?>
<html xmlns=""http://www.w3.org/1999/xhtml"" xmlns:epub=""http://www.idpf.org/2007/ops"">
<head>
    <title>{WebUtility.HtmlEncode(title)}</title>
    <link rel=""stylesheet"" type=""text/css"" href=""style.css"" />
</head>
<body>
    <div class=""book"">
        {cleanBody}
    </div>
</body></html>";
    }

    /// <summary>
    /// Удаляет из строки все недопустимые символы, запрещённые в XML 1.0.
    /// </summary>
    /// <param name="text">Входная строка для обработки. Может быть <see langword="null"/> или пустой.</param>
    /// <returns>
    /// Строка, очищенная от недопустимых управляющих символов XML.
    /// Если входная строка <see langword="null"/> или пуста, возвращается исходное значение без изменений.
    /// </returns>
    /// <remarks>
    /// <para>
    /// Метод удаляет управляющие символы в диапазоне:
    /// <list type="bullet">
    ///   <item><description>0x00 – 0x08</description></item>
    ///   <item><description>0x0B – 0x0C</description></item>
    ///   <item><description>0x0E – 0x1F</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Символы табуляции (<c>\t</c>), перевода строки (<c>\n</c>) и возврата каретки (<c>\r</c>) сохраняются,
    /// так как они допустимы в XML.
    /// </para>
    /// <para>
    /// Использование регулярного выражения обеспечивает простоту и читаемость,
    /// но может быть менее производительным при обработке больших объёмов текста.
    /// В таких случаях рекомендуется использовать более оптимизированные алгоритмы на основе буферов.
    /// </para>
    /// <para>
    /// Пример использования:
    /// <code>
    /// string cleanText = StripInvalidXmlChars(dirtyText);
    /// </code>
    /// </para>
    /// </remarks>
    /// <example>
    /// <para>Пример входных и выходных данных:</para>
    /// <code>
    /// string input = "Привет\x00\x01\x0Bмир\n";
    /// string output = StripInvalidXmlChars(input);
    /// // Результат: "Приветмир\n"
    /// </code>
    /// </example>
    private static string StripInvalidXmlChars(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;

        // Регулярное выражение для поиска недопустимых символов XML 1.0
        // Убираем управляющие символы, кроме \t, \n, \r
        return Regex.Replace(text, @"[\x00-\x08\x0B\x0C\x0E-\x1F]", "");
    }

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
            annotation += ToHtml(node);
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

    /// <summary>
    /// Генерирует XHTML-файл навигации (nav.xhtml) для электронной книги в формате EPUB, содержащий структурированное оглавление.
    /// </summary>
    /// <param name="chapters">Список глав с иерархией (вложенными подглавами), из которого строится дерево навигации.</param>
    /// <returns>
    /// Строка в формате XHTML, соответствующая спецификации EPUB 3.0 для файла <c>nav.xhtml</c>.
    /// Содержит тег <c>&lt;nav epub:type="toc"&gt;</c>, заголовок "Оглавление" и вложенный список ссылок на главы.
    /// </returns>
    private static string GenerateNav(List<Chapter> chapters)
    {
        static string RenderChapters(List<Chapter> items)
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
                /*var noteContent = string.Join("", note.Value.Content?.Select(ToHtml()) ?? Array.Empty<string>());
                foundFootnotes.Append($@"
                <aside id=""{note.Key}"" epub:type=""footnote"">
                    {noteContent}
                </aside>");*/
            }
        }

        if (foundFootnotes.Length == 0) return "";

        return $@"<section class=""footnotes"" epub:type=""footnotes"">
                <hr/>
                {foundFootnotes}
              </section>";
    }

    private static string ApplyDropCap(string html)
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
            return string.Concat(html.AsSpan(0, textStart), $"<span class=\"dc\">{pair}</span>", html.AsSpan(textStart + 2));
        }

        // Если просто буква
        return string.Concat(html.AsSpan(0, textStart), $"<span class=\"dc\">{firstChar}</span>", html.AsSpan(textStart + 1));
    }

    /// ОБРАБОТКА КАРТИНОК

    /// <summary>
    /// Извлекает все изображения из книги в формате FB2 и добавляет их в общий кэш бинарных ресурсов (<see cref="F:_binaryCache"/>).
    /// Поиск выполняется в основном контенте, сносках и обложке.
    /// </summary>
    /// <param name="book">Объект книги формата FB2, содержащий структурированный контент, метаданные и сноски. Не должен быть <see langword="null"/>.</param>
    /// <remarks>
    /// <para>
    /// Метод выполняет три этапа:
    /// <list type="number">
    ///   <item><description>Рекурсивный поиск изображений в основном контенте книги через метод <see cref="M:FindImageNodes(TipTapNode)"/>.</description></item>
    ///   <item><description>Аналогичный поиск в содержимом всех сносок (если они есть).</description></item>
    ///   <item><description>Добавление изображения обложки (если указано в метаданных) под ключом <c>"cover"</c>.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Особенности реализации:
    /// <list type="bullet">
    ///   <item><description>Использует поле <see cref="F:_binaryCache"/> класса для хранения найденных изображений. Это означает, что состояние накапливается между вызовами.</description></item>
    ///   <item><description>Метод <b>не очищает</b> <see cref="F:_binaryCache"/> перед началом — предполагается, что кэш пуст или обработка происходит в рамках одного потока.</description></item>
    ///   <item><description>Вызов <see cref="M:AddImage(System.String, BinaryData)"/> гарантирует корректное добавление с проверкой на <see langword="null"/>.</description></item>
    ///   <item><description>Не выбрасывает исключения при отсутствии данных — безопасен к <see langword="null"/> на всех уровнях вложенности.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Потокобезопасность: метод <b>не является потокобезопасным</b>, так как модифицирует общее состояние (<see cref="F:_binaryCache"/>). Должен вызываться в однопоточном контексте.
    /// </para>
    /// <para>
    /// Производительность: сложность зависит от объёма контента и количества сносок. Использование рекурсивного обхода (<see cref="M:FindImageNodes(TipTapNode)"/>) эффективно для типичной структуры FB2.
    /// </para>
    /// </remarks>
    /// <example>
    /// <para>Пример вызова:</para>
    /// <code>
    /// _binaryCache.Clear(); // Рекомендуется очистить перед вызовом
    /// ExtractImagesFromBook(book);
    /// // После выполнения все изображения доступны в _binaryCache
    /// </code>
    /// </example>
    /// <seealso cref="M:FindImageNodes(TipTapNode)"/>
    /// <seealso cref="M:AddImage(System.String, BinaryData)"/>
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

    /// <summary>
    /// Рекурсивно обходит дерево узлов TipTap в поиске изображений и добавляет найденные ресурсы в общий кэш бинарных данных.
    /// Поддерживает как блочные (<c>fb2BlockImage</c>), так и строчные (<c>fb2InlineImage</c>) изображения.
    /// </summary>
    /// <param name="node">Текущий узел дерева TipTap для анализа. Не должен быть <see langword="null"/>.</param>
    /// <remarks>
    /// <para>
    /// Метод выполняет следующие действия:
    /// <list type="number">
    ///   <item><description>Проверяет, является ли текущий узел изображением по его типу.</description></item>
    ///   <item><description>Если да — извлекает Base64-данные из атрибута <c>src</c> и уникальный идентификатор из <c>id</c>. При отсутствии <c>id</c> генерирует его автоматически.</description></item>
    ///   <item><description>Добавляет изображение в общий кэш с помощью метода <see cref="M:AddImage(System.String, System.Object)"/>.</description></item>
    ///   <item><description>Если узел не является изображением, но содержит дочерние узлы — рекурсивно обрабатывает каждый из них.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Особенности реализации:
    /// <list type="bullet">
    ///   <item><description>Использует поле <see cref="F:_binaryCache"/> класса для хранения изображений. Это означает, что состояние накапливается между вызовами.</description></item>
    ///   <item><description>Метод <b>не очищает</b> кэш перед началом — предполагается, что он пуст или обработка происходит в рамках одного потока.</description></item>
    ///   <item><description>Гарантирует уникальность ключей: при отсутствии <c>id</c> генерируется случайный 8-символьный идентификатор на основе GUID.</description></item>
    ///   <item><description>Безопасен к <see langword="null"/> значениям: проверяет наличие <c>Attrs</c>, <c>src</c> и <c>id</c> перед использованием.</description></item>
    ///   <item><description>Не обрабатывает вложенные изображения повторно — структура FB2 исключает их наличие внутри <c>fb2Image</c>.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Потокобезопасность: метод <b>не является потокобезопасным</b>, так как модифицирует общее состояние (<see cref="F:_binaryCache"/>). Должен вызываться в однопоточном контексте.
    /// </para>
    /// <para>
    /// Производительность: сложность O(n), где n — количество узлов. Использование рекурсии безопасно при типичной глубине вложенности FB2-документов.
    /// </para>
    /// </remarks>
    /// <example>
    /// <para>Пример узла изображения:</para>
    /// <code>
    /// {
    ///   "type": "fb2BlockImage",
    ///   "attrs": {
    ///     "id": "img123",
    ///     "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE..."
    ///   }
    /// }
    /// </code>
    /// <para>После вызова <c>FindImageNodes(node)</c> изображение будет добавлено в <see cref="F:_binaryCache"/> под ключом <c>"img123"</c>.</para>
    /// </example>
    /// <seealso cref="M:AddImage(System.String, System.Object)"/>
    /// <seealso cref="M:ExtractImagesFromBook(Fb2BookExport)"/>
    private void FindImageNodes(TipTapNode node)
    {
        // Если узел — картинка, извлекаем данные
        if ((node.Type == "fb2BlockImage" || node.Type == "fb2InlineImage") && node.Attrs != null)
        {
            // В TipTap данные обычно в 'src' (Base64) или в 'id'
            if (node.Attrs.TryGetValue("src", out var src) && src != null)
            {
                // Генерируем ID, если его нет в атрибутах
                if (!node.Attrs.TryGetValue("href", out string? id) || id == null)
                {
                    id = Guid.NewGuid().ToString("N")[..8];
                }
                else
                {
                    id = id[1..];
                }
                AddImage(id, src);
            }
            return;
        }

        // Если - не картинка, рекурсивно идем вглубь
        if (node.Content != null)
        {
            foreach (var child in node.Content)
            {
                FindImageNodes(child);
            }
        }
    }

    /// <summary>
    /// Добавляет изображение в общий кэш бинарных ресурсов на основе его идентификатора и строки Base64 (возможно, в формате Data URL).
    /// Метод извлекает MIME-тип и чистые Base64-данные, затем сохраняет их в <see cref="F:_binaryCache"/>.
    /// </summary>
    /// <param name="id">Уникальный идентификатор изображения. Используется как ключ в кэше. Не должен быть <see langword="null"/> или пустым.</param>
    /// <param name="base64OrHeader">Строка, содержащая либо чистые Base64-данные, либо Data URL вида <c>data:image/png;base64,...</c>. Может быть <see langword="null"/>.</param>
    /// <remarks>
    /// <para>
    /// Метод выполняет следующие шаги:
    /// <list type="number">
    ///   <item><description>Проверяет, что входная строка не пустая — если пустая, метод завершается без изменений.</description></item>
    ///   <item><description>Определяет, является ли строка Data URL (начинается с <c>data:</c>).</description></item>
    ///   <item><description>Если да — разбирает заголовок для извлечения MIME-типа с помощью регулярного выражения <see cref="M:MyRegex1()"/> и выделяет чистую Base64-часть после запятой.</description></item>
    ///   <item><description>Если нет — вся строка считается Base64-данными, используется MIME-тип по умолчанию <c>image/jpeg</c>.</description></item>
    ///   <item><description>Обрезает пробелы и переносы строк из Base64-строки.</description></item>
    ///   <item><description>Добавляет кортеж (<paramref name="base64Only"/>, <paramref name="contentType"/>) в <see cref="F:_binaryCache"/> с ключом <paramref name="id"/> только если такой ключ ещё не существует (<see cref="M:System.Collections.Concurrent.ConcurrentDictionary`2.TryAdd(`0,`1)"/>).</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Особенности реализации:
    /// <list type="bullet">
    ///   <item><description>Использует потокобезопасный <see cref="F:_binaryCache"/> (<see cref="T:System.Collections.Concurrent.ConcurrentDictionary`2"/>), что позволяет безопасно вызывать метод из нескольких потоков.</description></item>
    ///   <item><description>Поддерживает все стандартные форматы Data URL, включая варианты с кодировкой <c>;base64</c> и без неё.</description></item>
    ///   <item><description>По умолчанию устанавливает <c>image/jpeg</c> — разумный выбор для совместимости, но может быть недостаточно точно для PNG/GIF.</description></item>
    ///   <item><description>Регулярное выражение <see cref="M:MyRegex1()"/> должно корректно извлекать тип из строки вида <c>data:image/png;base64</c>.</description></item>
    ///   <item><description>Метод игнорирует дубликаты: если изображение с таким <paramref name="id"/> уже есть — оно не перезаписывается.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Безопасность: метод защищён от <see langword="null"/> и повреждённых строк. Не выбрасывает исключения при некорректном формате.
    /// </para>
    /// <para>
    /// Производительность: минимальные аллокации, быстрая проверка через <c>StartsWith</c>, эффективное разделение строки с использованием индексов.
    /// </para>
    /// </remarks>
    /// <example>
    /// <para>Примеры вызовов:</para>
    /// <code>
    /// AddImage("cover", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==");
    /// AddImage("img1", "iVBORw0KGgoAAAANSUhEUg=="); // без заголовка
    /// </code>
    /// <para>После выполнения кэш будет содержать записи с правильным MIME-типом и очищенной Base64-строкой.</para>
    /// </example>
    /// <seealso cref="M:FindImageNodes(TipTapNode)"/>
    /// <seealso cref="M:ExtractImagesFromBook(Fb2BookExport)"/>
    private void AddImage(string id, string? base64OrHeader)
    {
        if (string.IsNullOrWhiteSpace(base64OrHeader)) return;

        string base64Only;
        string contentType = "image/jpeg";

        if (base64OrHeader.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            int commaIndex = base64OrHeader.IndexOf(',');
            if (commaIndex == -1) return;

            string header = base64OrHeader[..commaIndex];
            base64Only = base64OrHeader[(commaIndex + 1)..];

            // Используем ПРАВИЛЬНЫЙ метод для MIME-типа (тот, что с регуляркой data:([^;]+))
            var match = MyRegex().Match(header);
            if (match.Success)
            {
                contentType = match.Groups[1].Value;
            }
        }
        else
        {
            base64Only = base64OrHeader;
        }

        // Удаляем ВСЕ пробельные символы (пробелы, табы, переносы) внутри строки
        base64Only = Regex.Replace(base64Only, @"\s+", "");

        // Проверка на валидность Base64 (опционально, но полезно)
        if (base64Only.Length % 4 != 0)
        {
            // Лог: некорректная длина base64
        }

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

    /// ФОРМИРОВАНИЕ ИЕРАРХИЧЕСКОЙ СТРУКТУРЫ ГЛАВ

    /// <summary>
    /// Преобразует плоский список узлов TipTap в иерархическую структуру глав книги, рекурсивно обрабатывая вложенные секции.
    /// </summary>
    /// <param name="nodes">Список узлов формата TipTap, представляющих содержимое документа. Не должен быть <see langword="null"/>, но может быть пустым.</param>
    /// <returns>
    /// Список объектов типа <see cref="T:Chapter"/>, представляющих корневые главы с построенной иерархией вложенных подглав.
    /// Если ни один узел типа <c>fb2Section</c> не найден — возвращается пустой список.
    /// </returns>
    /// <remarks>
    /// <para>
    /// Метод выполняет следующие действия:
    /// <list type="number">
    ///   <item><description>Фильтрует входной массив, оставляя только узлы с типом <c>"fb2Section"</c>.</description></item>
    ///   <item><description>Для каждой секции извлекает заголовок с помощью <see cref="M:GetTitleFromContent(TipTapNode)"/>.</description></item>
    ///   <item><description>Генерирует уникальные идентификатор и имя файла XHTML на основе счётчика <see cref="F:_chapterCounter"/>.</description></item>
    ///   <item><description>Рекурсивно обрабатывает дочерние узлы секции для построения вложенной структуры глав.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Особенности реализации:
    /// <list type="bullet">
    ///   <item><description>Использует поле <see cref="F:_chapterCounter"/> класса для генерации уникальных ID и имён файлов. Это состояние сохраняется между вызовами метода.</description></item>
    ///   <item><description>Метод <b>не является потокобезопасным</b>, так как модифицирует общее состояние (<see cref="F:_chapterCounter"/>).</description></item>
    ///   <item><description>При отсутствии узлов <c>fb2Section</c> возвращает пустой список без выброса исключений.</description></item>
    ///   <item><description>Не проверяет циклические ссылки, но при нормальной структуре TipTap они невозможны.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Предусловия:
    /// <list type="bullet">
    ///   <item><description>Поле <see cref="F:_chapterCounter"/> должно быть инициализировано до вызова (например, в начале конвертации).</description></item>
    ///   <item><description>Входной параметр <paramref name="nodes"/> не должен быть <see langword="null"/>; если возможен <see langword="null"/>, следует добавить проверку.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Производительность: сложность O(n), где n — общее количество узлов. Использование рекурсии безопасно при глубине вложенности, типичной для FB2/EPUB.
    /// </para>
    /// </remarks>
    /// <example>
    /// <para>Пример использования:</para>
    /// <code>
    /// _chapterCounter = 1;
    /// var chapterTree = MapTipTapToChapters(rootNodes);
    /// </code>
    /// <para>Если <c>rootNodes</c> содержит две секции, одна из которых имеет вложенную, результат будет примерно таким:</para>
    /// <code>
    /// [
    ///   new Chapter("ch1", "chapter_1.xhtml", "Глава 1", []),
    ///   new Chapter("ch2", "chapter_2.xhtml", "Глава 2", 
    ///     new List&lt;Chapter&gt; { 
    ///       new Chapter("ch3", "chapter_3.xhtml", "Подраздел", []) 
    ///     })
    /// ]
    /// </code>
    /// </example>
    public List<Chapter> MapTipTapToChapters(List<TipTapNode> nodes)
    {
        List<Chapter> chapters = [];    // Список для итоговых глав

        // Фильтруем только узлы-контейнеры (секции)
        foreach (var node in nodes.Where(n => n.Type == "fb2Section"))
        {
            // Вызываем поиск заголовка в дочерних узлах
            string title = GetTitleFromContent(node);

            string id = $"ch{_chapterCounter}";
            string href = $"chapter_{_chapterCounter}.xhtml";
            _chapterCounter++;

            var chapter = new Chapter(id, href, title, []);

            // Рекурсия для вложенных секций
            if (node.Content != null)
            {
                chapter.Children.AddRange(MapTipTapToChapters(node.Content));
            }

            chapters.Add(chapter);
        }

        return chapters;
    }

    /// <summary>
    /// Извлекает текст заголовка из указанного узла TipTap, просматривая его содержимое в поиске элемента типа <c>fb2Title</c>.
    /// </summary>
    /// <param name="node">Узел TipTap, содержащий структуру документа. Может быть <see langword="null"/> или иметь пустое содержимое.</param>
    /// <returns>
    /// Строка с текстом заголовка, если он найден и не является пустым; иначе возвращается строка "Без названия".
    /// Возвращаемое значение всегда обрезается от пробелов в начале и конце (<see cref="M:System.String.Trim"/>).
    /// </returns>
    /// <remarks>
    /// <para>
    /// Метод выполняет следующие шаги:
    /// <list type="number">
    ///   <item><description>Ищет первый дочерний узел с типом <c>"fb2Title"</c>.</description></item>
    ///   <item><description>Если такой узел найден — рекурсивно извлекает весь текст из его поддерева с помощью <see cref="M:ExtractAllText(TipTapNode)"/>.</description></item>
    ///   <item><description>Проверяет, что извлечённый текст не пустой и не состоит только из пробельных символов.</description></item>
    ///   <item><description>Возвращает очищенный заголовок или значение по умолчанию.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Особенности:
    /// <list type="bullet">
    ///   <item><description>Метод безопасен к <see langword="null"/> значениям: не выбрасывает исключения при отсутствии содержимого.</description></item>
    ///   <item><description>Поддерживает сложные структуры внутри <c>fb2Title</c> (например, форматирование, ссылки), так как использует <see cref="M:ExtractAllText(TipTapNode)"/> для полного извлечения текста.</description></item>
    ///   <item><description>Не чувствителен к порядку узлов — возвращает только первый найденный <c>fb2Title</c>.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Замечание: если требуется обработка нескольких заголовков или более строгая валидация, следует расширить логику.
    /// </para>
    /// </remarks>
    /// <example>
    /// <para>Пример входного узла:</para>
    /// <code>
    /// {
    ///   "type": "fb2Section",
    ///   "content": [
    ///     {
    ///       "type": "fb2Title",
    ///       "content": [
    ///         { "type": "text", "text": "Глава 1" },
    ///         { "type": "text", "text": ": Введение" }
    ///       ]
    ///     }
    ///   ]
    /// }
    /// </code>
    /// <para>Результат вызова:</para>
    /// <code>
    /// string title = GetTitleFromContent(node);
    /// // Результат: "Глава 1: Введение"
    /// </code>
    /// </example>
    private string GetTitleFromContent(TipTapNode node)
    {
        // 1. Ищем узел заголовка
        var headingNode = node.Content?.FirstOrDefault(n => n.Type == "fb2Title");

        if (headingNode != null)
        {
            // Выбираем весь текст из всех вложенных узлов любого уровня
            var title = ExtractAllText(headingNode);

            if (!string.IsNullOrWhiteSpace(title))
                return title.Trim();
        }

        return "Без названия";
    }

    /// <summary>
    /// Рекурсивно извлекает весь текстовый контент из указанного узла TipTap и его дочерних элементов.
    /// </summary>
    /// <param name="node">Узел TipTap, из которого необходимо извлечь текст. Может быть <see langword="null"/>.</param>
    /// <returns>
    /// Строка, содержащая объединённый текст всех текстовых узлов в дереве начиная с указанного узла.
    /// Если узел <see langword="null"/>, отсутствует текстовое содержимое или все узлы пусты — возвращается пустая строка.
    /// </returns>
    private string ExtractAllText(TipTapNode? node)
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

    public string ToHtml(TipTapNode node, bool isInsideTitle = false)
    {
        if (node == null) return "";

        if (node.Type == "text")
        {
            var text = WebUtility.HtmlEncode(node.Text ?? "");
            if (node.Marks != null)
            {
                foreach (var mark in node.Marks)
                {
                    text = mark.Type switch
                    {
                        "bold" => $"<strong>{text}</strong>",
                        "italic" => $"<em>{text}</em>",
                        "strike" => $"<del>{text}</del>", // Более современно для XHTML
                        "superscript" => $"<sup>{text}</sup>",
                        "subscript" => $"<sub>{text}</sub>",
                        "link" => BuildLink(mark, text),
                        "fb2InlineImage" => node.Attrs?.TryGetValue("id", out var idI) == true
                            ? $"<img class=\"inline-image\" src=\"images/{idI}.jpg\" alt=\"\" />"
                            : "",
                        _ => text
                    };
                }
            }
            return text;
        }

        // Рекурсивно вызываем ToHtml. 
        // Если текущий узел — это заголовок, передаем true всем его детям.
        bool childrenShouldBeHeaders = isInsideTitle || node.Type == "fb2Title";
        var childrenHtml = string.Join("", (node.Content ?? [])
            .Select(child => ToHtml(child)));

        return node.Type switch
        {
            "paragraph" => isInsideTitle
                       ? childrenHtml
                       : (string.IsNullOrWhiteSpace(childrenHtml) ? "" : $"<p>{childrenHtml}</p>"),
            "fb2Title" => $"<h1>{childrenHtml}</h1>", // Упростил, обычно в EPUB h1-h2
            "fb2Subtitle" => $"<p class=\"subtitle\">{childrenHtml}</p>",
            "fb2Epigraph" => $"<div class=\"epigraph\">{childrenHtml}</div>",
            "fb2Cite" => $"<blockquote class=\"cite\">{childrenHtml}</blockquote>",
            "fb2Poem" => $"<div class=\"poem\">{childrenHtml}</div>",
            "fb2Stanza" => $"<div class=\"stanza\">{childrenHtml}</div>",
            "fb2V" => $"<p class=\"v\">{childrenHtml}</p>",
            "fb2TextAuthor" => $"<p class=\"text-author\">{childrenHtml}</p>",

            // Блочное изображение
            "fb2BlockImage" => HandleBlockImage(node),
            "fb2Section" => $"<section>{childrenHtml}</section>",
            _ => childrenHtml
        };
    }

    private string HandleBlockImage(TipTapNode node)
    {
        if (node.Attrs?.TryGetValue("href", out string? idB) == true && idB?.StartsWith('#') == true)
        {
            var cleanId = idB[1..];
            // Безопасное получение расширения из вашего кэша
            string ext = "jpg";
            if (_binaryCache.TryGetValue(cleanId, out var cachedData))
            {
                ext = cachedData.ContentType switch
                {
                    "image/png" => "png",
                    "image/gif" => "gif",
                    _ => "jpg"
                };
            }
            return $"<div class=\"image\"><img src=\"images/{cleanId}.{ext}\" alt=\"\" /></div>";
        }
        return "";
    }

    private static string BuildLink(TipTapMark mark, string text)
    {
        if (mark.Attrs?.TryGetValue("href", out var h) == true && h is string hrefStr)
        {
            string encodedHref = WebUtility.HtmlEncode(hrefStr);
            if (hrefStr.StartsWith('#'))
            {
                return $"<a epub:type=\"noteref\" href=\"{encodedHref}\">{text}</a>";
            }
            return $"<a href=\"{encodedHref}\">{text}</a>";
        }
        return text;
    }


    [System.Text.RegularExpressions.GeneratedRegex(@"data:([^;]+)")]
    private static partial System.Text.RegularExpressions.Regex MyRegex();
    [GeneratedRegex(@"data:([^;]+)")]
    private static partial Regex MyRegex1();
}
