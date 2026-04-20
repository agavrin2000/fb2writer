using System.Text;
using System.Xml.Linq;

namespace FB2Writer.Models
{
    internal class EPUBConstants
    {
        public static readonly string Html5Doctype = "<!DOCTYPE html>";

        public static readonly string XmlDeclarationPrefix = "<?xml";
        public static readonly string XmlDeclarationSufix = "?>";

        public static readonly string XmlDeclaration = new XDeclaration("1.0", null, null).ToString();

        public static readonly XNamespace XhtmlNamespace = "http://www.w3.org/1999/xhtml";
        public static readonly XNamespace OcfNamespace = "urn:oasis:names:tc:opendocument:xmlns:container";
        public static readonly XNamespace NcxNamespace = "http://www.daisy.org/z3986/2005/ncx/";
        public static readonly XNamespace OpfNamespace = "http://www.idpf.org/2007/opf";
        public static readonly XNamespace OpfMetadataNamespace = "http://purl.org/dc/elements/1.1/";
        public static readonly XNamespace OpsNamespace = "http://www.idpf.org/2007/ops";

        public const string OcfPath = "META-INF/container.xml";
        public const string OcfMediaType = "application/oebps-package+xml";

        public const string DefaultOpfUniqueIdentifier = "uuid_id";

        public static readonly Encoding DefaultEncoding = Encoding.UTF8;
    }

    internal static class NcxElements
    {
        public static readonly XName Ncx = EPUBConstants.NcxNamespace + "ncx";
        public static readonly XName Head = EPUBConstants.NcxNamespace + "head";
        public static readonly XName Meta = EPUBConstants.NcxNamespace + "meta";
        public static readonly XName DocTitle = EPUBConstants.NcxNamespace + "docTitle";
        public static readonly XName DocAuthor = EPUBConstants.NcxNamespace + "docAuthor";
        public static readonly XName Text = EPUBConstants.NcxNamespace + "text";
        public static readonly XName NavMap = EPUBConstants.NcxNamespace + "navMap";
        public static readonly XName NavPoint = EPUBConstants.NcxNamespace + "navPoint";
        public static readonly XName NavList = EPUBConstants.NcxNamespace + "navList";
        public static readonly XName PageList = EPUBConstants.NcxNamespace + "pageList";
        public static readonly XName NavInfo = EPUBConstants.NcxNamespace + "navInfo";
        public static readonly XName PageTarget = EPUBConstants.NcxNamespace + "pageTarget";
        public static readonly XName NavLabel = EPUBConstants.NcxNamespace + "navLabel";
        public static readonly XName NavTarget = EPUBConstants.NcxNamespace + "navTarget";
        public static readonly XName Content = EPUBConstants.NcxNamespace + "content";
    }

    /// <summary>
    /// DAISY’s Navigation Center eXtended (NCX)
    /// </summary>
    public class NcxDocument
    {
        public IList<NcxMeta> Meta { get; set; } = [];
        public required string DocTitle { get; set; }
        public required string DocAuthor { get; set; }
        public NcxNapMap NavMap { get; set; } = new NcxNapMap(); // <navMap> is a required element in NCX.
        public NcxPageList PageList { get; set; } = new NcxPageList();
        public NcxNavList NavList { get; set; } = new NcxNavList();
    }

    public class NcxMeta
    {
        internal static class Attributes
        {
            public static readonly XName Name = "name";
            public static readonly XName Content = "content";
            public static readonly XName Scheme = "scheme";
        }

        public required string Name { get; set; }
        public required string Content { get; set; }
        public required string Scheme { get; set; }
    }

    public enum NcxPageTargetType
    {
        Front = 1,
        Normal,
        Special,
        Body
    }

    public class NcxPageList
    {
        public NcxNavInfo NavInfo { get; set; } = new NcxNavInfo();

        public IList<NcxPageTarget> PageTargets { get; set; } = [];
    }

    public class NcxNavInfo
    {
        public string Text { get; set; } = string.Empty;
    }

    public class NcxPageTarget
    {
        internal static class Attributes
        {
            public static readonly XName Id = "id";
            public static readonly XName Class = "class";
            public static readonly XName Type = "type";
            public static readonly XName Value = "value";
            public static readonly XName ContentSrc = "src";
        }

        public required string Id { get; set; }
        public required string Value { get; set; }
        public required string Class { get; set; }
        public NcxPageTargetType? Type { get; set; }
        public required string NavLabelText { get; set; }
        public required string ContentSrc { get; set; }
    }

    public class NcxNavList
    {
        public string Id { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public IList<NcxNavTarget> NavTargets { get; set; } = [];
    }

    public class NcxNavTarget
    {
        public string Id { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public int? PlayOrder { get; set; }
        public string Label { get; set; } = string.Empty;
        public string ContentSource { get; set; } = string.Empty;
    }

    public class NcxNavPoint
    {
        internal static class Attributes
        {
            public static readonly XName Id = "id";
            public static readonly XName Class = "class";
            public static readonly XName PlayOrder = "playOrder";
            public static readonly XName ContentSrc = "src";
        }

        public required string Id { get; set; }
        public required string Class { get; set; }
        public int? PlayOrder { get; set; }
        // NavLabelText and ContentSrc are flattened elements for convenience.
        // In case <navLabel> or <content/> need to carry more data, then they should have a dedicated model created.
        public required string NavLabelText { get; set; }
        public required string ContentSrc { get; set; }
        public IList<NcxNavPoint> NavPoints { get; set; } = [];

        public override string ToString()
        {
            return $"Id: {Id}, ContentSource: {ContentSrc}";
        }
    }
    public class NcxNapMap
    {
        /// <summary>
        /// Populated only when an EPUB with NCX is read.
        /// </summary>
        public XElement Dom { get; set; } = new XElement(EPUBConstants.NcxNamespace + "ncx");
        public IList<NcxNavPoint> NavPoints { get; set; } = [];

        /// <summary>
        /// Reorder the Nav Points by their Play Order
        /// </summary>
        public void ReorderNavPointsPlayOrder()
        {
            var myNavPoints = NavPoints;
            if (myNavPoints == null) return;
            myNavPoints = myNavPoints.OrderBy(x => x.PlayOrder).ToList();
            for (var x = 0; x < myNavPoints.Count; x++)
            {
                var curItem = myNavPoints[x];
                var curNavPoint = NavPoints.FirstOrDefault(g => g.Id.Equals(curItem.Id));
                curNavPoint?.PlayOrder = x;
            }
        }
    }
}