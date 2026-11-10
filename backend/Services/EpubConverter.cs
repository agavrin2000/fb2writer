using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using FB2Writer.Models;
using System.Text.RegularExpressions;

namespace FB2Writer.Services;

/// <summary>
/// Представляет структуру главы книги с идентификатором, ссылкой, заголовком и вложенными подглавами.
/// Используется для построения иерархического оглавления в EPUB.
/// </summary>
/// <param name="id">Уникальный идентификатор главы (например, "ch1").</param>
/// <param name="href">Путь к файлу XHTML главы внутри EPUB-архива (например, "chapter_1.xhtml").</param>
/// <param name="title">Заголовок главы, отображаемый в оглавлении.</param>
/// <param name="Children">Список вложенных подглав. Может быть пустым, но не <see langword="null"/>.</param>
public record Chapter(
    string id,
    string href,
    string title,
    List<Chapter> Children
);
/// <summary>
/// Основной класс для конвертации книги из формата FB2 (в JSON-представлении) в стандарт EPUB 3.0.
/// Генерирует все необходимые файлы: контейнер, манифест, навигацию, стили и XHTML-страницы.
/// </summary>
public partial class EpubConverter
{
    /// <summary>
    /// Кэш для хранения бинарных данных изображений в формате Base64.
    /// Ключ — ID изображения (без #), значение — кортеж с Base64-строкой и MIME-типом.
    /// Используется регистронезависимое сравнение ключей.
    /// </summary>
    private readonly Dictionary<string, (string Base64, string ContentType)> _binaryCache = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Пространство имён Dublin Core, используемое для метаданных книги (автор, заголовок, язык).
    /// URI: http://purl.org/dc/elements/1.1/
    /// </summary>
    private readonly XNamespace _dc = "http://purl.org/dc/elements/1.1/";

    /// <summary>
    /// Пространство имён OPF (Open Packaging Format), используемое в основном пакетном файле EPUB.
    /// URI: http://www.idpf.org/2007/opf
    /// </summary>
    private readonly XNamespace _opf = "http://www.idpf.org/2007/opf";

    /// <summary>
    /// Пространство имён DAISY NCX, используемое для генерации устаревшего файла оглавления toc.ncx.
    /// URI: http://www.daisy.org/z3986/2005/ncx/
    /// </summary>
    private readonly XNamespace _daisy = "http://www.daisy.org/z3986/2005/ncx/";

    /// <summary>
    /// Счётчик глав, используемый для генерации уникальных идентификаторов и имён файлов.
    /// Должен сбрасываться перед обработкой новой книги.
    /// </summary>
    private int _chapterCounter = 1;

    /// <summary>
    /// Счётчик сносок, используемый для генерации уникальных ID ссылок на сноски.
    /// Должен сбрасываться в 0 в начале каждой главы.
    /// </summary>
    private int _footnoteCounter = 0; // Сбрасывайте в 0 в начале каждой главы!

    /// <summary>
    /// Встроенное CSS-оформление для всех страниц EPUB.
    /// Обеспечивает единообразное отображение текста, абзацев, цитат, стихов и других элементов.
    /// </summary>
    private readonly string style = """
            p {margin: 0;text-indent: 1.5em;text-align:justify;hyphens:auto;-webkit-hyphens:auto;}
            p.text-author {text-indent:0;font-style:italic;font-weight:bold;text-align:right;}
            div.text-author {text-indent:0;font-size:130%;font-weight:bold;}
            h1,h2,h3,h4,h5,h6 {text-align: center;page-break-after: avoid;page-break-inside: avoid;}
            div.image {text-indent:0;text-align:center;}
            body { margin: 0 2%; }
            .epigraph {margin-left: 25%;margin-top: 2em;margin-bottom: 2em;}
            .epigraph p {font-size: 0.9em;text-align: left; text-indent: 0;}
            .subtitle {font-style:italic;font-weight: bold;text-align:center; page-break-after: avoid;page-break-inside: avoid;margin-top: 1.5em;margin-left: auto;margin-right: auto; }
            .cite {font-style:italic;font-size:95%;}
            .poem {margin: 1em 10%; text-align:left;}
            .stanza {page-break-inside:avoid;margin:0.5em 0px;}
            .v {padding-left:1em;text-indent:-1em;margin:0px;text-align:left;}
            div.section {}
            sup{font-size: 60%;color:#555555;}
            .footnote-link { vertical-align: super; font-size: 0.8em; text-decoration: none; }
            .footnotes { font-size: 0.9em; color: #666;}
            """;

    /// <summary>
    /// Конвертирует книгу из JSON-представления в формат EPUB и записывает результат в выходной поток.
    /// Генерирует все необходимые файлы: mimetype, container.xml, content.opf, nav.xhtml, toc.ncx, XHTML-страницы, изображения и стили.
    /// </summary>
    /// <param name="outputStream">Выходной поток, в который будет записан ZIP-архив в формате EPUB. Должен быть доступен для записи.</param>
    /// <param name="jsonContent">JSON-элемент, содержащий структурированное представление книги в формате FB2. Не должен быть <see langword="null"/>.</param>
    /// <exception cref="System.Exception">Выбрасывается при невозможности десериализовать JSON в объект <see cref="T:FB2Writer.Models.Fb2BookExport"/>.</exception>
    public void ConvertJsonToEpub(Stream outputStream, JsonElement jsonContent)
    {
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

        // 2. ОБРАБОТКА ИЗОБРАЖЕНИЙ (включая обложку)
        ExtractImagesFromBook(book); // Метод для сбора всех Base64 из данных

        foreach (var img in _binaryCache)
        {
            try
            {
                // Определяем расширение
                var ext = img.Value.ContentType switch
                {
                    "image/jpeg" => "jpg",
                    "image/png" => "png",
                    "image/gif" => "gif",
                    _ => "jpg"
                };

                // Декодируем и записываем файлы с изображениями в архив
                byte[] imageBytes = Convert.FromBase64String(img.Value.Base64);
                var imgHref = $"images/{img.Key}.{ext}";
                var entry = archive.CreateEntry($"OEBPS/{imgHref}");
                using (var os = entry.Open())
                {
                    os.Write(imageBytes, 0, imageBytes.Length);
                    os.Flush();
                }

                // Добавляем в manifestItems
                bool isCover = img.Key == "cover";
                manifestItems.Add((
                    id: isCover ? "cover" : $"img_{img.Key}",
                    href: imgHref,
                    mime: img.Value.ContentType
                ));
                if (isCover)
                {
                    // Добавляем страницу с обложкой как файл в архив
                    var coverEntry = archive.CreateEntry($"OEBPS/titlepage.xhtml");
                    using (var sw = new StreamWriter(coverEntry.Open())) sw.Write(WrapInXhtml("Cover", $"<div><img src=\"{imgHref}\"/></div>"));

                    // Добавляем страницу с обложкой в manifestItems
                    manifestItems.Add(("titlepage", "titlepage.xhtml", "application/xhtml+xml"));
                }
            }
            catch { /* Пропустить битую картинку */ }
        }

        // Строим дерево навигации
        _chapterCounter = 1;
        var firstBody = book.Content.Content?.FirstOrDefault();
        var chapterTree = MapTipTapToChapters(firstBody?.Content ?? []);

        // 2. Плоский список для Манифеста/Spine
        var flatChapters = new List<Chapter>();

        // Рекурсивный метод для сохранения файлов
        void ProcessTipTapNode(Chapter chapter, TipTapNode node)
        {
            flatChapters.Add(chapter);

            // Конвертируем TipTap ноду в HTML (ваш существующий конвертер)
            _footnoteCounter = 0;
            var bodyHtml = ToHtml(node);
            var finalHtml = WrapInXhtml(chapter.title, bodyHtml + GenerateFootnotesHtml(bodyHtml, book.Footnotes));

            // Пишем в ZIP
            var entry = archive.CreateEntry($"OEBPS/{chapter.href}");
            using (var sw = new StreamWriter(entry.Open())) sw.Write(finalHtml);

            // Добавляем в manifestItems
            manifestItems.Add((chapter.id, chapter.href, "application/xhtml+xml"));

            // Идем вглубь по дереву, если есть дети
            if (node.Content != null && chapter.Children.Count != 0)
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

        // Генерация файлов навигации и добавление в manifestItems
        var navEntry = archive.CreateEntry("OEBPS/nav.xhtml"); // + запись контента через GenerateNav
        using (var sw = new StreamWriter(navEntry.Open())) sw.Write(GenerateNav(chapterTree));
        manifestItems.Add(("nav", "nav.xhtml", mime: "application/xhtml+xml"));

        // Генерируем NCX контент и добавление в manifestItems
        var ncxEntry = archive.CreateEntry("OEBPS/toc.ncx");
        using (var sw = new StreamWriter(ncxEntry.Open())) sw.Write(GenerateNcx(book, chapterTree, bookId));
        manifestItems.Add((id: "ncx", href: "toc.ncx", mime: "application/x-dtbncx+xml"));

        // Формируем OPF
        var opfEntry = archive.CreateEntry("OEBPS/content.opf");
        using (var sw = new StreamWriter(opfEntry.Open()))
            sw.Write(GenerateOpf(book, manifestItems, bookId));
        return;
    }

    /// <summary>
    /// Обёртывает заданный заголовок и HTML-содержимое в валидный XHTML-документ, пригодный для использования в EPUB.
    /// </summary>
    /// <param name="title">Заголовок страницы, который будет помещён в тег &lt;title&gt;. Должен быть не <see langword="null"/>.</param>
    /// <param name="body">HTML-содержимое тела страницы, которое будет вставлено внутрь контейнера &lt;div class="book"&gt;.</param>
    /// <returns>
    /// Строка, содержащая полный XHTML-документ с правильным объявлением XML, пространствами имён,
    /// подключением стилей и экранированным заголовком.
    /// </returns>
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

    /// <summary>
    /// Генерирует OPF-файл (Open Packaging Format) — основной метафайл EPUB, содержащий метаданные, список ресурсов и порядок чтения.
    /// </summary>
    /// <param name="book">Объект книги с полной информацией о содержимом и метаданных.</param>
    /// <param name="items">Список всех цифровых ресурсов (главы, изображения, CSS, навигация), включённых в книгу.</param>
    /// <param name="id">Уникальный идентификатор публикации (обычно GUID), используемый для <c>dc:identifier</c>.</param>
    /// <returns>
    /// Объект <see cref="T:System.Xml.Linq.XDocument"/>, представляющий собой валидный <c>content.opf</c>-файл,
    /// соответствующий спецификации EPUB 3.0.
    /// </returns>
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
             new XElement(_opf + "meta", new XAttribute("name", "cover"), new XAttribute("content", "cover.jpg"))
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
                if (x.id == "cover") item.Add(new XAttribute("properties", "cover-image"));

                return item;
            })
        );
        opf.Add(manifest);

        // SPINE
        var spine = new XElement(_opf + "spine",
            new XAttribute("toc", "ncx"),

            // 1. Навигация (теперь без linear="no", чтобы не было ошибки валидации)
            /*items.Where(x => x.id == "nav")
                 .Select(x => new XElement(_opf + "itemref", new XAttribute("idref", x.id)))
                 .ToArray(),
*/
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

    /// <summary>
    /// Рекурсивно вычисляет максимальную глубину вложенности глав в иерархической структуре оглавления.
    /// Глубина определяется как наибольшее количество уровней вложенности подразделов.
    /// </summary>
    /// <param name="items">Список глав, для которых необходимо вычислить максимальную глубину. Может быть <see langword="null"/> или пустым.</param>
    /// <returns>
    /// Целое число, представляющее максимальную глубину вложенности.
    /// Возвращает <c>0</c>, если список <paramref name="items"/> равен <see langword="null"/> или пуст;
    /// иначе возвращает положительное число, соответствующее количеству уровней (сама глава плюс её самые глубокие подразделы).
    /// </returns>
    private static int GetMaxDepth(List<Chapter> items)
    {
        if (items == null || items.Count == 0) return 0;

        int maxSubDepth = 0;
        foreach (var chapter in items)
        {
            int depth = GetMaxDepth(chapter.Children);
            if (depth > maxSubDepth) maxSubDepth = depth;
        }
        return 1 + maxSubDepth;
    }

    /// <summary>
    /// Генерирует XML-документ в формате NCX (Navigation Center eXtended) — устаревшее, но обязательное оглавление для совместимости с некоторыми читалками.
    /// </summary>
    /// <param name="book">Объект книги, содержащий метаданные (в частности, заголовок).</param>
    /// <param name="chapters">Иерархический список глав, на основе которого строится карта навигации.</param>
    /// <param name="id">Уникальный идентификатор книги (обычно GUID), используемый в метаданных <c>dtb:uid</c>.</param>
    /// <returns>
    /// Объект <see cref="T:System.Xml.Linq.XDocument"/>, представляющий собой валидный NCX-файл (<c>toc.ncx</c>),
    /// соответствующий спецификации DAISY 2005.
    /// </returns>
    /// <remarks>
    /// <para>
    /// Формат NCX используется в EPUB 2 и поддерживается многими устройствами для отображения оглавления.
    /// Хотя в EPUB 3 предпочтительнее использовать <c>nav.xhtml</c>, файл <c>toc.ncx</c> всё ещё требуется для совместимости.
    /// </para>
    private XDocument GenerateNcx(Fb2BookExport book, List<Chapter> chapters, string id)
    {
        int playOrder = 1;
        // Считаем глубину динамически
        int depth = GetMaxDepth(chapters);

        // Рекурсивная функция для создания navPoint (ваша без изменений)
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

                if (c.Children != null && c.Children.Count != 0)
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
                // Используем вычисленную переменную depth
                new XElement(_daisy + "meta", new XAttribute("name", "dtb:depth"), new XAttribute("content", depth.ToString())),
                new XElement(_daisy + "meta", new XAttribute("name", "dtb:totalPageCount"), new XAttribute("content", "0")),
                new XElement(_daisy + "meta", new XAttribute("name", "dtb:maxPageNumber"), new XAttribute("content", "0"))
            ),
            new XElement(_daisy + "docTitle", new XElement(_daisy + "text", book.Metadata.TitleInfo?.Title ?? "Untitled")),
            new XElement(_daisy + "navMap", CreateNavPoints(chapters))
        );

        return new XDocument(new XDeclaration("1.0", "utf-8", null), ncx);
    }

    /// <summary>
    /// Генерирует HTML-разметку для блока сносок в конце главы, включая двусторонние ссылки (вперёд и назад).
    /// Извлекает только те сноски, на которые есть ссылки в текущей главе.
    /// </summary>
    /// <param name="chapterHtml">HTML-содержимое главы, в котором ищутся ссылки на сноски (с атрибутом <c>epub:type="noteref"</c>).</param>
    /// <param name="allFootnotes">Словарь всех доступных сносок книги, где ключ — ID сноски (например, <c>note1</c>), значение — структура <see cref="T:TipTapDoc"/>.</param>
    /// <returns>
    /// Строка с HTML-кодом секции <c>&lt;section epub:type="footnotes"&gt;</c>, содержащей все найденные сноски.
    /// Если сносок нет или они не используются в главе, возвращается пустая строка.
    /// </returns>
    private string GenerateFootnotesHtml(string chapterHtml, Dictionary<string, TipTapDoc>? allFootnotes)
    {
        if (allFootnotes == null || allFootnotes.Count == 0) return "";

        // Оптимизация: собираем все упоминания сносок в главе один раз
        var matches = Regex.Matches(chapterHtml, @"epub:type=""noteref"" id=""(ref_([^""]+)_(\d+))""\s+href=""#([^""]+)""");

        if (matches.Count == 0) return "";

        var foundFootnotes = new StringBuilder();
        var processedNotes = new HashSet<string>();

        foreach (Match m in matches)
        {
            string backlinkId = m.Groups[1].Value; // ref_note1_1
            string noteId = m.Groups[4].Value;     // note1

            if (allFootnotes.TryGetValue(noteId, out var noteDoc))
            {
                var noteContent = string.Join("", (noteDoc.Content ?? [])
                    .Select(node => ToHtml(node)));

                // Добавляем ссылку «назад» в виде символа ↵ или номера
                string backlink = $" <a href=\"#{backlinkId}\" epub:type=\"backlink\">↵</a>";

                // Вставляем обратную ссылку в конец последнего параграфа сноски
                if (noteContent.EndsWith("</p>"))
                {
                    noteContent = noteContent.Insert(noteContent.Length - 4, backlink);
                }
                else
                {
                    noteContent += backlink;
                }

                foundFootnotes.Append($@"
            <aside id=""{noteId}"" epub:type=""footnote"">
                {noteContent}
            </aside>");
            }
        }

        return $@"<section class=""footnotes"" epub:type=""footnotes"">
            <hr/>
            {foundFootnotes}
          </section>";
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
            if (node.Attrs.TryGetValue("src", out object? srcObj) && srcObj is string src)
            {
                string? id;
                // Генерируем ID, если его нет в атрибутах
                if (node.Attrs.TryGetValue("href", out object? idObj) && idObj is string idStr)
                {
                    // Если id начинается с # (например #image1), убираем первый символ
                    id = idStr.StartsWith("#") ? idStr[1..] : idStr;
                }
                else
                {
                    id = Guid.NewGuid().ToString("N")[..8];
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

    /// ПРЕОБРАЗОВАНИЕ ОСНОВНОГО ТЕКСТА РАЗДЕЛА В HTML

    /// <summary>
    /// Рекурсивно преобразует узел формата TipTap в строку HTML, пригодную для использования в EPUB-документе.
    /// Поддерживает текстовые стили, ссылки, изображения, абзацы, заголовки и другие элементы FB2.
    /// </summary>
    /// <param name="node">Узел TipTap, который необходимо конвертировать. Может быть <see langword="null"/>.</param>
    /// <param name="isInsideTitle">
    /// Флаг, указывающий, находится ли текущий узел внутри заголовка (<c>fb2Title</c>).
    /// Влияет на способ обработки дочерних элементов — например, абзацы не оборачиваются в <c>&lt;p&gt;</c> внутри заголовков.
    /// </param>
    /// <returns>
    /// Строка с валидным HTML-кодом, представляющим содержимое узла.
    /// Если <paramref name="node"/> равен <see langword="null"/>, возвращается пустая строка.
    /// Пустые или некорректные узлы также возвращают пустую строку.
    /// </returns>
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
                        "code" => $"<code>{text}</code>",
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
            .Select(child => ToHtml(child, childrenShouldBeHeaders)));

        return node.Type switch
        {
            "paragraph" => isInsideTitle
                       ? childrenHtml
                       : (string.IsNullOrWhiteSpace(childrenHtml) ? "" : $"<p>{childrenHtml}</p>"),
            "fb2Title" => $"<h1>{childrenHtml}</h1>",
            "fb2InlineImage" => HandleFB2Image(node, true),
            "fb2Subtitle" => $"<p class=\"subtitle\">{childrenHtml}</p>",
            "fb2Epigraph" => $"<div class=\"epigraph\">{childrenHtml}</div>",
            "fb2Cite" => $"<blockquote class=\"cite\">{childrenHtml}</blockquote>",
            "fb2Poem" => $"<div class=\"poem\">{childrenHtml}</div>",
            "fb2Stanza" => $"<div class=\"stanza\">{childrenHtml}</div>",
            "fb2V" => $"<p class=\"v\">{childrenHtml}</p>",
            "fb2TextAuthor" => $"<p class=\"text-author\">{childrenHtml}</p>",
            "table" => $"<table>{childrenHtml}</table>",
            "tableRow" => $"<tr>{childrenHtml}</tr>",
            // Добавляем атрибуты для ячеек таблиц
            "tableHeader" => $"<th{GetAttrsHtml(node)}>{childrenHtml}</th>",
            "tableCell" => $"<td{GetAttrsHtml(node)}>{childrenHtml}</td>",
            // Блочное изображение
            "fb2BlockImage" => HandleFB2Image(node, false),
            "fb2Section" => $"<section>{childrenHtml}</section>",
            _ => childrenHtml
        };
    }

    private static string GetAttrsHtml(TipTapNode node)
    {
        if (node.Attrs == null || node.Attrs.Count == 0) return "";

        var sb = new StringBuilder();
        foreach (var attr in node.Attrs)
        {
            // Пропускаем служебные или специфические атрибуты, которые не должны идти в тег
            if (attr.Key == "src" || attr.Key == "href") continue;

            if (attr.Value != null)
            {
                sb.Append($" {attr.Key}=\"{attr.Value}\"");
            }
        }
        return sb.ToString();
    }

    private string HandleFB2Image(TipTapNode node, bool isInline)
    {
        // Извлекаем ID и проверяем формат #id
        if (node.Attrs == null) return "";

        // 2. Достаем объект и СРАЗУ проверяем, строка ли это
        if (!node.Attrs.TryGetValue("href", out object? hrefObj) || hrefObj is not string href)
        {
            return "";
        }

        // Теперь href точно определена для всего кода ниже
        if (string.IsNullOrEmpty(href) || !href.StartsWith('#'))
        {
            return "";
        }

        string cleanId = href[1..]; // Отсекаем '#'

        // Определяем расширение на основе кэша
        string ext = _binaryCache.TryGetValue(cleanId, out var cachedData)
            ? (cachedData.ContentType switch
            {
                "image/png" => "png",
                "image/gif" => "gif",
                _ => "jpg"
            })
            : "jpg"; // Default fallback

        return isInline ? $"<img class=\"inline-image\" src=\"images/{cleanId}.{ext}\" alt=\"\" />" : $"<div class=\"image\"><img src=\"images/{cleanId}.{ext}\" alt=\"\" /></div>";
    }

    /// <summary>
    /// Генерирует HTML-разметку для ссылки на основе атрибутов разметки TipTap.
    /// Поддерживает обычные ссылки и специальные ссылки на сноски (footnotes).
    /// </summary>
    /// <param name="mark">Объект разметки TipTap, содержащий атрибуты ссылки (например, <c>href</c>, <c>rel</c>).</param>
    /// <param name="text">Текст ссылки, который будет обёрнут в тег <c>&lt;a&gt;</c>.</param>
    /// <returns>
    /// Строка с HTML-кодом ссылки. Если <c>mark</c> не содержит корректного <c>href</c>, возвращается исходный <paramref name="text"/> без изменений.
    /// Для сносок добавляется уникальный <c>id</c> и атрибут <c>epub:type="noteref"</c>.
    /// </returns>
    /// <remarks>
    /// <para>
    /// Особенности реализации:
    /// <list type="bullet">
    ///   <item><description>Проверяет наличие атрибута <c>href</c> и его тип — должен быть строкой.</description></item>
    ///   <item><description>Если указано <c>rel="footnote"</c>, ссылка считается ссылкой на сноску и обрабатывается особым образом:</description>
    ///   </item>
    ///   <item><description>Для обычных ссылок генерируется стандартный тег <c>&lt;a href="..."&gt;</c>.</description></item>
    /// </list>
    /// </para>
    /// <para>
    /// Потокобезопасность: метод <b>не является потокобезопасным</b>, так как модифицирует общее состояние <see cref="F:_footnoteCounter"/>.
    /// Должен вызываться в однопоточном контексте.
    /// </para>
    private string BuildLink(TipTapMark mark, string text)
    {
        if (mark.Attrs?.TryGetValue("href", out var h) == true && h is string hrefStr)
        {
            string encodedHref = WebUtility.HtmlEncode(hrefStr);
            if (mark.Attrs?.TryGetValue("rel", out var linkType) == true && linkType == "footnote")
            {
                _footnoteCounter++;

                string backlinkId = $"ref_{hrefStr[1..]}_{_footnoteCounter}";   // ref_{id}_{number} — уникальный ID для этого конкретного места в тексте

                return $"<a epub:type=\"noteref\" id=\"{backlinkId}\" href=\"{encodedHref}\" class=\"footnote-link\">{text}</a>";
            }
            else
            {
                return $"<a href=\"{encodedHref}\">{text}</a>";
            }
        }
        return text;
    }

    [GeneratedRegex(@"data:([^;]+)")]
    private static partial System.Text.RegularExpressions.Regex MyRegex();

}
