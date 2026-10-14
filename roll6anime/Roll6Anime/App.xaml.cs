using System.Globalization;
using System.IO;
using System.Windows;
using System.Windows.Data;
using System.Windows.Threading;
using Microsoft.Extensions.Configuration;
using Roll6Anime.Core.Settings;

namespace Roll6Anime;

/// <summary>
/// The roll6anime (062): reads <c>appsettings.json</c> (and <c>Roll6Anime__*</c> variables) and the user's state, then
/// opens the window. An unexpected error is shown instead of closing the tool.
/// </summary>
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        DispatcherUnhandledException += OnUnhandled;

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
        var settings = configuration.GetSection(AnimeSettings.SECTION).Get<AnimeSettings>() ?? new AnimeSettings();

        var window = new MainWindow(settings, UserState.Load());
        MainWindow = window;
        window.Show();
    }

    private static void OnUnhandled(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        MessageBox.Show($"Ocorreu um erro inesperado:\n\n{e.Exception.Message}", "roll6anime", MessageBoxButton.OK, MessageBoxImage.Error);
        e.Handled = true;
    }
}

/// <summary>Visible when the bound value is a non-empty string or any other non-null value; collapsed otherwise.</summary>
/// <summary>A PNG (bytes) as an image for the screen, decoded at the height asked in the parameter (default 160).</summary>
public class PngImageConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is not byte[] png || png.Length == 0)
            return null;
        var image = new System.Windows.Media.Imaging.BitmapImage();
        image.BeginInit();
        image.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad;
        image.DecodePixelHeight = int.TryParse(parameter as string, out var height) ? height : 160;
        image.StreamSource = new System.IO.MemoryStream(png);
        image.EndInit();
        image.Freeze();
        return image;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => throw new NotSupportedException();
}

public class VisibleWhenSetConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is null || (value is string text && string.IsNullOrWhiteSpace(text)) ? Visibility.Collapsed : Visibility.Visible;

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => throw new NotSupportedException();
}
