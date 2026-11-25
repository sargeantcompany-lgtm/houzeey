# Houzeey

Houzeey is an Australian private-sale property marketplace: owners list their homes, buyers search and save listings, and buyers contact sellers directly. Agency and buyer-agent listings are not accepted.

Buyers can filter published homes by suburb or postcode, state, property type, bedrooms, bathrooms, car spaces, price, and land size, then sort and page through results.

## Private listing review

1. The seller completes Houzeey's identity check and confirms they own the property or are authorised to sell it.
2. The seller provides their solicitor or conveyancer's contact and registration details.
3. Houzeey emails that representative a time-limited review link. The representative can attest to the listing details or request changes.
4. The listing stays unpublished until an attestation is submitted. Editing a listing sends it back for review.

The email link does not independently verify a legal professional's registration or guarantee ownership, title, disclosures, or property information. This workflow needs review by an Australian property lawyer before public launch.

## Offers and negotiation

Signed-in buyers can make an offer with a price, deposit, settlement timing, and conditions. The owner and buyer can take turns accepting or countering the latest terms, and the negotiation history is stored with the offer. Buyers can withdraw an active offer.

An accepted offer creates a settlement checklist and a downloadable letter of offer. Neither is a substitute for a contract prepared and reviewed by the parties' solicitors or conveyancers.

## Local development

1. Start local PostgreSQL and Redis with `docker compose up -d`.
2. Install dependencies with `npm install` in the root, `server`, and `worker` folders.
3. Copy `server/.env.example` to `server/.env` and `worker/.env.example` to `worker/.env`. Set local database and Redis URLs, a long random `JWT_SECRET`, and Railway bucket credentials for real video uploads.
4. Run `npm run dev` in `server`, `npm start` in `worker`, and `npm run dev` in the project root. Open `http://localhost:5173`.

Set `CLIENT_URL` to the frontend URL. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `SMTP_SECURE` for solicitor invitations. Without SMTP, the API logs the invitation (including its temporary link) for local testing.

Video uploads go directly from the browser to the private bucket using signed URLs. The bucket must allow browser CORS for the frontend origin and `PUT`; see [docs/ENV.md](./docs/ENV.md). The API automatically runs the numbered video migration at startup. The worker requires FFmpeg; use `worker/Dockerfile` for Railway deployment.

## Useful commands

- `npm run build` — build the frontend.
- `npm run lint` — run ESLint across the repository.
- `cd server && npm run start` — start the API.
- `GET /health` — API health check.
