# Putting the site live on mywifelivina.com

Two free services:
- **Firebase** (Google): the logins and the shared data (points, gifts, messages), so admin changes reach her phone instantly.
- **GitHub Pages**: hosts the website itself on mywifelivina.com.

Do Firebase first (Part A), then publishing (Part B).
⚠️ This folder becomes a public website, so never write passwords in any file here.

---

## Part A: Firebase (about 10 minutes)

### A1. Create the project
1. Go to **console.firebase.google.com** and sign in with your Google account.
2. **Create a project** → name it `kiwi-corner` → Continue.
3. Turn **Google Analytics off** → **Create project** → Continue.

### A2. Turn on logins
1. Left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → turn on the first switch → **Save**.
3. **Users** tab → **Add user**, twice:
   - `livina@mywifelivina.com`, with password = her PIN followed by `-kiwicorner`
   - `admin@mywifelivina.com`, with password = your PIN followed by `-kiwicorner`

   The emails don't need to be real inboxes. The site adds `-kiwicorner` behind the scenes (Firebase needs 6+ characters), so you both still log in with just the short PIN (her username is `wifey`, yours is `admin`).
4. **Settings** tab → **Authorized domains** → **Add domain** → `mywifelivina.com`. (`localhost` is already there.)

### A3. Create the database
1. Left menu: **Build → Firestore Database → Create database**.
2. Location: **europe-west1 (Belgium)** (closest to Barcelona) → Next.
3. **Start in production mode** → **Create**.
4. **Rules** tab → delete everything → paste the whole contents of `firestore.rules` from this folder → **Publish**.

### A4. Get the web config
1. ⚙️ gear next to "Project Overview" → **Project settings**.
2. **Your apps** → click the **`</>`** (Web) icon.
3. Nickname `kiwi-corner`, leave "Firebase Hosting" unticked → **Register app**.
4. Copy the `firebaseConfig = { apiKey: …, authDomain: …, projectId: …, appId: … }` block and **paste it to Claude**.

That config is **meant to be public** (every Firebase website has it). The logins and the rules from A3 keep the data safe. Claude puts it in `config.js` and removes the demo-mode password codes.

---

## Part B: Publish on mywifelivina.com (about 15 minutes, plus DNS time)

### B1. Put the site on GitHub
1. Make a free GitHub account if you don't have one.
2. GitHub → Settings → Emails → turn on **"Keep my email addresses private"**.
3. Tell Claude **"publish it"**. Claude creates a public repo, commits and pushes.

### B2. Turn on GitHub Pages
Repo → **Settings → Pages**: Source = "Deploy from a branch", Branch = `main`, folder `/ (root)` → **Save**.

### B3. Point the domain at GitHub
Log in where you bought **mywifelivina.com**, open its **DNS settings**, delete any "parking" A/CNAME records for `@` and `www`, then add:

| Type  | Host / Name | Value                 |
|-------|-------------|-----------------------|
| A     | @           | 185.199.108.153       |
| A     | @           | 185.199.109.153       |
| A     | @           | 185.199.110.153       |
| A     | @           | 185.199.111.153       |
| CNAME | www         | `<your-github-username>.github.io` |

On Cloudflare, set these to "DNS only" (grey cloud) at first.

### B4. Connect the domain in GitHub
Repo → **Settings → Pages → Custom domain** → `mywifelivina.com` → Save. When the check turns green (minutes to an hour), tick **Enforce HTTPS**.

### B5. Send her the link 💚
**https://mywifelivina.com**. Tell her her username and PIN in person or by text (not here), and that she can add it to her home screen from the 🌸 button.

---

## Notes
- The code is public on GitHub (free Pages needs a public repo), so gift names in `gifts.js` are readable by anyone who goes looking. Her site never shows what's inside a present before she unlocks it.
- Changing a PIN later: Firebase → Authentication → Users → ⋮ → Reset password → new PIN + `-kiwicorner`.
- Updates: tell Claude what to change and "publish it". The live site updates in about a minute, and open copies refresh themselves.
