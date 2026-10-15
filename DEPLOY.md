# TMGW Brass Band Portal — Live free hosting

The portal is published at:

> **https://tmgw-band-portal-7jf6.vercel.app**

This is a free Vercel address and does **not** contain `manus`. No domain purchase is required.

## First organizer account

The organizer account is configured as:

```text
emmaly.isobe@gmail.com
```

It is already an **Organizer** account. Sign in using its existing portal password. If that account ever needs to be recovered, an existing organizer can manage other accounts through **Member & organizer management**.

## What organizers can manage

From the organizer dashboard and the member-management screen, organizers can:

- enter, edit, and remove the **monthly schedule**;
- update the **today’s practice** plan, including ensemble repertoire and times;
- view the weekly schedule automatically derived from monthly entries;
- review each member’s approved **absence, lateness, and early-leave counts**;
- promote or remove organizers and section leaders; and
- remove former members’ accounts and their linked absence records.

## Updating the live site

1. Make changes on the `main` branch of the connected GitHub repository.
2. Push the changes to GitHub.
3. Vercel automatically creates a new production deployment.

The generated Vercel address remains the same.

## Important Vercel settings

The project is named `tmgw-band-portal-7jf6` in Vercel. Its production settings include:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Secure database connection |
| `JWT_SECRET` | Encrypts sign-in sessions |
| `ADMIN_EMAIL` | Initial organizer email (`emmaly.isobe@gmail.com`) |

Keep these values private. Any change to them should be followed by **Redeploy** in Vercel.

## Troubleshooting

| Issue | Action |
|---|---|
| The site does not show the newest version | Open Vercel → project → **Deployments**, then wait for the deployment of the latest `main` commit to be **Ready**. |
| Login does not work | Open Vercel → project → **Environment Variables** and confirm `DATABASE_URL` and `JWT_SECRET` are present for **Production**, then redeploy. |
| An organizer cannot see management pages | In **Member & organizer management**, promote the account to Organizer using an existing organizer account. |
| The ensemble attendance board is empty | First register an **ensemble** practice for that date. Approved absence, late, and early-leave requests then appear beneath it. |
