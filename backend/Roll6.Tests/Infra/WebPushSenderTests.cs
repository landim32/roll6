using System.Security.Cryptography;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Roll6.DTO.Settings;
using Roll6.Infra.AppServices;

namespace Roll6.Tests.Infra;

public class WebPushSenderTests
{
    private static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    /// <summary>A VAPID pair as `web-push generate-vapid-keys` prints it: P-256, public uncompressed (65 bytes), private D (32).</summary>
    private static (string Public, string Private) VapidPair()
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var p = key.ExportParameters(true);
        var publicKey = new byte[65];
        publicKey[0] = 0x04;
        p.Q.X!.CopyTo(publicKey, 1);
        p.Q.Y!.CopyTo(publicKey, 33);
        return (Base64Url(publicKey), Base64Url(p.D!));
    }

    [Fact]
    public void WithAVapidPair_IsEnabledAndExposesThePublicKey()
    {
        var (publicKey, privateKey) = VapidPair();

        var sender = new WebPushSender(Options.Create(new PushSettings { PublicKey = publicKey, PrivateKey = privateKey, Subject = "mailto:test@roll6.site" }),
            NullLogger<WebPushSender>.Instance);

        sender.Enabled.Should().BeTrue();
        sender.PublicKey.Should().Be(publicKey);
    }

    [Fact]
    public void WithoutKeys_IsOff()
    {
        var sender = new WebPushSender(Options.Create(new PushSettings()), NullLogger<WebPushSender>.Instance);

        sender.Enabled.Should().BeFalse();
        sender.PublicKey.Should().BeNull();
    }
}
