using System.Windows;
using System.Windows.Controls;
using Roll6Anime.Core.Animations;
using Roll6Anime.Core.Upload;

namespace Roll6Anime;

/// <summary>
/// "Enviar ao Roll6" (067): says whether the animation will be created or which one of the user's will be updated, and
/// lets the name and the type be confirmed (a new animation needs a type; the file's "type" or the existing one is
/// chosen already). Enviar closes it with <see cref="ChosenName"/> and <see cref="ChosenType"/>.
/// </summary>
public partial class UploadWindow : Window
{
    private readonly List<RadioButton> _types = new();

    public UploadWindow(UploadPlan plan, string fileName)
    {
        InitializeComponent();
        Target.Text = plan.Existing is { } existing
            ? $"{fileName} vai atualizar a animação \"{existing.Name}\" (id {existing.AnimationId}) do Roll6: nome, tipo e "
              + "arquivo. Os tokens que usam esta animação passam a tocar a versão nova."
            : $"{fileName} ainda não está no Roll6: vai ser criada uma animação nova na biblioteca.";
        NameBox.Text = plan.Name;
        for (var index = 0; index < AnimationEntry.TypeLabels.Count; index++)
        {
            var choice = new RadioButton
            {
                Content = AnimationEntry.TypeLabels[index],
                Tag = index + 1,
                GroupName = "type",
                Style = (Style)Resources["Choice"],
                IsChecked = plan.Type == index + 1,
            };
            choice.Checked += OnChanged;
            _types.Add(choice);
            Types.Children.Add(choice);
        }
        Loaded += (_, _) => { NameBox.Focus(); NameBox.SelectAll(); Validate(); };
    }

    public string ChosenName => NameBox.Text.Trim();

    public int? ChosenType => _types.FirstOrDefault(choice => choice.IsChecked == true)?.Tag as int?;

    private void OnChanged(object sender, RoutedEventArgs e) => Validate();

    private bool Validate()
    {
        var problem = ChosenName.Length == 0 ? "Informe o nome."
            : ChosenType == null ? "Escolha o tipo."
            : null;
        Problem.Text = problem ?? string.Empty;
        Problem.Visibility = problem == null ? Visibility.Collapsed : Visibility.Visible;
        SendButton.IsEnabled = problem == null;
        return problem == null;
    }

    private void OnSend(object sender, RoutedEventArgs e)
    {
        if (Validate())
            DialogResult = true;
    }
}
