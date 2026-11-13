# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

## Backend server

The registration, sign-in, and face detection routes run on port 3001. Face detection uses only the Google Cloud Vision `FACE_DETECTION` feature. Enable the Vision API in a Google Cloud project and provide its API key to the backend; keep the key out of frontend code and source control.

For local development in PowerShell:

```powershell
cd "src\backend"
$env:GOOGLE_VISION_API_KEY="your-google-cloud-vision-api-key"
$env:DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=verify-full"
npm.cmd install
npm.cmd run migrate
npm.cmd start
```

Create a managed PostgreSQL database before starting the backend. Set `DATABASE_URL` to its connection URI as a backend secret (URL-encode special characters in credentials). Run `npm run migrate` as the deployment's release/pre-deploy step before starting backend instances. The migration creates `schema_migrations` and `face_detection_usage`; the latter stores one row per UTC month. All backend instances must use the same database. Do not use an ephemeral database or filesystem for this counter.

The backend stores user accounts and reserves each face-detection request in PostgreSQL. Set `AUTH_TOKEN_SECRET` to a random secret of at least 32 characters in the backend environment; all backend instances must share it. Sign-in and registration return a seven-day signed token, and face detection requires that token. Each successful Vision response increments the signed-in user's `users.entries` count once per submitted image. Separately, monthly reservations include failed upstream attempts and are shared atomically across instances. After 900 reservations for the current UTC month, the route returns HTTP 429; the counter advances automatically when the UTC month changes. If PostgreSQL or the auth secret is unavailable, account operations and face detection fail closed.

For local development, add a private `AUTH_TOKEN_SECRET` value of at least 32 characters to `src/backend/.env`. Do not commit or share the value. Keep the same secret across backend instances; changing it invalidates existing sign-in tokens.

Set `REACT_APP_API_URL` in the frontend build environment to the deployed backend's HTTPS origin (for example, `https://api.example.com`); it defaults to `http://localhost:3001` for local development. Google and database credentials must only be set in the backend environment, never in `REACT_APP_*` variables. The image URL submitted for detection must be publicly accessible to Google Cloud Vision. For existing accounts, make the legacy `src/backend/users.json` file available to the migration command (or set `USER_STORE_PATH` to its location) before the first deployment migration; valid salted password hashes are imported without replacing accounts already in PostgreSQL. If no legacy file is available, the migration creates an empty accounts table.

The application-level 900-request limit is not a billing guarantee: other clients using the same Google Cloud project/key, or calls outside this backend, can still incur charges. Restrict the API key to the Cloud Vision API and appropriate server sources where feasible, set Cloud Vision quotas if available, enable billing alerts, monitor usage, and verify current free-tier pricing and eligibility. Budget alerts alone do not stop billing.


### Deployment




SmartBrain is deployed using cloud-based services. The React.js frontend is hosted on Vercel, while the Node.js and Express.js backend is deployed on Render. The application uses a PostgreSQL database hosted on Supabase to manage user accounts and face-detection usage records. For facial analysis, it integrates the Google Cloud Vision API, which processes submitted images using its FACE_DETECTION feature.



Live Application
Live Demo:  https://smartbrain-face-recognition.vercel.app/


GitHub Repository: https://github.com/adib2004/smartbrain-face-recognition

Deployment Architecture


The application follows a three-tier architecture:
1.	Frontend (Vercel): Hosts the React.js application and communicates with the backend through HTTPS API requests.
2.	Backend (Render): Handles user registration, authentication, face detection requests, API validation, and monthly usage tracking.
3.	Database (Supabase): Provides managed PostgreSQL storage for user accounts and monthly face-detection usage records.



The Google Cloud Vision API processes submitted image URLs using its FACE_DETECTION feature to identify faces and return facial analysis results.
Environment Configuration

The deployed application uses environment variables to keep sensitive credentials separate from the source code.
•	Vercel: REACT_APP_API_URL points to the deployed Render backend.
•	Render: DATABASE_URL, GOOGLE_VISION_API_KEY, and AUTH_TOKEN_SECRET are configured as backend environment variables.
Sensitive credentials are not stored in the frontend source code or committed to the GitHub repository. 



<img width="1000" height="620" alt="image" src="https://github.com/user-attachments/assets/806b934e-63ef-4bdf-93c6-112d51fb1c82" />  





<img width="940" height="504" alt="image" src="https://github.com/user-attachments/assets/ef00e034-b157-4bcd-bd3c-8a8eb0f45d79" />






<img width="1003" height="578" alt="image" src="https://github.com/user-attachments/assets/67665a90-e92d-41c0-a3e7-b0c573f33871" />






<img width="1010" height="633" alt="image" src="https://github.com/user-attachments/assets/b25c539d-39bc-4cc7-8925-ffeb808f1df7" />




### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
