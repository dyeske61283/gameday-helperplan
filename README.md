# Gameday Helperplan - your helper to organize your helpers

a small web app to organize a helper plan for home turf gamedays

## Why? What? Huh?

We are organizing the helpers for our home game days always in a crappy excel file, that is then distributed in a very unoptimal way.
I hate every single thing about that excel file...

- You cannot really see - especially on mobile devices - when and what your duty is on a given game day.
- People swap or are sick all the time and these changes are not distributed again properly with newer file versions
- Event dates change also all the time - same problems as above
- The excel file is also not always done for the whole season at once, so there may be additional days, where you have duties, but you need to look into a newer file to know

All of this is pain.

So I thought.. let's change that and go as simple as possible.

1. press Start
2. create permalink 
3. assign password (optional)
4. import iCal or enter events manually 
5. assign roles/types of duty 
6. randomly assign people from lists 
7. possibly with restrictions/preferences
8. export at the end (optional)
9. then distribute link 
10. view (with PW)
11. change appointments just like that
12. change schedules (swap) with confirmation link

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
deno install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
deno task dev
```

## Production

Build the application for production:

```bash
deno task build
```

Locally preview production build:

```bash
deno task preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
