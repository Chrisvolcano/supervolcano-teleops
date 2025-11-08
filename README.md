## SuperVolcano Teleoperator Portal

Next.js (App Router) portal for SuperVolcano teleoperators and OEM partners. Built with TypeScript, TailwindCSS, and shadcn/ui, backed by Firebase for client and admin workloads.

### Stack

- Next.js 14 (App Router) + TypeScript
- TailwindCSS + shadcn/ui component primitives
- Firebase client SDK (Auth, Firestore, Storage)
- Firebase Admin SDK for privileged API routes

### Getting Started

1. **Install dependencies**

   ```
   pnpm install
   ```

   > npm and yarn also work if preferred.

2. **Configure environment variables**

   Create a `.env.local` file at the project root and supply the Firebase and admin values. Refer to the variables described below (the sample values match current project defaults):

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDXXXX
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=supervolcano-teleops.firebaseapp.com
   FIREBASE_ADMIN_PROJECT_ID=super-volcano-oem-portal
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=supervolcano-teleops.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
   NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

   FIREBASE_ADMIN_PROJECT_ID=super-volcano-oem-portal
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@super-volcano-oem-portal.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDHSfuBJkQR1Yy5\n5iuFJ8whTTWhw6fyXj2W00HW6s+mK0/q2GSGrpPTf+bd4Ok9+4Unk/gqjowXZAqI\nXXxhb/ZwjY2NNGP5ekrSpyFQQlIrSBu1NWkquH8oA4K6dRX7yOYgbDRVoS2W1MTe\nEu2J+7ra8GO0lnBcm3Nqqqcg3Rz7aq/H6kVg8Qee+NbhDSJJD5r+kvUzC5aagONR\nuXxqsPwPu9Nv4Jl4yGF8xuygn+6WENU0aO/PCHXKFhb2uUwnjEBL8TkQ2Scz7ViS\nt2MvOWek37lqZrCYaIdsii6sia8ACyb32fuavWiIDMaLggI2ZJf0N5dWmJXJyaqy\nlF9CP6LzAgMBAAECggEAQEAY5t14aquHsFOFyms3Q7FJzjpvRhOeFadMfca8ZZ1n\nKZbUahuUq0Z8HyKo8APMPSNWihnlDpGBV8+UDzHyqPzqGxE9/iuwPdQGSILpTOz1\niemLW2uaC0N+fTDMgp2Vm/Rmtwi80vkL83D0xlyzNGz2KD2sQh8YCda1BUJkWqXL\nKEM3cQVbBfTPZ+dkQ9+MMiaSRRGNHBGg6vlVW8S/YJ7fULpFfkh6edpWwvedLowb\nFfPbNA1/Dq9rbqWY0qsEObYh8JdMXu3pBwjZEiLB1rw0tEgy4Ir5hU5Wj5p1lCU5\nlkwGBBvj4piMVwN6YzQVSvBHb2B3XEtctZal7VXu2QKBgQD9MccAj+aY0NGgUQk9\n3F35eG0GtABgYpGYS+Lrl26qJ2bPENiyLTHRWgi6mZGWSG/5kCtNGbslSBONpnQX\nlsMTHztZ2HePZCEtSbCrnZJBOptjZtjhpc+/kZCgla/qfcwCZVIhZDzj7YsCEKRE\nZfT6XY0opZVfmq51Rp973BZWdwKBgQDJf0tjfdSHKrjId60wEvDBNg1CHQ0l8Gq4\nK0L2x9H6acCxdC2qorcJdjmKncyjRoApRLTX72PWPhsVAsN8N3fhCmrtIf//qu/m\nW5PRvWTZ8dtq9OUKwW6BzAZ8BmJ7n5gXC2e0aMKyJ2xlQ+Xatv+rXT2pfqvrMEXV\nOIs65sAqZQKBgQCsTJF1yndMCt58UGkPlcTFnbPj2d5fuPQHRaz4UabXV9TYmEg+\niA7cvn4uLY8rS8QXeopc/2OhbTkRLfLWkpvRiXFkJLDH/YWuQfVd8+6xQOa5cCWq\n+KE1ZiObhAGge1a3UqffXU0qdl4gW57NhOx+6+bBgFz0IFkUKakiKpVw5QKBgE3J\nSn06ElWr9HHPYZhxd2ffSfb/6BeBXHGEofFK6pDVSoI263o4HpkUfto4WMufZ9KG\np5nE3LHUf/f4fSby8uB5eRXaTk2Q29P9/m61wr0wVRhROiqQyexpqwcuH87BqaEb\n0gkfeCn2di4RrCZnBwRMloVcVVoR5KOPlJBEjGLRAoGBAPwawO6qkhz0cblvqjGN\nJiR6gai0Pf/JJFX1t7x5pOVTADWRs5y1W9Ss6nGuvGR+d0F94KpWgEySFRZKWcLi\nX12dCJ1iuiH5dCmAscxp6tVZezyx0c7sAy+Ig1/lWVdGjyUxdx9t7K4EWweYDIxo\nR2FDoJ4NYJ1+McVE7dVfvGzS\n-----END PRIVATE KEY-----\n"

  ADMIN_BEARER_TOKEN=cf1b2fbd50b34b929a1e5e1b0d9327b0e2c83f62a1fd4d879e72906c57f3e2a3
   ```

   The admin private key should retain literal `\n` characters. When copying from a JSON service account, surround the value with quotes and keep `\n` escapes.

3. **Run the development server**

   ```
   pnpm dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) and sign in on `/login`.

### Firebase Configuration

1. **Enable services**

   - Authentication: Email/Password
   - Firestore: Native mode
   - Storage: Default bucket

2. **Set security rules**

   Deploy the rules included in this repo:

   ```
   firebase deploy --only firestore:rules --project vast-art-477519-u5
   firebase deploy --only storage:rules --project vast-art-477519-u5
   ```

   - Firestore rules: `src/firebase/firestore.rules`
   - Storage rules: `src/firebase/storage.rules`

3. **Configure custom claims**

   Use the admin API route below to assign `role` and `partner_org_id` claims to users.

### Feature Overview

- `/login` — email/password sign-in for teleoperators, with password visibility toggle and contextual messaging when already authenticated.
- `/admin` — admin dashboard for managing properties, uploading imagery, and assigning tasks between teleoperators and human cleaners.
- `/properties` — operator dashboard filtered by role/partner; displays `PropertyCard` components and teleoperator task queues with in-app status updates.
- `/property/[id]` — property overview with gallery, SessionHUD, and scoped tasks respecting assignment type.
- `/task/[id]` — detailed view with task metadata, state-machine transitions, and audit log timeline.
- Hooks:
  - `useAuth()` — wraps Firebase Auth with role claims and navigation helpers.
  - `useCollection()`/`useDoc()` — typed Firestore listeners with partner scoping.
- Components:
  - `PropertyCard`, `TaskList`, `SessionHUD`, `TaskForm`.
- API routes (require `ADMIN_BEARER_TOKEN` header):
  - `POST /api/admin/promote` — `{ email, role, partner_org_id }`
  - `POST /api/admin/seed` — idempotent demo data bootstrap
  - `POST /api/session/start` — create session, enforce `allowed_hours`
  - `POST /api/session/stop` — end session (optional `result_state`)

### Running Admin Endpoints

Include the bearer token in the request headers:

```
curl -X POST http://localhost:3000/api/admin/promote \
  -H "Content-Type: application/json" \
  -H "ADMIN_BEARER_TOKEN: changeme-admin-token" \
  -d '{"email":"operator@demo.org","role":"operator","partner_org_id":"demo-org"}'
```

Session management:

```
curl -X POST http://localhost:3000/api/session/start \
  -H "Content-Type: application/json" \
  -H "ADMIN_BEARER_TOKEN: changeme-admin-token" \
  -d '{"operatorId":"operator@demo.org","partnerOrgId":"demo-org","propertyId":"demo-property-1","taskId":"task-available-1","allowed_hours":4}'
```

### Deployment (Vercel)

1. Push the repository to GitHub/GitLab.
2. Import the project into Vercel.
3. Set the environment variables in Vercel → Settings → Environment Variables.
4. Configure a secret for `ADMIN_BEARER_TOKEN`.
5. Deploy; Vercel detects Next.js automatically.

### Development Notes

- Tailwind + shadcn/ui styles live in `src/app/globals.css` and `src/components/ui`.
- Firebase client code is isolated in `src/lib/firebaseClient.ts`; admin-only code in `src/lib/firebaseAdmin.ts`.
- Task state machine definitions are in `src/lib/taskMachine.ts`.
- Update rules alongside schema changes and redeploy via Firebase CLI.
