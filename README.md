# Exercise: An Animated Game Start Screen

Exercise code for the lesson **Exercise: An Animated Game Start Screen** in the CSS in Depth course on [ask-codey.com](https://www.ask-codey.com).

*Star Hopper* is a made-up space game, and its start screen looks finished: a night sky full of stars, a big gold title, three menu buttons and a loading bar. But nothing moves. You'll write the motion in `styles.css`: stars that twinkle, a title that slides in, buttons that lift when you point at them or reach them with the Tab key, and a loading bar that fills again and again. Then you'll calm it all down for readers who asked their device for less motion. Ten checks tell you when each part is doing its job.

## Before you start

You need VS Code with the Live Server extension, a current Chrome, Edge or Firefox, and Node.js 24 or newer, set up as in the lesson *Setup: VS Code, a Browser and Node.js*.

## What's here

- `index.html`: the start screen: a sky with twelve stars, the title, a tagline, the menu with Start, How to play and High scores, and the loading bar. Ready to use: don't change it.
- `styles.css`: Part 1 is the look of the screen, ready to use. It already gives each star its place and its own `animation-delay`, so once the stars have an animation they twinkle at different times. Part 2 is empty except for a comment that lists the motion to write. For you to finish.
- `page.test.js`: the ten checks. You don't need to change this file.
- `package.json`: tells npm what the checks need (`jsdom`, which reads your page and stylesheet the way a browser does). Ready to use.
- `.gitignore`: keeps the `node_modules` folder that `npm install` makes out of Git. Ready to use.

## What to do

Open this folder in VS Code, right-click `index.html` and choose **Open with Live Server**. Then write each part in Part 2 of `styles.css`, save, and watch the page:

1. **Twinkling stars.** Write a `@keyframes` rule that takes a star from dim to bright (`opacity`, and `scale` if you like). Play it on `.star`: about 1.5 seconds, forever, going back and forth.
2. **A title that slides in.** Write a `@keyframes` rule that starts the title 3rem above its place and see-through. Play it on `.title` once: about 0.7 seconds, `ease-out`, starting 0.3 seconds after the page opens. During those 0.3 seconds the title waits, hidden, at its starting point, so it never jumps.
3. **Buttons that lift.** When a menu button is hovered or has keyboard focus, it moves 4px up with `translate`, and its shadow grows. Give `.menu-button` a transition so the lift takes about 150ms, up and back down.
4. **A loading bar.** Write a `@keyframes` rule that grows `.loading-fill` from nothing to its full width with `scale` (not `width`), from its left edge, about every 2 seconds, forever.
5. **Motion that respects the reader.** After your other rules, add a `@media (prefers-reduced-motion: reduce)` rule that stops the stars and the loading bar, swaps the title's slide for a short fade (or no animation), and keeps the buttons still on hover and focus.

Every `@keyframes` rule animates only `transform` (`translate`, `rotate`, `scale`) and `opacity`.

## Check your work

Open the terminal in VS Code (**Terminal > New Terminal**). Run this once, to install what the checks need:

```bash
npm install
```

Then run the checks whenever you like:

```bash
npm test
```

Each check prints one line: ✔ when it passes, ✖ when it doesn't yet. Before you write any motion, the first check passes (the page and its link line are already there) and the other nine fail. That's expected. Under **failing tests**, each one has a message that starts **Not yet:** and says what it found, for example *.star plays "Twinkle", but styles.css has no @keyframes rule with that name.* When the last lines say `pass 10` and `fail 0`, you're done.

## The checklist the checks can't do

The checks read your rules; they can't watch anything move. So look at the page in the browser:

- The stars twinkle at different times, and none of them jumps from bright to dim.
- When the page opens (reload it to see it again), the title waits a moment, then glides down into place and stays there.
- Point at each button: it rises a little and its shadow grows, then settles back smoothly when the mouse leaves. Press Tab to move through the buttons: each one lifts when it has focus.
- The loading bar fills from left to right, over and over.
- In the developer tools, turn on reduced motion (Ctrl+Shift+P, type *rendering*, choose **Show Rendering**, then set **Emulate CSS media feature prefers-reduced-motion** to **reduce**) and reload. The stars and the bar are still, the title fades in where it is, and the buttons change their shadow without moving.

## Tips

- An animation that doesn't play is nearly always one of two things: the name in `animation` doesn't match the `@keyframes` name exactly, or there's no duration.
- In the `animation` line, the first time is the duration and the second is the delay.
- A keyframe you leave out is taken from the element's own style. A `from` on its own is enough for something that ends where it normally sits.
- `scale: 0 1` is no width and full height. Where it grows from is its `transform-origin`.
- A transition on the `:hover` rule runs only on the way in. Put it on `.menu-button` itself.
- A media query adds no specificity, so a rule inside it that ties with an earlier rule wins only if it comes later in the file.

## Hand it in

When it works, put your solution in a public repo of your own on GitHub, then paste that repo's address into **Submit your exercise** on the lesson page at [ask-codey.com](https://www.ask-codey.com). That's what completes the lesson. You don't need Git: create the repo on GitHub, choose **Add file**, then **Upload files**, and upload everything in this folder except `node_modules` (it's the files `npm install` downloaded, far too many for GitHub's upload, and `npm install` makes it again). The lesson page shows each step, and the lesson *Put Your Page Online for Free* walks through every screen.
