# commonplace

commonplace is a small app for keeping a commonplace book of what you read, watch, and
listen to. Your Ledger tracks the books, films, shows, and other media you've
finished, are in progress on, or want to get to. Your Journal holds the marginalia:
quotes, clips, and notes tied to those entries. Most of it is public by default, so
you can also follow other people and see what they're adding.

## Stack

- React 19 + TypeScript, built with Vite
- Supabase for the database, authentication, and file storage
- React Router for navigation

## Running locally

```
npm install
npm run dev
```

You'll need your own Supabase project and environment variables configured for auth
and data access to work; see the Supabase client setup in `src/` for what's expected.

Other useful scripts:

```
npm run build    # typecheck and build for production
npm run lint     # run ESLint
npm run preview  # preview a production build locally
```
