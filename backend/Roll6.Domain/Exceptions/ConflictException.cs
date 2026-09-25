namespace Roll6.Domain.Exceptions;

/// <summary>Business conflict, such as a duplicated e-mail or a record that is still in use (HTTP 409).</summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message)
    {
    }
}
