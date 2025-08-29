---
title: Privacy Policy
---

# Privacy Policy for Mindful Bookmarks
**Effective date:** {{ site.time | date: "%Y-%m-%d" }}

Mindful gives you control over your data. By default, data stays **locally on your device**. You can optionally enable **Cloud Sync** to keep bookmarks in sync across your devices.

## Storage Options
### 1) Local (default)

- Bookmark data (URL, title, tags, folder structure, settings) is stored on your device via Chrome’s `chrome.storage` API.
- No data is sent to our servers in this mode.

### 2) Cloud Sync (opt-in)

- If you enable Cloud Sync, we store your bookmark data in our backend so it can sync across your devices.
- Data is encrypted in transit (HTTPS/TLS) and at rest using AWS-managed encryption (e.g., KMS).
- We do not sell or share your data, and we do not use it for advertising or unrelated purposes.
  
## Data We Handle

- **Bookmark data & preferences**: URLs, titles, tags, folder/group structure, and settings you create in the app. Used only to provide bookmarking and (if enabled) syncing.
- **Account info for Cloud Sync**: Email address, phone number, and full name.
Authentication is provided by our identity provider (e.g., AWS Cognito via Amplify). We do not store or access your password.
- **Diagnostics (minimal, non-content)**: error codes and operational metadata to maintain reliability. We do not collect page text, keystrokes, mouse movements, or browsing history.

We do **not** collect financial/health data, personal communications, precise location, web history, or other unrelated categories.

## How Permissions Are Used

- `storage`: save your bookmarks and settings locally.
- `tabs`: read the current tab’s URL/title only when you click **"Add bookmark."** No background page reading or content script injection.
- **Optional site access**: may request access to [https://2rra98zl35.execute-api.us-west-1.amazonaws.com/](https://2rra98zl35.execute-api.us-west-1.amazonaws.com) only when you enable Cloud Sync to save/retrieve your own bookmarks.

## Your Controls

- **Switch modes** any time in Settings (Local ↔ Cloud Sync).
- **Export/Import** bookmarks as JSON from the app.
- **Delete data**:
  - Local: remove the extension or clear its storage.
  - Cloud Sync: use *Settings → Cloud Sync → Delete cloud data*. We delete copies immediately.

## Security

- Transport security (HTTPS/TLS) and encryption at rest on AWS.
- Access to backend systems is restricted and audited.
- We do not execute remote code from third-party CDNs.

## Data Sharing & Selling

- We do not sell personal information.
- We do not share data except with service providers necessary to run the app (e.g., AWS), operating under data-processing agreements and only on our instructions.

## Regional Rights

Depending on your region (e.g., GDPR/CCPA), you may have rights to access, correct, export, or delete your data. Contact us to exercise these rights.

## Children’s Privacy

Mindful Bookmarks is not intended for children under 13.

## Contact

Questions or requests (including data deletion/export)?
Email: `amylbearman@gmail.com`

## Changes to This Policy

We may update this policy to reflect product or legal changes. We’ll update the “Effective date” above and, if changes are material, provide notice in-app.

Last updated: {{ site.time | date: "%Y-%m-%d" }}