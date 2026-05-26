# Security Policy

## Supported Versions

Security fixes are provided for the latest published release line.

| Version                                   | Supported |
| ----------------------------------------- | --------- |
| Latest release                            | Yes       |
| Older releases                            | No        |
| Unreleased local forks or modified builds | No        |

If a vulnerability is fixed, the fix will generally be released only for the current supported version unless a backport is clearly necessary.

## Reporting a Vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately by email to `fraujulian@lechner.top`.

Please include:

- A clear description of the issue and the expected security impact.
- Affected package version or commit, Node.js version, and runtime environment.
- Reproduction steps, proof of concept, or a minimal example.
- Any relevant logs, stack traces, or dependency details.
- Whether you believe the issue is already publicly known.

## What To Expect

- Initial acknowledgement is targeted within 7 days.
- After triage, you may be asked for more detail or validation.
- If the report is accepted, a fix will be prepared and released as soon as reasonably possible.
- Coordinated disclosure is preferred. Please wait for a fix or explicit approval before publishing details.
- If the report is out of scope or not reproducible, you will be told why.

## Scope

This policy covers vulnerabilities in the published `discord-audio-stream` package itself.

Examples that may be in scope:

- Input handling issues that could cause unsafe process execution behavior.
- Vulnerabilities caused by package logic, lifecycle management, or exposed API behavior.
- Security-relevant documentation mistakes that would realistically lead users into unsafe deployment.

Examples that are usually out of scope:

- Vulnerabilities in third-party dependencies that are not introduced by this package.
- Misconfiguration in a consuming bot, Discord server, host OS, or infrastructure.
- Denial of service caused solely by unsupported environments or intentionally extreme workloads.

## Disclosure

When a report is confirmed, the goal is to publish a fix and then disclose the issue responsibly through the repository release notes, commit history, or an advisory, depending on severity and impact.
