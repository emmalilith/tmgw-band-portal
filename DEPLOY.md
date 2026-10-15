# Publish TMGW Brass Band Portal without a Manus address

This project is ready for **Render + TiDB Cloud Starter**. The result is a free public address such as:

```text
https://tmgw-brass-band-portal.onrender.com
```

It does not contain `manus`, and no custom domain purchase is required.

> Render's Free web service sleeps after 15 minutes without visitors. The first visit after that can take about a minute to open. It is suitable for a school club or demonstration site, but not for a high-availability public service.

## Before starting

1. Push the latest project files to the GitHub repository. Make sure `render.yaml` and this file are included.
2. Decide which email address will be the teacher/admin account. Use exactly that address for `ADMIN_EMAIL` and the first registration.

## Part 1 — Create the free database at TiDB Cloud

1. Open [TiDB Cloud](https://tidbcloud.com/) and create an account.
2. Select **Create** and choose **TiDB Cloud Starter**. This tier has a no-cost quota and no credit card is required to start.
3. Give the instance a name such as `tmgw-brass-db`, then finish creating it.
4. Open the new instance and click **Connect** in the upper-right corner.
5. Leave the connection type set to **Public**. If TiDB asks for firewall rules, allow `0.0.0.0/0` so Render can reach the database. TiDB encrypts this connection with TLS.
6. Click **Generate Password** and save the password somewhere private. TiDB does not show it again.
7. In the **Connect** dialog, choose the MySQL application connection string and copy the complete URL that begins with `mysql://`.

Keep that URL private. It is the value for `DATABASE_URL` in Render.

## Part 2 — Publish the website at Render

1. Go to [Render](https://dashboard.render.com/) and create an account. GitHub sign-in is fine.
2. On the dashboard, select **New** → **Blueprint**.
3. Connect GitHub if Render asks, then select the band portal repository.
4. Render finds `render.yaml` automatically. Select **Apply**.
5. On the setup page, fill in these two required values:

| Render field | Enter this value |
|---|---|
| `DATABASE_URL` | The complete TiDB connection URL copied in Part 1 |
| `ADMIN_EMAIL` | The email for the teacher/admin, for example `teacher@school.edu` |

Render creates the long `JWT_SECRET` securely by itself. Do not change it.

6. Select **Apply** or **Create New Resources**. Render builds the project, applies the database migrations, and starts the website.
7. When the service status becomes **Live**, select the service name. The public address is displayed at the top and ends in `.onrender.com`.

## Part 3 — Create the first administrator account

1. Open the new `.onrender.com` address.
2. Select **新規登録**.
3. Register with the **same email address entered as `ADMIN_EMAIL`**.
4. This account becomes **顧問 (admin)**. From **メンバー管理**, promote selected students to **パートリーダー** and leave the others as **部員**.

## Updating the site later

Edit the project, commit, and push to the GitHub branch connected to Render. Render automatically redeploys it. The TiDB database and member accounts remain in place.

## If something goes wrong

| What appears | What to do |
|---|---|
| A deployment fails before the site appears | Open the Render service → **Events** or **Logs** and check the first error. Confirm `DATABASE_URL` is the complete TiDB URL. |
| The first page takes a long time | This is normal after 15 minutes of inactivity on Render's Free service. Wait up to one minute, then refresh. |
| `Access denied` or TLS connection error | In TiDB Cloud, reopen **Connect**, confirm the public endpoint/firewall is enabled, then copy the application connection URL again. |
| The registered account is not an administrator | Confirm the account email exactly matches `ADMIN_EMAIL`, including spelling. Update the Render environment variable and redeploy if necessary. |
| A migration fails | Confirm `DATABASE_URL` points to TiDB Cloud and that `DATABASE_SSL=true` appears in Render's environment list. Do not remove `preDeployCommand` from `render.yaml`. |

## Platform notes

- **Render** provides a generated `onrender.com` address. A custom domain is optional, not required.
- **TiDB Cloud Starter** is MySQL-compatible and has a free monthly quota. When its quota is reached, new database connections pause until the next month or a paid plan is selected.
- **Railway** can also host this app, but its free access is a 30-day trial and then has a $1/month minimum. It is therefore not the no-cost recommendation.
- If `ADMIN_EMAIL` is left blank, the first registered account becomes the administrator as a fallback. Setting it is safer because it avoids an accidental first registration becoming an admin.
