<div align="center">

# 公 — Ghost Portfolio

**An interactive portfolio you fly through, not scroll.**

A dark, neon-green world in the spirit of *Ghost in the Shell (1995)* — a floating
control deck where your work is laid out as objects in space and a year of your
GitHub activity rises out of the floor as a living city of light.

[**▶ Open the live site**](https://korotych-portfolio-tau.vercel.app)

![Ghost Portfolio in motion](docs/preview.gif)

</div>

---

## What it is

Most portfolios are a page you scroll. This one is a place you move around.

Three stations — **Identity**, **Products**, **Activity** — and the camera glides
between them. Product screens power on like old monitors and open the real apps
when you click them. Your last 365 days on GitHub become a glowing cityscape you
can spin around with your mouse: every tower is one day, its height is how much
you shipped. It rebuilds itself live on every visit, so the portfolio is never
out of date.

The whole thing is wrapped in a retro-future HUD — scanlines, a soft CRT glow,
Japanese labels, a boot-up sequence — for that cyberpunk terminal feeling.

## Make it yours

It's **open source (MIT)** — take it, remix it, and build your own. Point it at
your GitHub username and swap in your own projects; the neon city and the whole
mood come for free.

```bash
git clone https://github.com/MikeKorotych/ghost-portfolio
cd ghost-portfolio
npm install
npm run dev
```

Then open `src/main.js`: set your GitHub username, list your own projects, and
drop your screenshots into `public/`. That's it.

## Credits

Built by [Mykhailo Korotych](https://github.com/MikeKorotych) with three.js.
If you make something cool with it, a link back is appreciated but not required.

**Repository:** https://github.com/MikeKorotych/ghost-portfolio
