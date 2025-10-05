# ✅ Vercel Deployment Checklist

Use this checklist to ensure smooth deployment.

## Pre-Deployment

- [ ] Have LPU registration number and password ready
- [ ] Anti-Captcha account created at [anti-captcha.com](https://anti-captcha.com)
- [ ] Added minimum $5 credit to Anti-Captcha account
- [ ] Copied Anti-Captcha API key from Settings → API Setup
- [ ] GitHub account created
- [ ] Vercel account created (free tier)

## Code Preparation

- [ ] All files are in the project directory
- [ ] `.env.example` file exists (template for users)
- [ ] `.env` file is NOT committed to git (check `.gitignore`)
- [ ] `vercel.json` configuration file exists
- [ ] `package.json` has correct dependencies
- [ ] `how_to_deploy.html` guide is included

## GitHub Setup

- [ ] Created new GitHub repository
- [ ] Repository is public or private (your choice)
- [ ] Initialized git in project folder (`git init`)
- [ ] Added all files (`git add .`)
- [ ] Created initial commit (`git commit -m "Initial commit"`)
- [ ] Added remote repository (`git remote add origin ...`)
- [ ] Pushed to GitHub (`git push -u origin main`)
- [ ] Verified all files are on GitHub (except `.env`)

## Vercel Configuration

- [ ] Logged into Vercel with GitHub account
- [ ] Clicked "New Project"
- [ ] Selected your repository
- [ ] Framework detected as "Other" or "None"
- [ ] Build settings are default (no custom build command needed)

## Environment Variables

Required (must be set):
- [ ] `LPU_USERNAME` = Your registration number
- [ ] `LPU_PASSWORD` = Your LPU password
- [ ] `ANTICAPTCHA_API_KEY` = Your Anti-Captcha API key

Optional (recommended):
- [ ] `AUTO_REFRESH_ENABLED` = true
- [ ] `AUTO_REFRESH_INTERVAL` = 30
- [ ] `PWA_VERSION` = 1.9.4

Optional (for custom notifications):
- [ ] `ONESIGNAL_APP_ID` = Your OneSignal app ID (or use pre-configured)
- [ ] `ONESIGNAL_API_KEY` = Your OneSignal API key (or use pre-configured)

- [ ] All variables set to "All environments" (Production, Preview, Development)

## Deployment

- [ ] Clicked "Deploy" button
- [ ] Waited for build to complete (1-2 minutes)
- [ ] Deployment succeeded (green checkmark)
- [ ] Got deployment URL (e.g., `https://your-app.vercel.app`)
- [ ] Clicked deployment URL to test

## Post-Deployment

- [ ] App loads successfully
- [ ] Timetable data appears (may take 30 seconds on first load)
- [ ] Can see class schedule
- [ ] Day filters work
- [ ] Dark mode toggle works
- [ ] Refresh button works

Optional post-deployment steps:
- [ ] Added `APP_URL` environment variable with Vercel URL
- [ ] Redeployed to apply APP_URL
- [ ] Installed app as PWA on mobile device
- [ ] Enabled push notifications
- [ ] Tested notification reception

## Testing

- [ ] Tested on desktop browser
- [ ] Tested on mobile browser
- [ ] Installed as PWA
- [ ] Tested offline functionality (after initial load)
- [ ] Verified auto-refresh works (check after 30 minutes)
- [ ] Tested manual refresh button
- [ ] Checked push notifications (if OneSignal configured)

## Troubleshooting (if issues occur)

If deployment failed:
- [ ] Checked Vercel deployment logs for errors
- [ ] Verified all required environment variables are set
- [ ] Confirmed no typos in variable names
- [ ] Ensured Anti-Captcha API key is valid

If timetable not loading:
- [ ] Verified LPU credentials are correct
- [ ] Checked Anti-Captcha account has balance
- [ ] Opened browser console (F12) to check for errors
- [ ] Tried manual refresh button

If notifications not working:
- [ ] Allowed notifications in browser
- [ ] Set APP_URL environment variable
- [ ] Redeployed after setting APP_URL
- [ ] Checked OneSignal credentials

## Maintenance

Ongoing tasks:
- [ ] Monitor Anti-Captcha balance monthly
- [ ] Add credits when balance is low
- [ ] Check app weekly to ensure it's working
- [ ] Update environment variables if password changes

## Security Verification

- [ ] `.env` file is NOT on GitHub
- [ ] Environment variables are only in Vercel dashboard
- [ ] No credentials visible in repository code
- [ ] HTTPS is enabled (automatic on Vercel)

## Optional Enhancements

- [ ] Set up custom domain in Vercel
- [ ] Created own OneSignal account for custom notifications
- [ ] Customized app colors/theme
- [ ] Shared deployment URL with friends

---

## Final Checklist

Before considering deployment complete:
- ✅ App is accessible via Vercel URL
- ✅ Timetable loads and displays correctly
- ✅ No errors in browser console
- ✅ Environment variables are secure (not in code)
- ✅ Anti-Captcha account has sufficient balance
- ✅ Saved Vercel URL for future access

**Status:** [ ] Deployment Successful! 🎉

---

**Need Help?** Open `how_to_deploy.html` for detailed step-by-step guide.
