---
title: Privacy Policy
---

# Privacy Policy for Mindful Bookmarks
**Effective date:** {{ site.time | date: "%Y-%m-%d" }}

Mindful Bookmarks is built to give you control over your data. You can choose **Remote Storage** (default) or **Local-Only Storage**.

---

## Storage Options

### 1) Remote Storage (default)
- Your bookmarks, tags, and preferences are encrypted **in transit** (HTTPS/TLS) and **at rest** using AWS-managed encryption (e.g., KMS).
- Ciphertext is stored in our cloud database; **no plaintext content** is stored on our servers.
- Encryption keys are managed via **AWS Key Management Service (KMS)**; servers cannot decrypt your data.
- We do **not** sell or share your data with third parties. We do **not** use your data for advertising.

### 2) Local-Only Storage (opt-in)
- You may switch to local mode at any time.
- In local mode, all data is kept on your device using Chrome’s `storage` API; **nothing is sent to our servers**.

---

## Data We Handle

- **Bookmark data & preferences** (titles, URLs, tags, folder structure, settings) — used only to provide core functionality and sync (if remote mode is enabled).

- **User account information (required for login):**
  - **Name, email, phone number, and password** are required to create and sign in to your account.
  - **Purpose:** authentication, account security (including MFA/verification), and essential service communications (e.g., password resets, critical notices).
  - **Handling:** authentication is provided by our identity provider (e.g., AWS Amplify/Cognito). Passwords are **never stored in plaintext** and are protected using industry-standard methods. We do not access your password.
  - **Contact settings:** you may update your profile details in the app (where available) or by contacting support.

- **Diagnostics (minimal, non-content):**
  - Error codes and operational metadata to maintain reliability.
  - **Never** includes bookmark contents.

We **do not** collect unrelated data such as full browsing history, health/financial data, keystrokes, or mouse movements.

---

## Your Controls

- **Switch storage mode** at any time in Settings.
- **Delete data**:
  - Local mode: Remove the extension or clear Chrome’s site/extension storage.
  - Remote mode: Switch to Local mode. All associated ciphertext will be deleted from our systems. 
- **Export**: You can export your bookmarks from the app.
- **Load**: You can load bookmarks from a local JSON file into the app.

---

## Security

- Client-side encryption; servers store ciphertext only.
- Keys protected via **AWS KMS**; access is tightly scoped and audited.
- Transport security with HTTPS/TLS.

---

## Data Sharing & Selling

- We do **not** sell personal information.
- We do **not** share data with third parties except service providers necessary to run the app (e.g., AWS), who process data on our behalf under strict agreements.

---

## Children’s Privacy

Mindful Bookmarks is not intended for children under 13.

---

## Contact

Questions or requests (including data deletion)?  
**Email:** amylbearman@gmail.com

_Last updated: {{ site.time | date: "%Y-%m-%d" }}_
