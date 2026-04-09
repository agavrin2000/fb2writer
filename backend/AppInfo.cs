namespace FB2Editor;
using System.Reflection;

/// <summary>
/// Предоставляет доступ к метаданным приложения, таким как имя сборки, отображаемое название и версия.
/// Данные извлекаются из атрибутов сборки, заданных в файле AssemblyInfo.cs или в CSPROJ.
/// </summary>
public static class AppInfo
{
    private static readonly Assembly _assembly = Assembly.GetExecutingAssembly();

    /// <summary>
    /// Получает техническое имя сборки (например, "FB2Editor").
    /// Соответствует значению &lt;AssemblyName&gt; в CSPROJ-файле.
    /// Если имя не задано, возвращается значение по умолчанию "FB2 Writer".
    /// </summary>
    public static string AssemblyName => _assembly.GetName().Name ?? "FB2 Writer";

    /// <summary>
    /// Получает пользовательское (дружелюбное) имя приложения, предназначенное для отображения в интерфейсе.
    /// Соответствует значению атрибута &lt;Product&gt; в CSPROJ-файле.
    /// Если атрибут не задан, возвращается значение <see cref="AssemblyName"/>.
    /// </summary>
    public static string FriendlyName =>
        _assembly.GetCustomAttribute<AssemblyProductAttribute>()?.Product ?? AssemblyName;

    /// <summary>
    /// Получает версию приложения в формате Major.Minor.Build (например, "1.2.3").
    /// Соответствует значению &lt;Version&gt; в CSPROJ-файле.
    /// Если версия не определена, возвращается значение по умолчанию "1.0.0".
    /// </summary>
    public static string Version =>
        _assembly.GetName().Version?.ToString(3) ?? "1.0.0";
}
