# SlickHood PMS frontend

Next.js frontend for the SlickHood property management backend in `E:\SlickHood\PMS`.

## Local configuration

Copy `.env.example` to `.env.local` and keep the backend URL as:

```text
NEXT_PUBLIC_API_URL=http://localhost:8080
```

The local file is intentionally ignored by Git. Never put Paystack secret keys in this frontend; they belong only in the backend deployment environment.

## Paystack test flow

1. Enable Paystack and set the test secret key in the backend environment.
2. Set the backend `PAYSTACK_CALLBACK_URL` to `http://localhost:3000/payment/callback` for local testing.
3. Configure the Paystack dashboard webhook as `https://YOUR-PUBLIC-BACKEND/callback/paystack`.
4. Create a landlord Paystack payment account in SlickHood, save its `ACCT_...` subaccount code, and attach that account to the property.
5. Pay an invoice through the Paystack account. The browser returns to `/payment/callback`; only the verified backend webhook can mark the invoice paid.

See the backend guide at `E:\SlickHood\PMS\PAYSTACK_TEST_SETUP.md` for the complete setup.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
