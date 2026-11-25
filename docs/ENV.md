# Environment and video storage setup

Copy the example files and provide the same database, Redis, and bucket settings to the API and worker:

- API: `server/.env.example` → `server/.env`
- Worker: `worker/.env.example` → `worker/.env`
- Frontend: `.env.example` → `.env.local`

Never commit `.env`, `.env.local`, bucket credentials, or Railway variable values.

## Variables

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | API, worker | PostgreSQL connection string |
| `JWT_SECRET` | API | Signs Houzeey authentication tokens |
| `ADMIN_EMAIL` | API | Grants admin access to the matching account when it registers |
| `MESSAGE_ALERT_EMAIL` | API | Receives an email copy of every buyer/seller message (falls back to `ADMIN_EMAIL`). Messages themselves stay inside Houzeey. |
| `PORT` | API | HTTP port; Railway supplies this in production |
| `CLIENT_URL` | API | Frontend origin used in email links and API CORS |
| `REDIS_URL` | API, worker | BullMQ queue connection |
| `BUCKET_ENDPOINT` | API, worker | S3-compatible endpoint, e.g. `https://t3.storageapi.dev` |
| `BUCKET_NAME` | API, worker | Actual S3 bucket name (`BUCKET` in Railway), not its display name |
| `BUCKET_ACCESS_KEY_ID` | API, worker | Bucket access key (`ACCESS_KEY_ID` in Railway) |
| `BUCKET_SECRET_ACCESS_KEY` | API, worker | Bucket secret (`SECRET_ACCESS_KEY` in Railway) |
| `BUCKET_REGION` | API, worker | Bucket region (`REGION` in Railway, commonly `auto`) |
| `MAX_VIDEO_UPLOAD_BYTES` | API | Maximum original upload size; defaults to 512 MiB |
| `MAX_VIDEO_DURATION_SECONDS` | worker | Maximum source video duration; defaults to 180 seconds |
| `VIDEO_WORKER_CONCURRENCY` | worker | Concurrent FFmpeg jobs; defaults to 1 |
| `VITE_API_URL` | frontend | API origin; use `http://localhost:3001` locally |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | API | Solicitor invitation email transport |
| `UPLOAD_DIR` | API | Existing local static upload directory setting |

## Local setup

1. Use Node.js 20.19+ or 22.12+ for the full app. Install Docker Desktop if it is not already available, then run `docker compose up -d` from the project root. This starts local PostgreSQL and Redis.
2. Copy `server/.env.example` to `server/.env`. Set `DATABASE_URL=postgresql://houzeey:houzeey_local@localhost:5432/houzeey`, a private `JWT_SECRET`, and `REDIS_URL=redis://localhost:6379`.
3. Add the Railway bucket credentials to both `server/.env` and `worker/.env`. Video uploads need a real bucket even when the API and worker are running locally.
4. Install dependencies with `npm install` in the root, `server`, and `worker` folders.
5. Start the API with `npm run dev` in `server`, the processor with `npm start` in `worker`, and the frontend with `npm run dev` in the root. The API creates the video table through the numbered migration on startup; `cd server; npm run migrate` can also run migrations manually after the base API schema exists.

To test a real phone video over your home Wi-Fi, find your computer's LAN IP with `ipconfig`, set `VITE_API_URL` to `http://<LAN-IP>:3001`, set the API's `CLIENT_URL` to `http://<LAN-IP>:5173`, and add that exact frontend origin to the bucket CORS rules. Start Vite with `npm run dev -- --host 0.0.0.0`, allow the local ports through Windows Firewall if prompted, then open `http://<LAN-IP>:5173` on the phone and select a saved video. Camera capture on iPhone requires HTTPS; this local HTTP test uses the phone's video picker.

## Railway variables

Add these references to both the API service and worker service. Replace `Bucket` with the exact Railway bucket service name:

```text
BUCKET_ENDPOINT=${{Bucket.ENDPOINT}}
BUCKET_NAME=${{Bucket.BUCKET}}
BUCKET_ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
BUCKET_SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
BUCKET_REGION=${{Bucket.REGION}}
```

Also reference the same PostgreSQL and Redis services in both services. Set `CLIENT_URL` on the API to the exact public Houzeey frontend origin. Keep bucket credentials server-side; the frontend receives only short-lived signed URLs.

To configure the bucket's browser CORS rules on Windows:

1. Install and configure the AWS CLI.
2. In PowerShell, set the bucket's access credentials for this terminal only:

   ```powershell
   $env:AWS_ACCESS_KEY_ID = "<bucket access key id>"
   $env:AWS_SECRET_ACCESS_KEY = "<bucket secret access key>"
   ```

3. Edit `docs/bucket-cors.example.json` so `AllowedOrigins` contains the exact local and production frontend origins you use.
4. Run this from the project root, replacing the bucket name and endpoint with the values in Railway's bucket Credentials tab:

   ```powershell
   aws s3api put-bucket-cors --bucket "<actual S3 bucket name>" --endpoint-url "https://t3.storageapi.dev" --region auto --cors-configuration file://docs/bucket-cors.example.json
   ```

   Railway's `BUCKET` value is the actual S3 bucket name to pass to `--bucket`; the display name is not.
5. Optionally verify with `aws s3api get-bucket-cors` using the same `--bucket`, `--endpoint-url`, and `--region` arguments, then clear the terminal credentials:

   ```powershell
   Remove-Item Env:AWS_ACCESS_KEY_ID
   Remove-Item Env:AWS_SECRET_ACCESS_KEY
   ```

The rules allow direct browser `PUT` uploads and signed `GET` playback. If a browser upload reports a CORS/network error, confirm that the requesting origin is an exact match and that the deployed bucket has these rules. Do not route video bytes through Express as a workaround.

See Railway's official [Storage Buckets](https://docs.railway.com/storage-buckets) and [Uploading & Serving Files](https://docs.railway.com/storage-buckets/uploading-serving) guides for current endpoint and CORS details.

## Video pipeline behavior

- The API authorizes the listing owner, issues a one-hour signed `PUT` URL, and checks the uploaded object's size and content type before queueing it.
- The browser sends the video directly to the private bucket. Express never receives or streams video bytes.
- The worker downloads to a temporary directory, rejects videos longer than the configured duration, and creates a 720×1280 H.264/AAC MP4 plus JPG thumbnail with FFmpeg.
- The API exposes private playback only for active listings that have passed the existing solicitor review, using signed `GET` URLs that expire after six hours.
- The worker stores a useful error and marks the video `failed` if processing fails. Temporary files are removed after the job.
