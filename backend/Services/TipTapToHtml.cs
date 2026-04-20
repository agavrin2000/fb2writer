using System.Net;
using FB2Writer.Models;

namespace FB2Writer.Services;

public static class TipTapToHtml
{
    public static string ToHtml(TipTapNode node)
    {
        if (node.Type == "text")
        {
            var text = WebUtility.HtmlEncode(node.Text ?? "");
            if (node.Marks != null)
            {
                foreach (var mark in node.Marks)
                {
                    text = mark.Type switch
                    {
                        "bold" => $"<strong>{text}</strong>", // strong более семантичен
                        "italic" => $"<em>{text}</em>",
                        "strike" => $"<s>{text}</s>",
                        "superscript" => $"<sup>{text}</sup>",
                        "subscript" => $"<sub>{text}</sub>",
                        "link" => (mark.Attrs?.TryGetValue("href", out var h) == true && h is string hrefStr && hrefStr.StartsWith('#'))
                                ? $"<a epub:type=\"noteref\" href=\"{h}\">{text}</a>"
                                : $"<a href=\"{(mark.Attrs?.ContainsKey("href") == true ? mark.Attrs["href"] : "")}\">{text}</a>",
                        _ => text
                    };
                }
            }
            return text;
        }

        var childrenHtml = string.Join("", (node.Content ?? new()).Select(ToHtml));

        return node.Type switch
        {
            "paragraph" => $"<p>{childrenHtml}</p>",
            "heading" => $"<h{node.Attrs?["level"] ?? "1"}>{childrenHtml}</h{node.Attrs?["level"] ?? "1"}>",

            // Специфика FB2 (используем классы из вашего CSS)
            "subtitle" => $"<div class=\"subtitle\">{childrenHtml}</div>",
            "epigraph" => $"<div class=\"epigraph\">{childrenHtml}</div>",
            "cite" => $"<div class=\"cite\"><blockquote>{childrenHtml}</blockquote></div>",

            // Стихи
            "poem" => $"<div class=\"poem\">{childrenHtml}</div>",
            "stanza" => $"<div class=\"stanza\">{childrenHtml}</div>", // строфа
            "v" => $"<p class=\"v\">{childrenHtml}</p>", // строка стиха

            // Авторы цитат/эпиграфов
            "textAuthor" => $"<p class=\"text-author\">{childrenHtml}</p>",

            // Изображения
            "image" => (node.Attrs?.TryGetValue("id", out var id) == true)
                ? $"<div class=\"image\"><img src=\"images/{id}.jpg\" alt=\"image\" /></div>"
                : "",

            // Списки
            "bulletList" => $"<ul>{childrenHtml}</ul>",
            "orderedList" => $"<ol>{childrenHtml}</ol>",
            "listItem" => $"<li>{childrenHtml}</li>",

            "fb2Section" => $"<section>{childrenHtml}</section>",

            _ => childrenHtml
        };
    }
}
