# My Spidey Portfolio

A Spider-Verse inspired developer portfolio built with React and Vite.

The project includes:
- A themed light/dark experience (Spidey and Venom modes)
- Animated section-based portfolio layout
- A floating AI portfolio assistant (Spidey Bot / Venom Bot)
- Gemini API integration with local intelligent fallback responses
- Mobile-first responsive behavior and touch-friendly interactions

## Tech Stack

- React 19
- Vite 8
- CSS (component-scoped + global design tokens)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Set the values in `.env.local`:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-1.5-flash
```

### 3. Run in development

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

### 5. Preview production build

```bash
npm run preview
```

## Project Structure

```text
src/
	components/
		About/
		Contact/
		Experience/
		Footer/
		Hero/
		Nav/
		Projects/
		Skills/
		shared/
	data/
	hooks/
	styles/
```

## Deployment

This app is Vercel-ready out of the box.

### Deploy with Vercel CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

### Environment Variables in Vercel

Add these variables in the Vercel project settings:
- `VITE_GEMINI_API_KEY`
- `VITE_GEMINI_MODEL`

## GitHub

Repository:
- https://github.com/Shnekithaa/my-spidey-portfolio.git

## Notes

- `.env.local` is intentionally ignored by git.
- If Gemini is unavailable or misconfigured, the portfolio bot automatically falls back to local response logic.
