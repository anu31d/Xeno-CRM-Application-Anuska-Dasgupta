# Security Guidelines

## Secrets Management

This project handles sensitive credentials. **Never commit secrets to version control.**

### Local Development

1. **Create `firebase-applet-config.json`** (not tracked in git):
   ```bash
   cp firebase-applet-config.json.example firebase-applet-config.json
   ```
   Replace placeholder values with your real Firebase credentials.

2. **Create `.env.local`** (not tracked in git):
   ```bash
   cp .env.example .env.local
   ```
   Add your `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey).

### GitHub Actions CI/CD

Before running the workflow, configure these secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret Name | Value | Source |
|------------|-------|--------|
| `GEMINI_API_KEY` | Your Gemini API key | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `FIREBASE_CONFIG` | JSON string of Firebase credentials | Firebase Console |

**Setting `FIREBASE_CONFIG` secret:**
```bash
# Copy your firebase-applet-config.json and convert to JSON string:
cat firebase-applet-config.json | jq -c . | pbcopy
# Then paste in GitHub Secrets UI as single-line JSON
```

### What's Protected

- ✅ `.env*` files (git-ignored)
- ✅ `firebase-applet-config.json` (git-ignored, example provided)
- ✅ GitHub Actions secrets (environment-scoped)

### If Secrets Are Exposed

1. **Immediately revoke** the exposed credentials in Firebase Console and Google AI Studio
2. **Rotate** all secrets with new values
3. **Update** GitHub Secrets with new credentials
4. **Force-push** after removing secrets from history (if committed):
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch firebase-applet-config.json' \
     --prune-empty --tag-name-filter cat -- --all
   git push --force --all
   ```

---

**Always review commits before pushing.** Use `git diff` to verify no secrets are staged.
