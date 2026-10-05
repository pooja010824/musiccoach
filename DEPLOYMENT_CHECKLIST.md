# MusicCoach final security checklist

## What was completed
- Public coach discovery remains available without login.
- Bookings, lessons, progress notes, payments and reviews are user-scoped on the API.
- Students/parents can only create/cancel/pay/review their own records.
- Coaches/admins can manage lesson/progress records only for permitted records.
- Review creation derives student/coach ownership from the booking instead of trusting client IDs.
- Coach cards receive public average rating data without exposing private review records.
- The frontend loads private dashboard data only when a login token exists.
- Logging out clears private dashboard state.
- The auth modal icon corruption was fixed.

## Environment
Do not commit `.env` or `.env.local`.
Set `DATABASE_URL` and a strong `JWT_SECRET` in Render.

## Deployment
Build command:
`npm install --include=dev && npx prisma migrate deploy && npx tsx prisma/seed.js && npm run build`

Start command:
`npm start`

After pushing `main`, verify:
1. `/api/health`
2. Sign up/login
3. Find a coach while logged out
4. Book while logged in
5. Pay the booking
6. Confirm dashboard only shows the logged-in user's records
7. Logout and confirm private dashboard data clears
