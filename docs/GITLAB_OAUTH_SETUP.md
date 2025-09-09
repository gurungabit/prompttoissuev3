# GitLab OAuth Setup Guide

This guide explains how to set up GitLab OAuth authentication for the application.

## Prerequisites

- GitLab account
- Application running on `http://localhost:3000` (development)

## Step 1: Create GitLab OAuth Application

1. Go to GitLab → Your Avatar → Settings → Applications
2. Click **Add new application**
3. Fill in the details:
   - **Name**: "Prompt to Issue App" (or your preferred name)
   - **Redirect URI**: `http://localhost:3000/api/auth/gitlab/callback`
   - **Scopes**: Select these checkboxes:
     - ✅ `read_user` - Read user information
     - ✅ `read_api` - Read access to the API
     - ✅ `read_repository` - Read access to repositories
   - **Confidential**: ✅ Yes (checked)

4. Click **Save application**
5. Copy the **Application ID** and **Secret** from the result page

## Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```env
# GitLab OAuth Configuration
GITLAB_OAUTH_CLIENT_ID=your_gitlab_application_id
GITLAB_OAUTH_CLIENT_SECRET=your_gitlab_application_secret
GITLAB_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/gitlab/callback
NEXTAUTH_SECRET=your_random_secret_for_sessions
```

### Environment Variable Details:

- `GITLAB_OAUTH_CLIENT_ID`: The Application ID from GitLab
- `GITLAB_OAUTH_CLIENT_SECRET`: The Secret from GitLab
- `GITLAB_OAUTH_REDIRECT_URI`: Must match exactly what you entered in GitLab
- `NEXTAUTH_SECRET`: Any random string (at least 32 characters)

## Step 3: Test the Integration

1. Start your application: `npm run dev`
2. Open Settings → Connectors tab
3. Select "GitLab OAuth" 
4. Click "Connect with GitLab OAuth"
5. You should be redirected to GitLab for authorization
6. After approval, you'll be redirected back with the access token automatically saved

## How It Works

1. **User clicks "Connect with GitLab OAuth"**
2. **App redirects** to `/api/auth/gitlab/login`
3. **Server redirects** to GitLab OAuth with your client ID
4. **User authorizes** the application on GitLab
5. **GitLab redirects back** to `/api/auth/gitlab/callback` with authorization code
6. **Server exchanges** code for access token
7. **Token is returned** to client via URL fragment
8. **Client saves token** to localStorage automatically

## Production Deployment

For production, update:

1. **GitLab Application Settings**:
   - Update redirect URI to your production domain
   - Example: `https://yourapp.com/api/auth/gitlab/callback`

2. **Environment Variables**:
   - Update `GITLAB_OAUTH_REDIRECT_URI` to production URL
   - Use production-safe `NEXTAUTH_SECRET`

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check that redirect URI in GitLab matches exactly
   - Ensure no trailing slashes or extra characters

2. **"Invalid client"**
   - Verify Application ID and Secret are correct
   - Check that GitLab application is not disabled

3. **"Token exchange failed"**
   - Check server logs for detailed error message
   - Ensure all scopes are granted in GitLab

4. **"Insufficient scopes"**
   - Verify GitLab app has `read_user`, `read_api`, `read_repository` scopes
   - Re-create the application if scopes were changed

### Debug Steps

1. Check browser console for errors
2. Verify environment variables are loaded:
   ```bash
   echo $GITLAB_OAUTH_CLIENT_ID
   ```
3. Test OAuth endpoints directly:
   - Visit: `/api/auth/gitlab/login`
4. Check server logs for OAuth flow errors

### Security Notes

- Keep client secret secure and never expose in client-side code
- Use HTTPS in production
- Consider implementing refresh token rotation
- Monitor access token expiration (GitLab tokens expire)

## Token Storage

- Tokens are stored in browser localStorage
- Tokens persist across browser sessions
- Clear storage to logout: Settings → Connectors → Disconnect