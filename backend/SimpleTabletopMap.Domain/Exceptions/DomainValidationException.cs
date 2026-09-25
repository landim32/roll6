namespace SimpleTabletopMap.Domain.Exceptions;

public class DomainValidationException : Exception
{
    public IDictionary<string, string[]> Errors { get; }

    public DomainValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public DomainValidationException(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = new[] { message } })
    {
    }
}
