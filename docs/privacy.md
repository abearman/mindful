---
title: Privacy Policy
---

# Privacy Policy for Mindful Bookmarks
**Effective date:** {{ site.time | date: "%Y-%m-%d" }}

Mindful gives you control over your data. All users sign in with an account. You can choose to keep data **locally on your device** (Local-Only mode) or enable **Encrypted Sync** to keep bookmarks in sync across your devices.

## Storage Options
### 1) Local-Only (default)

- Bookmark data (URL, title, tags, folder structure, settings) is stored on your device via Chrome’s `chrome.storage` API.
- You must still sign in with an account, but data remains on your device in this mode and is not uploaded to our servers.

### 2) Encrypted Sync

- If you enable Encrypted Sync, we store your bookmark data in our backend so it can sync across your devices.
- Data is encrypted in transit (HTTPS/TLS) and at rest using AWS-managed encryption (e.g., KMS).
- We do not sell or share your data, and we do not use it for advertising or unrelated purposes.
  
## Data We Handle

- **Bookmark data & preferences**: URLs, titles, tags, folder/group structure, and settings you create in the app. Used only to provide bookmarking and syncing.
- **Account info**: Email address, phone number, and full name.
  Authentication is provided by our identity provider (e.g., AWS Cognito via Amplify). We do not store or access your password.
- **Diagnostics (minimal, non-content)**: error codes and operational metadata to maintain reliability. We do not collect page text, keystrokes, mouse movements, or browsing history.

We do **not** collect financial/health data, personal communications, precise location, web history, or other unrelated categories.

## How Permissions Are Used

- `storage`: save your bookmarks and settings locally.
- `tabs`: read the current tab’s URL/title only when you click **"Add bookmark,"** or list open tabs only when you explicitly choose **"Import Open Tabs."** No background page reading or content script injection.
- `bookmarks`: access the Chrome bookmarks API only when you explicitly choose **"Import from Chrome Bookmarks."** Read-only, never monitored in the background.
- **Host access**: communicates with Mindful’s backend services (AWS API Gateway, Cognito, S3) to provide login and, if enabled, Encrypted Sync. These requests are limited to our own domains.

## Your Controls

- **Choose storage mode** any time in Settings (Local-Only ↔ Encrypted Sync).
- **Export/Import** bookmarks as JSON from the app.
- **Delete data**:
  - Local-Only: remove the extension or clear its storage.
  - Encrypted Sync: use *Settings → Encrypted Sync → Delete cloud data*. We delete copies immediately.

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
Email: `amy@mindfulbookmarks.com`

## Changes to This Policy

We may update this policy to reflect product or legal changes. We’ll update the “Effective date” above and, if changes are material, provide notice in-app.

Last updated: {{ site.time | date: "%Y-%m-%d" }}
