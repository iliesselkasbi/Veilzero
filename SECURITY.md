# Security Policy

## Supported version

The current `main` branch and the latest deployed release receive security fixes.

## Threat model

VEILZERO processes media in the browser and does not send source files to an application server. It is not a guarantee of anonymity or forensic erasure.

Users must assume:
- Face obscuration may not defeat trained recognition systems.
- Voice transformation may be reversible by forensic analysis.
- Browser and operating-system malware can observe before, during, or after processing.
- Metadata stripping is format-dependent; unsupported or embedded media metadata may survive.
- Resistance Drop encryption protects payload chunks and visible header fields with AES-GCM, but security depends on passphrase strength and secure handling of the downloaded HTML.
- JavaScript cannot guarantee memory zeroization.

## Reporting vulnerabilities

Please report suspected vulnerabilities privately through the repository's GitHub **Security Advisories** page:

https://github.com/iliesselkasbi/Veilzero/security/advisories

If security advisories are unavailable, open a minimal issue that omits secrets, exploit payloads, and sensitive reproduction data, and ask maintainers to move the discussion to a private channel.

Please include affected versions, reproduction steps, impact, and suggested mitigation when available. Do not test against third parties or access data that you do not own.
